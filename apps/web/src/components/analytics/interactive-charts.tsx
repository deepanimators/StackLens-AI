import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieIcon, Activity, Maximize2, Download, RefreshCw, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ChartDataPoint {
  timestamp: string | number;
  [key: string]: any;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut';
  data: ChartDataPoint[];
  xAxis?: string;
  yAxis?: string[];
  colors?: string[];
  options?: {
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    animate?: boolean;
    strokeWidth?: number;
    fillOpacity?: number;
  };
}

export interface CustomWidget {
  id: string;
  title: string;
  type: 'metric' | 'chart' | 'table' | 'alert';
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number; w: number; h: number };
  config: any;
  isVisible: boolean;
}

interface InteractiveChartsProps {
  charts: ChartConfig[];
  widgets?: CustomWidget[];
  realTimeUpdates?: boolean;
  onWidgetUpdate?: (widget: CustomWidget) => void;
  onChartExport?: (chartId: string, format: 'png' | 'svg' | 'pdf') => void;
  className?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

export function InteractiveCharts({
  charts = [],
  widgets = [],
  realTimeUpdates = true,
  onWidgetUpdate,
  onChartExport,
  className
}: InteractiveChartsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const [customization, setCustomization] = useState<Record<string, any>>({});
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && realTimeUpdates) {
      refreshIntervalRef.current = setInterval(() => {
        // Trigger data refresh
        console.log('Auto-refreshing charts');
      }, refreshInterval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, realTimeUpdates, refreshInterval]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  const renderChart = (chart: ChartConfig) => {
    const { type, data, xAxis = 'timestamp', yAxis = [], colors = DEFAULT_COLORS, options = {} } = chart;
    
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxis} />
              <YAxis />
              {options.showTooltip && <Tooltip content={<CustomTooltip />} />}
              {options.showLegend && <Legend />}
              {yAxis.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={options.strokeWidth || 2}
                  dot={false}
                  animationDuration={options.animate ? 1000 : 0}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxis} />
              <YAxis />
              {options.showTooltip && <Tooltip content={<CustomTooltip />} />}
              {options.showLegend && <Legend />}
              {yAxis.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={options.fillOpacity || 0.3}
                  animationDuration={options.animate ? 1000 : 0}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={xAxis} />
              <YAxis />
              {options.showTooltip && <Tooltip content={<CustomTooltip />} />}
              {options.showLegend && <Legend />}
              {yAxis.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  animationDuration={options.animate ? 1000 : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={type === 'donut' ? 80 : 100}
                innerRadius={type === 'donut' ? 40 : 0}
                paddingAngle={2}
                dataKey={yAxis[0] || 'value'}
                animationDuration={options.animate ? 1000 : 0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              {options.showTooltip && <Tooltip />}
              {options.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="flex items-center justify-center h-full text-muted-foreground">Unsupported chart type</div>;
    }
  };

  // Chart customization dialog
  const ChartCustomizationDialog = ({ chart }: { chart: ChartConfig }) => {
    const [localConfig, setLocalConfig] = useState(chart);
    
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Chart: {chart.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Chart Type</Label>
                <Select 
                  value={localConfig.type} 
                  onValueChange={(value: any) => setLocalConfig({...localConfig, type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="area">Area Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="donut">Donut Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Time Range</Label>
                <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15m">Last 15 minutes</SelectItem>
                    <SelectItem value="1h">Last hour</SelectItem>
                    <SelectItem value="6h">Last 6 hours</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={localConfig.options?.showGrid} 
                  onCheckedChange={(checked) => 
                    setLocalConfig({
                      ...localConfig, 
                      options: {...localConfig.options, showGrid: checked}
                    })
                  }
                />
                <Label>Show Grid</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={localConfig.options?.showLegend} 
                  onCheckedChange={(checked) => 
                    setLocalConfig({
                      ...localConfig, 
                      options: {...localConfig.options, showLegend: checked}
                    })
                  }
                />
                <Label>Show Legend</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={localConfig.options?.animate} 
                  onCheckedChange={(checked) => 
                    setLocalConfig({
                      ...localConfig, 
                      options: {...localConfig.options, animate: checked}
                    })
                  }
                />
                <Label>Enable Animation</Label>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Get chart icon
  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line':
      case 'area':
        return <TrendingUp className="h-4 w-4" />;
      case 'bar':
        return <BarChart3 className="h-4 w-4" />;
      case 'pie':
      case 'donut':
        return <PieIcon className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Controls Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Interactive Charts</h3>
          <p className="text-sm text-muted-foreground">
            Real-time data visualization with customizable widgets
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh" className="text-sm">Auto Refresh</Label>
          </div>
          
          <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(Number(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10000">10s</SelectItem>
              <SelectItem value="30000">30s</SelectItem>
              <SelectItem value="60000">1m</SelectItem>
              <SelectItem value="300000">5m</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">Last 15 minutes</SelectItem>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <Card key={chart.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getChartIcon(chart.type)}
                  <CardTitle className="text-base">{chart.title}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {chart.type}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-1">
                  <ChartCustomizationDialog chart={chart} />
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48" align="end">
                      <div className="space-y-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => onChartExport?.(chart.id, 'png')}
                        >
                          Export as PNG
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => onChartExport?.(chart.id, 'svg')}
                        >
                          Export as SVG
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => onChartExport?.(chart.id, 'pdf')}
                        >
                          Export as PDF
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFullscreenChart(chart.id)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="h-64">
                {chart.data.length > 0 ? (
                  renderChart(chart)
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No data available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Chart metadata */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                <span>
                  {chart.data.length} data points
                </span>
                <span>
                  Updated {realTimeUpdates ? 'live' : 'manually'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fullscreen Chart Dialog */}
      {fullscreenChart && (
        <Dialog open={true} onOpenChange={() => setFullscreenChart(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {charts.find(c => c.id === fullscreenChart)?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="h-96">
              {(() => {
                const chart = charts.find(c => c.id === fullscreenChart);
                return chart ? renderChart(chart) : null;
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Custom Widgets Section */}
      {widgets.length > 0 && (
        <div>
          <h4 className="text-md font-semibold mb-4">Custom Widgets</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {widgets.filter(w => w.isVisible).map((widget) => (
              <Card key={widget.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{widget.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Custom widget placeholder</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {charts.length === 0 && widgets.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Charts Available</h3>
              <p className="text-muted-foreground mb-4">
                Start by creating your first interactive chart or widget.
              </p>
              <Button variant="outline">
                Create Chart
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default InteractiveCharts;