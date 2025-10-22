import { authenticatedRequest } from '@/lib/auth';
import type { SearchPlugin, SearchQuery, SearchResult } from '../types';

/**
 * Semantic Search Plugin - Integrates with existing semantic search API
 * Leverages the current microservices semantic search endpoint
 */
export class SemanticSearchPlugin implements SearchPlugin {
    name = 'semantic';
    enabled = true;
    priority = 10; // Highest priority for semantic search

    constructor(private config: { apiEndpoint?: string } = {}) {
        this.config.apiEndpoint = this.config.apiEndpoint || '/api/microservices/semantic-search';
    }

    async search(query: SearchQuery): Promise<SearchResult[]> {
        if (!query.options.enableSemantic) {
            return [];
        }

        try {
            console.log('🧠 Executing semantic search for:', query.query);

            // Use existing semantic search API
            const response = await authenticatedRequest('POST', this.config.apiEndpoint!, {
                query: query.query,
                limit: query.options.maxResults || 20,
                threshold: 0.7, // Semantic similarity threshold
                filters: this.mapFiltersToAPI(query.filters)
            });

            if (!response.ok) {
                throw new Error(`Semantic search API error: ${response.status}`);
            }

            const apiResults = await response.json();
            return this.mapAPIResultsToSearchResults(apiResults.results || []);

        } catch (error) {
            console.error('❌ Semantic search failed:', error);

            // Fallback to keyword search if semantic fails
            return this.performFallbackSearch(query);
        }
    }

    async getSuggestions(query: string): Promise<string[]> {
        if (query.length < 3) return [];

        try {
            // Get semantic suggestions from existing API
            const response = await authenticatedRequest('POST', '/api/microservices/suggestions', {
                query,
                type: 'semantic',
                limit: 5
            });

            if (response.ok) {
                const data = await response.json();
                return data.suggestions || [];
            }

            return [];
        } catch (error) {
            console.warn('⚠️ Semantic suggestions failed:', error);
            return [];
        }
    }

    supportsQuery(query: SearchQuery): boolean {
        // Semantic search works best with natural language queries
        return query.options.enableSemantic !== false && query.query.length >= 3;
    }

    /**
     * Map search filters to API format
     */
    private mapFiltersToAPI(filters: any): any {
        const apiFilters: any = {};

        if (filters.severity?.length > 0) {
            apiFilters.severity = filters.severity;
        }

        if (filters.errorType?.length > 0) {
            apiFilters.error_types = filters.errorType;
        }

        if (filters.dateRange) {
            apiFilters.date_range = {
                start: filters.dateRange.start.toISOString(),
                end: filters.dateRange.end.toISOString()
            };
        }

        if (filters.fileNames?.length > 0) {
            apiFilters.file_names = filters.fileNames;
        }

        return apiFilters;
    }

    /**
     * Map API results to SearchResult format
     */
    private mapAPIResultsToSearchResults(apiResults: any[]): SearchResult[] {
        return apiResults.map((result, index) => ({
            id: result.id || `semantic-${index}`,
            title: result.title || result.error_message || 'Semantic Match',
            content: result.content || result.stack_trace || result.description || '',
            metadata: {
                errorType: result.error_type || 'unknown',
                severity: result.severity || 'medium',
                fileName: result.file_name || result.filename || 'unknown',
                lineNumber: result.line_number,
                timestamp: new Date(result.timestamp || result.created_at || Date.now()),
                tags: result.tags || []
            },
            relevanceScore: result.similarity_score || result.confidence || 0.5
        }));
    }

    /**
     * Fallback search when semantic search fails
     */
    private async performFallbackSearch(query: SearchQuery): Promise<SearchResult[]> {
        try {
            // Use existing all-errors endpoint as fallback
            const response = await authenticatedRequest('GET', '/api/errors', {
                search: query.query,
                limit: query.options.maxResults || 10,
                ...this.mapFiltersToQueryParams(query.filters)
            });

            if (response.ok) {
                const data = await response.json();
                return this.mapErrorsToSearchResults(data.errors || []);
            }

            return [];
        } catch (error) {
            console.error('❌ Fallback search also failed:', error);
            return [];
        }
    }

    /**
     * Map filters to query parameters for fallback API
     */
    private mapFiltersToQueryParams(filters: any): any {
        const params: any = {};

        if (filters.severity?.length > 0) {
            params.severity = filters.severity.join(',');
        }

        if (filters.errorType?.length > 0) {
            params.errorType = filters.errorType.join(',');
        }

        if (filters.dateRange) {
            params.startDate = filters.dateRange.start.toISOString();
            params.endDate = filters.dateRange.end.toISOString();
        }

        return params;
    }

    /**
     * Map error records to search results
     */
    private mapErrorsToSearchResults(errors: any[]): SearchResult[] {
        return errors.map(error => ({
            id: error.id.toString(),
            title: error.errorMessage || error.message || 'Error',
            content: error.stackTrace || error.content || '',
            metadata: {
                errorType: error.errorType || 'runtime',
                severity: error.severity || 'medium',
                fileName: error.fileName || 'unknown',
                lineNumber: error.lineNumber,
                timestamp: new Date(error.createdAt || error.timestamp),
                tags: []
            },
            relevanceScore: 0.3 // Lower score for fallback results
        }));
    }
}

// Export the plugin instance
export const semanticSearchPlugin = new SemanticSearchPlugin();