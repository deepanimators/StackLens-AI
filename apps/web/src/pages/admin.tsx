import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import AdaptiveLayout from "@/components/adaptive-layout";
import { authenticatedRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLayout } from "@/contexts/layout-context";
import { useSettings } from "@/contexts/settings-context";
import LayoutSelector from "@/components/layout-selector";
import JiraIntegrationAdmin from "@/components/jira-integration-admin";
import { APICredentialsManager } from "@/components/admin/APICredentialsManager";
import {
  Users,
  Settings,
  Shield,
  Brain,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  BookOpen,
  Target,
  TrendingUp,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Database,
  Activity,
  Play,
  Layout,
  Sidebar as SidebarIcon,
  Navigation,
  Save,
  Key,
  ShoppingCart,
} from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
}

interface TrainingModule {
  id: number;
  title: string;
  description: string;
  content: string;
  difficulty: string;
  estimatedTime: number;
  isActive: boolean;
  createdAt: Date;
}

interface MLModel {
  id: number;
  name: string;
  version: string;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  isActive: boolean;
  trainedAt: Date;
  cvScore?: number | null;
  confidenceInterval?: {
    lower: number;
    upper: number;
  } | null;
  performanceGrade?: string | null;
  trainingTimeHours?: number;
  dataQualityScore?: number;
}

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalTrainingModules: number;
  totalMLModels: number;
  activeMLModels: number;
  systemHealth: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refetchSettings } = useSettings();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedTrainingModule, setSelectedTrainingModule] =
    useState<TrainingModule | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [isCreateTrainingOpen, setIsCreateTrainingOpen] = useState(false);
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [isEditTrainingOpen, setIsEditTrainingOpen] = useState(false);
  const [isEditModelOpen, setIsEditModelOpen] = useState(false);

  // Navigation state for mutually exclusive switches
  const [showTopNav, setShowTopNav] = useState(true);
  const [showSideNav, setShowSideNav] = useState(false); // Fixed: should start as false
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);

  // API settings state
  const [isGeminiApiKeyLocked, setIsGeminiApiKeyLocked] = useState(false);

  // Fetch admin stats
  const { data: adminStats, isLoading: isLoadingAdminStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      return await authenticatedRequest("GET", "/api/admin/stats");
    },
  });

  // Fetch users
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      return await authenticatedRequest("GET", "/api/admin/users");
    },
  });

  // Fetch roles
  const { data: roles } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
    queryFn: async () => {
      return await authenticatedRequest("GET", "/api/admin/roles");
    },
  });

  // Fetch training modules
  const { data: trainingModules } = useQuery<TrainingModule[]>({
    queryKey: ["/api/admin/training-modules"],
    queryFn: async () => {
      return await authenticatedRequest("GET", "/api/admin/training-modules");
    },
  });

  // Fetch ML models
  const { data: mlModels } = useQuery<MLModel[]>({
    queryKey: ["/api/admin/models"],
    queryFn: async () => {
      return await authenticatedRequest("GET", "/api/admin/models");
    },
  });

  // Fetch admin UI settings
  const { data: adminUISettings } = useQuery({
    queryKey: ["/api/admin/ui-settings"],
    queryFn: async () => {
      const response = await authenticatedRequest(
        "GET",
        "/api/admin/ui-settings"
      );
      return response;
    },
  });

  // Fetch admin API settings
  const { data: adminAPISettings } = useQuery({
    queryKey: ["/api/admin/api-settings"],
    queryFn: async () => {
      const response = await authenticatedRequest(
        "GET",
        "/api/admin/api-settings"
      );
      return response;
    },
  });

  // Sync navigation state with fetched settings
  useEffect(() => {
    if (adminUISettings?.navigationPreferences) {
      console.log("=== USEEFFECT SYNC ===");
      console.log("Backend settings:", adminUISettings.navigationPreferences);
      console.log(
        "Current state before sync - showTopNav:",
        showTopNav,
        "showSideNav:",
        showSideNav
      );

      const newTopNav =
        adminUISettings.navigationPreferences.showTopNav ?? true;
      const newSideNav =
        adminUISettings.navigationPreferences.showSideNav ?? false;

      console.log(
        "Setting state to - showTopNav:",
        newTopNav,
        "showSideNav:",
        newSideNav
      );

      setShowTopNav(newTopNav);
      setShowSideNav(newSideNav);
    }
  }, [adminUISettings]);

  // Initialize API key lock state based on whether API key exists
  useEffect(() => {
    if (adminAPISettings?.geminiApiKey) {
      setIsGeminiApiKeyLocked(true);
    }
  }, [adminAPISettings]);

  // Handle navigation toggle - allow both false but provide defaults
  const handleTopNavToggle = (checked: boolean) => {
    console.log("=== TOP NAV TOGGLE ===");
    console.log(
      "Before - showTopNav:",
      showTopNav,
      "showSideNav:",
      showSideNav
    );
    console.log("Setting showTopNav to:", checked);

    setShowTopNav(checked);
    // Implement mutual exclusivity: if enabling top nav, disable side nav
    if (checked && showSideNav) {
      setShowSideNav(false);
    }
  };

  const handleSideNavToggle = (checked: boolean) => {
    console.log("=== SIDE NAV TOGGLE ===");
    console.log(
      "Before - showTopNav:",
      showTopNav,
      "showSideNav:",
      showSideNav
    );
    console.log("Setting showSideNav to:", checked);

    setShowSideNav(checked);
    // Implement mutual exclusivity: if enabling side nav, disable top nav
    if (checked && showTopNav) {
      setShowTopNav(false);
    }
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/admin/users",
        userData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateUserOpen(false);
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await authenticatedRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Train ML model mutation
  const trainModelMutation = useMutation({
    mutationFn: async (modelData: any) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/admin/models/train", // Fixed: use correct endpoint
        modelData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/models"] });
      setIsTrainingModalOpen(false);
      toast({
        title: "Success",
        description: "Model training started successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start model training",
        variant: "destructive",
      });
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await authenticatedRequest(
        "PATCH",
        `/api/admin/users/${userData.id}`,
        userData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsEditUserOpen(false);
      setSelectedUser(null);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/admin/roles",
        roleData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsCreateRoleOpen(false);
      toast({
        title: "Success",
        description: "Role created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      });
    },
  });

  // Edit role mutation
  const editRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      const response = await authenticatedRequest(
        "PUT",
        `/api/admin/roles/${roleData.id}`,
        roleData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setIsEditRoleOpen(false);
      setSelectedRole(null);
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    },
  });

  // Create training module mutation
  const createTrainingMutation = useMutation({
    mutationFn: async (moduleData: any) => {
      const response = await authenticatedRequest(
        "POST",
        "/api/admin/training-modules",
        moduleData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/training-modules"],
      });
      setIsCreateTrainingOpen(false);
      toast({
        title: "Success",
        description: "Training module created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create training module",
        variant: "destructive",
      });
    },
  });

  // Edit training module mutation
  const editTrainingMutation = useMutation({
    mutationFn: async (moduleData: any) => {
      const response = await authenticatedRequest(
        "PUT",
        `/api/admin/training-modules/${moduleData.id}`,
        moduleData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/training-modules"],
      });
      setIsEditTrainingOpen(false);
      setSelectedTrainingModule(null);
      toast({
        title: "Success",
        description: "Training module updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update training module",
        variant: "destructive",
      });
    },
  });

  // Edit model mutation
  const editModelMutation = useMutation({
    mutationFn: async (modelData: any) => {
      const response = await authenticatedRequest(
        "PUT",
        `/api/admin/models/${modelData.id}`,
        modelData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/models"] });
      setIsEditModelOpen(false);
      setSelectedModel(null);
      toast({
        title: "Success",
        description: "Model updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update model",
        variant: "destructive",
      });
    },
  });

  // Delete ML model mutation
  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: number) => {
      const response = await authenticatedRequest(
        "DELETE",
        `/api/admin/models/${modelId}`
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/models"] });
      toast({
        title: "Success",
        description: "Model deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete model",
        variant: "destructive",
      });
    },
  });

  // Admin Settings Handlers
  const handleSaveUISettings = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);

    const uiSettings = {
      theme: formData.get("theme") || "dark",
      navigationPreferences: {
        showTopNav: showTopNav, // Use state values
        showSideNav: showSideNav, // Use state values
        topNavStyle: formData.get("topNavStyle") || "fixed",
        topNavColor: formData.get("topNavColor") || "#1f2937",
        sideNavStyle: formData.get("sideNavStyle") || "collapsible",
        sideNavPosition: formData.get("sideNavPosition") || "left",
        sideNavColor: formData.get("sideNavColor") || "#374151",
        enableBreadcrumbs: formData.get("enableBreadcrumbs") === "on",
      },
      displayPreferences: {
        primaryColor: formData.get("primaryColor") || "#3b82f6",
        itemsPerPage: parseInt(formData.get("itemsPerPage") as string) || 10,
        defaultView: formData.get("defaultView") || "grid",
      },
      denseMode: formData.get("denseMode") === "on",
      autoRefresh: formData.get("autoRefresh") === "on",
    };

    console.log("=== FRONTEND SAVE ===");
    console.log(
      "Current state - showTopNav:",
      showTopNav,
      "showSideNav:",
      showSideNav
    );
    console.log(
      "Sending UI settings:",
      JSON.stringify(uiSettings.navigationPreferences, null, 2)
    );

    try {
      await authenticatedRequest(
        "PUT",
        "/api/admin/ui-settings",
        uiSettings
      );
      
      // Refresh the UI settings data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ui-settings"] });
      refetchSettings(); // Apply settings immediately
      toast({
        title: "Success",
        description: "UI settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save UI settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveAPISettings = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);

    const apiSettings = {
      geminiApiKey: formData.get("geminiApiKey"),
      webhookUrl: formData.get("webhookUrl"),
      maxFileSize: formData.get("maxFileSize"),
      autoAnalysis: formData.get("autoAnalysis") === "on",
    };

    try {
      await authenticatedRequest(
        "PUT",
        "/api/admin/api-settings",
        apiSettings
      );
      
      // Lock the Gemini API key after successful save
      if (apiSettings.geminiApiKey) {
        setIsGeminiApiKeyLocked(true);
      }

      // Refresh the API settings data
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/api-settings"],
      });
      refetchSettings(); // Apply settings immediately
      toast({
        title: "Success",
        description: "API settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save API settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveSystemSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);

    const systemSettings = {
      defaultTimezone: formData.get("defaultTimezone"),
      defaultLanguage: formData.get("defaultLanguage"),
      emailNotifications: formData.get("emailNotifications") === "on",
      weeklyReports: formData.get("weeklyReports") === "on",
    };

    try {
      await authenticatedRequest(
        "PUT",
        "/api/admin/system-settings",
        systemSettings
      );
      
      // Refresh the API settings data
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/api-settings"],
      });
      refetchSettings(); // Apply settings immediately
      toast({
        title: "Success",
        description: "System settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save system settings",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const userData = {
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      department: formData.get("department"),
    };
    createUserMutation.mutate(userData);
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleCreateRole = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    
    let permissions;
    try {
      const permissionsText = formData.get("permissions") as string;
      permissions = permissionsText ? JSON.parse(permissionsText) : {};
    } catch {
      permissions = {};
    }

    const roleData = {
      name: formData.get("name"),
      description: formData.get("description"),
      permissions,
      isActive: formData.get("isActive") === "on",
    };
    createRoleMutation.mutate(roleData);
  };

  const handleCreateTraining = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const moduleData = {
      title: formData.get("title"),
      description: formData.get("description"),
      content: formData.get("content"),
      difficulty: formData.get("difficultyLevel") || "beginner",
      estimatedDuration: 60, // Default 60 minutes
      isActive: true,
      createdBy: 1, // Will be set by backend from auth
    };
    createTrainingMutation.mutate(moduleData);
  };

  const handleTrainModel = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    const modelData = {
      modelName: formData.get("modelName"),
      description: formData.get("description"),
    };
    trainModelMutation.mutate(modelData);
  };

  const handleEditUser = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(event.target as HTMLFormElement);
    const userData = {
      id: selectedUser.id,
      username: formData.get("username"),
      email: formData.get("email"),
      role: formData.get("role"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      department: formData.get("department"),
      isActive: formData.get("isActive") === "true",
    };

    // Only include password if it's provided
    const password = formData.get("password") as string;
    if (password && password.trim()) {
      userData.password = password;
    }

    editUserMutation.mutate(userData);
  };

  const handleEditRole = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRole) return;

    const formData = new FormData(event.target as HTMLFormElement);
    const roleData = {
      id: selectedRole.id,
      name: formData.get("name"),
      description: formData.get("description"),
      permissions:
        formData
          .get("permissions")
          ?.toString()
          .split(",")
          .map((p) => p.trim()) || [],
      isActive: formData.get("isActive") === "true",
    };

    editRoleMutation.mutate(roleData);
  };

  const handleEditTraining = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTrainingModule) return;

    const formData = new FormData(event.target as HTMLFormElement);
    const moduleData = {
      id: selectedTrainingModule.id,
      title: formData.get("title"),
      description: formData.get("description"),
      content: formData.get("content"),
      difficulty: formData.get("difficulty"),
      estimatedTime: parseInt(formData.get("estimatedTime") as string),
      isActive: formData.get("isActive") === "true",
    };

    editTrainingMutation.mutate(moduleData);
  };

  const handleEditModel = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedModel) return;

    const formData = new FormData(event.target as HTMLFormElement);
    const modelData = {
      id: selectedModel.id,
      name: formData.get("name"),
      version: formData.get("version"),
      isActive: formData.get("isActive") === "true",
    };

    editModelMutation.mutate(modelData);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200";
      case "admin":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200";
      case "user":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200";
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200";
  };

  return (
    <AdaptiveLayout
      title="Admin Dashboard"
      subtitle="System Administration & AI Model Management"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="ai-models">AI Models</TabsTrigger>
          <TabsTrigger value="ui-settings">UI Settings</TabsTrigger>
          <TabsTrigger value="api-integration">API & Integration</TabsTrigger>
          <TabsTrigger value="jira-integration">Jira Integration</TabsTrigger>
          <TabsTrigger value="pos-integration">POS Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Health Status */}
          <Card className="border-0 bg-gradient-to-r from-green-50 to-blue-50 border-green-200/50 dark:from-green-950/20 dark:to-blue-950/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-lg font-semibold">
                    System Health: Excellent
                  </span>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      All services operational
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-muted-foreground">
                      Database: Connected
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {isLoadingAdminStats ? (
              Array.from({ length: 4 }, (_, i) => (
                <Card key={i} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
                        <div className="text-3xl font-bold">
                          <div className="flex items-center space-x-1 my-2 py-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center ring-2 ring-primary/10">
                        <Users className="w-7 h-7 text-primary animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <>
                <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">
                          Total Users
                        </p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {adminStats?.totalUsers || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {adminStats?.activeUsers || 0} active
                        </p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center ring-2 ring-primary/10">
                        <Users className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">
                          Total Roles
                        </p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {adminStats?.totalRoles || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Permission levels
                        </p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center ring-2 ring-primary/10">
                        <Shield className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">
                          Training Modules
                        </p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {adminStats?.totalTrainingModules || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Available courses
                        </p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center ring-2 ring-primary/10">
                        <BookOpen className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all duration-200 border-0 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium">
                          AI Models
                        </p>
                        <p className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {adminStats?.totalMLModels || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {adminStats?.activeMLModels || 0} active
                        </p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center ring-2 ring-primary/10">
                        <Brain className="w-7 h-7 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  className="flex items-center space-x-2 h-20"
                  onClick={() => setIsCreateUserOpen(true)}
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Create New User</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 h-20"
                  onClick={() => setIsCreateTrainingOpen(true)}
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Training Module</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex items-center space-x-2 h-20"
                  onClick={() => setIsTrainingModalOpen(true)}
                >
                  <Zap className="h-5 w-5" />
                  <span>Train AI Model</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">User Management</h2>
            <Button onClick={() => setIsCreateUserOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Role</th>
                      <th className="text-left py-3 px-4">Department</th>
                      <th className="text-left py-3 px-4">Status</th>
                      <th className="text-left py-3 px-4">Last Login</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={getRoleColor(user.role)}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          {user.department || "N/A"}
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={getStatusColor(user.isActive)}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditUserOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Role Management</h2>
            <Button onClick={() => setIsCreateRoleOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles?.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <Badge className={getStatusColor(role.isActive)}>
                      {role.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {role.description}
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.map((permission, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRole(role);
                        setIsEditRoleOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Training Management</h2>
            <Button onClick={() => setIsCreateTrainingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Module
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trainingModules?.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <Badge className={getStatusColor(module.isActive)}>
                      {module.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {module.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{module.estimatedTime} min</span>
                    </div>
                    <Badge variant="outline">{module.difficulty}</Badge>
                  </div>
                  <div className="flex items-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTrainingModule(module);
                        setIsEditTrainingOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai-models" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">AI Model Management</h2>
            <Button onClick={() => setIsTrainingModalOpen(true)}>
              <Zap className="h-4 w-4 mr-2" />
              Train New Model
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mlModels?.map((model) => (
              <Card key={model.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{model.name}</CardTitle>
                    <Badge className={getStatusColor(model.isActive)}>
                      {model.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Version</span>
                      <span className="text-sm">{model.version}</span>
                    </div>

                    {model.accuracy && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Accuracy</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">
                              {(model.accuracy * 100).toFixed(1)}%
                            </span>
                            {model.performanceGrade && (
                              <Badge variant="outline" className="text-xs">
                                Grade {model.performanceGrade}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress
                          value={model.accuracy * 100}
                          className="h-2"
                        />
                      </div>
                    )}

                    {model.precision && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Precision</span>
                        <span className="text-sm">
                          {(model.precision * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}

                    {model.recall && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Recall</span>
                        <span className="text-sm">
                          {(model.recall * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}

                    {model.f1Score && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">F1 Score</span>
                        <span className="text-sm">
                          {model.f1Score.toFixed(3)}
                        </span>
                      </div>
                    )}

                    {model.cvScore && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">CV Score</span>
                        <span className="text-sm">
                          {(model.cvScore * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}

                    {model.trainingLoss && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Training Loss
                        </span>
                        <span className="text-sm">
                          {model.trainingLoss.toFixed(4)}
                        </span>
                      </div>
                    )}

                    {model.validationLoss && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Validation Loss
                        </span>
                        <span className="text-sm">
                          {model.validationLoss.toFixed(4)}
                        </span>
                      </div>
                    )}

                    {model.topFeatures && model.topFeatures.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-sm font-medium">
                          Top Features
                        </span>
                        <div className="space-y-1">
                          {model.topFeatures
                            .slice(0, 3)
                            .map((feature, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-muted-foreground truncate flex-1">
                                  {feature.feature
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                                <div className="flex items-center space-x-2 ml-2">
                                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                      style={{
                                        width: `${(
                                          feature.importance * 100
                                        ).toFixed(0)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium w-8 text-right">
                                    {(feature.importance * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {model.dataQualityScore && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Data Quality
                        </span>
                        <span className="text-sm">
                          {(model.dataQualityScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}

                    {model.trainingTimeHours && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Training Time
                        </span>
                        <span className="text-sm">
                          {model.trainingTimeHours}h
                        </span>
                      </div>
                    )}

                    {model.confidenceInterval && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium">
                          Confidence Interval
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {(model.confidenceInterval.lower * 100).toFixed(1)}% -{" "}
                          {(model.confidenceInterval.upper * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Trained: {new Date(model.trainedAt).toLocaleDateString()}
                    </div>

                    <div className="flex items-center space-x-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedModel(model);
                          setIsEditModelOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          trainModelMutation.mutate({
                            modelName: model.name, // Use existing name to update the model
                            description: `Updated version of ${model.name}`,
                          })
                        }
                        disabled={trainModelMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {trainModelMutation.isPending
                          ? "Training..."
                          : "Retrain"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (
                            confirm(
                              `Are you sure you want to delete the model "${model.name}"? This action cannot be undone.`
                            )
                          ) {
                            deleteModelMutation.mutate(model.id);
                          }
                        }}
                        disabled={deleteModelMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteModelMutation.isPending
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ui-settings" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">UI Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure the application's user interface and navigation
            </p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Layout className="h-5 w-5" />
                  <span>Navigation Layout</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure how navigation is displayed across the application
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">i</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Navigation Layout Behavior
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Top Navigation and Side Navigation are mutually
                        exclusive. When one is enabled, the other will be
                        automatically disabled. Dependent options (like style,
                        position, and background) are only available when their
                        respective navigation type is enabled.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSaveUISettings} className="space-y-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card
                        className={`transition-all duration-200 ${
                          showTopNav
                            ? "border-blue-200 dark:border-blue-700 shadow-md"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center space-x-2">
                            <Navigation className="h-4 w-4" />
                            <h4 className="font-medium">Top Navigation</h4>
                            {showTopNav && (
                              <Badge variant="secondary" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <label className="text-sm font-medium">
                                Enable Top Navigation
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Display horizontal navigation bar
                              </p>
                            </div>
                            <Switch
                              name="showTopNav"
                              checked={showTopNav}
                              onCheckedChange={handleTopNavToggle}
                            />
                          </div>

                          <div
                            className={`space-y-4 transition-all duration-200 ${
                              !showTopNav
                                ? "opacity-50 pointer-events-none"
                                : ""
                            }`}
                          >
                            <div className="space-y-2">
                              <Label>Navigation Style</Label>
                              <Select
                                name="topNavStyle"
                                defaultValue={
                                  adminUISettings?.navigationPreferences
                                    ?.topNavStyle ?? "fixed"
                                }
                                disabled={!showTopNav}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fixed">Fixed</SelectItem>
                                  <SelectItem value="sticky">Sticky</SelectItem>
                                  <SelectItem value="static">Static</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Background Color</Label>
                              <Input
                                name="topNavColor"
                                type="color"
                                defaultValue={
                                  adminUISettings?.navigationPreferences
                                    ?.topNavColor ?? "#1f2937"
                                }
                                className="h-10"
                                disabled={!showTopNav}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        className={`transition-all duration-200 ${
                          showSideNav
                            ? "border-green-200 dark:border-green-700 shadow-md"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center space-x-2">
                            <SidebarIcon className="h-4 w-4" />
                            <h4 className="font-medium">Side Navigation</h4>
                            {showSideNav && (
                              <Badge variant="secondary" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <label className="text-sm font-medium">
                                Enable Side Navigation
                              </label>
                              <p className="text-xs text-muted-foreground">
                                Display vertical navigation panel
                              </p>
                            </div>
                            <Switch
                              name="showSideNav"
                              checked={showSideNav}
                              onCheckedChange={handleSideNavToggle}
                            />
                          </div>

                          <div
                            className={`space-y-4 transition-all duration-200 ${
                              !showSideNav
                                ? "opacity-50 pointer-events-none"
                                : ""
                            }`}
                          >
                            <div className="space-y-2">
                              <Label>Navigation Style</Label>
                              <Select
                                name="sideNavStyle"
                                defaultValue={
                                  adminUISettings?.navigationPreferences
                                    ?.sideNavStyle ?? "collapsible"
                                }
                                disabled={!showSideNav}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="collapsible">
                                    Collapsible
                                  </SelectItem>
                                  <SelectItem value="overlay">
                                    Overlay
                                  </SelectItem>
                                  <SelectItem value="push">Push</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Position</Label>
                              <Select
                                name="sideNavPosition"
                                defaultValue={
                                  adminUISettings?.navigationPreferences
                                    ?.sideNavPosition ?? "left"
                                }
                                disabled={!showSideNav}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="left">Left</SelectItem>
                                  <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Background Color</Label>
                              <Input
                                name="sideNavColor"
                                type="color"
                                defaultValue={
                                  adminUISettings?.navigationPreferences
                                    ?.sideNavColor ?? "#374151"
                                }
                                className="h-10"
                                disabled={!showSideNav}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">
                          Enable Breadcrumbs
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Show navigation breadcrumbs
                        </p>
                      </div>
                      <Switch
                        name="enableBreadcrumbs"
                        defaultChecked={
                          adminUISettings?.navigationPreferences
                            ?.enableBreadcrumbs ?? true
                        }
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">
                      Theme & Appearance Settings
                    </h4>
                    <div className="space-y-2">
                      <Label>Default Theme</Label>
                      <Select
                        name="theme"
                        defaultValue={adminUISettings?.theme ?? "dark"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Primary Color</Label>
                      <Input
                        name="primaryColor"
                        type="color"
                        defaultValue={
                          adminUISettings?.displayPreferences?.primaryColor ??
                          "#3b82f6"
                        }
                        className="h-10"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">
                          Dense Mode
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Reduce spacing for compact layout
                        </p>
                      </div>
                      <Switch
                        name="denseMode"
                        defaultChecked={adminUISettings?.denseMode ?? false}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">
                          Auto-refresh Data
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Auto-refresh dashboard every 30 seconds
                        </p>
                      </div>
                      <Switch
                        name="autoRefresh"
                        defaultChecked={adminUISettings?.autoRefresh ?? false}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Default Items Per Page</Label>
                      <Select
                        name="itemsPerPage"
                        defaultValue={
                          adminUISettings?.displayPreferences?.itemsPerPage?.toString() ??
                          "10"
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 items</SelectItem>
                          <SelectItem value="10">10 items</SelectItem>
                          <SelectItem value="25">25 items</SelectItem>
                          <SelectItem value="50">50 items</SelectItem>
                          <SelectItem value="100">100 items</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default View</Label>
                      <Select
                        name="defaultView"
                        defaultValue={
                          adminUISettings?.displayPreferences?.defaultView ??
                          "grid"
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grid">Grid View</SelectItem>
                          <SelectItem value="list">List View</SelectItem>
                          <SelectItem value="table">Table View</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button type="submit" className="w-full">
                      <Save className="h-4 w-4 mr-2" />
                      Save UI Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-integration" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">API & Integration Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure external API keys and webhook integrations
            </p>
          </div>

          <div className="grid gap-6">
            {/* API Credentials Management Component */}
            <APICredentialsManager />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>System Configuration</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Global system settings and preferences
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSaveSystemSettings} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultTimezone">Default Timezone</Label>
                    <Select
                      name="defaultTimezone"
                      defaultValue={adminAPISettings?.defaultTimezone ?? "UTC"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">
                          Eastern Time
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time
                        </SelectItem>
                        <SelectItem value="Europe/London">
                          London Time
                        </SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Default Language</Label>
                    <Select
                      name="defaultLanguage"
                      defaultValue={
                        adminAPISettings?.defaultLanguage ?? "English"
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Spanish">Spanish</SelectItem>
                        <SelectItem value="French">French</SelectItem>
                        <SelectItem value="German">German</SelectItem>
                        <SelectItem value="Japanese">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">
                        Email Notifications
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Send email notifications for critical events
                      </p>
                    </div>
                    <Switch
                      name="emailNotifications"
                      defaultChecked={
                        adminAPISettings?.emailNotifications ?? true
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium">
                        Weekly Reports
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Generate and send weekly analysis reports
                      </p>
                    </div>
                    <Switch
                      name="weeklyReports"
                      defaultChecked={adminAPISettings?.weeklyReports ?? false}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save System Settings
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>POS Application Integration</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Connect and configure Point of Sale applications for realtime monitoring
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Active POS Connections */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Active POS Connections</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium">POS Demo - Production Ready</span>
                          <Badge className="ml-2">Active</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Connected POS instance: {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5174` : 'http://localhost:5174'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          API Endpoint: {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Status: Realtime data sync enabled • Last sync: 2 minutes ago
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Add New Connection */}
                <div className="space-y-4 border-t pt-6">
                  <h3 className="font-semibold text-sm">Add New POS Connection</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="posName">POS Application Name</Label>
                      <Input
                        id="posName"
                        placeholder="e.g., Store A, Main Counter, Online Shop"
                      />
                      <p className="text-xs text-muted-foreground">
                        Friendly name for this POS instance
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="posEndpoint">API Endpoint URL</Label>
                      <Input
                        id="posEndpoint"
                        type="url"
                        placeholder="https://your-pos-api.com/api"
                      />
                      <p className="text-xs text-muted-foreground">
                        Base URL for the POS API (must support OpenTelemetry)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="posApiKey">API Key</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="posApiKey"
                          type="password"
                          placeholder="Enter POS API key"
                        />
                        <Button variant="outline" size="sm">
                          Reveal
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Authentication key for POS API access
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="syncInterval">Data Sync Interval</Label>
                      <Select defaultValue="realtime">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Realtime (Live)</SelectItem>
                          <SelectItem value="30s">Every 30 seconds</SelectItem>
                          <SelectItem value="1m">Every 1 minute</SelectItem>
                          <SelectItem value="5m">Every 5 minutes</SelectItem>
                          <SelectItem value="10m">Every 10 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How frequently to sync data from this POS instance
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">
                          Enable Error Tracking
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Capture and log errors from transactions
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">
                          Enable Performance Monitoring
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Track transaction latency and throughput
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-medium">
                          Enable Custom Events
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Capture custom business events
                        </p>
                      </div>
                      <Switch defaultChecked={true} />
                    </div>

                    <Button className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Connect POS Application
                    </Button>
                  </div>
                </div>

                {/* Data Flow Diagram */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-semibold text-sm">Data Flow</h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-sm font-mono text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        POS Application
                      </div>
                      <div className="flex items-center gap-2 ml-4 text-muted-foreground">
                        ↓ OpenTelemetry Integration
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Kafka Message Queue
                      </div>
                      <div className="flex items-center gap-2 ml-4 text-muted-foreground">
                        ↓ Event Processing
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        StackLens Analytics
                      </div>
                      <div className="flex items-center gap-2 ml-4 text-muted-foreground">
                        ↓ Real-time Dashboard
                      </div>
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Analysis & Alerts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integration Guide */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="font-semibold text-sm">Integration Guide</h3>
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      How to Connect Your POS System
                    </h4>
                    <ol className="space-y-2 text-sm list-decimal list-inside text-muted-foreground">
                      <li>Ensure your POS system has OpenTelemetry SDK integrated</li>
                      <li>Configure the POS to export metrics to Kafka broker</li>
                      <li>Fill in the connection details above</li>
                      <li>Click "Connect POS Application"</li>
                      <li>View realtime data in the Analytics dashboard</li>
                    </ol>
                    <Button variant="link" className="mt-4 h-auto p-0">
                      <BookOpen className="h-4 w-4 mr-1" />
                      View Full Integration Documentation →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Jira Integration Tab */}
        <TabsContent value="jira-integration" className="space-y-6">
          <JiraIntegrationAdmin />
        </TabsContent>

        <TabsContent value="pos-integration" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  POS Application Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-1">
                    <h3 className="font-medium">Connection Status</h3>
                    <p className="text-sm text-muted-foreground">
                      Status of the connection to the POS Demo Backend
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>POS Backend URL</Label>
                    <div className="flex gap-2">
                      <Input defaultValue={typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000` : 'http://localhost:3000'} readOnly />
                      <Button variant="outline" size="icon">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Environment</Label>
                    <Input defaultValue="Development / Local" readOnly />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Integration Actions</h3>
                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:5174`, '_blank')}>
                      Open POS Terminal
                    </Button>
                    <Button variant="outline" onClick={() => window.open(`${window.location.protocol}//${window.location.hostname}:3000/api/health`, '_blank')}>
                      Check Health API
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api-credentials" className="space-y-6">
          <APICredentialsManager />
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input name="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input name="email" type="email" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input name="password" type="password" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input name="firstName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input name="lastName" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue="user" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input name="department" />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateUserOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Train Model Dialog */}
      <Dialog open={isTrainingModalOpen} onOpenChange={setIsTrainingModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Train New AI Model</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTrainModel} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modelName">Model Name</Label>
              <Input name="modelName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea name="description" rows={3} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTrainingModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={trainModelMutation.isPending}>
                {trainModelMutation.isPending
                  ? "Starting..."
                  : "Start Training"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                defaultValue={selectedUser?.username || ""}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={selectedUser?.email || ""}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue={selectedUser?.role || ""}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                defaultValue={selectedUser?.firstName || ""}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                defaultValue={selectedUser?.lastName || ""}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium">
                Department
              </label>
              <input
                id="department"
                name="department"
                type="text"
                defaultValue={selectedUser?.department || ""}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                New Password (optional)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Leave blank to keep current password"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={selectedUser?.isActive || false}
                value="true"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditUserOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editUserMutation.isPending}>
                {editUserMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditRole} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="roleName" className="text-sm font-medium">
                Role Name
              </label>
              <input
                id="roleName"
                name="name"
                type="text"
                defaultValue={selectedRole?.name || ""}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="roleDescription" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="roleDescription"
                name="description"
                defaultValue={selectedRole?.description || ""}
                className="w-full p-2 border rounded-md"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="permissions" className="text-sm font-medium">
                Permissions (comma-separated)
              </label>
              <input
                id="permissions"
                name="permissions"
                type="text"
                defaultValue={selectedRole?.permissions.join(", ") || ""}
                className="w-full p-2 border rounded-md"
                placeholder="read, write, delete, admin"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="roleIsActive"
                name="isActive"
                type="checkbox"
                defaultChecked={selectedRole?.isActive || false}
                value="true"
              />
              <label htmlFor="roleIsActive" className="text-sm font-medium">
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditRoleOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editRoleMutation.isPending}>
                {editRoleMutation.isPending ? "Updating..." : "Update Role"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Training Module Dialog */}
      <Dialog open={isEditTrainingOpen} onOpenChange={setIsEditTrainingOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Training Module</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTraining} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="moduleTitle" className="text-sm font-medium">
                Title
              </label>
              <input
                id="moduleTitle"
                name="title"
                type="text"
                defaultValue={selectedTrainingModule?.title || ""}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="moduleDescription"
                className="text-sm font-medium"
              >
                Description
              </label>
              <textarea
                id="moduleDescription"
                name="description"
                defaultValue={selectedTrainingModule?.description || ""}
                className="w-full p-2 border rounded-md"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="moduleContent" className="text-sm font-medium">
                Content
              </label>
              <textarea
                id="moduleContent"
                name="content"
                defaultValue={selectedTrainingModule?.content || ""}
                className="w-full p-2 border rounded-md"
                rows={6}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="difficulty" className="text-sm font-medium">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={selectedTrainingModule?.difficulty || ""}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor="estimatedTime" className="text-sm font-medium">
                Estimated Time (minutes)
              </label>
              <input
                id="estimatedTime"
                name="estimatedTime"
                type="number"
                defaultValue={selectedTrainingModule?.estimatedTime || 0}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="moduleIsActive"
                name="isActive"
                type="checkbox"
                defaultChecked={selectedTrainingModule?.isActive || false}
                value="true"
              />
              <label htmlFor="moduleIsActive" className="text-sm font-medium">
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditTrainingOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editTrainingMutation.isPending}>
                {editTrainingMutation.isPending
                  ? "Updating..."
                  : "Update Module"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Model Dialog */}
      <Dialog open={isEditModelOpen} onOpenChange={setIsEditModelOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit ML Model</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditModel} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="modelName" className="text-sm font-medium">
                Model Name
              </label>
              <input
                id="modelName"
                name="name"
                type="text"
                defaultValue={selectedModel?.name || ""}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="modelVersion" className="text-sm font-medium">
                Version
              </label>
              <input
                id="modelVersion"
                name="version"
                type="text"
                defaultValue={selectedModel?.version || ""}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="modelIsActive"
                name="isActive"
                type="checkbox"
                defaultChecked={selectedModel?.isActive || false}
                value="true"
              />
              <label htmlFor="modelIsActive" className="text-sm font-medium">
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModelOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editModelMutation.isPending}>
                {editModelMutation.isPending ? "Updating..." : "Update Model"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div>
              <label htmlFor="roleName" className="text-sm font-medium">
                Role Name
              </label>
              <Input
                id="roleName"
                name="name"
                placeholder="e.g., Developer, Analyst"
                required
              />
            </div>
            <div>
              <label htmlFor="roleDescription" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="roleDescription"
                name="description"
                placeholder="Role description and responsibilities"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="rolePermissions" className="text-sm font-medium">
                Permissions (JSON)
              </label>
              <Textarea
                id="rolePermissions"
                name="permissions"
                placeholder='{"canRead": true, "canWrite": false, "canDelete": false}'
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="roleIsActive"
                name="isActive"
                defaultChecked
              />
              <label htmlFor="roleIsActive" className="text-sm font-medium">
                Active
              </label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateRoleOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRoleMutation.isPending}>
                {createRoleMutation.isPending ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Training Module Dialog */}
      <Dialog open={isCreateTrainingOpen} onOpenChange={setIsCreateTrainingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Training Module</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTraining} className="space-y-4">
            <div>
              <label htmlFor="trainingTitle" className="text-sm font-medium">
                Module Title
              </label>
              <Input
                id="trainingTitle"
                name="title"
                placeholder="e.g., Introduction to Error Analysis"
                required
              />
            </div>
            <div>
              <label htmlFor="trainingDescription" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="trainingDescription"
                name="description"
                placeholder="Brief overview of the training module"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="trainingContent" className="text-sm font-medium">
                Content (Markdown)
              </label>
              <Textarea
                id="trainingContent"
                name="content"
                placeholder="Training content in Markdown format..."
                rows={6}
              />
            </div>
            <div>
              <label htmlFor="difficultyLevel" className="text-sm font-medium">
                Difficulty Level
              </label>
              <select
                id="difficultyLevel"
                name="difficultyLevel"
                className="w-full p-2 border rounded"
                defaultValue="beginner"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateTrainingOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTrainingMutation.isPending}>
                {createTrainingMutation.isPending ? "Creating..." : "Create Module"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdaptiveLayout>
  );
}
