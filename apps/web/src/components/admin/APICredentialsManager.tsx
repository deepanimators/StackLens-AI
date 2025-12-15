import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Edit, Trash2, Eye, EyeOff, Activity } from "lucide-react";
import { authenticatedRequest } from "@/lib/auth";

interface APICredential {
  id: number;
  name: string;
  provider: string;
  endpoint?: string | null;
  priority?: number;
  isActive: boolean;
  isGlobal: boolean;
  userId?: number | null;
  rateLimit?: number | null;
  usageCount?: number;
  currentMonthUsage?: number;
  lastUsed?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CredentialFormData {
  name: string;
  provider: string;
  apiKey: string;
  apiSecret?: string;
  endpoint?: string;
  isGlobal: boolean;
  isActive?: boolean;
  rateLimit?: number;
  priority?: number;
}

const PROVIDERS = [
  { 
    value: "gemini", 
    label: "Google Gemini",
    description: "Google's Gemini AI models",
    endpoint: "https://generativelanguage.googleapis.com"
  },
  { 
    value: "openai", 
    label: "OpenAI",
    description: "GPT-4, GPT-3.5, and other OpenAI models",
    endpoint: "https://api.openai.com/v1"
  },
  { 
    value: "anthropic", 
    label: "Anthropic Claude",
    description: "Claude 3 and Claude 2 models",
    endpoint: "https://api.anthropic.com"
  },
  { 
    value: "deepseek", 
    label: "DeepSeek AI",
    description: "DeepSeek's reasoning and chat models",
    endpoint: "https://api.deepseek.com/v1"
  },
  { 
    value: "together", 
    label: "Together AI",
    description: "Fast inference for open-source models",
    endpoint: "https://api.together.xyz/v1"
  },
  { 
    value: "openrouter", 
    label: "OpenRouter",
    description: "Access multiple AI models through one API",
    endpoint: "https://openrouter.ai/api/v1"
  },
  { 
    value: "groq", 
    label: "Groq",
    description: "Ultra-fast LLM inference",
    endpoint: "https://api.groq.com/openai/v1"
  },
  { 
    value: "grok", 
    label: "Grok (xAI)",
    description: "Elon Musk's xAI Grok models",
    endpoint: "https://api.x.ai/v1"
  },
  { 
    value: "perplexity", 
    label: "Perplexity AI",
    description: "Online research and reasoning models",
    endpoint: "https://api.perplexity.ai"
  },
  { 
    value: "mistral", 
    label: "Mistral AI",
    description: "Mistral's open-source and commercial models",
    endpoint: "https://api.mistral.ai/v1"
  },
  { 
    value: "cohere", 
    label: "Cohere",
    description: "Command and Embed models",
    endpoint: "https://api.cohere.ai/v1"
  },
  { 
    value: "other", 
    label: "Other",
    description: "Custom API endpoint",
    endpoint: ""
  },
];

export function APICredentialsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<APICredential | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState<CredentialFormData>({
    name: "",
    provider: "gemini",
    apiKey: "",
    apiSecret: "",
    endpoint: "",
    isGlobal: true,
    rateLimit: undefined,
    priority: 100,
  });

  // Fetch credentials
  const { data: credentials = [], isLoading } = useQuery<APICredential[]>({
    queryKey: ["/api/admin/credentials"],
    queryFn: async () => {
      return await authenticatedRequest("GET", "/api/admin/credentials");
    },
  });

