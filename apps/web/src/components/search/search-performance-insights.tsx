import React, { useState, useMemo } from 'react';
import { TrendingUp, Search, Filter, Calendar, BarChart3, Users, Clock, Target, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export interface SearchPerformanceMetrics {
  totalSearches: number;
  avgResponseTime: number;
  successRate: number;
  peakSearchTime: string;
  topSearchTerms: Array<{
    term: string;
    count: number;
    avgResponseTime: number;
  }>;
  performanceByHour: Array<{
    hour: number;
    searches: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
  slowQueries: Array<{
    query: string;
    responseTime: number;
    timestamp: Date;
  }>;
  errorPatterns: Array<{
    error: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  userActivity: Array<{
    userId: string;
    searchCount: number;
    avgSessionLength: number;
  }>;
}

interface SearchPerformanceProps {
  metrics: SearchPerformanceMetrics;
  dateRange: { start: Date; end: Date };
  onRefresh?: () => void;
  className?: string;
}

export function SearchPerformanceInsights({
  metrics,
  dateRange,
  onRefresh,
  className
}: SearchPerformanceProps) {
  const [selectedMetric, setSelectedMetric] = useState<'response-time' | 'success-rate' | 'search-volume'>('response-time');
  const [timeGrouping, setTimeGrouping] = useState<'hour' | 'day' | 'week'>('hour');

  // Calculate insights and trends
  const insights = useMemo(() => {
    const recentHours = metrics.performanceByHour.slice(-24);
    const olderHours = metrics.performanceByHour.slice(-48, -24);

    // Calculate trends
    const recentAvgResponseTime = recentHours.reduce((sum, h) => sum + h.avgResponseTime, 0) / recentHours.length;
    const olderAvgResponseTime = olderHours.reduce((sum, h) => sum + h.avgResponseTime, 0) / olderHours.length;
    
    const responseTimeTrend = recentAvgResponseTime < olderAvgResponseTime ? 'improved' : 
                             recentAvgResponseTime > olderAvgResponseTime ? 'degraded' : 'stable';

    const recentErrorRate = recentHours.reduce((sum, h) => sum + h.errorRate, 0) / recentHours.length;
    const olderErrorRate = olderHours.reduce((sum, h) => sum + h.errorRate, 0) / olderHours.length;
    
    const errorRateTrend = recentErrorRate < olderErrorRate ? 'improved' : 
                          recentErrorRate > olderErrorRate ? 'degraded' : 'stable';

    // Performance classification
    const getPerformanceGrade = () => {
      const avgResponseTime = metrics.avgResponseTime;
      const successRate = metrics.successRate;
      
      if (avgResponseTime < 100 && successRate > 0.98) return 'excellent';
      if (avgResponseTime < 300 && successRate > 0.95) return 'good';
      if (avgResponseTime < 1000 && successRate > 0.90) return 'fair';
      return 'poor';
    };

    return {
      responseTimeTrend,
      errorRateTrend,
      performanceGrade: getPerformanceGrade(),
      peakHour: metrics.performanceByHour.reduce((peak, hour) => 
        hour.searches > peak.searches ? hour : peak
      ),
      bottleneckQueries: metrics.slowQueries.slice(0, 5),
      topErrorPatterns: metrics.errorPatterns
        .filter(p => p.trend === 'up')
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    };
  }, [metrics]);

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getGradeColor = (grade: string) => {
    const colors = {
      excellent: 'text-green-600 bg-green-100 dark:bg-green-900/20',
      good: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
      fair: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
      poor: 'text-red-600 bg-red-100 dark:bg-red-900/20'
    };
    return colors[grade as keyof typeof colors] || colors.fair;
  };

  const getTrendIcon = (trend: string, isGoodTrend: boolean = true) => {
    if (trend === 'stable') return <Target className="h-4 w-4 text-muted-foreground" />;
    
    const isPositive = (trend === 'improved' && isGoodTrend) || (trend === 'degraded' && !isGoodTrend);
    const color = isPositive ? 'text-green-500' : 'text-red-500';
    
    return <TrendingUp className={`h-4 w-4 ${color} ${trend === 'degraded' ? 'rotate-180' : ''}`} />;
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Search Performance</h2>
            <p className="text-muted-foreground">
              Performance metrics and insights for the search system
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Select value={timeGrouping} onValueChange={(value: any) => setTimeGrouping(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hourly</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={onRefresh} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Total Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSearches.toLocaleString()}</div>
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                Last 24 hours
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{formatResponseTime(metrics.avgResponseTime)}</div>
                {getTrendIcon(insights.responseTimeTrend, false)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Peak: {metrics.peakSearchTime}
              </div>
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
                <div className="text-2xl font-bold">{formatPercentage(metrics.successRate)}</div>
                {getTrendIcon(insights.errorRateTrend, true)}
              </div>
              <Progress value={metrics.successRate * 100} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Performance Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`text-sm font-medium ${getGradeColor(insights.performanceGrade)}`}>
                {insights.performanceGrade.toUpperCase()}
              </Badge>
              <div className="text-xs text-muted-foreground mt-2">
                Based on speed & reliability
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Search Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Search className="h-5 w-5 mr-2" />
                Top Search Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.topSearchTerms.slice(0, 8).map((term, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{term.term}</div>
                      <div className="text-xs text-muted-foreground">
                        {term.count} searches • {formatResponseTime(term.avgResponseTime)} avg
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">#{index + 1}</div>
                      <div className="text-xs text-muted-foreground">
                        {((term.count / metrics.totalSearches) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Performance Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Slow Queries */}
                {insights.bottleneckQueries.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-red-600">
                      🐌 Slow Queries
                    </h4>
                    <div className="space-y-2">
                      {insights.bottleneckQueries.slice(0, 3).map((query, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded">
                          <span className="truncate flex-1">{query.query}</span>
                          <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                            {formatResponseTime(query.responseTime)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error Patterns */}
                {insights.topErrorPatterns.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-orange-600">
                      ⚠️ Rising Error Patterns
                    </h4>
                    <div className="space-y-2">
                      {insights.topErrorPatterns.map((error, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                          <span className="truncate flex-1">{error.error}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                              {error.count}
                            </Badge>
                            <TrendingUp className="h-3 w-3 text-orange-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performance Recommendations */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-blue-600">
                    💡 Recommendations
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {metrics.avgResponseTime > 500 && (
                      <div className="flex items-center">
                        <Zap className="h-3 w-3 mr-2 text-blue-600" />
                        Consider adding caching for frequently searched terms
                      </div>
                    )}
                    {metrics.successRate < 0.95 && (
                      <div className="flex items-center">
                        <Target className="h-3 w-3 mr-2 text-blue-600" />
                        Review error handling and query validation
                      </div>
                    )}
                    {insights.bottleneckQueries.length > 3 && (
                      <div className="flex items-center">
                        <BarChart3 className="h-3 w-3 mr-2 text-blue-600" />
                        Optimize database indexes for common query patterns
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Performance Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Performance Timeline (24h)
              </CardTitle>
              <Select value={selectedMetric} onValueChange={(value: any) => setSelectedMetric(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="response-time">Response Time</SelectItem>
                  <SelectItem value="success-rate">Success Rate</SelectItem>
                  <SelectItem value="search-volume">Search Volume</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Performance Timeline Chart</p>
                <p className="text-xs">Integration with Chart.js or D3 for interactive visualization</p>
              </div>
            </div>
            
            {/* Performance Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {insights.peakHour.hour}:00
                </div>
                <div className="text-xs text-muted-foreground">Peak Hour</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {formatResponseTime(Math.min(...metrics.performanceByHour.map(h => h.avgResponseTime)))}
                </div>
                <div className="text-xs text-muted-foreground">Fastest Response</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {formatResponseTime(Math.max(...metrics.performanceByHour.map(h => h.avgResponseTime)))}
                </div>
                <div className="text-xs text-muted-foreground">Slowest Response</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {metrics.performanceByHour.reduce((sum, h) => sum + h.searches, 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Searches</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Activity Insights */}
        {metrics.userActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Users className="h-5 w-5 mr-2" />
                User Search Behavior
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-semibold mb-3">Most Active Users</h4>
                  <div className="space-y-2">
                    {metrics.userActivity
                      .sort((a, b) => b.searchCount - a.searchCount)
                      .slice(0, 5)
                      .map((user, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="truncate">{user.userId}</span>
                          <Badge variant="outline" className="text-xs">
                            {user.searchCount} searches
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-3">Average Session Length</h4>
                  <div className="text-2xl font-bold text-primary">
                    {(metrics.userActivity.reduce((sum, u) => sum + u.avgSessionLength, 0) / metrics.userActivity.length / 60).toFixed(1)}m
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average time users spend searching
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-3">Search Patterns</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Power Users (&gt;10 searches)</span>
                      <span>{metrics.userActivity.filter(u => u.searchCount > 10).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Casual Users (1-5 searches)</span>
                      <span>{metrics.userActivity.filter(u => u.searchCount <= 5).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Regular Users (6-10 searches)</span>
                      <span>{metrics.userActivity.filter(u => u.searchCount > 5 && u.searchCount <= 10).length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default SearchPerformanceInsights;