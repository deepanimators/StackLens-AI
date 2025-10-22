import React, { useState, useMemo, useCallback } from 'react';
import { 
  Download, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid, 
  List, 
  Search,
  Eye,
  ExternalLink,
  Clock,
  AlertTriangle,
  Code,
  Copy,
  BookmarkPlus,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface SearchResult {
  id: string;
  message: string;
  stackTrace?: string;
  errorType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  fileName?: string;
  lineNumber?: number;
  timestamp: Date;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  tags: string[];
  metadata?: Record<string, any>;
  highlights?: {
    field: string;
    matches: Array<{
      text: string;
      start: number;
      end: number;
    }>;
  }[];
  relevanceScore?: number;
  contextSnippet?: string;
}

export interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onResultClick?: (result: SearchResult) => void;
  onExport?: (format: 'csv' | 'json' | 'pdf') => void;
  searchQuery?: string;
  className?: string;
  enableHighlighting?: boolean;
  enableVirtualization?: boolean;
}

type ViewMode = 'grid' | 'list' | 'compact';
type SortField = 'relevance' | 'timestamp' | 'severity' | 'count' | 'lastSeen';
type SortOrder = 'asc' | 'desc';

interface FilterState {
  severity: string[];
  errorType: string[];
  resolved: boolean | null;
  dateRange: { start?: Date; end?: Date };
  tags: string[];
}

