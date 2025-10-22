import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Search, Filter, Calendar, BarChart3, PieChart, LineChart, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  avgResponseTime: number;
  successRate: number;
  topQueries: Array<{
    query: string;
    count: number;
    avgResponseTime: number;
    successRate: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  searchTypeDistribution: Array<{
    type: 'semantic' | 'fuzzy' | 'regex' | 'simple';
    count: number;
    percentage: number;
  }>;
  performanceMetrics: Array<{
    date: string;
    searches: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
  userSearchPatterns: Array<{
    userId: string;
    searchCount: number;
    avgSessionLength: number;
    favoriteQueries: string[];
  }>;
  errorPatterns: Array<{
    query: string;
    errorType: string;
    count: number;
    lastOccurrence: string;
  }>;
}

interface SearchAnalyticsDashboardProps {
  analytics: SearchAnalytics;
  dateRange?: {
    start: Date;
    end: Date;
  };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  onRefresh?: () => void;
  className?: string;
}

export function SearchAnalyticsDashboard({
  analytics,
  dateRange,
  onDateRangeChange,
  onRefresh,
  className
}: SearchAnalyticsDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<'searches' | 'response-time' | 'success-rate'>('searches');
  const [filterQuery, setFilterQuery] = useState('');

  // Calculate trends and insights
  const insights = useMemo(() => {
    const totalSearches = analytics.totalSearches;
    const avgResponseTime = analytics.avgResponseTime;
    const successRate = analytics.successRate;

    // Calculate performance trend
    const recentMetrics = analytics.performanceMetrics.slice(-7);
    const olderMetrics = analytics.performanceMetrics.slice(-14, -7);
    
    const recentAvgSearches = recentMetrics.reduce((sum, m) => sum + m.searches, 0) / recentMetrics.length;
    const olderAvgSearches = olderMetrics.reduce((sum, m) => sum + m.searches, 0) / olderMetrics.length;
    
    const searchTrend = recentAvgSearches > olderAvgSearches ? 'up' : 
                       recentAvgSearches < olderAvgSearches ? 'down' : 'stable';

    const recentAvgResponseTime = recentMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / recentMetrics.length;
    const olderAvgResponseTime = olderMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / olderMetrics.length;
    
    const responseTrend = recentAvgResponseTime < olderAvgResponseTime ? 'up' : 
                         recentAvgResponseTime > olderAvgResponseTime ? 'down' : 'stable';

    return {
      searchTrend: searchTrend as 'up' | 'down' | 'stable',
      responseTrend: responseTrend as 'up' | 'down' | 'stable',
      topPerformingQueries: analytics.topQueries.filter(q => q.successRate > 0.9).slice(0, 5),
      slowQueries: analytics.topQueries.filter(q => q.avgResponseTime > avgResponseTime * 1.5).slice(0, 5),
      trendingQueries: analytics.topQueries.filter(q => q.trend === 'up').slice(0, 5)
    };
  }, [analytics]);

  // Filter queries based on search input
  const filteredTopQueries = useMemo(() => {
    if (!filterQuery) return analytics.topQueries;
    return analytics.topQueries.filter(q => 
      q.query.toLowerCase().includes(filterQuery.toLowerCase())
    );
  }, [analytics.topQueries, filterQuery]);

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable', isGoodTrend: boolean = true) => {
    if (trend === 'stable') return <Activity className="h-4 w-4 text-muted-foreground" />;
    
    const isPositive = (trend === 'up' && isGoodTrend) || (trend === 'down' && !isGoodTrend);
    
    return trend === 'up' 
      ? <TrendingUp className={cn("h-4 w-4", isPositive ? "text-green-500" : "text-red-500")} />
      : <TrendingDown className={cn("h-4 w-4", isPositive ? "text-green-500" : "text-red-500")} />;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Search Analytics</h2>
          <p className="text-muted-foreground">
            Insights and performance metrics for your search system
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Date Range Picker */}
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select defaultValue="7days">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1day">Last Day</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={onRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Total Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{analytics.totalSearches.toLocaleString()}</div>
              {getTrendIcon(insights.searchTrend, true)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.uniqueQueries.toLocaleString()} unique queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{formatResponseTime(analytics.avgResponseTime)}</div>
              {getTrendIcon(insights.responseTrend, false)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Performance metric
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{formatPercentage(analytics.successRate)}</div>
              <Badge variant={analytics.successRate > 0.95 ? "default" : analytics.successRate > 0.9 ? "secondary" : "destructive"}>
                {analytics.successRate > 0.95 ? "Excellent" : analytics.successRate > 0.9 ? "Good" : "Needs Attention"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Query success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <PieChart className="h-4 w-4 mr-2" />
              Search Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.searchTypeDistribution.map((type, index) => (
                <div key={type.type} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{type.type}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-12 bg-muted rounded-full h-2">
                      <div 
                        className="h-2 bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${type.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{type.percentage.toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Queries Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Top Queries
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Filter queries..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-40 h-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTopQueries.slice(0, 8).map((query, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium truncate">{query.query}</span>
                      {getTrendIcon(query.trend, true)}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                      <span>{query.count} executions</span>
                      <span>{formatResponseTime(query.avgResponseTime)}</span>
                      <span>{formatPercentage(query.successRate)} success</span>
                    </div>
                  </div>
                  <Badge variant={query.successRate > 0.9 ? "default" : "secondary"}>
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="h-5 w-5 mr-2" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Top Performing Queries */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-green-600">
                  🚀 Best Performing Queries
                </h4>
                <div className="space-y-2">
                  {insights.topPerformingQueries.slice(0, 3).map((query, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                      <span className="truncate flex-1">{query.query}</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {formatPercentage(query.successRate)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Slow Queries */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-yellow-600">
                  🐌 Slow Queries
                </h4>
                <div className="space-y-2">
                  {insights.slowQueries.slice(0, 3).map((query, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                      <span className="truncate flex-1">{query.query}</span>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        {formatResponseTime(query.avgResponseTime)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Trending Queries */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-blue-600">
                  📈 Trending Queries
                </h4>
                <div className="space-y-2">
                  {insights.trendingQueries.slice(0, 3).map((query, index) => (
                    <div key={index} className="flex items-center justify-between text-sm p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                      <span className="truncate flex-1">{query.query}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          {query.count}
                        </Badge>
                        <TrendingUp className="h-3 w-3 text-blue-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Patterns */}
      {analytics.errorPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Error Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.errorPatterns.slice(0, 5).map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{error.query}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="text-red-600">{error.errorType}</span>
                      <span className="mx-2">•</span>
                      <span>Last seen: {new Date(error.lastOccurrence).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge variant="destructive">
                    {error.count} errors
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Performance Timeline
            </CardTitle>
            <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="searches">Search Volume</SelectItem>
                <SelectItem value="response-time">Response Time</SelectItem>
                <SelectItem value="success-rate">Success Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Performance timeline chart would be rendered here</p>
              <p className="text-sm">Integration with charting library (Chart.js, D3, etc.)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SearchAnalyticsDashboard;