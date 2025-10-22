import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, Zap, History, Bookmark, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAdvancedSearch } from '@/hooks/search/use-advanced-search';
import { cn } from '@/lib/utils';

interface AdvancedSearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  showAdvancedOptions?: boolean;
  enableAutoComplete?: boolean;
}

export function AdvancedSearchBar({
  onSearch,
  placeholder = "Search errors, stack traces, and patterns...",
  className,
  showAdvancedOptions = true,
  enableAutoComplete = true
}: AdvancedSearchBarProps) {
  const {
    query,
    results,
    isSearching,
    search,
    setQuery,
    suggestions,
    getSuggestions,
    filters,
    setFilters,
    searchOptions,
    setSearchOptions
  } = useAdvancedSearch({
    autoSearch: false,
    debounceMs: 300
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle input changes with suggestions
  const handleInputChange = async (value: string) => {
    setQuery(value);
    
    if (enableAutoComplete && value.length >= 2) {
      await getSuggestions(value);
      setShowSuggestions(true);
      setActiveSuggestionIndex(-1);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle search execution
  const handleSearch = async () => {
    if (query.trim()) {
      await search(query, searchOptions);
      setShowSuggestions(false);
      onSearch?.(query);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0) {
          setQuery(suggestions[activeSuggestionIndex]);
          setShowSuggestions(false);
        }
        handleSearch();
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Active filters count
  const activeFiltersCount = Object.values(filters).filter(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter
  ).length;

  // Search modes
  const searchModes = [
    { key: 'enableSemantic', label: 'Semantic', icon: Zap, description: 'AI-powered contextual search' },
    { key: 'enableFuzzy', label: 'Fuzzy', icon: Search, description: 'Tolerant to typos and variations' },
    { key: 'enableRegex', label: 'Regex', icon: Settings, description: 'Pattern matching with regular expressions' }
  ];

  return (
    <div className={cn("relative w-full", className)}>
      {/* Main search bar */}
      <div className="relative">
        <div className="flex items-center space-x-2">
          {/* Search input container */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Delay hiding to allow clicking suggestions
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder={placeholder}
              className="pl-10 pr-4 py-2 text-sm"
              disabled={isSearching}
            />
            
            {/* Loading indicator */}
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}

            {/* Clear button */}
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => {
                  setQuery('');
                  setShowSuggestions(false);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Search button */}
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="px-6"
          >
            Search
          </Button>

          {/* Advanced filters toggle */}
          {showAdvancedOptions && (
            <Popover open={isExpanded} onOpenChange={setIsExpanded}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <AdvancedFiltersPanel
                  filters={filters}
                  setFilters={setFilters}
                  searchOptions={searchOptions}
                  setSearchOptions={setSearchOptions}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Search suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <Card 
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg border"
          >
            <CardContent className="p-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer rounded transition-colors",
                    "hover:bg-muted",
                    activeSuggestionIndex === index && "bg-muted"
                  )}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-center space-x-2">
                    <History className="h-3 w-3 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search modes indicator */}
      <div className="flex items-center space-x-4 mt-2">
        {searchModes.map((mode) => {
          const Icon = mode.icon;
          const isEnabled = (searchOptions as any)[mode.key];
          
          return (
            <div 
              key={mode.key}
              className={cn(
                "flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors cursor-pointer",
                isEnabled 
                  ? "bg-primary/10 text-primary" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setSearchOptions({ [mode.key]: !isEnabled })}
              title={mode.description}
            >
              <Icon className="h-3 w-3" />
              <span>{mode.label}</span>
            </div>
          );
        })}
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {Object.entries(filters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            
            return (
              <Badge
                key={key}
                variant="secondary"
                className="text-xs px-2 py-1 cursor-pointer hover:bg-destructive/20"
                onClick={() => setFilters({ ...filters, [key]: Array.isArray(value) ? [] : undefined })}
              >
                {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setFilters({})}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}

// Advanced Filters Panel Component
interface AdvancedFiltersPanelProps {
  filters: any;
  setFilters: (filters: any) => void;
  searchOptions: any;
  setSearchOptions: (options: any) => void;
}

function AdvancedFiltersPanel({
  filters,
  setFilters,
  searchOptions,
  setSearchOptions
}: AdvancedFiltersPanelProps) {
  const severityOptions = ['critical', 'high', 'medium', 'low'];
  const errorTypeOptions = ['runtime', 'compile', 'network', 'database', 'ui', 'validation'];
  
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-sm mb-2">Search Options</h4>
        <div className="space-y-2">
          {[
            { key: 'enableSemantic', label: 'Semantic Search', description: 'AI-powered contextual matching' },
            { key: 'enableFuzzy', label: 'Fuzzy Matching', description: 'Tolerant to typos and variations' },
            { key: 'enableRegex', label: 'Regex Patterns', description: 'Regular expression matching' },
            { key: 'highlightMatches', label: 'Highlight Matches', description: 'Highlight search terms in results' }
          ].map((option) => (
            <div key={option.key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={option.key} className="text-xs font-medium">
                  {option.label}
                </Label>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <Switch
                id={option.key}
                checked={(searchOptions as any)[option.key] || false}
                onCheckedChange={(checked) => 
                  setSearchOptions({ ...searchOptions, [option.key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium text-sm mb-2">Severity</h4>
        <div className="flex flex-wrap gap-1">
          {severityOptions.map((severity) => (
            <Badge
              key={severity}
              variant={filters.severity?.includes(severity) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => {
                const currentSeverities = filters.severity || [];
                const newSeverities = currentSeverities.includes(severity)
                  ? currentSeverities.filter((s: string) => s !== severity)
                  : [...currentSeverities, severity];
                setFilters({ ...filters, severity: newSeverities });
              }}
            >
              {severity}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-sm mb-2">Error Type</h4>
        <div className="flex flex-wrap gap-1">
          {errorTypeOptions.map((type) => (
            <Badge
              key={type}
              variant={filters.errorType?.includes(type) ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => {
                const currentTypes = filters.errorType || [];
                const newTypes = currentTypes.includes(type)
                  ? currentTypes.filter((t: string) => t !== type)
                  : [...currentTypes, type];
                setFilters({ ...filters, errorType: newTypes });
              }}
            >
              {type}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-sm mb-2">Date Range</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="start-date" className="text-xs">From</Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={filters.dateRange?.start?.slice(0, 16) || ''}
              onChange={(e) => setFilters({
                ...filters,
                dateRange: {
                  ...filters.dateRange,
                  start: e.target.value ? new Date(e.target.value).toISOString() : undefined
                }
              })}
              className="text-xs"
            />
          </div>
          <div>
            <Label htmlFor="end-date" className="text-xs">To</Label>
            <Input
              id="end-date"
              type="datetime-local"
              value={filters.dateRange?.end?.slice(0, 16) || ''}
              onChange={(e) => setFilters({
                ...filters,
                dateRange: {
                  ...filters.dateRange,
                  end: e.target.value ? new Date(e.target.value).toISOString() : undefined
                }
              })}
              className="text-xs"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFilters({});
            setSearchOptions({
              enableSemantic: true,
              enableFuzzy: true,
              enableRegex: false,
              highlightMatches: true
            });
          }}
        >
          Reset All
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Bookmark className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdvancedSearchBar;