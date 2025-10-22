import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../database/db.js';
import { errorLogs, users } from '@shared/sqlite-schema';
import { eq, and, or, like, gte, lte, desc, asc, sql, count, avg } from 'drizzle-orm';
import { searchCache, cacheService } from '../../services/cache/redis-cache.service.js';

/**
 * Advanced Search API Routes for v0.9.5
 * Provides comprehensive search functionality with caching and performance optimization
 */

const router = Router();

// Search request validation schema
const searchRequestSchema = z.object({
    query: z.string().min(1, 'Query cannot be empty').max(500, 'Query too long'),
    filters: z.object({
        severity: z.array(z.enum(['critical', 'high', 'medium', 'low'])).optional(),
        errorType: z.array(z.string()).optional(),
        dateRange: z.object({
            start: z.string().datetime(),
            end: z.string().datetime()
        }).optional(),
        fileNames: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        userId: z.number().optional()
    }).optional(),
    options: z.object({
        enableSemantic: z.boolean().default(true),
        enableFuzzy: z.boolean().default(true),
        enableRegex: z.boolean().default(false),
        enableContextual: z.boolean().default(true),
        maxResults: z.number().min(1).max(100).default(20),
        sortBy: z.enum(['relevance', 'date', 'severity', 'errorType']).default('relevance'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
        highlightMatches: z.boolean().default(true),
        page: z.number().min(1).default(1),
        includeFacets: z.boolean().default(true)
    }).optional()
});

// Search suggestions request schema
const suggestionsRequestSchema = z.object({
    query: z.string().min(1).max(100),
    limit: z.number().min(1).max(20).default(10),
    type: z.enum(['semantic', 'fuzzy', 'historical']).default('semantic')
});

// Saved search schemas
const saveSearchSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    searchQuery: z.string().min(1),
    searchFilters: z.object({}).passthrough(),
    searchOptions: z.object({}).passthrough(),
    isPublic: z.boolean().default(false),
    isFavorite: z.boolean().default(false)
});

/**
 * POST /api/v095/search/advanced
 * Execute advanced search with multiple search strategies
 */
