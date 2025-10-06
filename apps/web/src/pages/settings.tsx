import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import AdaptiveLayout from "@/components/adaptive-layout";
import { authenticatedRequest, authManager } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Bell, 
  Shield, 
  Save,
  Store,
  Plus,
  Edit,
  Trash2,
} from "lucide-react";

const profileSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const notificationSchema = z.object({
  emailNotifications: z.boolean(),
  criticalAlerts: z.boolean(),
  weeklyReports: z.boolean(),
  analysisComplete: z.boolean(),
  alertThreshold: z.string(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type NotificationForm = z.infer<typeof notificationSchema>;

interface StoreData {
  id: number;
  storeNumber: string;
  name: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country: string;
  phoneNumber?: string;
  isActive: boolean;
}

interface KioskData {
  id: number;
  kioskNumber: string;
  storeId: number;
  name: string;
  location?: string;
  deviceType?: string;
  ipAddress?: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const user = authManager.getUser();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  // Store & Kiosk Management State
  const [stores, setStores] = useState<StoreData[]>([]);
  const [kiosks, setKiosks] = useState<KioskData[]>([]);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [isKioskDialogOpen, setIsKioskDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [editingKiosk, setEditingKiosk] = useState<KioskData | null>(null);
  const [storeForm, setStoreForm] = useState({
    storeNumber: "",
    name: "",
    location: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "USA",
    phoneNumber: "",
    isActive: true,
  });
  const [kioskForm, setKioskForm] = useState({
    kioskNumber: "",
    storeId: 0,
    name: "",
    location: "",
    deviceType: "",
    ipAddress: "",
    isActive: true,
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      email: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const notificationForm = useForm<NotificationForm>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      criticalAlerts: true,
      weeklyReports: false,
      analysisComplete: true,
      alertThreshold: "critical",
    },
  });

  // Load user settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load user profile
        const userData = await authenticatedRequest('GET', '/api/auth/me');
        
        if (userData.user) {
          profileForm.reset({
            username: userData.user.username || "",
            email: userData.user.email || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }

        // Load user settings (optional - don't fail if endpoint has issues)
        try {
          const settingsData = await authenticatedRequest('GET', '/api/settings');
          
          if (settingsData.notificationPreferences) {
            notificationForm.reset({
              emailNotifications: settingsData.notificationPreferences.emailNotifications ?? true,
              criticalAlerts: settingsData.notificationPreferences.criticalAlerts ?? true,
              weeklyReports: settingsData.notificationPreferences.weeklyReports ?? false,
              analysisComplete: settingsData.notificationPreferences.analysisComplete ?? true,
              alertThreshold: settingsData.notificationPreferences.alertThreshold ?? "critical",
            });
          }
        } catch (settingsError) {
          console.warn('Could not load notification settings, using defaults:', settingsError);
          // Continue with default notification settings
        }

        // Load stores and kiosks for admin users
        if (isAdmin) {
          fetchStores();
          fetchKiosks();
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive",
        });
      }
    };

    loadSettings();
  }, [profileForm, notificationForm, toast, isAdmin]);

  const handleProfileSubmit = async (data: ProfileForm) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleNotificationSubmit = async (data: NotificationForm) => {
    try {
      await authenticatedRequest('PUT', '/api/settings', {
        notificationPreferences: data
      });

      toast({
        title: "Success",
        description: "Notification settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    }
  };

  // Store & Kiosk Management Functions
  const fetchStores = async () => {
    try {
      const data = await authenticatedRequest("GET", "/api/stores");
      setStores(data);
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    }
  };

  const fetchKiosks = async () => {
    try {
      const data = await authenticatedRequest("GET", "/api/kiosks");
      setKiosks(data);
    } catch (error) {
      console.error("Failed to fetch kiosks:", error);
    }
  };

  const handleCreateStore = () => {
    setEditingStore(null);
    setStoreForm({
      storeNumber: "",
      name: "",
      location: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
      phoneNumber: "",
      isActive: true,
    });
    setIsStoreDialogOpen(true);
  };

  const handleEditStore = (store: StoreData) => {
    setEditingStore(store);
    setStoreForm({
      storeNumber: store.storeNumber,
      name: store.name,
      location: store.location || "",
      address: store.address || "",
      city: store.city || "",
      state: store.state || "",
      zipCode: store.zipCode || "",
      country: store.country,
      phoneNumber: store.phoneNumber || "",
      isActive: store.isActive,
    });
    setIsStoreDialogOpen(true);
  };

  const handleSaveStore = async () => {
    try {
      if (editingStore) {
        await authenticatedRequest("PUT", `/api/stores/${editingStore.id}`, storeForm);
        toast({ title: "Success", description: "Store updated successfully" });
      } else {
        await authenticatedRequest("POST", "/api/stores", storeForm);
        toast({ title: "Success", description: "Store created successfully" });
      }
      setIsStoreDialogOpen(false);
      fetchStores();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteStore = async (id: number) => {
    if (!confirm("Are you sure you want to delete this store?")) return;
    try {
      await authenticatedRequest("DELETE", `/api/stores/${id}`);
      toast({ title: "Success", description: "Store deleted successfully" });
      fetchStores();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCreateKiosk = () => {
    setEditingKiosk(null);
    setKioskForm({
      kioskNumber: "",
      storeId: 0,
      name: "",
      location: "",
      deviceType: "",
      ipAddress: "",
      isActive: true,
    });
    setIsKioskDialogOpen(true);
  };

  const handleEditKiosk = (kiosk: KioskData) => {
    setEditingKiosk(kiosk);
    setKioskForm({
      kioskNumber: kiosk.kioskNumber,
      storeId: kiosk.storeId,
      name: kiosk.name,
      location: kiosk.location || "",
      deviceType: kiosk.deviceType || "",
      ipAddress: kiosk.ipAddress || "",
      isActive: kiosk.isActive,
    });
    setIsKioskDialogOpen(true);
  };

  const handleSaveKiosk = async () => {
    try {
      if (editingKiosk) {
        await authenticatedRequest("PUT", `/api/kiosks/${editingKiosk.id}`, kioskForm);
        toast({ title: "Success", description: "Kiosk updated successfully" });
      } else {
        await authenticatedRequest("POST", "/api/kiosks", kioskForm);
        toast({ title: "Success", description: "Kiosk created successfully" });
      }
      setIsKioskDialogOpen(false);
      fetchKiosks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteKiosk = async (id: number) => {
    if (!confirm("Are you sure you want to delete this kiosk?")) return;
    try {
      await authenticatedRequest("DELETE", `/api/kiosks/${id}`);
      toast({ title: "Success", description: "Kiosk deleted successfully" });
      fetchKiosks();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AdaptiveLayout
      title="Settings"
      subtitle="Manage your account and notification preferences"
    >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Security</span>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="stores" className="flex items-center space-x-2">
                  <Store className="h-4 w-4" />
                  <span>Stores & Kiosks</span>
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Profile Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="space-y-4 pt-6 border-t">
                        <h4 className="font-medium">Change Password</h4>
                        
                        <FormField
                          control={profileForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <Button type="submit" className="flex items-center space-x-2">
                        <Save className="h-4 w-4" />
                        <span>Update Profile</span>
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Notification Preferences</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...notificationForm}>
                    <form onSubmit={notificationForm.handleSubmit(handleNotificationSubmit)} className="space-y-6">
                      <Alert>
                        <Bell className="h-4 w-4" />
                        <AlertDescription>
                          Configure how and when you receive notifications about errors and analysis results.
                        </AlertDescription>
                      </Alert>
                      
                      <div className="space-y-4">
                        <FormField
                          control={notificationForm.control}
                          name="emailNotifications"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <FormLabel>Email Notifications</FormLabel>
                                <FormDescription>
                                  Receive notifications via email
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={notificationForm.control}
                          name="criticalAlerts"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <FormLabel>Critical Error Alerts</FormLabel>
                                <FormDescription>
                                  Immediate notifications for critical errors
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={notificationForm.control}
                          name="analysisComplete"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <FormLabel>Analysis Complete</FormLabel>
                                <FormDescription>
                                  Notify when log analysis is completed
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={notificationForm.control}
                          name="weeklyReports"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <FormLabel>Weekly Reports</FormLabel>
                                <FormDescription>
                                  Receive weekly summary reports
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={notificationForm.control}
                          name="alertThreshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alert Threshold</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="critical">Critical Only</SelectItem>
                                  <SelectItem value="high">High and Above</SelectItem>
                                  <SelectItem value="medium">Medium and Above</SelectItem>
                                  <SelectItem value="all">All Errors</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Minimum error severity for notifications
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button type="submit" className="flex items-center space-x-2">
                        <Save className="h-4 w-4" />
                        <span>Save Preferences</span>
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Security Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Two-Factor Authentication</h4>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline">
                          Enable 2FA
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Session Management</h4>
                          <p className="text-sm text-muted-foreground">
                            Manage your active sessions
                          </p>
                        </div>
                        <Button variant="outline">
                          View Sessions
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Account Recovery</h4>
                          <p className="text-sm text-muted-foreground">
                            Set up account recovery options
                          </p>
                        </div>
                        <Button variant="outline">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Store & Kiosk Management Tab */}
            {isAdmin && (
              <TabsContent value="stores" className="space-y-6">
                <Tabs defaultValue="stores" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="stores">Stores</TabsTrigger>
                    <TabsTrigger value="kiosks">Kiosks</TabsTrigger>
                  </TabsList>

                  {/* Stores Sub-Tab */}
                  <TabsContent value="stores" className="space-y-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Store Management</CardTitle>
                          <CardDescription>Manage retail store locations</CardDescription>
                        </div>
                        <Button onClick={handleCreateStore}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Store
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Store #</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>City</TableHead>
                              <TableHead>State</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stores.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                  No stores found. Create your first store to get started.
                                </TableCell>
                              </TableRow>
                            ) : (
                              stores.map((store) => (
                                <TableRow key={store.id}>
                                  <TableCell className="font-medium">{store.storeNumber}</TableCell>
                                  <TableCell>{store.name}</TableCell>
                                  <TableCell>{store.location || "—"}</TableCell>
                                  <TableCell>{store.city || "—"}</TableCell>
                                  <TableCell>{store.state || "—"}</TableCell>
                                  <TableCell>{store.phoneNumber || "—"}</TableCell>
                                  <TableCell>
                                    <Badge variant={store.isActive ? "default" : "secondary"}>
                                      {store.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditStore(store)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteStore(store.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Kiosks Sub-Tab */}
                  <TabsContent value="kiosks" className="space-y-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle>Kiosk Management</CardTitle>
                          <CardDescription>Manage kiosk devices across stores</CardDescription>
                        </div>
                        <Button onClick={handleCreateKiosk}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Kiosk
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kiosk #</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Store</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Device Type</TableHead>
                              <TableHead>IP Address</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {kiosks.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground">
                                  No kiosks found. Add your first kiosk to get started.
                                </TableCell>
                              </TableRow>
                            ) : (
                              kiosks.map((kiosk) => {
                                const store = stores.find((s) => s.id === kiosk.storeId);
                                return (
                                  <TableRow key={kiosk.id}>
                                    <TableCell className="font-medium">{kiosk.kioskNumber}</TableCell>
                                    <TableCell>{kiosk.name}</TableCell>
                                    <TableCell>{store?.name || "Unknown"}</TableCell>
                                    <TableCell>{kiosk.location || "—"}</TableCell>
                                    <TableCell>{kiosk.deviceType || "—"}</TableCell>
                                    <TableCell className="font-mono text-sm">{kiosk.ipAddress || "—"}</TableCell>
                                    <TableCell>
                                      <Badge variant={kiosk.isActive ? "default" : "secondary"}>
                                        {kiosk.isActive ? "Active" : "Inactive"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditKiosk(kiosk)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteKiosk(kiosk.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Store Dialog */}
                <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingStore ? "Edit Store" : "Create New Store"}</DialogTitle>
                      <DialogDescription>
                        {editingStore ? "Update store information" : "Add a new retail store location"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="storeNumber">Store Number *</Label>
                        <Input
                          id="storeNumber"
                          value={storeForm.storeNumber}
                          onChange={(e) => setStoreForm({ ...storeForm, storeNumber: e.target.value })}
                          placeholder="e.g., ST-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="storeName">Store Name *</Label>
                        <Input
                          id="storeName"
                          value={storeForm.name}
                          onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                          placeholder="e.g., Downtown Branch"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="storeLocation">Location Description</Label>
                        <Input
                          id="storeLocation"
                          value={storeForm.location}
                          onChange={(e) => setStoreForm({ ...storeForm, location: e.target.value })}
                          placeholder="e.g., Main Shopping District"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          value={storeForm.address}
                          onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                          placeholder="e.g., 123 Main Street"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={storeForm.city}
                          onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                          placeholder="e.g., San Francisco"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State/Province</Label>
                        <Input
                          id="state"
                          value={storeForm.state}
                          onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                          placeholder="e.g., CA"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                        <Input
                          id="zipCode"
                          value={storeForm.zipCode}
                          onChange={(e) => setStoreForm({ ...storeForm, zipCode: e.target.value })}
                          placeholder="e.g., 94102"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={storeForm.country}
                          onChange={(e) => setStoreForm({ ...storeForm, country: e.target.value })}
                          placeholder="e.g., USA"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <Input
                          id="phoneNumber"
                          value={storeForm.phoneNumber}
                          onChange={(e) => setStoreForm({ ...storeForm, phoneNumber: e.target.value })}
                          placeholder="e.g., (555) 123-4567"
                        />
                      </div>
                      <div className="space-y-2 flex items-center">
                        <input
                          type="checkbox"
                          id="storeIsActive"
                          checked={storeForm.isActive}
                          onChange={(e) => setStoreForm({ ...storeForm, isActive: e.target.checked })}
                          className="mr-2"
                        />
                        <Label htmlFor="storeIsActive">Active Store</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsStoreDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveStore}>
                        {editingStore ? "Update Store" : "Create Store"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Kiosk Dialog */}
                <Dialog open={isKioskDialogOpen} onOpenChange={setIsKioskDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingKiosk ? "Edit Kiosk" : "Create New Kiosk"}</DialogTitle>
                      <DialogDescription>
                        {editingKiosk ? "Update kiosk information" : "Add a new kiosk device"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="kioskNumber">Kiosk Number *</Label>
                        <Input
                          id="kioskNumber"
                          value={kioskForm.kioskNumber}
                          onChange={(e) => setKioskForm({ ...kioskForm, kioskNumber: e.target.value })}
                          placeholder="e.g., K-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kioskName">Kiosk Name *</Label>
                        <Input
                          id="kioskName"
                          value={kioskForm.name}
                          onChange={(e) => setKioskForm({ ...kioskForm, name: e.target.value })}
                          placeholder="e.g., Entrance Kiosk"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="kioskStore">Store *</Label>
                        <select
                          id="kioskStore"
                          value={kioskForm.storeId}
                          onChange={(e) => setKioskForm({ ...kioskForm, storeId: parseInt(e.target.value) })}
                          className="w-full p-2 border rounded"
                        >
                          <option value={0}>Select a store...</option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.storeNumber} - {store.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="kioskLocation">Location Description</Label>
                        <Input
                          id="kioskLocation"
                          value={kioskForm.location}
                          onChange={(e) => setKioskForm({ ...kioskForm, location: e.target.value })}
                          placeholder="e.g., Near Main Entrance"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deviceType">Device Type</Label>
                        <Input
                          id="deviceType"
                          value={kioskForm.deviceType}
                          onChange={(e) => setKioskForm({ ...kioskForm, deviceType: e.target.value })}
                          placeholder="e.g., Touchscreen Terminal"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ipAddress">IP Address</Label>
                        <Input
                          id="ipAddress"
                          value={kioskForm.ipAddress}
                          onChange={(e) => setKioskForm({ ...kioskForm, ipAddress: e.target.value })}
                          placeholder="e.g., 192.168.1.100"
                        />
                      </div>
                      <div className="space-y-2 flex items-center col-span-2">
                        <input
                          type="checkbox"
                          id="kioskIsActive"
                          checked={kioskForm.isActive}
                          onChange={(e) => setKioskForm({ ...kioskForm, isActive: e.target.checked })}
                          className="mr-2"
                        />
                        <Label htmlFor="kioskIsActive">Active Kiosk</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsKioskDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveKiosk}>
                        {editingKiosk ? "Update Kiosk" : "Create Kiosk"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            )}
          </Tabs>
    </AdaptiveLayout>
  );
}
