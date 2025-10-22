import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { 
  Plus, 
  Settings, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Move, 
  RotateCcw,
  Save,
  Download,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

export interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'text' | 'iframe';
  title: string;
  description?: string;
  config: WidgetConfig;
  layout: {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
  isVisible: boolean;
  isEditable: boolean;
  refreshInterval?: number;
  lastUpdated?: Date;
}

export interface WidgetConfig {
  // Metric widget
  metricKey?: string;
  format?: 'number' | 'percentage' | 'currency' | 'bytes' | 'duration';
  threshold?: { warning: number; critical: number };
  
  // Chart widget
  chartType?: 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'gauge';
  dataSource?: string;
  xAxis?: string;
  yAxis?: string[];
  colors?: string[];
  
  // Table widget
  columns?: Array<{ key: string; label: string; sortable?: boolean }>;
  pageSize?: number;
  
  // Alert widget
  alertTypes?: string[];
  maxAlerts?: number;
  
  // Text widget
  content?: string;
  markdown?: boolean;
  
  // iframe widget
  url?: string;
  
  // Common options
  showHeader?: boolean;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  customCSS?: string;
}

interface CustomDashboardProps {
  widgets: Widget[];
  onWidgetUpdate: (widget: Widget) => void;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetAdd: (widget: Omit<Widget, 'id'>) => void;
  onLayoutChange: (layout: any) => void;
  onDashboardSave?: () => void;
  onDashboardExport?: () => void;
  onDashboardImport?: (data: string) => void;
  isEditing?: boolean;
  className?: string;
}

const WIDGET_TYPES = [
  { value: 'metric', label: 'Metric Display', icon: '📊', description: 'Show single metric value with trends' },
  { value: 'chart', label: 'Chart', icon: '📈', description: 'Interactive data visualization' },
  { value: 'table', label: 'Data Table', icon: '📋', description: 'Tabular data display with sorting' },
  { value: 'alert', label: 'Alert List', icon: '🚨', description: 'Recent alerts and notifications' },
  { value: 'text', label: 'Text/Markdown', icon: '📝', description: 'Custom text content' },
  { value: 'iframe', label: 'External Content', icon: '🌐', description: 'Embed external web content' }
];

const DEFAULT_LAYOUTS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2
};