  // Create credential mutation
  const createMutation = useMutation({
    mutationFn: async (data: CredentialFormData) => {
      return await authenticatedRequest("POST", "/api/admin/credentials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credentials"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "API credential created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create credential",
        variant: "destructive",
      });
    },
  });

  // Update credential mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CredentialFormData> }) => {
      return await authenticatedRequest("PATCH", `/api/admin/credentials/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credentials"] });
      setIsEditDialogOpen(false);
      setSelectedCredential(null);
      resetForm();
      toast({
        title: "Success",
        description: "API credential updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update credential",
        variant: "destructive",
      });
    },
  });

  // Delete credential mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await authenticatedRequest("DELETE", `/api/admin/credentials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/credentials"] });
      toast({
        title: "Success",
        description: "API credential deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete credential",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "gemini",
      apiKey: "",
      apiSecret: "",
      endpoint: "",
      isGlobal: true,
      rateLimit: undefined,
      priority: 100,
    });
    setShowApiKey(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEdit = (credential: APICredential) => {
    setSelectedCredential(credential);
    setFormData({
      name: credential.name,
      provider: credential.provider,
      apiKey: "", // Don't populate for security
      apiSecret: "",
      endpoint: credential.endpoint || "",
      isGlobal: credential.isGlobal,
      rateLimit: credential.rateLimit || undefined,
      priority: credential.priority || 100,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCredential) return;
    
    // Only send changed fields
    const updateData: Partial<CredentialFormData> = {};
    if (formData.name !== selectedCredential.name) updateData.name = formData.name;
    if (formData.provider !== selectedCredential.provider) updateData.provider = formData.provider;
    if (formData.apiKey) updateData.apiKey = formData.apiKey;
    if (formData.apiSecret) updateData.apiSecret = formData.apiSecret;
    if (formData.endpoint !== selectedCredential.endpoint) updateData.endpoint = formData.endpoint;
    if (formData.rateLimit !== selectedCredential.rateLimit) updateData.rateLimit = formData.rateLimit;
    if (formData.priority !== selectedCredential.priority) updateData.priority = formData.priority;

    updateMutation.mutate({ id: selectedCredential.id, data: updateData });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this credential?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleActive = (credential: APICredential) => {
    updateMutation.mutate({
      id: credential.id,
      data: { isActive: !credential.isActive },
    });
  };

  const formatUsage = (current: number | undefined, limit: number | null | undefined) => {
    if (!limit) return `${current || 0} calls`;
    const percentage = ((current || 0) / limit) * 100;
    return `${current || 0} / ${limit} (${percentage.toFixed(1)}%)`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>API Credentials Management</span>
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credential
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Add New API Credential</DialogTitle>
                  <DialogDescription>
                    Configure a new API credential for AI providers
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Credential Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., gemini-primary"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(value) => {
                        const provider = PROVIDERS.find(p => p.value === value);
                        setFormData({ 
                          ...formData, 
                          provider: value,
                          endpoint: provider?.endpoint || ""
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{p.label}</span>
                              {p.description && (
                                <span className="text-xs text-muted-foreground">{p.description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.provider && PROVIDERS.find(p => p.value === formData.provider)?.description && (
                      <p className="text-sm text-muted-foreground">
                        {PROVIDERS.find(p => p.value === formData.provider)?.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="apiKey"
                        type={showApiKey ? "text" : "password"}
                        placeholder="Enter API key"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endpoint">Endpoint (Optional)</Label>
                    <Input
                      id="endpoint"
                      placeholder="https://api.example.com"
                      value={formData.endpoint}
                      onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    />
                    {formData.endpoint && (
                      <p className="text-xs text-muted-foreground">
                        Auto-populated from provider. Edit if using a custom endpoint.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority (Lower = Higher Priority)</Label>
                    <Input
                      id="priority"
                      type="number"
                      placeholder="100"
                      value={formData.priority || 100}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value ? parseInt(e.target.value) : 100,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Gemini=10, Groq=20, OpenRouter=30, OpenAI=40, Anthropic=50. Lower numbers have higher priority.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rateLimit">Monthly Rate Limit (Optional)</Label>
                    <Input
                      id="rateLimit"
                      type="number"
                      placeholder="10000"
                      value={formData.rateLimit || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rateLimit: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isGlobal">Global (Available to all users)</Label>
                    <Switch
                      id="isGlobal"
                      checked={formData.isGlobal}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isGlobal: checked })
                      }
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Credential"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading credentials...</div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API credentials configured. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly Usage</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell className="font-medium">{credential.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{credential.provider}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-blue-600">{credential.priority || 100}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge variant={credential.isActive ? "default" : "secondary"}>
                          {credential.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {credential.isGlobal && (
                          <Badge variant="outline">Global</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatUsage(credential.currentMonthUsage, credential.rateLimit)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {credential.lastUsed
                        ? new Date(credential.lastUsed).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(credential)}
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(credential)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(credential.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit API Credential</DialogTitle>
            <DialogDescription>
              Update credential settings. Leave API key blank to keep existing key.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Credential Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-provider">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-apiKey">API Key (leave blank to keep existing)</Label>
              <div className="flex space-x-2">
                <Input
                  id="edit-apiKey"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter new API key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-endpoint">Endpoint (Optional)</Label>
              <Input
                id="edit-endpoint"
                placeholder="https://api.example.com"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority (Lower = Higher Priority)</Label>
              <Input
                id="edit-priority"
                type="number"
                placeholder="100"
                value={formData.priority || 100}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: e.target.value ? parseInt(e.target.value) : 100,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Gemini=10, Groq=20, OpenRouter=30, OpenAI=40, Anthropic=50
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rateLimit">Monthly Rate Limit (Optional)</Label>
              <Input
                id="edit-rateLimit"
                type="number"
                placeholder="10000"
                value={formData.rateLimit || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rateLimit: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Credential"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
