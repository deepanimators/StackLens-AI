import { authenticatedRequest } from '@/lib/auth';
import type {
    SearchQuery,
    SearchResults,
    SearchEngineConfig,
    SearchPlugin,
    SearchPerformanceMetrics,
    SearchAnalytics
} from './types';

// Core Advanced Search Engine Implementation
export class AdvancedSearchEngine {
    private config: SearchEngineConfig;
    private plugins: Map<string, SearchPlugin> = new Map();
    private cache: Map<string, { results: SearchResults; timestamp: number }> = new Map();
    private analytics: SearchAnalytics[] = [];

    constructor(config: SearchEngineConfig) {
        this.config = config;
        this.initializePlugins();
    }

    /**
     * Initialize search plugins based on configuration
     */
    private initializePlugins(): void {
        this.config.plugins
            .filter(plugin => plugin.enabled)
            .sort((a, b) => b.priority - a.priority)
            .forEach(plugin => {
                this.plugins.set(plugin.name, plugin);
            });

        console.log(`🔍 Initialized ${this.plugins.size} search plugins:`,
            Array.from(this.plugins.keys()));
    }

    /**
     * Execute advanced search across all enabled plugins
     */
    async search(query: SearchQuery): Promise<SearchResults> {
        const startTime = performance.now();
        const cacheKey = this.generateCacheKey(query);

        // Check cache first if enabled
        if (this.config.enableCaching) {
            const cachedResult = this.getCachedResult(cacheKey);
            if (cachedResult) {
                console.log('🎯 Search cache hit for query:', query.query);
                return cachedResult;
            }
        }

        try {
            // Execute search across all applicable plugins
            const searchPromises = Array.from(this.plugins.values())
                .filter(plugin => !plugin.supportsQuery || plugin.supportsQuery(query))
                .map(plugin => this.executePluginSearch(plugin, query));

            const pluginResults = await Promise.allSettled(searchPromises);

            // Combine and rank results
            const combinedResults = this.combinePluginResults(pluginResults, query);
            const rankedResults = this.rankResults(combinedResults, query);

            // Apply post-processing
            const finalResults = this.postProcessResults(rankedResults, query);

            // Generate facets
            const facets = this.generateFacets(finalResults);

            // Get suggestions
            const suggestions = await this.getSuggestions(query.query);

            const searchResults: SearchResults = {
                results: finalResults.slice(0, query.options.maxResults || this.config.maxResults),
                totalCount: finalResults.length,
                executionTime: performance.now() - startTime,
                suggestions,
                appliedFilters: query.filters,
                facets
            };

            // Cache results if enabled
            if (this.config.enableCaching) {
                this.setCachedResult(cacheKey, searchResults);
            }

            // Track analytics
            this.trackSearchAnalytics(query, searchResults);

            console.log(`🔍 Search completed in ${searchResults.executionTime.toFixed(2)}ms:`,
                `${searchResults.results.length}/${searchResults.totalCount} results`);

            return searchResults;

        } catch (error) {
            console.error('❌ Search execution failed:', error);
            throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Execute search on a specific plugin with error handling
     */
    private async executePluginSearch(plugin: SearchPlugin, query: SearchQuery): Promise<any> {
        const pluginStartTime = performance.now();

        try {
            const results = await plugin.search(query);
            const executionTime = performance.now() - pluginStartTime;

            console.log(`🔌 Plugin ${plugin.name} returned ${results.length} results in ${executionTime.toFixed(2)}ms`);

            return {
                status: 'fulfilled',
                value: { plugin: plugin.name, results, executionTime }
            };
        } catch (error) {
            console.warn(`⚠️ Plugin ${plugin.name} search failed:`, error);
            return {
                status: 'rejected',
                reason: error
            };
        }
    }

    /**
     * Combine results from multiple plugins
     */
    private combinePluginResults(pluginResults: any[], query: SearchQuery): any[] {
        const combined: any[] = [];

        pluginResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value.results) {
                combined.push(...result.value.results);
            }
        });

        // Remove duplicates based on ID
        const uniqueResults = new Map();
        combined.forEach(result => {
            if (!uniqueResults.has(result.id)) {
                uniqueResults.set(result.id, result);
            }
        });

