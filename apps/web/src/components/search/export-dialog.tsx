import React from 'react';
import { Download, FileSpreadsheet, FileText, FileImage, Clock, User, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export interface ExportConfig {
  format: 'csv' | 'json' | 'pdf' | 'xlsx';
  fields: string[];
  filters: {
    dateRange?: { start: Date; end: Date };
    severity?: string[];
    includeResolved?: boolean;
    includeStackTrace?: boolean;
    includeMetadata?: boolean;
  };
  options: {
    includeHeaders?: boolean;
    maxResults?: number;
    groupBy?: string;
    sortBy?: string;
    customFileName?: string;
  };
}

interface ExportDialogProps {
  totalResults: number;
  selectedResults: number;
  availableFields: Array<{ key: string; label: string; type: 'text' | 'date' | 'number' | 'boolean' }>;
  onExport: (config: ExportConfig) => void;
  isExporting?: boolean;
}

const DEFAULT_FIELDS = [
  { key: 'id', label: 'ID', type: 'text' as const },
  { key: 'message', label: 'Error Message', type: 'text' as const },
  { key: 'errorType', label: 'Error Type', type: 'text' as const },
  { key: 'severity', label: 'Severity', type: 'text' as const },
  { key: 'fileName', label: 'File Name', type: 'text' as const },
  { key: 'lineNumber', label: 'Line Number', type: 'number' as const },
  { key: 'timestamp', label: 'Timestamp', type: 'date' as const },
  { key: 'count', label: 'Occurrence Count', type: 'number' as const },
  { key: 'firstSeen', label: 'First Seen', type: 'date' as const },
  { key: 'lastSeen', label: 'Last Seen', type: 'date' as const },
  { key: 'resolved', label: 'Resolved Status', type: 'boolean' as const },
  { key: 'stackTrace', label: 'Stack Trace', type: 'text' as const },
  { key: 'tags', label: 'Tags', type: 'text' as const },
  { key: 'contextSnippet', label: 'Context Snippet', type: 'text' as const },
  { key: 'relevanceScore', label: 'Relevance Score', type: 'number' as const }
];

export function ExportDialog({
  totalResults,
  selectedResults,
  availableFields = DEFAULT_FIELDS,
  onExport,
  isExporting = false
}: ExportDialogProps) {
  const [config, setConfig] = React.useState<ExportConfig>({
    format: 'csv',
    fields: ['message', 'errorType', 'severity', 'timestamp', 'fileName'],
    filters: {
      includeResolved: true,
      includeStackTrace: false,
      includeMetadata: false
    },
    options: {
      includeHeaders: true,
      maxResults: totalResults,
      customFileName: `stacklens-errors-${new Date().toISOString().split('T')[0]}`
    }
  });
  
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  const formatOptions = [
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Comma-separated values for Excel/Google Sheets' },
    { value: 'json', label: 'JSON', icon: FileText, description: 'Structured data format for developers' },
    { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, description: 'Microsoft Excel workbook format' },
    { value: 'pdf', label: 'PDF', icon: FileImage, description: 'Formatted report for sharing and printing' }
  ];

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    const newFields = checked
      ? [...config.fields, fieldKey]
      : config.fields.filter(f => f !== fieldKey);
    setConfig({ ...config, fields: newFields });
  };

  const handleSelectAllFields = (checked: boolean) => {
    const newFields = checked ? availableFields.map(f => f.key) : [];
    setConfig({ ...config, fields: newFields });
  };

  const handleExport = () => {
    if (config.fields.length === 0) {
      toast({
        title: "No Fields Selected",
        description: "Please select at least one field to export.",
        variant: "destructive"
      });
      return;
    }

    onExport(config);
    setOpen(false);
    
    toast({
      title: "Export Started",
      description: `Exporting ${config.options.maxResults} results as ${config.format.toUpperCase()}`
    });
  };

  const getEstimatedFileSize = () => {
    const avgFieldSize = {
      'csv': 50,
      'json': 100,
      'xlsx': 80,
      'pdf': 200
    };
    
    const size = (config.options.maxResults || 0) * config.fields.length * (avgFieldSize[config.format] || 50);
    
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedFormat = formatOptions.find(f => f.value === config.format);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Results
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Search Results
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Configure and download your search results in various formats
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{totalResults.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Total Results</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{selectedResults.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">Selected</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{config.fields.length}</div>
                  <div className="text-xs text-muted-foreground">Fields</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{getEstimatedFileSize()}</div>
                  <div className="text-xs text-muted-foreground">Est. Size</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Format</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formatOptions.map((format) => {
                  const Icon = format.icon;
                  return (
                    <div
                      key={format.value}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        config.format === format.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setConfig({ ...config, format: format.value as ExportConfig['format'] })}
                    >
                      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{format.label}</span>
                          <input
                            type="radio"
                            checked={config.format === format.value}
                            onChange={() => setConfig({ ...config, format: format.value as ExportConfig['format'] })}
                            className="text-primary"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{format.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File name */}
                <div>
                  <Label htmlFor="filename" className="text-sm">Custom File Name</Label>
                  <Input
                    id="filename"
                    value={config.options.customFileName || ''}
                    onChange={(e) => setConfig({
                      ...config,
                      options: { ...config.options, customFileName: e.target.value }
                    })}
                    placeholder="Enter custom filename"
                    className="mt-1"
                  />
                </div>

                {/* Max results */}
                <div>
                  <Label htmlFor="maxResults" className="text-sm">Max Results</Label>
                  <Select 
                    value={String(config.options.maxResults)}
                    onValueChange={(value) => setConfig({
                      ...config,
                      options: { ...config.options, maxResults: Number(value) }
                    })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(selectedResults)}>
                        Selected Only ({selectedResults.toLocaleString()})
                      </SelectItem>
                      <SelectItem value="100">100 Results</SelectItem>
                      <SelectItem value="500">500 Results</SelectItem>
                      <SelectItem value="1000">1,000 Results</SelectItem>
                      <SelectItem value="5000">5,000 Results</SelectItem>
                      <SelectItem value={String(totalResults)}>
                        All Results ({totalResults.toLocaleString()})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Format-specific options */}
                {(config.format === 'csv' || config.format === 'xlsx') && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeHeaders"
                      checked={config.options.includeHeaders}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        options: { ...config.options, includeHeaders: checked as boolean }
                      })}
                    />
                    <Label htmlFor="includeHeaders" className="text-sm">Include column headers</Label>
                  </div>
                )}

                {/* Data options */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeResolved"
                      checked={config.filters.includeResolved}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        filters: { ...config.filters, includeResolved: checked as boolean }
                      })}
                    />
                    <Label htmlFor="includeResolved" className="text-sm">Include resolved errors</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeStackTrace"
                      checked={config.filters.includeStackTrace}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        filters: { ...config.filters, includeStackTrace: checked as boolean }
                      })}
                    />
                    <Label htmlFor="includeStackTrace" className="text-sm">Include full stack traces</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeMetadata"
                      checked={config.filters.includeMetadata}
                      onCheckedChange={(checked) => setConfig({
                        ...config,
                        filters: { ...config.filters, includeMetadata: checked as boolean }
                      })}
                    />
                    <Label htmlFor="includeMetadata" className="text-sm">Include metadata and custom fields</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Field Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Select Fields to Export</CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="selectAll"
                    checked={config.fields.length === availableFields.length}
                    onCheckedChange={handleSelectAllFields}
                  />
                  <Label htmlFor="selectAll" className="text-sm">Select All</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableFields.map((field) => (
                  <div key={field.key} className="flex items-center space-x-2 p-2 rounded border">
                    <Checkbox
                      id={field.key}
                      checked={config.fields.includes(field.key)}
                      onCheckedChange={(checked) => handleFieldToggle(field.key, checked as boolean)}
                    />
                    <Label htmlFor={field.key} className="text-sm flex-1 cursor-pointer">
                      {field.label}
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                  </div>
                ))}
              </div>
              
              {config.fields.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No fields selected. Please select at least one field to export.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          {selectedFormat && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  {React.createElement(selectedFormat.icon, { className: "h-4 w-4 mr-2" })}
                  Export Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Format:</span> {selectedFormat.label}
                    </div>
                    <div>
                      <span className="font-medium">Fields:</span> {config.fields.length} selected
                    </div>
                    <div>
                      <span className="font-medium">Records:</span> {config.options.maxResults?.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Size:</span> ~{getEstimatedFileSize()}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-sm font-medium">Selected Fields:</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.fields.map(fieldKey => {
                        const field = availableFields.find(f => f.key === fieldKey);
                        return field ? (
                          <Badge key={fieldKey} variant="secondary" className="text-xs">
                            {field.label}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Export may take a few moments for large datasets</span>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={config.fields.length === 0 || isExporting}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {config.format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;