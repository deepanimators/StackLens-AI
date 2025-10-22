import { authenticatedRequest } from '@/lib/auth';

// Core search interfaces and types
export interface SearchQuery {
    query: string;
    filters: SearchFilters;
    options: SearchOptions;
    metadata?: SearchMetadata;
}

export interface SearchFilters {
    severity?: string[];
    errorType?: string[];
    dateRange?: DateRange;
    fileNames?: string[];
    tags?: string[];
    customFilters?: CustomFilter[];
}

export interface SearchOptions {
    enableSemantic?: boolean;
    enableFuzzy?: boolean;
    enableRegex?: boolean;
    enableContextual?: boolean;
    maxResults?: number;
    sortBy?: SortField;
    sortOrder?: 'asc' | 'desc';
    highlightMatches?: boolean;
}

export interface SearchMetadata {
    userId?: string;
    sessionId?: string;
    timestamp?: Date;
    source?: 'manual' | 'suggestion' | 'saved';
}

export interface DateRange {
    start: Date;
    end: Date;
}

export interface CustomFilter {
    field: string;
    operator: FilterOperator;
    value: any;
}

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'between' | 'in' | 'notIn';
export type SortField = 'relevance' | 'date' | 'severity' | 'errorType' | 'fileName';

export interface SearchResult {
    id: string;
    title: string;
    content: string;
    metadata: ResultMetadata;
    highlights?: SearchHighlight[];
    relevanceScore?: number;
}

export interface ResultMetadata {
    errorType: string;
    severity: string;
    fileName: string;
    lineNumber?: number;
    timestamp: Date;
    tags?: string[];
}

export interface SearchHighlight {
    field: string;
    fragments: string[];
}

export interface SearchResults {
    results: SearchResult[];
    totalCount: number;
    executionTime: number;
    suggestions?: string[];
    appliedFilters: SearchFilters;
    facets?: SearchFacets;
}

export interface SearchFacets {
    severity: FacetCount[];
    errorType: FacetCount[];
    fileNames: FacetCount[];
    timeRanges: FacetCount[];
}

export interface FacetCount {
    value: string;
    count: number;
}

// Performance metrics for search operations
export interface SearchPerformanceMetrics {
    queryExecutionTime: number;
    indexLookupTime: number;
    facetCalculationTime: number;
    resultSerializationTime: number;
    totalTime: number;
    cacheHit: boolean;
}

// Search plugin interface
export interface SearchPlugin {
    name: string;
    enabled: boolean;
    priority: number;
    search(query: SearchQuery): Promise<SearchResult[]>;
    getSuggestions?(query: string): Promise<string[]>;
    supportsQuery?(query: SearchQuery): boolean;
}

// Advanced search configuration
export interface SearchEngineConfig {
    enableSemantic: boolean;
    enableFuzzy: boolean;
    enableRegex: boolean;
    enableCaching: boolean;
    cacheTimeout: number;
    maxResults: number;
    performanceTracking: boolean;
    plugins: SearchPlugin[];
}

// Search analytics and tracking
export interface SearchAnalytics {
    query: string;
    resultsCount: number;
    executionTime: number;
    userClicks: number[];
    timestamp: Date;
    userId?: string;
}

// All types are already exported above with individual export statements