        return Array.from(uniqueResults.values());
    }

    /**
     * Rank and score results based on relevance
     */
    private rankResults(results: any[], query: SearchQuery): any[] {
        return results
            .map(result => ({
                ...result,
                relevanceScore: this.calculateRelevanceScore(result, query)
            }))
            .sort((a, b) => {
                // Sort by relevance score, then by date
                if (query.options.sortBy === 'relevance' || !query.options.sortBy) {
                    return b.relevanceScore - a.relevanceScore;
                }

                if (query.options.sortBy === 'date') {
                    const dateA = new Date(a.metadata.timestamp).getTime();
                    const dateB = new Date(b.metadata.timestamp).getTime();
                    return query.options.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                }

                return 0;
            });
    }

    /**
     * Calculate relevance score for a result
     */
    private calculateRelevanceScore(result: any, query: SearchQuery): number {
        let score = 0;
        const queryTerms = query.query.toLowerCase().split(/\s+/);
        const content = `${result.title} ${result.content}`.toLowerCase();

        // Exact phrase match (highest score)
        if (content.includes(query.query.toLowerCase())) {
            score += 10;
        }

        // Individual term matches
        queryTerms.forEach(term => {
            if (content.includes(term)) {
                score += 5;
            }

            // Title matches get higher score
            if (result.title.toLowerCase().includes(term)) {
                score += 3;
            }
        });

        // Severity boost for important errors
        if (result.metadata.severity === 'critical') {
            score += 2;
        } else if (result.metadata.severity === 'high') {
            score += 1;
        }

        // Recent errors get slight boost
        const daysSinceError = (Date.now() - new Date(result.metadata.timestamp).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceError < 7) {
            score += 1;
        }

        return score;
    }

    /**
     * Post-process results (highlighting, filtering, etc.)
     */
    private postProcessResults(results: any[], query: SearchQuery): any[] {
        if (query.options.highlightMatches) {
            return results.map(result => ({
                ...result,
                highlights: this.generateHighlights(result, query.query)
            }));
        }

        return results;
    }

    /**
     * Generate search highlights for result content
     */
    private generateHighlights(result: any, query: string): any[] {
        const highlights = [];
        const queryTerms = query.toLowerCase().split(/\s+/);

        // Highlight matches in title
        let highlightedTitle = result.title;
        queryTerms.forEach(term => {
            const regex = new RegExp(`(${term})`, 'gi');
            highlightedTitle = highlightedTitle.replace(regex, '<mark>$1</mark>');
        });

        if (highlightedTitle !== result.title) {
            highlights.push({
                field: 'title',
                fragments: [highlightedTitle]
            });
        }

        // Highlight matches in content (first 200 chars around match)
        queryTerms.forEach(term => {
            const regex = new RegExp(`(.{0,100}${term}.{0,100})`, 'gi');
            const matches = result.content.match(regex);
            if (matches) {
                highlights.push({
                    field: 'content',
                    fragments: matches.slice(0, 3).map((match: string) =>
                        match.replace(new RegExp(`(${term})`, 'gi'), '<mark>$1</mark>')
                    )
                });
            }
        });

        return highlights;
    }

    /**
     * Generate search facets for filtering
     */
    private generateFacets(results: any[]): any {
        const facets = {
            severity: this.generateFacetCounts(results, 'metadata.severity'),
            errorType: this.generateFacetCounts(results, 'metadata.errorType'),
            fileNames: this.generateFacetCounts(results, 'metadata.fileName'),
            timeRanges: this.generateTimeRangeFacets(results)
        };

        return facets;
    }

    /**
     * Generate facet counts for a specific field
     */
    private generateFacetCounts(results: any[], field: string): any[] {
        const counts = new Map();

        results.forEach(result => {
            const value = this.getNestedProperty(result, field);
            if (value) {
                counts.set(value, (counts.get(value) || 0) + 1);
            }
        });

        return Array.from(counts.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Generate time range facets
     */
    private generateTimeRangeFacets(results: any[]): any[] {
        const now = new Date();
        const ranges = [
            { label: 'Last hour', hours: 1 },
            { label: 'Last 24 hours', hours: 24 },
            { label: 'Last 7 days', hours: 24 * 7 },
            { label: 'Last 30 days', hours: 24 * 30 }
        ];

        return ranges.map(range => {
            const cutoff = new Date(now.getTime() - range.hours * 60 * 60 * 1000);
            const count = results.filter(result =>
                new Date(result.metadata.timestamp) >= cutoff
            ).length;

            return { value: range.label, count };
        });
    }

    /**
     * Get suggestions for query autocomplete
     */
    private async getSuggestions(query: string): Promise<string[]> {
        const suggestions = new Set<string>();

        // Get suggestions from plugins
        for (const plugin of Array.from(this.plugins.values())) {
            if (plugin.getSuggestions) {
                try {
                    const pluginSuggestions = await plugin.getSuggestions(query);
                    pluginSuggestions.forEach((s: string) => suggestions.add(s));
                } catch (error) {
                    console.warn(`Plugin ${plugin.name} suggestion generation failed:`, error);
                }
            }
        }

        // Add historical search suggestions
        const historicalSuggestions = this.getHistoricalSuggestions(query);
        historicalSuggestions.forEach(s => suggestions.add(s));

        return Array.from(suggestions).slice(0, 10);
    }

    /**
     * Get historical suggestions based on previous searches
     */
    private getHistoricalSuggestions(query: string): string[] {
        return this.analytics
            .filter(search => search.query.includes(query.toLowerCase()) && search.resultsCount > 0)
            .sort((a, b) => b.userClicks.length - a.userClicks.length)
            .map(search => search.query)
            .slice(0, 5);
    }

    /**
     * Cache management
     */
    private generateCacheKey(query: SearchQuery): string {
        return btoa(JSON.stringify({
            query: query.query,
            filters: query.filters,
            options: query.options
        }));
    }

    private getCachedResult(key: string): SearchResults | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
            return cached.results;
        }
        return null;
    }

    private setCachedResult(key: string, results: SearchResults): void {
        this.cache.set(key, { results, timestamp: Date.now() });

        // Clean old cache entries
        if (this.cache.size > 100) {
            const oldestKey = Array.from(this.cache.keys())[0];
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Analytics tracking
     */
    private trackSearchAnalytics(query: SearchQuery, results: SearchResults): void {
        if (!this.config.performanceTracking) return;

        this.analytics.push({
            query: query.query,
            resultsCount: results.totalCount,
            executionTime: results.executionTime,
            userClicks: [],
            timestamp: new Date(),
            userId: query.metadata?.userId
        });

        // Keep only last 1000 searches
        if (this.analytics.length > 1000) {
            this.analytics = this.analytics.slice(-1000);
        }
    }

    /**
     * Utility functions
     */
    private getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Public API methods
     */
    public getSearchMetrics(): SearchPerformanceMetrics {
        const recentSearches = this.analytics.slice(-10);
        const avgExecutionTime = recentSearches.reduce((sum, s) => sum + s.executionTime, 0) / recentSearches.length;

        return {
            queryExecutionTime: avgExecutionTime,
            indexLookupTime: 0, // TODO: Implement detailed timing
            facetCalculationTime: 0,
            resultSerializationTime: 0,
            totalTime: avgExecutionTime,
            cacheHit: false
        };
    }

    public clearCache(): void {
        this.cache.clear();
        console.log('🧹 Search cache cleared');
    }

    public getPluginStatus(): Array<{ name: string; enabled: boolean; priority: number }> {
        return Array.from(this.plugins.values()).map(plugin => ({
            name: plugin.name,
            enabled: plugin.enabled,
            priority: plugin.priority
        }));
    }
}

// Export singleton instance factory
let searchEngineInstance: AdvancedSearchEngine | null = null;

export function getSearchEngine(config?: SearchEngineConfig): AdvancedSearchEngine {
    if (!searchEngineInstance || config) {
        const defaultConfig: SearchEngineConfig = {
            enableSemantic: true,
            enableFuzzy: true,
            enableRegex: false,
            enableCaching: true,
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            maxResults: 50,
            performanceTracking: true,
            plugins: [] // Will be populated by plugin system
        };

        searchEngineInstance = new AdvancedSearchEngine(config || defaultConfig);
    }

    return searchEngineInstance;
}