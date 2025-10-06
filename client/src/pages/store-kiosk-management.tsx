import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Store, MapPin, Plus, Edit, Trash2, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authenticatedRequest } from "@/lib/auth";

interface StoreData {
  id: number;
  storeNumber: string;
  name: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  lastCheckIn?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default function StoreKioskManagement() {
  const { toast } = useToast();
  
  const [stores, setStores] = useState<StoreData[]>([]);
  const [kiosks, setKiosks] = useState<KioskData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [kioskDialogOpen, setKioskDialogOpen] = useState(false);
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

  useEffect(() => {
    fetchStores();
    fetchKiosks();
  }, []);

  const fetchStores = async () => {
    try {
      const data = await authenticatedRequest("GET", "/api/stores");
      setStores(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch stores",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchKiosks = async () => {
    try {
      const data = await authenticatedRequest("GET", "/api/kiosks");
      setKiosks(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch kiosks",
      });
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
    setStoreDialogOpen(true);
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
      country: store.country || "USA",
      phoneNumber: store.phoneNumber || "",
      isActive: store.isActive,
    });
    setStoreDialogOpen(true);
  };

  const handleSaveStore = async () => {
    try {
      if (editingStore) {
        await authenticatedRequest("PUT", `/api/stores/${editingStore.id}`, storeForm);
        toast({
          title: "Success",
          description: "Store updated successfully",
        });
      } else {
        await authenticatedRequest("POST", "/api/stores", storeForm);
        toast({
          title: "Success",
          description: "Store created successfully",
        });
      }
      setStoreDialogOpen(false);
      fetchStores();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingStore ? "update" : "create"} store`,
      });
    }
  };

  const handleDeleteStore = async (id: number) => {
    if (!confirm("Are you sure you want to delete this store?")) return;
    
    try {
      await authenticatedRequest("DELETE", `/api/stores/${id}`);
      toast({
        title: "Success",
        description: "Store deleted successfully",
      });
      fetchStores();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete store",
      });
    }
  };

  const handleCreateKiosk = () => {
    setEditingKiosk(null);
    setKioskForm({
      kioskNumber: "",
      storeId: stores[0]?.id || 0,
      name: "",
      location: "",
      deviceType: "",
      ipAddress: "",
      isActive: true,
    });
    setKioskDialogOpen(true);
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
    setKioskDialogOpen(true);
  };

  const handleSaveKiosk = async () => {
    try {
      if (editingKiosk) {
        await authenticatedRequest("PUT", `/api/kiosks/${editingKiosk.id}`, kioskForm);
        toast({
          title: "Success",
          description: "Kiosk updated successfully",
        });
      } else {
        await authenticatedRequest("POST", "/api/kiosks", kioskForm);
        toast({
          title: "Success",
          description: "Kiosk created successfully",
        });
      }
      setKioskDialogOpen(false);
      fetchKiosks();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${editingKiosk ? "update" : "create"} kiosk`,
      });
    }
  };

  const handleDeleteKiosk = async (id: number) => {
    if (!confirm("Are you sure you want to delete this kiosk?")) return;
    
    try {
      await authenticatedRequest("DELETE", `/api/kiosks/${id}`);
      toast({
        title: "Success",
        description: "Kiosk deleted successfully",
      });
      fetchKiosks();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete kiosk",
      });
    }
  };

  const getStoreName = (storeId: number) => {
    return stores.find((s) => s.id === storeId)?.name || "Unknown";
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Store & Kiosk Management</h1>
        <p className="text-muted-foreground">
          Manage stores and kiosks for error log tracking
        </p>
      </div>

      <Tabs defaultValue="stores" className="w-full">
        <TabsList>
          <TabsTrigger value="stores">
            <Store className="w-4 h-4 mr-2" />
            Stores
          </TabsTrigger>
          <TabsTrigger value="kiosks">
            <Monitor className="w-4 h-4 mr-2" />
            Kiosks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stores" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Stores</CardTitle>
                  <CardDescription>Manage store locations</CardDescription>
                </div>
                <Button onClick={handleCreateStore}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Store
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {stores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No stores configured</p>
                  <p className="text-sm">Create your first store to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>City/State</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.storeNumber}</TableCell>
                        <TableCell>{store.name}</TableCell>
                        <TableCell>{store.location || "-"}</TableCell>
                        <TableCell>
                          {store.city && store.state ? `${store.city}, ${store.state}` : "-"}
                        </TableCell>
                        <TableCell>{store.phoneNumber || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={store.isActive ? "default" : "secondary"}>
                            {store.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditStore(store)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStore(store.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
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
        </TabsContent>

        <TabsContent value="kiosks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Kiosks</CardTitle>
                  <CardDescription>Manage kiosks within stores</CardDescription>
                </div>
                <Button onClick={handleCreateKiosk} disabled={stores.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Kiosk
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {kiosks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No kiosks configured</p>
                  <p className="text-sm">
                    {stores.length === 0
                      ? "Create a store first, then add kiosks"
                      : "Create your first kiosk to get started"}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kiosk Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Device Type</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kiosks.map((kiosk) => (
                      <TableRow key={kiosk.id}>
                        <TableCell className="font-medium">{kiosk.kioskNumber}</TableCell>
                        <TableCell>{kiosk.name}</TableCell>
                        <TableCell>{getStoreName(kiosk.storeId)}</TableCell>
                        <TableCell>{kiosk.location || "-"}</TableCell>
                        <TableCell>{kiosk.deviceType || "-"}</TableCell>
                        <TableCell>{kiosk.ipAddress || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={kiosk.isActive ? "default" : "secondary"}>
                            {kiosk.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditKiosk(kiosk)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteKiosk(kiosk.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
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
        </TabsContent>
      </Tabs>

      {/* Store Dialog */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStore ? "Edit Store" : "Create New Store"}
            </DialogTitle>
            <DialogDescription>
              {editingStore ? "Update store information" : "Add a new store location"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storeNumber">Store Number *</Label>
              <Input
                id="storeNumber"
                value={storeForm.storeNumber}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, storeNumber: e.target.value })
                }
                placeholder="ST001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name *</Label>
              <Input
                id="storeName"
                value={storeForm.name}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, name: e.target.value })
                }
                placeholder="Main Store"
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={storeForm.location}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, location: e.target.value })
                }
                placeholder="Downtown"
              />
            </div>
            
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={storeForm.address}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, address: e.target.value })
                }
                placeholder="123 Main St"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={storeForm.city}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, city: e.target.value })
                }
                placeholder="New York"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={storeForm.state}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, state: e.target.value })
                }
                placeholder="NY"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input
                id="zipCode"
                value={storeForm.zipCode}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, zipCode: e.target.value })
                }
                placeholder="10001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={storeForm.country}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, country: e.target.value })
                }
                placeholder="USA"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={storeForm.phoneNumber}
                onChange={(e) =>
                  setStoreForm({ ...storeForm, phoneNumber: e.target.value })
                }
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="isActive">Status</Label>
              <Select
                value={storeForm.isActive ? "active" : "inactive"}
                onValueChange={(value) =>
                  setStoreForm({ ...storeForm, isActive: value === "active" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStore}>
              {editingStore ? "Update Store" : "Create Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kiosk Dialog */}
      <Dialog open={kioskDialogOpen} onOpenChange={setKioskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKiosk ? "Edit Kiosk" : "Create New Kiosk"}
            </DialogTitle>
            <DialogDescription>
              {editingKiosk ? "Update kiosk information" : "Add a new kiosk"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kioskNumber">Kiosk Number *</Label>
              <Input
                id="kioskNumber"
                value={kioskForm.kioskNumber}
                onChange={(e) =>
                  setKioskForm({ ...kioskForm, kioskNumber: e.target.value })
                }
                placeholder="K001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kioskName">Kiosk Name *</Label>
              <Input
                id="kioskName"
                value={kioskForm.name}
                onChange={(e) =>
                  setKioskForm({ ...kioskForm, name: e.target.value })
                }
                placeholder="Kiosk 1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storeId">Store *</Label>
              <Select
                value={kioskForm.storeId.toString()}
                onValueChange={(value) =>
                  setKioskForm({ ...kioskForm, storeId: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name} ({store.storeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kioskLocation">Location in Store</Label>
              <Input
                id="kioskLocation"
                value={kioskForm.location}
                onChange={(e) =>
                  setKioskForm({ ...kioskForm, location: e.target.value })
                }
                placeholder="Front entrance"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type</Label>
              <Input
                id="deviceType"
                value={kioskForm.deviceType}
                onChange={(e) =>
                  setKioskForm({ ...kioskForm, deviceType: e.target.value })
                }
                placeholder="Self-service terminal"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ipAddress">IP Address</Label>
              <Input
                id="ipAddress"
                value={kioskForm.ipAddress}
                onChange={(e) =>
                  setKioskForm({ ...kioskForm, ipAddress: e.target.value })
                }
                placeholder="192.168.1.100"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="kioskStatus">Status</Label>
              <Select
                value={kioskForm.isActive ? "active" : "inactive"}
                onValueChange={(value) =>
                  setKioskForm({ ...kioskForm, isActive: value === "active" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setKioskDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveKiosk}>
              {editingKiosk ? "Update Kiosk" : "Create Kiosk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
