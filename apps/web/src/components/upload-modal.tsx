import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, X, CheckCircle, AlertTriangle } from "lucide-react";
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'analyzing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: {
    fileId: number;
    errors: number;
  };
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending' as const,
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt', '.log'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/yaml': ['.yaml', '.yml'],
      'text/csv': ['.csv'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: UploadFile) => {
      const formData = new FormData();
      formData.append('files', uploadFile.file);

      const response = await authenticatedRequest('POST', '/api/files/upload', formData);
      return response;
    },
    onSuccess: async (data, uploadFile) => {
      const fileId = data.files[0].id;
      
      // Update status to analyzing
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'analyzing', progress: 50 }
          : f
      ));

      // Start analysis
      try {
        const analysisResponse = await authenticatedRequest('POST', `/api/files/${fileId}/analyze`);
        const analysisData = analysisResponse;
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'completed', 
                progress: 100,
                result: { fileId, errors: analysisData.errors }
              }
            : f
        ));

        toast({
          title: "Success",
          description: `File analyzed successfully. Found ${analysisData.errors} errors.`,
        });

        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['/api/files'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      } catch (error) {
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error', error: 'Analysis failed' }
            : f
        ));
      }
    },
    onError: (error, uploadFile) => {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = (uploadFile: UploadFile) => {
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id 
        ? { ...f, status: 'uploading', progress: 25 }
        : f
    ));
    uploadMutation.mutate(uploadFile);
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUploadAll = () => {
    files.filter(f => f.status === 'pending').forEach(handleUpload);
  };

  const handleClose = () => {
    setFiles([]);
    onClose();
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case 'uploading':
      case 'analyzing':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'uploading':
      case 'analyzing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Log Files</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Drop files here' : 'Drop files here or click to browse'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: {SUPPORTED_FILE_TYPES.join(', ')}
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Files to Upload</h3>
                <Button 
                  onClick={handleUploadAll}
                  disabled={files.every(f => f.status !== 'pending')}
                  size="sm"
                >
                  Upload All
                </Button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {files.map((uploadFile) => (
                  <div key={uploadFile.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getStatusIcon(uploadFile.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{uploadFile.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={getStatusColor(uploadFile.status)}>
                          {uploadFile.status === 'uploading' && 'Uploading...'}
                          {uploadFile.status === 'analyzing' && 'Analyzing...'}
                          {uploadFile.status === 'pending' && 'Pending'}
                          {uploadFile.status === 'completed' && 'Completed'}
                          {uploadFile.status === 'error' && 'Error'}
                        </Badge>
                        
                        {uploadFile.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpload(uploadFile)}
                            disabled={uploadMutation.isPending}
                          >
                            Upload
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(uploadFile.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {(uploadFile.status === 'uploading' || uploadFile.status === 'analyzing') && (
                      <div className="mt-2">
                        <Progress value={uploadFile.progress} className="w-full" />
                        <p className="text-sm text-muted-foreground mt-1">
                          {uploadFile.status === 'uploading' ? 'Uploading...' : 'Analyzing...'}
                        </p>
                      </div>
                    )}
                    
                    {uploadFile.status === 'completed' && uploadFile.result && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                        Analysis completed successfully. Found {uploadFile.result.errors} errors.
                      </div>
                    )}
                    
                    {uploadFile.status === 'error' && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                        {uploadFile.error || 'Upload failed'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleClose}
              disabled={files.some(f => f.status === 'uploading' || f.status === 'analyzing')}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
