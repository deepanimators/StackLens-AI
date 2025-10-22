import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PlusCircle, 
  Settings, 
  Download, 
  Upload, 
  Copy, 
  Trash2, 
  Eye, 
  EyeOff,
  Grid3X3,
  Layout,
  Save,
  RefreshCw,
  Share2,
  Star,
  Filter,
  Search,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDashboard, Dashboard, DashboardTemplate } from './dashboard-context';
import CustomDashboard from './custom-dashboard';

interface DashboardManagerProps {
  className?: string;
}

export function DashboardManager({ className }: DashboardManagerProps) {
  const { state, actions } = useDashboard();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newDashboardDialog, setNewDashboardDialog] = useState(false);
  const [templatesDialog, setTemplatesDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [newDashboard, setNewDashboard] = useState({
    name: '',
    description: '',
    category: 'general',
    isPublic: false
  });
  const { toast } = useToast();

  // Load data on mount
  useEffect(() => {
    actions.loadDashboards();
    actions.loadTemplates();
  }, []);

  // Filter dashboards
  const filteredDashboards = state.dashboards.filter(dashboard => {
    const matchesSearch = dashboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dashboard.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dashboard.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || dashboard.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get dashboard categories
  const categories = ['all', ...Array.from(new Set(state.dashboards.map(d => d.category)))];

  // Get active dashboard
  const activeDashboard = state.dashboards.find(d => d.id === state.activeDashboard);

  // Create new dashboard
  const handleCreateDashboard = async () => {
    if (!newDashboard.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Dashboard name is required.",
        variant: "destructive"
      });
      return;
    }

    try {
      await actions.createDashboard({
        name: newDashboard.name,
        description: newDashboard.description,
        category: newDashboard.category,
        isPublic: newDashboard.isPublic,
        widgets: [],
        layout: {},
        isDefault: false,
        createdBy: 'user',
        tags: []
      });

      setNewDashboard({ name: '', description: '', category: 'general', isPublic: false });
      setNewDashboardDialog(false);
      
      toast({
        title: "Dashboard Created",
        description: `${newDashboard.name} has been created successfully.`
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create dashboard. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Create from template
  const handleCreateFromTemplate = async (template: DashboardTemplate) => {
    try {
      const dashboard = await actions.createFromTemplate(
        template.id,
        `${template.name} Dashboard`
      );
      
      setTemplatesDialog(false);
      toast({
        title: "Dashboard Created",
        description: `Dashboard created from ${template.name} template.`
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create dashboard from template.",
        variant: "destructive"
      });
    }
  };

  // Duplicate dashboard
  const handleDuplicateDashboard = async (dashboard: Dashboard) => {
    try {
      await actions.duplicateDashboard(dashboard.id);
      toast({
        title: "Dashboard Duplicated",
        description: `${dashboard.name} (Copy) has been created.`
      });
    } catch (error) {
      toast({
        title: "Duplication Failed",
        description: "Failed to duplicate dashboard.",
        variant: "destructive"
      });
    }
  };

  // Delete dashboard
  const handleDeleteDashboard = async (dashboard: Dashboard) => {
    if (dashboard.isDefault) {
      toast({
        title: "Cannot Delete",
        description: "Default dashboard cannot be deleted.",
        variant: "destructive"
      });
      return;
    }

    try {
      await actions.deleteDashboard(dashboard.id);
      toast({
        title: "Dashboard Deleted",
        description: `${dashboard.name} has been deleted.`
      });
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete dashboard.",
        variant: "destructive"
      });
    }
  };

  // Export dashboard
  const handleExportDashboard = async (dashboard: Dashboard) => {
    try {
      const exportData = await actions.exportDashboard(dashboard.id);
      
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dashboard.name.replace(/\s+/g, '-').toLowerCase()}-dashboard.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Dashboard Exported",
        description: `${dashboard.name} has been exported successfully.`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export dashboard.",
        variant: "destructive"
      });
    }
  };

  // Import dashboard
  const handleImportDashboard = async () => {
    try {
      const dashboard = await actions.importDashboard(importData);
      setImportData('');
      setImportDialog(false);
      
      toast({
        title: "Dashboard Imported",
        description: `${dashboard.name} has been imported successfully.`
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Invalid dashboard format or corrupted data.",
        variant: "destructive"
      });
    }
  };

  // Update preferences
  const handleUpdatePreferences = (key: string, value: any) => {
    actions.updatePreferences({ [key]: value });
    toast({
      title: "Settings Updated",
      description: "Dashboard preferences have been saved."
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Manager</h1>
          <p className="text-muted-foreground">
            Create and manage your custom analytics dashboards
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Dialog open={templatesDialog} onOpenChange={setTemplatesDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Layout className="h-4 w-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Dashboard Templates</DialogTitle>
                <DialogDescription>
                  Choose from pre-built templates to get started quickly
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {state.templates.map(template => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{template.category}</Badge>
                          {template.isBuiltIn && (
                            <Badge variant="outline">Built-in</Badge>
                          )}
                        </div>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            {template.widgets.length} widgets
                          </span>
                          <span className="flex items-center">
                            <Download className="h-3 w-3 mr-1" />
                            {template.downloadCount}
                          </span>
                          <span className="flex items-center">
                            <Star className="h-3 w-3 mr-1" />
                            {template.rating}
                          </span>
                        </div>
                        
                        <Button 
                          size="sm"
                          onClick={() => handleCreateFromTemplate(template)}
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={importDialog} onOpenChange={setImportDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Dashboard</DialogTitle>
                <DialogDescription>
                  Import a dashboard from exported JSON data
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Dashboard Data (JSON)</Label>
                  <textarea
                    className="w-full h-32 mt-1 p-3 border rounded-md font-mono text-sm"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste exported dashboard JSON here..."
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportDashboard}>
                  Import Dashboard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={newDashboardDialog} onOpenChange={setNewDashboardDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Dashboard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Dashboard</DialogTitle>
                <DialogDescription>
                  Create a custom dashboard for your analytics needs
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="dashboard-name">Dashboard Name *</Label>
                  <Input
                    id="dashboard-name"
                    value={newDashboard.name}
                    onChange={(e) => setNewDashboard({...newDashboard, name: e.target.value})}
                    placeholder="Enter dashboard name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dashboard-description">Description</Label>
                  <Input
                    id="dashboard-description"
                    value={newDashboard.description}
                    onChange={(e) => setNewDashboard({...newDashboard, description: e.target.value})}
                    placeholder="Optional description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="dashboard-category">Category</Label>
                  <Select 
                    value={newDashboard.category} 
                    onValueChange={(value) => setNewDashboard({...newDashboard, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="dashboard-public"
                    checked={newDashboard.isPublic}
                    onCheckedChange={(checked) => setNewDashboard({...newDashboard, isPublic: checked})}
                  />
                  <Label htmlFor="dashboard-public">Make dashboard public</Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewDashboardDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateDashboard}>
                  Create Dashboard
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Active Dashboard */}
      {activeDashboard ? (
        <Tabs defaultValue="dashboard" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="manage">Manage</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Active:</span>
              <Badge variant="outline">{activeDashboard.name}</Badge>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleExportDashboard(activeDashboard)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="dashboard">
            <CustomDashboard
              widgets={activeDashboard.widgets}
              onWidgetUpdate={(widget) => actions.updateWidget(activeDashboard.id, widget)}
              onWidgetDelete={(widgetId) => actions.deleteWidget(activeDashboard.id, widgetId)}
              onWidgetAdd={(widget) => actions.addWidget(activeDashboard.id, widget)}
              onLayoutChange={(layout) => actions.updateLayout(activeDashboard.id, layout)}
              onDashboardSave={() => {
                toast({
                  title: "Dashboard Saved",
                  description: "All changes have been saved successfully."
                });
              }}
            />
          </TabsContent>

          <TabsContent value="manage" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search dashboards..."
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : 
                       category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dashboards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDashboards.map(dashboard => (
                <Card 
                  key={dashboard.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    dashboard.id === state.activeDashboard && "ring-2 ring-primary"
                  )}
                  onClick={() => actions.setActiveDashboard(dashboard.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center">
                          {dashboard.name}
                          {dashboard.isDefault && (
                            <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{dashboard.description}</CardDescription>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateDashboard(dashboard);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportDashboard(dashboard);
                          }}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        
                        {!dashboard.isDefault && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDashboard(dashboard);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center text-muted-foreground">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          {dashboard.widgets.length} widgets
                        </span>
                        <Badge variant="outline">{dashboard.category}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Updated {dashboard.updatedAt.toLocaleDateString()}</span>
                        {dashboard.isPublic && (
                          <Badge variant="outline" className="text-xs">
                            <Share2 className="h-2 w-2 mr-1" />
                            Public
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredDashboards.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Dashboards Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || selectedCategory !== 'all' 
                        ? 'No dashboards match your current filters.'
                        : 'Create your first dashboard to get started.'}
                    </p>
                    {(!searchTerm && selectedCategory === 'all') && (
                      <Button onClick={() => setNewDashboardDialog(true)}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Dashboard
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Preferences</CardTitle>
                <CardDescription>
                  Configure your dashboard behavior and appearance
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">General Settings</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-save Changes</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically save dashboard changes
                        </p>
                      </div>
                      <Switch
                        checked={state.preferences.autoSave}
                        onCheckedChange={(checked) => handleUpdatePreferences('autoSave', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-refresh Data</Label>
                        <p className="text-xs text-muted-foreground">
                          Automatically refresh widget data
                        </p>
                      </div>
                      <Switch
                        checked={state.preferences.autoRefresh}
                        onCheckedChange={(checked) => handleUpdatePreferences('autoRefresh', checked)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Refresh Interval (seconds)</Label>
                      <Select
                        value={state.preferences.refreshInterval.toString()}
                        onValueChange={(value) => handleUpdatePreferences('refreshInterval', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10000">10 seconds</SelectItem>
                          <SelectItem value="30000">30 seconds</SelectItem>
                          <SelectItem value="60000">1 minute</SelectItem>
                          <SelectItem value="300000">5 minutes</SelectItem>
                          <SelectItem value="900000">15 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Layout Settings</h4>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Show Grid Lines</Label>
                        <p className="text-xs text-muted-foreground">
                          Display grid lines in edit mode
                        </p>
                      </div>
                      <Switch
                        checked={state.preferences.showGridLines}
                        onCheckedChange={(checked) => handleUpdatePreferences('showGridLines', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Snap to Grid</Label>
                        <p className="text-xs text-muted-foreground">
                          Snap widgets to grid when moving
                        </p>
                      </div>
                      <Switch
                        checked={state.preferences.snapToGrid}
                        onCheckedChange={(checked) => handleUpdatePreferences('snapToGrid', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Animate Transitions</Label>
                        <p className="text-xs text-muted-foreground">
                          Smooth animations for widget changes
                        </p>
                      </div>
                      <Switch
                        checked={state.preferences.animateTransitions}
                        onCheckedChange={(checked) => handleUpdatePreferences('animateTransitions', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Dashboard Selected</h3>
              <p className="text-muted-foreground mb-4">
                Create or select a dashboard to start building your analytics interface.
              </p>
              <Button onClick={() => setNewDashboardDialog(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create First Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DashboardManager;