export function CustomDashboard({
  widgets = [],
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetAdd,
  onLayoutChange,
  onDashboardSave,
  onDashboardExport,
  onDashboardImport,
  isEditing = false,
  className
}: CustomDashboardProps) {
  const [editMode, setEditMode] = useState(isEditing);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [newWidgetDialog, setNewWidgetDialog] = useState(false);
  const [newWidget, setNewWidget] = useState<Partial<Widget>>({
    type: 'metric',
    title: '',
    description: '',
    isVisible: true,
    isEditable: true,
    config: {}
  });
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const { toast } = useToast();

  // Generate unique widget ID
  const generateWidgetId = () => `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Handle layout change
  const handleLayoutChange = useCallback((layout: any, layouts: any) => {
    const updatedWidgets = widgets.map(widget => {
      const layoutItem = layout.find((item: any) => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          layout: {
            ...widget.layout,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        };
      }
      return widget;
    });

    // Update all widgets with new positions
    updatedWidgets.forEach(widget => onWidgetUpdate(widget));
    onLayoutChange?.(layouts);
  }, [widgets, onWidgetUpdate, onLayoutChange]);

  // Add new widget
  const handleAddWidget = () => {
    if (!newWidget.title?.trim()) {
      toast({
        title: "Validation Error",
        description: "Widget title is required.",
        variant: "destructive"
      });
      return;
    }

    const widget: Widget = {
      id: generateWidgetId(),
      type: newWidget.type as Widget['type'],
      title: newWidget.title,
      description: newWidget.description,
      config: newWidget.config || {},
      layout: {
        i: generateWidgetId(),
        x: 0,
        y: 0,
        w: getDefaultWidgetSize(newWidget.type as Widget['type']).w,
        h: getDefaultWidgetSize(newWidget.type as Widget['type']).h,
        minW: 2,
        minH: 2
      },
      isVisible: true,
      isEditable: true,
      lastUpdated: new Date()
    };

    onWidgetAdd(widget);
    setNewWidget({
      type: 'metric',
      title: '',
      description: '',
      isVisible: true,
      isEditable: true,
      config: {}
    });
    setNewWidgetDialog(false);

    toast({
      title: "Widget Added",
      description: `${widget.title} has been added to the dashboard.`
    });
  };

  // Get default widget size based on type
  const getDefaultWidgetSize = (type: Widget['type']) => {
    switch (type) {
      case 'metric':
        return { w: 3, h: 2 };
      case 'chart':
        return { w: 6, h: 4 };
      case 'table':
        return { w: 8, h: 4 };
      case 'alert':
        return { w: 4, h: 3 };
      case 'text':
        return { w: 4, h: 3 };
      case 'iframe':
        return { w: 6, h: 4 };
      default:
        return { w: 4, h: 3 };
    }
  };

  // Duplicate widget
  const handleDuplicateWidget = (widget: Widget) => {
    const duplicated: Widget = {
      ...widget,
      id: generateWidgetId(),
      title: `${widget.title} (Copy)`,
      layout: {
        ...widget.layout,
        i: generateWidgetId(),
        x: widget.layout.x + 1,
        y: widget.layout.y + 1
      }
    };

    onWidgetAdd(duplicated);
    toast({
      title: "Widget Duplicated",
      description: `${duplicated.title} has been created.`
    });
  };

  // Toggle widget visibility
  const handleToggleVisibility = (widget: Widget) => {
    const updated = { ...widget, isVisible: !widget.isVisible };
    onWidgetUpdate(updated);
  };

  // Reset dashboard layout
  const handleResetLayout = () => {
    const resetWidgets = widgets.map((widget, index) => ({
      ...widget,
      layout: {
        ...widget.layout,
        x: (index % 3) * 4,
        y: Math.floor(index / 3) * 3,
        w: getDefaultWidgetSize(widget.type).w,
        h: getDefaultWidgetSize(widget.type).h
      }
    }));

    resetWidgets.forEach(widget => onWidgetUpdate(widget));
    toast({
      title: "Layout Reset",
      description: "Dashboard layout has been reset to default."
    });
  };

  // Export dashboard
  const handleExport = () => {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      widgets: widgets.map(widget => ({
        ...widget,
        lastUpdated: undefined // Remove timestamp for clean export
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Dashboard Exported",
      description: "Dashboard configuration has been downloaded."
    });
  };

  // Import dashboard
  const handleImport = () => {
    try {
      const importedData = JSON.parse(importData);
      
      if (!importedData.widgets || !Array.isArray(importedData.widgets)) {
        throw new Error('Invalid dashboard format');
      }

      // Add imported widgets
      importedData.widgets.forEach((widget: any) => {
        const newWidget: Widget = {
          ...widget,
          id: generateWidgetId(),
          layout: {
            ...widget.layout,
            i: generateWidgetId()
          },
          lastUpdated: new Date()
        };
        onWidgetAdd(newWidget);
      });

      setImportData('');
      setImportDialog(false);
      
      toast({
        title: "Dashboard Imported",
        description: `Successfully imported ${importedData.widgets.length} widgets.`
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Invalid dashboard format or corrupted data.",
        variant: "destructive"
      });
    }
  };

  // Render widget content based on type
  const renderWidgetContent = (widget: Widget) => {
    switch (widget.type) {
      case 'metric':
        return (
          <div className="flex flex-col justify-center h-full text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {Math.floor(Math.random() * 1000)}
            </div>
            <div className="text-sm text-muted-foreground">
              Sample Metric Value
            </div>
          </div>
        );

      case 'chart':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <div className="text-4xl mb-2">📈</div>
              <div className="text-sm">Chart Visualization</div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="p-2">
            <div className="text-xs text-muted-foreground mb-2">Data Table</div>
            <div className="space-y-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>Item {i + 1}</span>
                  <span>{Math.floor(Math.random() * 100)}</span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'alert':
        return (
          <div className="p-2 space-y-2">
            <div className="text-xs text-muted-foreground">Recent Alerts</div>
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="text-xs p-2 bg-red-50 dark:bg-red-950/20 rounded border-l-2 border-red-500">
                Alert {i + 1}: Sample error message
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div className="p-3">
            <div className="text-sm">
              {widget.config.content || 'Custom text content goes here...'}
            </div>
          </div>
        );

      case 'iframe':
        return widget.config.url ? (
          <iframe
            src={widget.config.url}
            className="w-full h-full border-0"
            title={widget.title}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-2xl mb-2">🌐</div>
              <div className="text-xs">Configure URL in widget settings</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Unknown widget type
          </div>
        );
    }
  };

  // Prepare layout for react-grid-layout
  const layout = widgets
    .filter(w => w.isVisible)
    .map(widget => ({
      i: widget.id,
      x: widget.layout.x,
      y: widget.layout.y,
      w: widget.layout.w,
      h: widget.layout.h,
      minW: widget.layout.minW || 2,
      minH: widget.layout.minH || 2,
      maxW: widget.layout.maxW,
      maxH: widget.layout.maxH
    }));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Custom Dashboard</h2>
          <p className="text-muted-foreground">
            Drag and drop widgets to customize your dashboard
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="edit-mode"
              checked={editMode}
              onCheckedChange={setEditMode}
            />
            <Label htmlFor="edit-mode" className="text-sm">Edit Mode</Label>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleResetLayout}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset Layout
          </Button>
          
          <Dialog open={importDialog} onOpenChange={setImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-1" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Dashboard</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Dashboard Data (JSON)</Label>
                  <Textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste exported dashboard JSON here..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport}>
                  Import Dashboard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          <Button onClick={onDashboardSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Dashboard
          </Button>
        </div>
      </div>

      {/* Add Widget Button (when in edit mode) */}
      {editMode && (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="pt-6">
            <div className="text-center">
              <Dialog open={newWidgetDialog} onOpenChange={setNewWidgetDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Widget
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Widget</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="widget-title">Widget Title *</Label>
                        <Input
                          id="widget-title"
                          value={newWidget.title || ''}
                          onChange={(e) => setNewWidget({...newWidget, title: e.target.value})}
                          placeholder="Enter widget title"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="widget-type">Widget Type *</Label>
                        <Select 
                          value={newWidget.type} 
                          onValueChange={(value: any) => setNewWidget({...newWidget, type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WIDGET_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center space-x-2">
                                  <span>{type.icon}</span>
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="widget-description">Description</Label>
                      <Input
                        id="widget-description"
                        value={newWidget.description || ''}
                        onChange={(e) => setNewWidget({...newWidget, description: e.target.value})}
                        placeholder="Optional description"
                      />
                    </div>
                    
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {WIDGET_TYPES.find(t => t.value === newWidget.type)?.description}
                      </p>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewWidgetDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddWidget}>
                      Add Widget
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widgets Grid */}
      {widgets.length > 0 ? (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={DEFAULT_LAYOUTS}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          isDraggable={editMode}
          isResizable={editMode}
          margin={[16, 16]}
          containerPadding={[0, 0]}
        >
          {widgets
            .filter(widget => widget.isVisible)
            .map((widget) => (
              <div key={widget.id} className="relative">
                <Card className="h-full">
                  <CardHeader className={cn(
                    "pb-2",
                    !widget.config.showHeader && "sr-only"
                  )}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {widget.title}
                      </CardTitle>
                      
                      {editMode && (
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => setSelectedWidget(widget)}
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => handleDuplicateWidget(widget)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0"
                            onClick={() => handleToggleVisibility(widget)}
                          >
                            {widget.isVisible ? 
                              <Eye className="h-3 w-3" /> : 
                              <EyeOff className="h-3 w-3" />
                            }
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => onWidgetDelete(widget.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {widget.description && (
                      <p className="text-xs text-muted-foreground">
                        {widget.description}
                      </p>
                    )}
                  </CardHeader>
                  
                  <CardContent className="flex-1 p-3">
                    {renderWidgetContent(widget)}
                  </CardContent>
                </Card>
                
                {editMode && (
                  <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
                    <Move className="h-3 w-3" />
                  </div>
                )}
              </div>
            ))}
        </ResponsiveGridLayout>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Widgets</h3>
              <p className="text-muted-foreground mb-4">
                Create your first widget to get started with your custom dashboard.
              </p>
              <Button onClick={() => setNewWidgetDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Widget
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Widget Configuration Dialog */}
      {selectedWidget && (
        <Dialog open={true} onOpenChange={() => setSelectedWidget(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configure Widget: {selectedWidget.title}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Widget Title</Label>
                  <Input
                    value={selectedWidget.title}
                    onChange={(e) => setSelectedWidget({
                      ...selectedWidget,
                      title: e.target.value
                    })}
                  />
                </div>
                
                <div>
                  <Label>Widget Type</Label>
                  <Input value={selectedWidget.type} disabled />
                </div>
              </div>
              
              <div>
                <Label>Description</Label>
                <Input
                  value={selectedWidget.description || ''}
                  onChange={(e) => setSelectedWidget({
                    ...selectedWidget,
                    description: e.target.value
                  })}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium">Widget Options</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={selectedWidget.config.showHeader !== false}
                    onCheckedChange={(checked) => setSelectedWidget({
                      ...selectedWidget,
                      config: { ...selectedWidget.config, showHeader: checked }
                    })}
                  />
                  <Label>Show Header</Label>
                </div>
                
                {/* Type-specific configuration */}
                {selectedWidget.type === 'text' && (
                  <div>
                    <Label>Content</Label>
                    <Textarea
                      value={selectedWidget.config.content || ''}
                      onChange={(e) => setSelectedWidget({
                        ...selectedWidget,
                        config: { ...selectedWidget.config, content: e.target.value }
                      })}
                      rows={4}
                    />
                  </div>
                )}
                
                {selectedWidget.type === 'iframe' && (
                  <div>
                    <Label>URL</Label>
                    <Input
                      value={selectedWidget.config.url || ''}
                      onChange={(e) => setSelectedWidget({
                        ...selectedWidget,
                        config: { ...selectedWidget.config, url: e.target.value }
                      })}
                      placeholder="https://example.com"
                    />
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedWidget(null)}>
                Cancel
              </Button>
              <Button onClick={() => {
                onWidgetUpdate(selectedWidget);
                setSelectedWidget(null);
                toast({
                  title: "Widget Updated",
                  description: "Widget configuration has been saved."
                });
              }}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default CustomDashboard;