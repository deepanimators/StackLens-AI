import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchEngine, searchPluginRegistry } from '@/services/search';
import type {
    SearchQuery,
    SearchResults,
    SearchOptions,
    SearchFilters,
    SearchPerformanceMetrics
} from '@/services/search/types';

export interface UseAdvancedSearchOptions {
    autoSearch?: boolean;
    debounceMs?: number;
    cacheResults?: boolean;
    enableAnalytics?: boolean;
}

export interface UseAdvancedSearchReturn {
    // Search state
    query: string;
    results: SearchResults | null;
    isSearching: boolean;
    error: Error | null;

    // Search controls
    search: (query: string, options?: Partial<SearchOptions>) => Promise<void>;
    clearSearch: () => void;
    setQuery: (query: string) => void;

    // Filters
    filters: SearchFilters;
    setFilters: (filters: SearchFilters) => void;
    clearFilters: () => void;

    // Options
    searchOptions: SearchOptions;
    setSearchOptions: (options: Partial<SearchOptions>) => void;

    // Advanced features
    suggestions: string[];
    getSuggestions: (query: string) => Promise<string[]>;

    // Performance metrics
    metrics: SearchPerformanceMetrics | null;

    // Plugin management
    pluginConfig: { [key: string]: { enabled: boolean; priority: number } };
    updatePluginConfig: (config: { [key: string]: { enabled?: boolean; priority?: number } }) => void;
}

/**
 * Advanced Search Hook - Provides comprehensive search functionality
 */
