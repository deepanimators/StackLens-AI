import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  EnhancedSearchableSelect,
  EnhancedSearchableSelectOption,
} from "@/components/ui/enhanced-searchable-select";
import { Label } from "@/components/ui/label";
import AdaptiveLayout from "@/components/adaptive-layout";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Store as StoreIcon,
  Monitor,
} from "lucide-react";
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";

interface Store {
  id: number;
  storeNumber: string;
  name: string;
  isActive: boolean;
}

interface Kiosk {
  id: number;
  kioskNumber: string;
  storeId: number;
  name: string;
  isActive: boolean;
}

interface UploadFile {
  id: string;
  file: File;
  status: "pending" | "uploading" | "analyzing" | "completed" | "error";
  progress: number;
  error?: string;
  result?: {
    fileId: number;
    errors: number;
  };
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedKiosk, setSelectedKiosk] = useState<string>("");
  const [filteredKiosks, setFilteredKiosks] = useState<Kiosk[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stores on mount
  useEffect(() => {
    fetchStores();
    fetchKiosks();
  }, []);

  // Filter kiosks when store changes
  useEffect(() => {
    if (selectedStore) {
      const store = stores.find((s) => s.storeNumber === selectedStore);
      if (store) {
        const filtered = kiosks.filter((k) => k.storeId === store.id);
        setFilteredKiosks(filtered);
        // Reset kiosk selection if current kiosk not in filtered list
        if (selectedKiosk && !filtered.find((k) => k.kioskNumber === selectedKiosk)) {
          setSelectedKiosk("");
        }
      }
    } else {
      setFilteredKiosks([]);
      setSelectedKiosk("");
    }
  }, [selectedStore, stores, kiosks, selectedKiosk]);

  const fetchStores = async () => {
    try {
      const data = await authenticatedRequest("GET", "/api/stores");
      setStores(data.filter((s: Store) => s.isActive));
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    }
  };

  const fetchKiosks = async () => {
    try {
      const data = await authenticatedRequest("GET", "/api/kiosks");
      setKiosks(data.filter((k: Kiosk) => k.isActive));
    } catch (error) {
      console.error("Failed to fetch kiosks:", error);
    }
  };

  // Add new store functionality
  const addNewStore = async (storeName: string) => {
    try {
      const newStore = await authenticatedRequest("POST", "/api/stores", {
        name: storeName,
        storeNumber: `ST-${Date.now()}`, // Generate unique store number
        isActive: true,
      });
      
      // Refresh stores list
      await fetchStores();
      
      // Auto-select the new store
      setSelectedStore(newStore.storeNumber);
      
      toast({
        title: "Success",
        description: `Store "${storeName}" has been added successfully.`,
      });
    } catch (error) {
      console.error("Failed to add new store:", error);
      toast({
        title: "Error",
        description: "Failed to add new store. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add new kiosk functionality  
  const addNewKiosk = async (kioskName: string) => {
    if (!selectedStore) {
      toast({
        title: "Error",
        description: "Please select a store first before adding a kiosk.",
        variant: "destructive",
      });
      return;
    }

    const store = stores.find((s) => s.storeNumber === selectedStore);
    if (!store) {
      toast({
        title: "Error", 
        description: "Invalid store selected. Please select a valid store.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newKiosk = await authenticatedRequest("POST", "/api/kiosks", {
        name: kioskName,
        kioskNumber: `KS-${Date.now()}`, // Generate unique kiosk number
        storeId: store.id,
        isActive: true,
      });
      
      // Refresh kiosks list
      await fetchKiosks();
      
      // Auto-select the new kiosk
      setSelectedKiosk(newKiosk.kioskNumber);
      
      toast({
        title: "Success",
        description: `Kiosk "${kioskName}" has been added successfully.`,
      });
    } catch (error) {
      console.error("Failed to add new kiosk:", error);
      toast({
        title: "Error",
        description: "Failed to add new kiosk. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt", ".log"],
      "application/json": [".json"],
      "application/xml": [".xml"],
      "text/yaml": [".yaml", ".yml"],
      "text/csv": [".csv"],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: UploadFile) => {
      const formData = new FormData();
      formData.append("files", uploadFile.file);
      
      // Add store/kiosk metadata
      if (selectedStore) {
        formData.append("storeNumber", selectedStore);
      }
      if (selectedKiosk) {
        formData.append("kioskNumber", selectedKiosk);
      }

      const response = await authenticatedRequest(
        "POST",
        "/api/files/upload",
        formData
      );
      return response; // authenticatedRequest already parses JSON
    },
    onSuccess: async (data, uploadFile) => {
      if (!data.files || data.files.length === 0) {
        throw new Error("No files returned from upload");
      }
      const fileId = data.files[0].id;

      // Update status to analyzing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "analyzing", progress: 50 }
            : f
        )
      );

      // Start analysis
      try {
        const analysisResponse = await authenticatedRequest(
          "POST",
          `/api/files/${fileId}/analyze`
        );
        const analysisData = analysisResponse; // authenticatedRequest already parses JSON

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  result: { fileId, errors: analysisData.errors },
                }
              : f
          )
        );

        toast({
          title: "Success",
          description: `File analyzed successfully. Found ${analysisData.errors} errors.`,
        });
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error", error: "Analysis failed" }
              : f
          )
        );
      }
    },
    onError: (error, uploadFile) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "error", error: error.message }
            : f
        )
      );
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: "uploading", progress: 25 } : f
      )
    );
    uploadMutation.mutate(uploadFile);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUploadAll = () => {
    files.filter((f) => f.status === "pending").forEach(handleUpload);
  };

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "pending":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "uploading":
      case "analyzing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: UploadFile["status"]) => {
    switch (status) {
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "uploading":
      case "analyzing":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <AdaptiveLayout
      title="Upload Files"
      subtitle="Upload log files for AI-powered analysis"
    >
      {/* Store/Kiosk Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5" />
            Select Store and Kiosk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Selector */}
            <div className="space-y-2">
              <Label htmlFor="store-select">
                Store <span className="text-red-500">*</span>
              </Label>
              <EnhancedSearchableSelect
                id="store-select"
                options={stores.map((store): EnhancedSearchableSelectOption => ({
                  value: store.storeNumber,
                  label: `${store.storeNumber} - ${store.name}`,
                  searchText: `${store.storeNumber} ${store.name}`,
                }))}
                value={selectedStore}
                onValueChange={setSelectedStore}
                onAddNew={addNewStore}
                allowAddNew={true}
                placeholder="Search and select a store"
                searchPlaceholder="Search stores..."
                emptyText="No stores found."
                addNewText="Add New Store"
              />
              <p className="text-xs text-muted-foreground">
                {stores.length === 0
                  ? "No stores available"
                  : `${stores.length} active stores`}
              </p>
            </div>

            {/* Kiosk Selector */}
            <div className="space-y-2">
              <Label htmlFor="kiosk-select">
                Kiosk <span className="text-red-500">*</span>
              </Label>
              <EnhancedSearchableSelect
                id="kiosk-select"
                options={filteredKiosks.map((kiosk): EnhancedSearchableSelectOption => ({
                  value: kiosk.kioskNumber,
                  label: `${kiosk.kioskNumber} - ${kiosk.name}`,
                  searchText: `${kiosk.kioskNumber} ${kiosk.name}`,
                }))}
                value={selectedKiosk}
                onValueChange={setSelectedKiosk}
                onAddNew={addNewKiosk}
                allowAddNew={true}
                disabled={!selectedStore}
                placeholder="Search and select a kiosk"
                searchPlaceholder="Search kiosks..."
                emptyText="No kiosks found for this store."
                addNewText="Add New Kiosk"
              />
              <p className="text-xs text-muted-foreground">
                {!selectedStore
                  ? "Select a store first"
                  : filteredKiosks.length === 0
                  ? "No kiosks available for this store"
                  : `${filteredKiosks.length} active kiosks`}
              </p>
            </div>
          </div>

          {!selectedStore || !selectedKiosk ? (
            <Alert className="mt-4">
              <Monitor className="h-4 w-4" />
              <AlertDescription>
                Please select both a store and kiosk before uploading files. This metadata will be associated with all uploaded log files.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Files will be uploaded for: <strong>{selectedStore}</strong> / <strong>{selectedKiosk}</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Log Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              !selectedStore || !selectedKiosk
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            } ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} disabled={!selectedStore || !selectedKiosk} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {!selectedStore || !selectedKiosk
                ? "Select store and kiosk above to enable upload"
                : isDragActive
                ? "Drop files here"
                : "Drop files here or click to browse"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: {SUPPORTED_FILE_TYPES.join(", ")}
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Files to Upload</h3>
                <Button
                  onClick={handleUploadAll}
                  disabled={
                    files.every((f) => f.status !== "pending") ||
                    !selectedStore ||
                    !selectedKiosk
                  }
                >
                  Upload All
                </Button>
              </div>

              <div className="space-y-3">
                {files.map((uploadFile) => (
                  <Card key={uploadFile.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {getStatusIcon(uploadFile.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Badge
                          variant="secondary"
                          className={getStatusColor(uploadFile.status)}
                        >
                          {uploadFile.status === "uploading" && "Uploading..."}
                          {uploadFile.status === "analyzing" && "Analyzing..."}
                          {uploadFile.status === "pending" && "Pending"}
                          {uploadFile.status === "completed" && "Completed"}
                          {uploadFile.status === "error" && "Error"}
                        </Badge>

                        {uploadFile.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpload(uploadFile)}
                            disabled={
                              uploadMutation.isPending ||
                              !selectedStore ||
                              !selectedKiosk
                            }
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

                    {(uploadFile.status === "uploading" ||
                      uploadFile.status === "analyzing") && (
                      <div className="mt-3">
                        <Progress
                          value={uploadFile.progress}
                          className="w-full"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          {uploadFile.status === "uploading"
                            ? "Uploading..."
                            : "Analyzing..."}
                        </p>
                      </div>
                    )}

                    {uploadFile.status === "completed" && uploadFile.result && (
                      <Alert className="mt-3">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Analysis completed successfully. Found{" "}
                          {uploadFile.result.errors} errors.
                        </AlertDescription>
                      </Alert>
                    )}

                    {uploadFile.status === "error" && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {uploadFile.error || "Upload failed"}
                        </AlertDescription>
                      </Alert>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Supported File Types</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Log files (.log, .txt)</li>
                <li>• JSON files (.json)</li>
                <li>• XML files (.xml)</li>
                <li>• YAML files (.yaml, .yml)</li>
                <li>• CSV files (.csv)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3">Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Keep files under 10MB for optimal performance</li>
                <li>• Use descriptive filenames</li>
                <li>• Ensure logs contain timestamps</li>
                <li>• Include error stack traces when available</li>
                <li>• Upload multiple files for batch analysis</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </AdaptiveLayout>
  );
}
