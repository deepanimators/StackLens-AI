import React, { useState, useCallback } from 'react';
import { Save, Bookmark, Search, Settings, Trash2, Edit, Star, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AdvancedQuery } from './query-builder';

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: AdvancedQuery;
  isPublic: boolean;
  isFavorite: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  executionCount: number;
  lastExecutedAt?: Date;
  createdBy: string;
}

interface SavedSearchesManagerProps {
  searches: SavedSearch[];
  onSaveSearch?: (search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'lastExecutedAt'>) => void;
  onUpdateSearch?: (id: string, updates: Partial<SavedSearch>) => void;
  onDeleteSearch?: (id: string) => void;
  onExecuteSearch?: (search: SavedSearch) => void;
  onImportSearch?: (searchData: string) => void;
  onExportSearch?: (search: SavedSearch) => void;
  className?: string;
  currentQuery?: AdvancedQuery;
}

export function SavedSearchesManager({
  searches = [],
  onSaveSearch,
  onUpdateSearch,
  onDeleteSearch,
  onExecuteSearch,
  onImportSearch,
  onExportSearch,
  className,
  currentQuery
}: SavedSearchesManagerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterTag, setFilterTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated' | 'executions'>('updated');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState('');
  const { toast } = useToast();

  // New search form state
  const [newSearch, setNewSearch] = useState({
    name: '',
    description: '',
    isPublic: false,
    isFavorite: false,
    tags: [] as string[],
    tagInput: ''
  });

  // Get all unique tags
  const allTags = Array.from(new Set(searches.flatMap(s => s.tags)));

  // Filter and sort searches
  const filteredSearches = searches
    .filter(search => {
      if (showFavoritesOnly && !search.isFavorite) return false;
      if (filterTag && !search.tags.includes(filterTag)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'executions':
          return b.executionCount - a.executionCount;
        default:
          return 0;
      }
    });

  // Handle save search
  const handleSaveSearch = useCallback(() => {
    if (!currentQuery || !newSearch.name.trim()) {
      toast({
        title: "Error",
        description: "Please provide a name for the search.",
        variant: "destructive"
      });
      return;
    }

    onSaveSearch?.({
      name: newSearch.name.trim(),
      description: newSearch.description.trim() || undefined,
      query: currentQuery,
      isPublic: newSearch.isPublic,
      isFavorite: newSearch.isFavorite,
      tags: newSearch.tags,
      createdBy: 'current-user' // This would come from auth context
    });

    // Reset form
    setNewSearch({
      name: '',
      description: '',
      isPublic: false,
      isFavorite: false,
      tags: [],
      tagInput: ''
    });
    setSaveDialogOpen(false);
    
    toast({
      title: "Search Saved",
      description: "Your search has been saved successfully."
    });
  }, [currentQuery, newSearch, onSaveSearch, toast]);

  // Handle add tag
  const handleAddTag = (target: 'new' | 'edit') => {
    const input = target === 'new' ? newSearch.tagInput : editingSearch?.tags.join(', ') || '';
    const tag = input.trim().toLowerCase();
    
    if (tag && tag.length > 0) {
      if (target === 'new') {
        if (!newSearch.tags.includes(tag)) {
          setNewSearch({
            ...newSearch,
            tags: [...newSearch.tags, tag],
            tagInput: ''
          });
        }
      } else if (editingSearch && !editingSearch.tags.includes(tag)) {
        setEditingSearch({
          ...editingSearch,
          tags: [...editingSearch.tags, tag]
        });
      }
    }
  };

  // Handle remove tag
  const handleRemoveTag = (tag: string, target: 'new' | 'edit') => {
    if (target === 'new') {
      setNewSearch({
        ...newSearch,
        tags: newSearch.tags.filter(t => t !== tag)
      });
    } else if (editingSearch) {
      setEditingSearch({
        ...editingSearch,
        tags: editingSearch.tags.filter(t => t !== tag)
      });
    }
  };

  // Handle update search
  const handleUpdateSearch = () => {
    if (!editingSearch) return;

    onUpdateSearch?.(editingSearch.id, {
      name: editingSearch.name,
      description: editingSearch.description,
      isPublic: editingSearch.isPublic,
      isFavorite: editingSearch.isFavorite,
      tags: editingSearch.tags
    });

    setEditingSearch(null);
    toast({
      title: "Search Updated",
      description: "Your search has been updated successfully."
    });
  };

  // Handle import search
  const handleImportSearch = () => {
    try {
      const searchData = JSON.parse(importData);
      onImportSearch?.(importData);
      setImportData('');
      setImportDialogOpen(false);
      toast({
        title: "Search Imported",
        description: "Search has been imported successfully."
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Invalid search data format.",
        variant: "destructive"
      });
    }
  };

  // Handle export search
  const handleExportSearch = (search: SavedSearch) => {
    const exportData = JSON.stringify(search, null, 2);
    navigator.clipboard.writeText(exportData);
    toast({
      title: "Search Exported",
      description: "Search data copied to clipboard."
    });
    onExportSearch?.(search);
  };

  // Handle toggle favorite
  const handleToggleFavorite = (search: SavedSearch) => {
    onUpdateSearch?.(search.id, { isFavorite: !search.isFavorite });
  };

  // Render search card
  const renderSearchCard = (search: SavedSearch) => (
    <Card key={search.id} className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-base truncate">{search.name}</CardTitle>
              {search.isFavorite && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
              {search.isPublic && (
                <Badge variant="secondary" className="text-xs">Public</Badge>
              )}
            </div>
            {search.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {search.description}
              </p>
            )}
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => onExecuteSearch?.(search)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Execute
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setEditingSearch(search)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleToggleFavorite(search)}
                >
                  <Star className={cn(
                    "h-4 w-4 mr-2",
                    search.isFavorite && "text-yellow-500 fill-current"
                  )} />
                  {search.isFavorite ? 'Unfavorite' : 'Favorite'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleExportSearch(search)}
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Separator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Search</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{search.name}"? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteSearch?.(search.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Tags */}
          {search.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {search.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(search.updatedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <Search className="h-3 w-3 mr-1" />
              {search.executionCount} runs
            </div>
          </div>
          
          {/* Quick execute button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => onExecuteSearch?.(search)}
          >
            <Search className="h-4 w-4 mr-2" />
            Execute Search
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Saved Searches</h3>
            <div className="flex items-center space-x-2">
              {/* Save Current Query */}
              {currentQuery && (
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Save className="h-4 w-4 mr-1" />
                      Save Current
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Search</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="search-name">Name *</Label>
                        <Input
                          id="search-name"
                          value={newSearch.name}
                          onChange={(e) => setNewSearch({ ...newSearch, name: e.target.value })}
                          placeholder="Enter search name"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="search-description">Description</Label>
                        <Textarea
                          id="search-description"
                          value={newSearch.description}
                          onChange={(e) => setNewSearch({ ...newSearch, description: e.target.value })}
                          placeholder="Optional description"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="search-tags">Tags</Label>
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <Input
                              id="search-tags"
                              value={newSearch.tagInput}
                              onChange={(e) => setNewSearch({ ...newSearch, tagInput: e.target.value })}
                              placeholder="Add tag and press Enter"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddTag('new');
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleAddTag('new')}
                            >
                              Add
                            </Button>
                          </div>
                          {newSearch.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {newSearch.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                    onClick={() => handleRemoveTag(tag, 'new')}
                                  >
                                    ×
                                  </Button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is-public"
                            checked={newSearch.isPublic}
                            onCheckedChange={(checked) => setNewSearch({ ...newSearch, isPublic: checked })}
                          />
                          <Label htmlFor="is-public">Make Public</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="is-favorite"
                            checked={newSearch.isFavorite}
                            onCheckedChange={(checked) => setNewSearch({ ...newSearch, isFavorite: checked })}
                          />
                          <Label htmlFor="is-favorite">Add to Favorites</Label>
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveSearch}>
                        Save Search
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Import Search */}
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Search</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="import-data">Search Data (JSON)</Label>
                      <Textarea
                        id="import-data"
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        placeholder="Paste exported search data here..."
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleImportSearch}>
                      Import Search
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filters and sorting */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="favorites-only"
                  checked={showFavoritesOnly}
                  onCheckedChange={setShowFavoritesOnly}
                />
                <Label htmlFor="favorites-only" className="text-sm">Favorites Only</Label>
              </div>
              
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Label className="text-sm">Sort by:</Label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Last Updated</SelectItem>
                  <SelectItem value="created">Created Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="executions">Most Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Searches grid/list */}
      {filteredSearches.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-2"
        )}>
          {filteredSearches.map(renderSearchCard)}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Saved Searches</h3>
              <p className="text-muted-foreground mb-4">
                {showFavoritesOnly || filterTag 
                  ? "No searches match your current filters."
                  : "Save your first search to get started."
                }
              </p>
              {(!showFavoritesOnly && !filterTag) && currentQuery && (
                <Button onClick={() => setSaveDialogOpen(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Current Search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Search Dialog */}
      {editingSearch && (
        <Dialog open={true} onOpenChange={() => setEditingSearch(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingSearch.name}
                  onChange={(e) => setEditingSearch({ ...editingSearch, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingSearch.description || ''}
                  onChange={(e) => setEditingSearch({ ...editingSearch, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1 mt-2">
                  {editingSearch.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                        onClick={() => handleRemoveTag(tag, 'edit')}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingSearch.isPublic}
                    onCheckedChange={(checked) => setEditingSearch({ ...editingSearch, isPublic: checked })}
                  />
                  <Label>Public</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingSearch.isFavorite}
                    onCheckedChange={(checked) => setEditingSearch({ ...editingSearch, isFavorite: checked })}
                  />
                  <Label>Favorite</Label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSearch(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSearch}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default SavedSearchesManager;