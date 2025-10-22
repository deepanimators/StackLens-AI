import React, { useState, useCallback, useMemo } from 'react';
import { Search, Filter, Settings, BarChart3, FileDown, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AdvancedSearchBar,
  QueryBuilder,
  SavedSearchesManager,
  SearchAnalyticsDashboard,
  EnhancedSearchResults,
  SearchPerformanceInsights
} from '@/components/search';
import type {
  AdvancedQuery,
  SearchResult,
  SavedSearch,
  SearchAnalytics,
  SearchPerformanceMetrics
} from '@/components/search';
import { useAdvancedSearch } from '@/hooks/search/use-advanced-search';

// Mock data for demonstration - in real app this would come from API
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    message: 'Cannot read property "length" of undefined',
    stackTrace: 'TypeError: Cannot read property "length" of undefined\n    at processArray (main.js:42:15)\n    at Object.handler (app.js:123:8)',
    errorType: 'runtime',
    severity: 'critical',
    fileName: 'main.js',
    lineNumber: 42,
    timestamp: new Date('2024-10-22T10:30:00Z'),
    count: 15,
    firstSeen: new Date('2024-10-20T08:15:00Z'),
    lastSeen: new Date('2024-10-22T10:30:00Z'),
    resolved: false,
    tags: ['array-processing', 'null-check'],
    relevanceScore: 0.95,
    contextSnippet: 'The error occurs when processing user input arrays without proper validation',
    highlights: [{
      field: 'message',
      matches: [{ text: 'length', start: 32, end: 38 }]
    }]
  },
  {
    id: '2',
    message: 'Network request failed with status 500',
    errorType: 'network',
    severity: 'high',
    fileName: 'api.js',
    lineNumber: 78,
    timestamp: new Date('2024-10-22T09:45:00Z'),
    count: 8,
    firstSeen: new Date('2024-10-21T14:20:00Z'),
    lastSeen: new Date('2024-10-22T09:45:00Z'),
    resolved: false,
    tags: ['api', 'server-error'],
    relevanceScore: 0.87,
    contextSnippet: 'API endpoint returns 500 when processing large datasets'
  }
];

const mockSavedSearches: SavedSearch[] = [
  {
    id: '1',
    name: 'Critical Runtime Errors',
    description: 'All critical runtime errors from the last 7 days',
    query: {
      groups: [{ 
        id: 'group-1',
        conditions: [
          { id: 'cond-1', field: 'severity', operator: 'equals', value: 'critical' },
          { id: 'cond-2', field: 'errorType', operator: 'equals', value: 'runtime' }
        ]
      }],
      globalOperator: 'AND',
      searchOptions: { enableSemantic: true, enableFuzzy: false, enableRegex: false, caseSensitive: false, wholeWords: false }
    } as AdvancedQuery,
    isPublic: true,
    isFavorite: true,
    tags: ['critical', 'runtime'],
    createdAt: new Date('2024-10-15T00:00:00Z'),
    updatedAt: new Date('2024-10-20T00:00:00Z'),
    executionCount: 25,
    lastExecutedAt: new Date('2024-10-22T08:00:00Z'),
    createdBy: 'user-1'
  }
];

const mockAnalytics: SearchAnalytics = {
  totalSearches: 1250,
  uniqueQueries: 485,
  avgResponseTime: 245,
  successRate: 0.956,
  topQueries: [
    { query: 'network error', count: 89, avgResponseTime: 180, successRate: 0.98, trend: 'up' },
    { query: 'undefined property', count: 76, avgResponseTime: 220, successRate: 0.95, trend: 'stable' },
    { query: 'database connection', count: 65, avgResponseTime: 340, successRate: 0.91, trend: 'down' }
  ],
  searchTypeDistribution: [
    { type: 'semantic', count: 625, percentage: 50 },
    { type: 'fuzzy', count: 375, percentage: 30 },
    { type: 'simple', count: 188, percentage: 15 },
    { type: 'regex', count: 62, percentage: 5 }
  ],
  performanceMetrics: Array.from({ length: 24 }, (_, i) => ({
    date: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
    searches: Math.floor(Math.random() * 100) + 20,
    avgResponseTime: Math.floor(Math.random() * 200) + 150,
    errorRate: Math.random() * 0.1
  })),
  userSearchPatterns: [
    { userId: 'user-1', searchCount: 45, avgSessionLength: 1200, favoriteQueries: ['error logs', 'performance'] },
    { userId: 'user-2', searchCount: 32, avgSessionLength: 800, favoriteQueries: ['network issues'] }
  ],
  errorPatterns: [
    { query: 'timeout error', errorType: 'network_timeout', count: 12, lastOccurrence: '2024-10-22T10:00:00Z' },
    { query: 'null reference', errorType: 'null_pointer', count: 8, lastOccurrence: '2024-10-22T09:30:00Z' }
  ]
};

