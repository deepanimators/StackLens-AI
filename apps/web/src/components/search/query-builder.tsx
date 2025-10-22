import React, { useState, useCallback } from 'react';
import { Plus, X, Search, Filter, Zap, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface QueryCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

export interface QueryGroup {
  id: string;
  conditions: QueryCondition[];
  logicalOperator?: 'AND' | 'OR';
}

export interface AdvancedQuery {
  groups: QueryGroup[];
  globalOperator: 'AND' | 'OR';
  searchOptions: {
    enableSemantic: boolean;
    enableFuzzy: boolean;
    enableRegex: boolean;
    caseSensitive: boolean;
    wholeWords: boolean;
  };
}

interface QueryBuilderProps {
  initialQuery?: AdvancedQuery;
  onQueryChange?: (query: AdvancedQuery) => void;
  onExecuteQuery?: (query: AdvancedQuery) => void;
  className?: string;
  readOnly?: boolean;
}

// Field definitions for search
const SEARCH_FIELDS = [
  { value: 'message', label: 'Error Message', type: 'text', icon: Search },
  { value: 'stack_trace', label: 'Stack Trace', type: 'text', icon: Code },
  { value: 'error_type', label: 'Error Type', type: 'select', icon: Filter, 
    options: ['runtime', 'compile', 'network', 'database', 'ui', 'validation'] },
  { value: 'severity', label: 'Severity', type: 'select', icon: Filter,
    options: ['critical', 'high', 'medium', 'low'] },
  { value: 'file_path', label: 'File Path', type: 'text', icon: Search },
  { value: 'user_agent', label: 'User Agent', type: 'text', icon: Search },
  { value: 'url', label: 'URL', type: 'text', icon: Search },
  { value: 'user_id', label: 'User ID', type: 'text', icon: Search },
  { value: 'session_id', label: 'Session ID', type: 'text', icon: Search },
  { value: 'timestamp', label: 'Timestamp', type: 'datetime', icon: Filter },
  { value: 'created_at', label: 'Created At', type: 'datetime', icon: Filter },
  { value: 'resolved', label: 'Resolved', type: 'boolean', icon: Filter },
  { value: 'count', label: 'Error Count', type: 'number', icon: Filter }
];

// Operator definitions based on field types
const OPERATORS = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'not_equals', label: 'Does Not Equal' },
    { value: 'regex', label: 'Matches Pattern (Regex)' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ],
  select: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does Not Equal' },
    { value: 'in', label: 'In List' },
    { value: 'not_in', label: 'Not In List' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Does Not Equal' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'less_than_or_equal', label: 'Less Than or Equal' },
    { value: 'between', label: 'Between' }
  ],
  datetime: [
    { value: 'equals', label: 'Equals' },
    { value: 'after', label: 'After' },
    { value: 'before', label: 'Before' },
    { value: 'between', label: 'Between' },
    { value: 'last_hour', label: 'Last Hour' },
    { value: 'last_day', label: 'Last 24 Hours' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'last_month', label: 'Last Month' }
  ],
  boolean: [
    { value: 'is_true', label: 'Is True' },
    { value: 'is_false', label: 'Is False' }
  ]
};