router.post('/search/advanced', async (req: Request, res: Response) => {
    const startTime = performance.now();

    try {
        // Validate request
        const searchRequest = searchRequestSchema.parse(req.body);
        const { query, filters = {}, options = {} } = searchRequest;

        console.log('🔍 Advanced search request:', { query, filters, options });

        // Check cache first
        const cacheKey = generateSearchCacheKey(query, filters, options);
        const cachedResults = await searchCache.getCachedSearchResults(query, { filters, options });

        if (cachedResults) {
            console.log('🎯 Returning cached search results');
            return res.json({
                ...cachedResults,
                cached: true,
                executionTime: performance.now() - startTime
            });
        }

        // Build database query
        const dbQuery = buildAdvancedSearchQuery(query, filters, options);

        // Execute search with performance tracking
        const searchResults = await executeAdvancedSearch(dbQuery, options);

        // Calculate relevance scores
        const scoredResults = calculateRelevanceScores(searchResults, query, options);

        // Apply sorting and pagination
        const sortedResults = applySortingAndPagination(scoredResults, options);

        // Generate facets if requested
        const facets = (options as any).includeFacets ? await generateSearchFacets(filters) : undefined;

        // Get search suggestions
        const suggestions = await getSearchSuggestions(query, (options as any).maxResults || 5);

        // Prepare response
        const response = {
            results: sortedResults.results,
            totalCount: sortedResults.totalCount,
            page: (options as any).page || 1,
            pageSize: (options as any).maxResults || 20,
            totalPages: Math.ceil(sortedResults.totalCount / ((options as any).maxResults || 20)),
            executionTime: performance.now() - startTime,
            suggestions,
            facets,
            appliedFilters: filters,
            searchOptions: options,
            cached: false
        };

        // Cache results for future requests
        await searchCache.cacheSearchResults(query, { filters, options }, response);

        // Track search analytics
        await trackSearchAnalytics(query, filters, options, response, req);

        console.log(`✅ Advanced search completed in ${response.executionTime.toFixed(2)}ms: ${response.totalCount} results`);

        res.json(response);

    } catch (error) {
        console.error('❌ Advanced search failed:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid search request',
                details: error.errors
            });
        }

        res.status(500).json({
            error: 'Search execution failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/v095/search/suggestions
 * Get search suggestions based on query input
 */
router.get('/search/suggestions', async (req: Request, res: Response) => {
    try {
        const { query, limit = 10, type = 'semantic' } = suggestionsRequestSchema.parse(req.query);

        console.log('💡 Getting search suggestions:', { query, type, limit });

        // Check cache first
        const cacheKey = `suggestions:${type}:${query}:${limit}`;
        const cachedSuggestions = await cacheService.get(cacheKey);

        if (cachedSuggestions) {
            return res.json({ suggestions: cachedSuggestions, cached: true });
        }

        let suggestions: string[] = [];

        switch (type) {
            case 'semantic':
                suggestions = await getSemanticSuggestions(query, limit);
                break;
            case 'fuzzy':
                suggestions = await getFuzzySuggestions(query, limit);
                break;
            case 'historical':
                suggestions = await getHistoricalSuggestions(query, limit);
                break;
        }

        // Cache suggestions
        await cacheService.set(cacheKey, suggestions, 300); // 5 minutes

        res.json({ suggestions, cached: false });

    } catch (error) {
        console.error('❌ Failed to get search suggestions:', error);
        res.status(500).json({
            error: 'Failed to get suggestions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/v095/search/save
 * Save a search query for later use
 */
router.post('/search/save', async (req: Request, res: Response) => {
    try {
        const saveRequest = saveSearchSchema.parse(req.body);
        const userId = (req as any).user?.id; // Assuming auth middleware sets user

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        console.log('💾 Saving search:', saveRequest.name);

        // Insert saved search
        const result = await db.execute(sql`
      INSERT INTO saved_searches (user_id, name, description, search_query, search_filters, search_options, is_public, is_favorite)
      VALUES (${userId}, ${saveRequest.name}, ${saveRequest.description || null}, 
              ${saveRequest.searchQuery}, ${JSON.stringify(saveRequest.searchFilters)}, 
              ${JSON.stringify(saveRequest.searchOptions)}, ${saveRequest.isPublic}, ${saveRequest.isFavorite})
    `);

        res.json({
            id: result.insertId,
            message: 'Search saved successfully'
        });

    } catch (error) {
        console.error('❌ Failed to save search:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Invalid save request',
                details: error.errors
            });
        }

        res.status(500).json({
            error: 'Failed to save search',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/v095/search/saved
 * Get user's saved searches
 */
router.get('/search/saved', async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { page = 1, limit = 20, includePublic = false } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        console.log('📋 Getting saved searches for user:', userId);

        let whereClause = sql`user_id = ${userId}`;
        if (includePublic === 'true') {
            whereClause = sql`(user_id = ${userId} OR is_public = true)`;
        }

        const savedSearches = await db.execute(sql`
      SELECT id, name, description, search_query, search_filters, search_options, 
             is_public, is_favorite, usage_count, created_at, updated_at
      FROM saved_searches 
      WHERE ${whereClause}
      ORDER BY is_favorite DESC, updated_at DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `);

        const totalCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM saved_searches WHERE ${whereClause}
    `);

        res.json({
            searches: savedSearches.rows,
            totalCount: (totalCount.rows[0] as any)?.count || 0,
            page: Number(page),
            totalPages: Math.ceil(((totalCount.rows[0] as any)?.count || 0) / Number(limit))
        });

    } catch (error) {
        console.error('❌ Failed to get saved searches:', error);
        res.status(500).json({
            error: 'Failed to get saved searches',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/v095/search/analytics
 * Get search performance analytics
 */
router.get('/search/analytics', async (req: Request, res: Response) => {
    try {
        const { timeRange = '7d' } = req.query;

        console.log('📊 Getting search analytics for range:', timeRange);

        // Check cache
        const cacheKey = `search_analytics:${timeRange}`;
        const cachedAnalytics = await cacheService.get(cacheKey);

        if (cachedAnalytics) {
            return res.json({ ...cachedAnalytics, cached: true });
        }

        const analytics = await generateSearchAnalytics(timeRange as string);

        // Cache analytics for 10 minutes
        await cacheService.set(cacheKey, analytics, 600);

        res.json({ ...analytics, cached: false });

    } catch (error) {
        console.error('❌ Failed to get search analytics:', error);
        res.status(500).json({
            error: 'Failed to get analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * DELETE /api/v095/search/cache
 * Clear search cache (admin only)
 */
router.delete('/search/cache', async (req: Request, res: Response) => {
    try {
        // TODO: Add admin role check
        const userId = (req as any).user?.id;
        const isAdmin = (req as any).user?.role === 'admin';

        if (!userId || !isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        console.log('🧹 Clearing search cache...');

        const deletedCount = await searchCache.invalidateSearchCache();

        res.json({
            message: 'Search cache cleared successfully',
            deletedEntries: deletedCount
        });

    } catch (error) {
        console.error('❌ Failed to clear search cache:', error);
        res.status(500).json({
            error: 'Failed to clear cache',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Helper functions

/**
 * Generate cache key for search results
 */
function generateSearchCacheKey(query: string, filters: any, options: any): string {
    const data = { query, filters, options };
    return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Build advanced search database query
 */
function buildAdvancedSearchQuery(query: string, filters: any, options: any) {
    let whereConditions = [];
    let params = [];

    // Full-text search condition
    if (query.trim()) {
        whereConditions.push(sql`
      (to_tsvector('english', COALESCE(error_message, '') || ' ' || COALESCE(stack_trace, '') || ' ' || COALESCE(error_type, ''))
       @@ plainto_tsquery('english', ${query})
       OR error_message ILIKE ${`%${query}%`}
       OR stack_trace ILIKE ${`%${query}%`}
       OR error_type ILIKE ${`%${query}%`})
    `);
    }

    // Apply filters
    if (filters.severity?.length > 0) {
        whereConditions.push(sql`severity = ANY(${filters.severity})`);
    }

    if (filters.errorType?.length > 0) {
        whereConditions.push(sql`error_type = ANY(${filters.errorType})`);
    }

    if (filters.dateRange) {
        whereConditions.push(sql`created_at >= ${new Date(filters.dateRange.start)}`);
        whereConditions.push(sql`created_at <= ${new Date(filters.dateRange.end)}`);
    }

    if (filters.fileNames?.length > 0) {
        const fileConditions = filters.fileNames.map((fileName: string) =>
            sql`file_name ILIKE ${`%${fileName}%`}`
        );
        whereConditions.push(sql`(${sql.join(fileConditions, sql` OR `)})`);
    }

    if (filters.userId) {
        whereConditions.push(sql`user_id = ${filters.userId}`);
    }

    return {
        whereConditions,
        params
    };
}

/**
 * Execute advanced search query
 */
async function executeAdvancedSearch(dbQuery: any, options: any) {
    const { whereConditions } = dbQuery;

    const whereClause = whereConditions.length > 0
        ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}`
        : sql``;

    const results = await db.execute(sql`
    SELECT 
      id, error_message, stack_trace, error_type, severity, 
      file_name, line_number, user_id, created_at, updated_at,
      resolved, resolution_notes
    FROM error_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ${(options.maxResults || 20) * 2} -- Get more results for relevance scoring
  `);

    return results.rows;
}

/**
 * Calculate relevance scores for search results
 */
function calculateRelevanceScores(results: any[], query: string, options: any) {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);

    return results.map(result => {
        let score = 0;
        const content = `${result.error_message || ''} ${result.stack_trace || ''} ${result.error_type || ''}`.toLowerCase();

        // Exact phrase match (highest score)
        if (content.includes(query.toLowerCase())) {
            score += 10;
        }

        // Individual term matches
        queryTerms.forEach(term => {
            if (content.includes(term)) {
                score += 5;
            }

            // Title matches get higher score
            if ((result.error_message || '').toLowerCase().includes(term)) {
                score += 3;
            }
        });

        // Severity boost
        const severityBoost = {
            critical: 3,
            high: 2,
            medium: 1,
            low: 0
        };
        score += severityBoost[result.severity] || 0;

        // Recent errors get slight boost
        const daysSinceError = (Date.now() - new Date(result.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceError < 7) {
            score += 2;
        } else if (daysSinceError < 30) {
            score += 1;
        }

        return { ...result, relevanceScore: score };
    });
}

/**
 * Apply sorting and pagination to results
 */
function applySortingAndPagination(results: any[], options: any) {
    // Sort results
    const sortedResults = results.sort((a, b) => {
        switch (options.sortBy) {
            case 'relevance':
                return options.sortOrder === 'asc' ? a.relevanceScore - b.relevanceScore : b.relevanceScore - a.relevanceScore;
            case 'date':
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return options.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            case 'severity':
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                const severityA = severityOrder[a.severity] || 0;
                const severityB = severityOrder[b.severity] || 0;
                return options.sortOrder === 'asc' ? severityA - severityB : severityB - severityA;
            default:
                return 0;
        }
    });

    // Apply pagination
    const page = options.page || 1;
    const pageSize = options.maxResults || 20;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
        results: sortedResults.slice(startIndex, endIndex),
        totalCount: sortedResults.length
    };
}

/**
 * Generate search facets for filtering
 */
async function generateSearchFacets(currentFilters: any) {
    // Get severity distribution
    const severityFacets = await db.execute(sql`
    SELECT severity, COUNT(*) as count
    FROM error_logs
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY severity
    ORDER BY count DESC
  `);

    // Get error type distribution
    const errorTypeFacets = await db.execute(sql`
    SELECT error_type, COUNT(*) as count
    FROM error_logs
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY error_type
    ORDER BY count DESC
    LIMIT 10
  `);

    // Get file name distribution
    const fileFacets = await db.execute(sql`
    SELECT file_name, COUNT(*) as count
    FROM error_logs
    WHERE created_at >= NOW() - INTERVAL '30 days'
      AND file_name IS NOT NULL
    GROUP BY file_name
    ORDER BY count DESC
    LIMIT 10
  `);

    return {
        severity: severityFacets.rows,
        errorType: errorTypeFacets.rows,
        fileNames: fileFacets.rows
    };
}

/**
 * Get search suggestions based on query
 */
async function getSearchSuggestions(query: string, limit: number): Promise<string[]> {
    // Get suggestions from historical searches
    const historicalSuggestions = await db.execute(sql`
    SELECT DISTINCT search_query
    FROM search_analytics
    WHERE search_query ILIKE ${`%${query}%`}
      AND results_count > 0
    ORDER BY results_count DESC
    LIMIT ${limit}
  `);

    return historicalSuggestions.rows.map((row: any) => row.search_query);
}

/**
 * Get semantic suggestions (placeholder - would integrate with AI service)
 */
async function getSemanticSuggestions(query: string, limit: number): Promise<string[]> {
    // TODO: Integrate with semantic search service
    return getHistoricalSuggestions(query, limit);
}

/**
 * Get fuzzy suggestions
 */
async function getFuzzySuggestions(query: string, limit: number): Promise<string[]> {
    // Simple fuzzy matching on error messages
    const fuzzySuggestions = await db.execute(sql`
    SELECT DISTINCT error_type
    FROM error_logs
    WHERE similarity(error_type, ${query}) > 0.3
    ORDER BY similarity(error_type, ${query}) DESC
    LIMIT ${limit}
  `);

    return fuzzySuggestions.rows.map((row: any) => row.error_type);
}

/**
 * Get historical suggestions
 */
async function getHistoricalSuggestions(query: string, limit: number): Promise<string[]> {
    const suggestions = await db.execute(sql`
    SELECT search_query, results_count
    FROM search_analytics
    WHERE search_query ILIKE ${`%${query}%`}
      AND results_count > 0
    ORDER BY results_count DESC, created_at DESC
    LIMIT ${limit}
  `);

    return suggestions.rows.map((row: any) => row.search_query);
}

/**
 * Track search analytics
 */
async function trackSearchAnalytics(query: string, filters: any, options: any, response: any, req: Request) {
    try {
        const userId = (req as any).user?.id;

        await db.execute(sql`
      INSERT INTO search_analytics (
        user_id, search_query, search_filters, search_options, 
        results_count, execution_time_ms, created_at
      ) VALUES (
        ${userId || null}, ${query}, ${JSON.stringify(filters)}, 
        ${JSON.stringify(options)}, ${response.totalCount}, 
        ${Math.round(response.executionTime)}, NOW()
      )
    `);
    } catch (error) {
        console.error('❌ Failed to track search analytics:', error);
    }
}

/**
 * Generate search analytics data
 */
async function generateSearchAnalytics(timeRange: string) {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1;

    // Total searches
    const totalSearches = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM search_analytics
    WHERE created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
  `);

    // Average response time
    const avgResponseTime = await db.execute(sql`
    SELECT AVG(execution_time_ms) as avg_time
    FROM search_analytics
    WHERE created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
  `);

    // Popular queries
    const popularQueries = await db.execute(sql`
    SELECT search_query, COUNT(*) as count
    FROM search_analytics
    WHERE created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
    GROUP BY search_query
    ORDER BY count DESC
    LIMIT 10
  `);

    // Search trends by day
    const searchTrends = await db.execute(sql`
    SELECT 
      date_trunc('day', created_at) as date,
      COUNT(*) as searches,
      AVG(execution_time_ms) as avg_time
    FROM search_analytics
    WHERE created_at >= NOW() - INTERVAL '${sql.raw(days.toString())} days'
    GROUP BY date_trunc('day', created_at)
    ORDER BY date DESC
  `);

    return {
        totalSearches: (totalSearches.rows[0] as any)?.count || 0,
        avgResponseTime: Math.round((avgResponseTime.rows[0] as any)?.avg_time || 0),
        popularQueries: popularQueries.rows,
        searchTrends: searchTrends.rows
    };
}

export { router as advancedSearchRouter };