const mockPerformanceMetrics: SearchPerformanceMetrics = {
  totalSearches: 1250,
  avgResponseTime: 245,
  successRate: 0.956,
  peakSearchTime: '14:00',
  topSearchTerms: [
    { term: 'network error', count: 89, avgResponseTime: 180 },
    { term: 'undefined property', count: 76, avgResponseTime: 220 },
    { term: 'database connection', count: 65, avgResponseTime: 340 }
  ],
  performanceByHour: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    searches: Math.floor(Math.random() * 100) + 20,
    avgResponseTime: Math.floor(Math.random() * 200) + 150,
    errorRate: Math.random() * 0.1
  })),
  slowQueries: [
    { query: 'complex regex pattern', responseTime: 1200, timestamp: new Date() },
    { query: 'large dataset search', responseTime: 890, timestamp: new Date() }
  ],
  errorPatterns: [
    { error: 'timeout_error', count: 12, trend: 'up' },
    { error: 'validation_failed', count: 8, trend: 'stable' }
  ],
  userActivity: [
    { userId: 'user-1', searchCount: 45, avgSessionLength: 1200 },
    { userId: 'user-2', searchCount: 32, avgSessionLength: 800 }
  ]
};

export function IntegratedSearchInterface() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchResults, setSearchResults] = useState<SearchResult[]>(mockSearchResults);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(mockSavedSearches);
  const [currentQuery, setCurrentQuery] = useState<AdvancedQuery | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(mockSearchResults.length);

  const {
    query,
    results,
    search,
    setQuery,
    filters,
    setFilters,
    searchOptions,
    setSearchOptions
  } = useAdvancedSearch({
    autoSearch: false,
    debounceMs: 300
  });

  // Handle search execution from various components
  const handleSearch = useCallback(async (searchQuery?: string, options?: any) => {
    setIsSearching(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In real app, this would be an API call with the search parameters
      setSearchResults(mockSearchResults);
      setTotalResults(mockSearchResults.length);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle query builder execution
  const handleQueryExecution = useCallback(async (query: AdvancedQuery) => {
    setCurrentQuery(query);
    await handleSearch();
    setActiveTab('results'); // Switch to results tab
  }, [handleSearch]);

  // Handle saved search execution
  const handleSavedSearchExecution = useCallback(async (savedSearch: SavedSearch) => {
    setCurrentQuery(savedSearch.query);
    await handleSearch();
    setActiveTab('results'); // Switch to results tab
    
    // Update execution count (in real app, this would be API call)
    setSavedSearches(prev => prev.map(s => 
      s.id === savedSearch.id 
        ? { ...s, executionCount: s.executionCount + 1, lastExecutedAt: new Date() }
        : s
    ));
  }, [handleSearch]);

  // Handle saving new search
  const handleSaveSearch = useCallback((searchData: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecutedAt'>) => {
    const newSearch: SavedSearch = {
      ...searchData,
      id: `search-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0
    };
    
    setSavedSearches(prev => [newSearch, ...prev]);
  }, []);

  // Handle export functionality
  const handleExport = useCallback((format: 'csv' | 'json' | 'pdf') => {
    // In real app, this would trigger actual export
    console.log(`Exporting ${searchResults.length} results as ${format}`);
  }, [searchResults]);

  // Handle result click
  const handleResultClick = useCallback((result: SearchResult) => {
    // In real app, this would navigate to detailed error view
    console.log('Clicked result:', result);
  }, []);

  const pageSize = 20;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Search</h1>
          <p className="text-muted-foreground">
            Comprehensive error search and analytics platform
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Search Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="search" className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Search</span>
          </TabsTrigger>
          <TabsTrigger value="builder" className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Query Builder</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Results</span>
          </TabsTrigger>
          <TabsTrigger value="saved" className="flex items-center space-x-2">
            <Bookmark className="h-4 w-4" />
            <span>Saved Searches</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* Simple Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <AdvancedSearchBar
                onSearch={handleSearch}
                placeholder="Search errors, stack traces, and patterns..."
                showAdvancedOptions={true}
                enableAutoComplete={true}
              />
            </CardContent>
          </Card>
          
          {/* Quick Results Preview */}
          {searchResults.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Quick Results</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('results')}
                  >
                    View All Results
                  </Button>
                </div>
                <div className="space-y-3">
                  {searchResults.slice(0, 3).map((result) => (
                    <div 
                      key={result.id} 
                      className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1">{result.message}</p>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span className={`px-2 py-1 rounded text-xs ${
                              result.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              result.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              result.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {result.severity}
                            </span>
                            <span>{result.errorType}</span>
                            <span>•</span>
                            <span>{result.count}x</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Query Builder Tab */}
        <TabsContent value="builder" className="space-y-6">
          <QueryBuilder
            onQueryChange={setCurrentQuery}
            onExecuteQuery={handleQueryExecution}
            initialQuery={currentQuery}
          />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <EnhancedSearchResults
            results={searchResults}
            isLoading={isSearching}
            totalCount={totalResults}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onResultClick={handleResultClick}
            onExport={handleExport}
            searchQuery={query}
            enableHighlighting={true}
          />
        </TabsContent>

        {/* Saved Searches Tab */}
        <TabsContent value="saved" className="space-y-6">
          <SavedSearchesManager
            searches={savedSearches}
            onSaveSearch={handleSaveSearch}
            onUpdateSearch={(id, updates) => {
              setSavedSearches(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
            }}
            onDeleteSearch={(id) => {
              setSavedSearches(prev => prev.filter(s => s.id !== id));
            }}
            onExecuteSearch={handleSavedSearchExecution}
            currentQuery={currentQuery}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <SearchAnalyticsDashboard
            analytics={mockAnalytics}
            dateRange={{
              start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              end: new Date()
            }}
          />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <SearchPerformanceInsights
            metrics={mockPerformanceMetrics}
            dateRange={{
              start: new Date(Date.now() - 24 * 60 * 60 * 1000),
              end: new Date()
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IntegratedSearchInterface;