export function EnhancedSearchResults({
  results,
  isLoading = false,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onResultClick,
  onExport,
  searchQuery = '',
  className,
  enableHighlighting = true,
  enableVirtualization = false
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortField, setSortField] = useState<SortField>('relevance');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<FilterState>({
    severity: [],
    errorType: [],
    resolved: null,
    dateRange: {},
    tags: []
  });
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [quickFilter, setQuickFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  // Memoized filtered and sorted results
  const processedResults = useMemo(() => {
    let filtered = results.filter(result => {
      // Quick text filter
      if (quickFilter) {
        const searchText = quickFilter.toLowerCase();
        const matchesText = 
          result.message.toLowerCase().includes(searchText) ||
          result.errorType.toLowerCase().includes(searchText) ||
          result.fileName?.toLowerCase().includes(searchText) ||
          result.tags.some(tag => tag.toLowerCase().includes(searchText));
        if (!matchesText) return false;
      }

      // Severity filter
      if (filters.severity.length > 0 && !filters.severity.includes(result.severity)) {
        return false;
      }

      // Error type filter
      if (filters.errorType.length > 0 && !filters.errorType.includes(result.errorType)) {
        return false;
      }

      // Resolved filter
      if (filters.resolved !== null && result.resolved !== filters.resolved) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.start && new Date(result.timestamp) < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end && new Date(result.timestamp) > filters.dateRange.end) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => result.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'relevance':
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
          break;
        case 'timestamp':
          comparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          break;
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = severityOrder[b.severity] - severityOrder[a.severity];
          break;
        case 'count':
          comparison = b.count - a.count;
          break;
        case 'lastSeen':
          comparison = new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });

    return filtered;
  }, [results, quickFilter, filters, sortField, sortOrder]);

  // Get available filter options from results
  const availableFilters = useMemo(() => {
    const severities = Array.from(new Set(results.map(r => r.severity)));
    const errorTypes = Array.from(new Set(results.map(r => r.errorType)));
    const tags = Array.from(new Set(results.flatMap(r => r.tags)));
    
    return { severities, errorTypes, tags };
  }, [results]);

  // Handle result selection
  const toggleResultSelection = useCallback((id: string) => {
    const newSelection = new Set(selectedResults);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedResults(newSelection);
  }, [selectedResults]);

  const selectAllResults = useCallback(() => {
    if (selectedResults.size === processedResults.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(processedResults.map(r => r.id)));
    }
  }, [selectedResults.size, processedResults]);

  // Handle export
  const handleExport = useCallback((format: 'csv' | 'json' | 'pdf') => {
    const resultsToExport = selectedResults.size > 0 
      ? processedResults.filter(r => selectedResults.has(r.id))
      : processedResults;
    
    onExport?.(format);
    toast({
      title: "Export Started",
      description: `Exporting ${resultsToExport.length} results as ${format.toUpperCase()}`
    });
  }, [selectedResults, processedResults, onExport, toast]);

  // Handle bulk actions
  const handleBulkAction = useCallback((action: 'resolve' | 'tag' | 'delete') => {
    const selectedIds = Array.from(selectedResults);
    toast({
      title: "Bulk Action",
      description: `Applied ${action} to ${selectedIds.length} results`
    });
    setSelectedResults(new Set());
  }, [selectedResults, toast]);

  // Highlight text matches
  const highlightText = useCallback((text: string, highlights?: SearchResult['highlights'], fieldName?: string) => {
    if (!enableHighlighting || !highlights || !searchQuery) {
      return <span>{text}</span>;
    }

    const fieldHighlights = highlights.find(h => h.field === fieldName);
    if (!fieldHighlights) {
      return <span>{text}</span>;
    }

    let lastIndex = 0;
    const elements: React.ReactNode[] = [];

    fieldHighlights.matches.forEach((match, index) => {
      // Add text before highlight
      if (match.start > lastIndex) {
        elements.push(text.substring(lastIndex, match.start));
      }

      // Add highlighted text
      elements.push(
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {match.text}
        </mark>
      );

      lastIndex = match.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return <span>{elements}</span>;
  }, [enableHighlighting, searchQuery]);

  // Format date
  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }, []);

  // Get severity color
  const getSeverityColor = useCallback((severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
      high: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
      low: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  }, []);

  // Render result card
  const renderResultCard = useCallback((result: SearchResult, index: number) => {
    const isSelected = selectedResults.has(result.id);
    
    return (
      <Card 
        key={result.id}
        className={cn(
          "transition-all duration-200 hover:shadow-md cursor-pointer",
          isSelected && "ring-2 ring-primary ring-offset-2",
          viewMode === 'compact' && "py-2"
        )}
        onClick={() => onResultClick?.(result)}
      >
        <CardHeader className={cn("pb-3", viewMode === 'compact' && "py-2")}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              {/* Selection checkbox */}
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleResultSelection(result.id);
                }}
                className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={getSeverityColor(result.severity)}>
                    {result.severity}
                  </Badge>
                  <Badge variant="outline">{result.errorType}</Badge>
                  {result.resolved && (
                    <Badge variant="secondary">Resolved</Badge>
                  )}
                  {result.count > 1 && (
                    <Badge variant="outline">{result.count}x</Badge>
                  )}
                </div>
                
                <CardTitle className={cn(
                  "text-base leading-snug mb-2",
                  viewMode === 'compact' && "text-sm"
                )}>
                  {highlightText(result.message, result.highlights, 'message')}
                </CardTitle>
                
                {viewMode !== 'compact' && result.contextSnippet && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {highlightText(result.contextSnippet, result.highlights, 'contextSnippet')}
                  </p>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  {result.fileName && (
                    <div className="flex items-center">
                      <Code className="h-3 w-3 mr-1" />
                      <span>{result.fileName}</span>
                      {result.lineNumber && <span>:{result.lineNumber}</span>}
                    </div>
                  )}
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{formatDate(result.timestamp)}</span>
                  </div>
                  {result.relevanceScore && (
                    <div>
                      Score: {(result.relevanceScore * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-1 ml-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="space-y-1">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <BookmarkPlus className="h-4 w-4 mr-2" />
                      Add to Saved
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Tags */}
          {result.tags.length > 0 && viewMode !== 'compact' && (
            <div className="flex flex-wrap gap-1 mt-2">
              {result.tags.slice(0, 5).map((tag, tagIndex) => (
                <Badge key={tagIndex} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {result.tags.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{result.tags.length - 5} more
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        
        {/* Stack trace preview for expanded view */}
        {viewMode === 'list' && result.stackTrace && (
          <CardContent className="pt-0">
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                View Stack Trace
              </summary>
              <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto max-h-32">
                {highlightText(result.stackTrace.slice(0, 500), result.highlights, 'stackTrace')}
                {result.stackTrace.length > 500 && '...'}
              </pre>
            </details>
          </CardContent>
        )}
      </Card>
    );
  }, [
    selectedResults, 
    viewMode, 
    onResultClick, 
    toggleResultSelection, 
    getSeverityColor,
    highlightText,
    formatDate
  ]);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-muted-foreground">Searching...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Results toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {processedResults.length.toLocaleString()} of {totalCount.toLocaleString()} results
                {selectedResults.size > 0 && (
                  <span className="ml-2">
                    • {selectedResults.size} selected
                  </span>
                )}
              </div>
              
              {/* Quick filter */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Quick filter..."
                  value={quickFilter}
                  onChange={(e) => setQuickFilter(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Bulk actions */}
              {selectedResults.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('resolve')}
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('tag')}
                  >
                    Add Tags
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                </>
              )}
              
              {/* Export */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48" align="end">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleExport('csv')}
                    >
                      Export as CSV
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleExport('json')}
                    >
                      Export as JSON
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleExport('pdf')}
                    >
                      Export as PDF
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Filters toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-muted" : ""}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
              
              {/* View mode */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'compact' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('compact')}
                  className="rounded-r-none border-r"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-none border-r"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-l-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Sort and select controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedResults.size === processedResults.length && processedResults.length > 0}
                  onChange={selectAllResults}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label className="text-sm">Select all</Label>
              </div>
              
              <Separator orientation="vertical" className="h-4" />
              
              <div className="flex items-center space-x-2">
                <Label className="text-sm">Sort by:</Label>
                <Select value={sortField} onValueChange={(value: SortField) => setSortField(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="timestamp">Date</SelectItem>
                    <SelectItem value="severity">Severity</SelectItem>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="lastSeen">Last Seen</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Active filters display */}
            {(filters.severity.length > 0 || filters.errorType.length > 0 || filters.resolved !== null) && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {filters.severity.map(severity => (
                  <Badge key={severity} variant="secondary" className="text-xs">
                    {severity}
                  </Badge>
                ))}
                {filters.errorType.map(type => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}
                  </Badge>
                ))}
                {filters.resolved !== null && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.resolved ? 'Resolved' : 'Unresolved'}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Advanced filters panel */}
          {showFilters && (
            <>
              <Separator className="my-4" />
              <AdvancedFiltersPanel
                filters={filters}
                setFilters={setFilters}
                availableOptions={availableFilters}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Results display */}
      {processedResults.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' && "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4",
          viewMode === 'list' && "space-y-4",
          viewMode === 'compact' && "space-y-2"
        )}>
          {processedResults.map((result, index) => renderResultCard(result, index))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
              <p className="text-muted-foreground mb-4">
                {quickFilter || Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== null)
                  ? "Try adjusting your filters or search terms."
                  : "No errors match your search criteria."
                }
              </p>
              {(quickFilter || Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== null)) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickFilter('');
                    setFilters({
                      severity: [],
                      errorType: [],
                      resolved: null,
                      dateRange: {},
                      tags: []
                    });
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {Math.ceil(totalCount / pageSize)}
          </span>
          <Button
            variant="outline"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// Advanced Filters Panel Component
interface AdvancedFiltersPanelProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  availableOptions: {
    severities: string[];
    errorTypes: string[];
    tags: string[];
  };
}

function AdvancedFiltersPanel({
  filters,
  setFilters,
  availableOptions
}: AdvancedFiltersPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Severity filter */}
        <div>
          <Label className="text-sm font-medium">Severity</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {availableOptions.severities.map(severity => (
              <Badge
                key={severity}
                variant={filters.severity.includes(severity) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => {
                  const newSeverities = filters.severity.includes(severity)
                    ? filters.severity.filter(s => s !== severity)
                    : [...filters.severity, severity];
                  setFilters({ ...filters, severity: newSeverities });
                }}
              >
                {severity}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Error type filter */}
        <div>
          <Label className="text-sm font-medium">Error Type</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {availableOptions.errorTypes.slice(0, 4).map(type => (
              <Badge
                key={type}
                variant={filters.errorType.includes(type) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => {
                  const newTypes = filters.errorType.includes(type)
                    ? filters.errorType.filter(t => t !== type)
                    : [...filters.errorType, type];
                  setFilters({ ...filters, errorType: newTypes });
                }}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Resolution status */}
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Switch
              checked={filters.resolved === true}
              onCheckedChange={(checked) => 
                setFilters({ ...filters, resolved: checked ? true : null })
              }
            />
            <Label className="text-xs">Resolved Only</Label>
          </div>
        </div>
        
        {/* Clear filters */}
        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({
              severity: [],
              errorType: [],
              resolved: null,
              dateRange: {},
              tags: []
            })}
            className="w-full"
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
}

export default EnhancedSearchResults;