export function useAdvancedSearch(options: UseAdvancedSearchOptions = {}): UseAdvancedSearchReturn {
    const {
        autoSearch = true,
        debounceMs = 300,
        cacheResults = true,
        enableAnalytics = true
    } = options;

    const queryClient = useQueryClient();

    // Search state
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<SearchFilters>({});
    const [searchOptions, setSearchOptions] = useState<SearchOptions>({
        enableSemantic: true,
        enableFuzzy: true,
        enableRegex: false,
        enableContextual: true,
        maxResults: 20,
        sortBy: 'relevance',
        sortOrder: 'desc',
        highlightMatches: true
    });
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [metrics, setMetrics] = useState<SearchPerformanceMetrics | null>(null);

    // Refs for debouncing
    const debounceTimeout = useRef<NodeJS.Timeout>();
    const searchCounter = useRef(0);

    // Plugin configuration
    const [pluginConfig, setPluginConfig] = useState(() =>
        searchPluginRegistry.getPluginConfig()
    );

    // Query for search results
    const {
        data: results,
        isLoading: isSearching,
        error,
        refetch: executeSearch
    } = useQuery({
        queryKey: ['advanced-search', query, filters, searchOptions],
        queryFn: async (): Promise<SearchResults> => {
            if (!query.trim()) {
                return {
                    results: [],
                    totalCount: 0,
                    executionTime: 0,
                    suggestions: [],
                    appliedFilters: filters,
                    facets: undefined
                };
            }

            const searchQuery: SearchQuery = {
                query: query.trim(),
                filters,
                options: searchOptions,
                metadata: {
                    userId: 'current-user', // TODO: Get from auth context
                    sessionId: 'current-session',
                    timestamp: new Date(),
                    source: 'manual'
                }
            };

            console.log('🔍 Executing advanced search:', searchQuery);

            const startTime = performance.now();
            const searchResults = await searchEngine.search(searchQuery);
            const endTime = performance.now();

            // Track analytics if enabled
            if (enableAnalytics) {
                console.log(`📊 Search completed in ${(endTime - startTime).toFixed(2)}ms:`, {
                    query: query,
                    resultsCount: searchResults.totalCount,
                    executionTime: endTime - startTime
                });
            }

            // Update performance metrics
            const performanceMetrics = searchEngine.getSearchMetrics();
            setMetrics(performanceMetrics);

            return searchResults;
        },
        enabled: !!query.trim() && autoSearch,
        staleTime: cacheResults ? 30000 : 0, // 30 seconds cache
        gcTime: cacheResults ? 5 * 60 * 1000 : 0 // 5 minutes garbage collection
    });

    // Manual search function
    const search = useCallback(async (searchQuery: string, options?: Partial<SearchOptions>) => {
        // Update search options if provided
        if (options) {
            setSearchOptions(prev => ({ ...prev, ...options }));
        }

        // Set query and trigger search
        setQuery(searchQuery);

        // If autoSearch is disabled, manually trigger the search
        if (!autoSearch) {
            await executeSearch();
        }
    }, [autoSearch, executeSearch]);

    // Debounced search for auto-search mode
    useEffect(() => {
        if (!autoSearch || !query.trim()) return;

        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        debounceTimeout.current = setTimeout(() => {
            executeSearch();
        }, debounceMs);

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [query, filters, searchOptions, autoSearch, debounceMs, executeSearch]);

    // Get search suggestions
    const getSuggestions = useCallback(async (suggestionQuery: string): Promise<string[]> => {
        if (suggestionQuery.length < 2) {
            setSuggestions([]);
            return [];
        }

        try {
            // Get suggestions from search engine
            const searchQuery: SearchQuery = {
                query: suggestionQuery,
                filters: {},
                options: searchOptions
            };

            // This is a bit of a hack - we'll need to implement a dedicated suggestion method
            // For now, we'll use the existing search and extract suggestions
            const mockResults = await searchEngine.search({
                ...searchQuery,
                options: { ...searchOptions, maxResults: 5 }
            });

            const newSuggestions = mockResults.suggestions || [];
            setSuggestions(newSuggestions);
            return newSuggestions;
        } catch (error) {
            console.error('❌ Failed to get search suggestions:', error);
            setSuggestions([]);
            return [];
        }
    }, [searchOptions]);

    // Clear search
    const clearSearch = useCallback(() => {
        setQuery('');
        setSuggestions([]);
        queryClient.removeQueries({ queryKey: ['advanced-search'] });
    }, [queryClient]);

    // Clear filters
    const clearFilters = useCallback(() => {
        setFilters({});
    }, []);

    // Update plugin configuration
    const updatePluginConfig = useCallback((config: { [key: string]: { enabled?: boolean; priority?: number } }) => {
        searchPluginRegistry.updatePluginConfig(config);
        setPluginConfig(searchPluginRegistry.getPluginConfig());

        // Clear cache to force re-search with new plugin config
        queryClient.removeQueries({ queryKey: ['advanced-search'] });
    }, [queryClient]);

    // Update search options helper
    const updateSearchOptions = useCallback((options: Partial<SearchOptions>) => {
        setSearchOptions(prev => ({ ...prev, ...options }));
    }, []);

    return {
        // Search state
        query,
        results: results || null,
        isSearching,
        error: error as Error | null,

        // Search controls
        search,
        clearSearch,
        setQuery,

        // Filters
        filters,
        setFilters,
        clearFilters,

        // Options
        searchOptions,
        setSearchOptions: updateSearchOptions,

        // Advanced features
        suggestions,
        getSuggestions,

        // Performance metrics
        metrics,

        // Plugin management
        pluginConfig,
        updatePluginConfig
    };
}

/**
 * Simple search hook for basic use cases
 */
export function useSimpleSearch(initialQuery = '', initialOptions?: Partial<SearchOptions>) {
    const {
        query,
        results,
        isSearching,
        error,
        search,
        clearSearch,
        setQuery
    } = useAdvancedSearch({
        autoSearch: true,
        debounceMs: 300
    });

    // Initialize with provided options
    useEffect(() => {
        if (initialOptions) {
            // This will need to be implemented when we have setSearchOptions exposed
        }
    }, [initialOptions]);

    // Initialize with initial query
    useEffect(() => {
        if (initialQuery) {
            setQuery(initialQuery);
        }
    }, [initialQuery, setQuery]);

    return {
        query,
        results: results?.results || [],
        totalCount: results?.totalCount || 0,
        isSearching,
        error,
        search,
        clearSearch,
        setQuery
    };
}

/**
 * Search analytics hook for monitoring search performance
 */
export function useSearchAnalytics() {
    const [analytics, setAnalytics] = useState({
        totalSearches: 0,
        averageResponseTime: 0,
        popularQueries: [] as string[],
        pluginPerformance: {} as { [key: string]: number }
    });

    const updateAnalytics = useCallback((searchData: {
        query: string;
        responseTime: number;
        resultsCount: number;
    }) => {
        setAnalytics(prev => ({
            ...prev,
            totalSearches: prev.totalSearches + 1,
            averageResponseTime: (prev.averageResponseTime * prev.totalSearches + searchData.responseTime) / (prev.totalSearches + 1)
        }));
    }, []);

    const getSearchMetrics = useCallback(() => {
        return searchEngine.getSearchMetrics();
    }, []);

    const getPluginStatus = useCallback(() => {
        return searchEngine.getPluginStatus();
    }, []);

    return {
        analytics,
        updateAnalytics,
        getSearchMetrics,
        getPluginStatus
    };
}