export function QueryBuilder({
  initialQuery,
  onQueryChange,
  onExecuteQuery,
  className,
  readOnly = false
}: QueryBuilderProps) {
  const [query, setQuery] = useState<AdvancedQuery>(
    initialQuery || {
      groups: [{
        id: 'group-1',
        conditions: [{
          id: 'condition-1',
          field: 'message',
          operator: 'contains',
          value: ''
        }]
      }],
      globalOperator: 'AND',
      searchOptions: {
        enableSemantic: true,
        enableFuzzy: true,
        enableRegex: false,
        caseSensitive: false,
        wholeWords: false
      }
    }
  );

  // Generate unique IDs
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Update query and notify parent
  const updateQuery = useCallback((newQuery: AdvancedQuery) => {
    setQuery(newQuery);
    onQueryChange?.(newQuery);
  }, [onQueryChange]);

  // Add new condition to a group
  const addCondition = (groupId: string) => {
    const newQuery = {
      ...query,
      groups: query.groups.map(group => 
        group.id === groupId 
          ? {
              ...group,
              conditions: [
                ...group.conditions,
                {
                  id: generateId('condition'),
                  field: 'message',
                  operator: 'contains',
                  value: '',
                  logicalOperator: 'AND' as const
                }
              ]
            }
          : group
      )
    };
    updateQuery(newQuery);
  };

  // Remove condition from group
  const removeCondition = (groupId: string, conditionId: string) => {
    const newQuery = {
      ...query,
      groups: query.groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.filter(c => c.id !== conditionId)
            }
          : group
      ).filter(group => group.conditions.length > 0)
    };

    // Ensure at least one group with one condition exists
    if (newQuery.groups.length === 0) {
      newQuery.groups = [{
        id: generateId('group'),
        conditions: [{
          id: generateId('condition'),
          field: 'message',
          operator: 'contains',
          value: ''
        }]
      }];
    }

    updateQuery(newQuery);
  };

  // Add new group
  const addGroup = () => {
    const newQuery = {
      ...query,
      groups: [
        ...query.groups,
        {
          id: generateId('group'),
          conditions: [{
            id: generateId('condition'),
            field: 'message',
            operator: 'contains',
            value: ''
          }],
          logicalOperator: 'AND' as const
        }
      ]
    };
    updateQuery(newQuery);
  };

  // Remove group
  const removeGroup = (groupId: string) => {
    if (query.groups.length <= 1) return; // Keep at least one group

    const newQuery = {
      ...query,
      groups: query.groups.filter(g => g.id !== groupId)
    };
    updateQuery(newQuery);
  };

  // Update condition
  const updateCondition = (groupId: string, conditionId: string, updates: Partial<QueryCondition>) => {
    const newQuery = {
      ...query,
      groups: query.groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map(condition =>
                condition.id === conditionId
                  ? { ...condition, ...updates }
                  : condition
              )
            }
          : group
      )
    };
    updateQuery(newQuery);
  };

  // Update group operator
  const updateGroupOperator = (groupId: string, operator: 'AND' | 'OR') => {
    const newQuery = {
      ...query,
      groups: query.groups.map(group =>
        group.id === groupId ? { ...group, logicalOperator: operator } : group
      )
    };
    updateQuery(newQuery);
  };

  // Update search options
  const updateSearchOptions = (updates: Partial<AdvancedQuery['searchOptions']>) => {
    const newQuery = {
      ...query,
      searchOptions: { ...query.searchOptions, ...updates }
    };
    updateQuery(newQuery);
  };

  // Get operators for field type
  const getOperatorsForField = (fieldName: string) => {
    const field = SEARCH_FIELDS.find(f => f.value === fieldName);
    return OPERATORS[field?.type as keyof typeof OPERATORS] || OPERATORS.text;
  };

  // Render condition value input
  const renderValueInput = (condition: QueryCondition, groupId: string) => {
    const field = SEARCH_FIELDS.find(f => f.value === condition.field);
    const needsValue = !['is_empty', 'is_not_empty', 'is_true', 'is_false', 'last_hour', 'last_day', 'last_week', 'last_month'].includes(condition.operator);

    if (!needsValue) {
      return <div className="text-sm text-muted-foreground italic">No value needed</div>;
    }

    switch (field?.type) {
      case 'select':
        if (condition.operator === 'in' || condition.operator === 'not_in') {
          return (
            <Textarea
              placeholder="Enter values separated by commas"
              value={condition.value}
              onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
              className="min-h-[60px]"
              disabled={readOnly}
            />
          );
        }
        return (
          <Select
            value={condition.value}
            onValueChange={(value) => updateCondition(groupId, condition.id, { value })}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'datetime':
        if (condition.operator === 'between') {
          const [start, end] = condition.value.split('|');
          return (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="datetime-local"
                value={start || ''}
                onChange={(e) => {
                  const newValue = `${e.target.value}|${end || ''}`;
                  updateCondition(groupId, condition.id, { value: newValue });
                }}
                disabled={readOnly}
              />
              <Input
                type="datetime-local"
                value={end || ''}
                onChange={(e) => {
                  const newValue = `${start || ''}|${e.target.value}`;
                  updateCondition(groupId, condition.id, { value: newValue });
                }}
                disabled={readOnly}
              />
            </div>
          );
        }
        return (
          <Input
            type="datetime-local"
            value={condition.value}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            disabled={readOnly}
          />
        );

      case 'number':
        if (condition.operator === 'between') {
          const [min, max] = condition.value.split('|');
          return (
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={min || ''}
                onChange={(e) => {
                  const newValue = `${e.target.value}|${max || ''}`;
                  updateCondition(groupId, condition.id, { value: newValue });
                }}
                disabled={readOnly}
              />
              <Input
                type="number"
                placeholder="Max"
                value={max || ''}
                onChange={(e) => {
                  const newValue = `${min || ''}|${e.target.value}`;
                  updateCondition(groupId, condition.id, { value: newValue });
                }}
                disabled={readOnly}
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={condition.value}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            disabled={readOnly}
          />
        );

      default:
        return (
          <Input
            value={condition.value}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            placeholder={condition.operator === 'regex' ? 'Enter regex pattern' : 'Enter value'}
            disabled={readOnly}
          />
        );
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Query Builder</CardTitle>
          <div className="flex items-center space-x-2">
            {/* Global operator toggle */}
            <div className="flex items-center space-x-2 text-sm">
              <span>Groups:</span>
              <Select
                value={query.globalOperator}
                onValueChange={(value: 'AND' | 'OR') => updateQuery({ ...query, globalOperator: value })}
                disabled={readOnly}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {!readOnly && (
              <Button onClick={addGroup} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Group
              </Button>
            )}
          </div>
        </div>
        
        {/* Search Options */}
        <div className="flex items-center space-x-4 pt-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="semantic"
              checked={query.searchOptions.enableSemantic}
              onCheckedChange={(checked) => updateSearchOptions({ enableSemantic: checked })}
              disabled={readOnly}
            />
            <Label htmlFor="semantic" className="text-sm flex items-center">
              <Zap className="h-3 w-3 mr-1" />
              Semantic
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="fuzzy"
              checked={query.searchOptions.enableFuzzy}
              onCheckedChange={(checked) => updateSearchOptions({ enableFuzzy: checked })}
              disabled={readOnly}
            />
            <Label htmlFor="fuzzy" className="text-sm">Fuzzy</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="regex"
              checked={query.searchOptions.enableRegex}
              onCheckedChange={(checked) => updateSearchOptions({ enableRegex: checked })}
              disabled={readOnly}
            />
            <Label htmlFor="regex" className="text-sm">Regex</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="case-sensitive"
              checked={query.searchOptions.caseSensitive}
              onCheckedChange={(checked) => updateSearchOptions({ caseSensitive: checked })}
              disabled={readOnly}
            />
            <Label htmlFor="case-sensitive" className="text-sm">Case Sensitive</Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {query.groups.map((group, groupIndex) => (
          <div key={group.id} className="relative">
            {groupIndex > 0 && (
              <div className="flex items-center justify-center -mt-2 mb-2">
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  {query.globalOperator}
                </Badge>
              </div>
            )}
            
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Group {groupIndex + 1}</span>
                    {group.conditions.length > 1 && (
                      <Select
                        value={group.logicalOperator || 'AND'}
                        onValueChange={(value: 'AND' | 'OR') => updateGroupOperator(group.id, value)}
                        disabled={readOnly}
                      >
                        <SelectTrigger className="w-16 h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {!readOnly && (
                      <>
                        <Button
                          onClick={() => addCondition(group.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        {query.groups.length > 1 && (
                          <Button
                            onClick={() => removeGroup(group.id)}
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {group.conditions.map((condition, conditionIndex) => (
                    <div key={condition.id} className="relative">
                      {conditionIndex > 0 && (
                        <div className="flex items-center justify-center -mt-1 mb-1">
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {group.logicalOperator || 'AND'}
                          </Badge>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-12 gap-2 items-end">
                        {/* Field */}
                        <div className="col-span-3">
                          <Label className="text-xs text-muted-foreground">Field</Label>
                          <Select
                            value={condition.field}
                            onValueChange={(value) => {
                              const field = SEARCH_FIELDS.find(f => f.value === value);
                              const operators = getOperatorsForField(value);
                              updateCondition(group.id, condition.id, {
                                field: value,
                                operator: operators[0]?.value || 'contains',
                                value: ''
                              });
                            }}
                            disabled={readOnly}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SEARCH_FIELDS.map(field => {
                                const Icon = field.icon;
                                return (
                                  <SelectItem key={field.value} value={field.value}>
                                    <div className="flex items-center">
                                      <Icon className="h-3 w-3 mr-2" />
                                      {field.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Operator */}
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">Operator</Label>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateCondition(group.id, condition.id, { 
                              operator: value, 
                              value: '' 
                            })}
                            disabled={readOnly}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getOperatorsForField(condition.field).map(op => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Value */}
                        <div className="col-span-6">
                          <Label className="text-xs text-muted-foreground">Value</Label>
                          {renderValueInput(condition, group.id)}
                        </div>

                        {/* Remove button */}
                        <div className="col-span-1">
                          {!readOnly && group.conditions.length > 1 && (
                            <Button
                              onClick={() => removeCondition(group.id, condition.id)}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {!readOnly && (
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                const resetQuery: AdvancedQuery = {
                  groups: [{
                    id: generateId('group'),
                    conditions: [{
                      id: generateId('condition'),
                      field: 'message',
                      operator: 'contains',
                      value: ''
                    }]
                  }],
                  globalOperator: 'AND',
                  searchOptions: {
                    enableSemantic: true,
                    enableFuzzy: true,
                    enableRegex: false,
                    caseSensitive: false,
                    wholeWords: false
                  }
                };
                updateQuery(resetQuery);
              }}
            >
              Reset
            </Button>
            
            <Button onClick={() => onExecuteQuery?.(query)}>
              <Search className="h-4 w-4 mr-2" />
              Execute Query
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default QueryBuilder;