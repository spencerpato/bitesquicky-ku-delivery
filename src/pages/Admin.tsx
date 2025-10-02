import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Clock, CircleCheck as CheckCircle, LogOut, Plus, Pencil, Trash2, Eye, Download } from "lucide-react";
import logo from "@/assets/logo.png";
import NotificationBell from "@/components/NotificationBell";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import jsPDF from "jspdf";

interface Order {
  id: string;
  receipt_code: string;
  contact_name: string;
  contact_phone: string;
  room_number: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  pickup_zone_id: string | null;
}

interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string | null;
  is_negotiable: boolean;
  is_available: boolean;
  category: string;
  pinned: boolean;
}

interface DeliveryFeeTier {
  id: string;
  min_amount: number;
  max_amount: number | null;
  fee: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryFeeTier[]>([]);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, delivered: 0 });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<DeliveryFeeTier | null>(null);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);

  useEffect(() => {
    const isAuth = localStorage.getItem("adminAuth");
    if (!isAuth) {
      navigate("/admin-login");
      return;
    }

    loadData();

    const ordersChannel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [navigate]);

  const loadData = async () => {
    // Load orders
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error loading orders:", ordersError);
      toast.error("Failed to load orders: " + ordersError.message);
    } else if (ordersData) {
      setOrders(ordersData as any);
      const pending = ordersData.filter((o) => o.status === "pending").length;
      const inProgress = ordersData.filter((o) => o.status === "preparing").length;
      const delivered = ordersData.filter((o) => o.status === "delivered").length;
      setStats({ pending, inProgress, delivered });
    }

    // Load menu items
    const { data: menuData, error: menuError } = await supabase
      .from("menu_items")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (menuError) {
      console.error("Error loading menu items:", menuError);
      toast.error("Failed to load menu items: " + menuError.message);
    } else if (menuData) {
      setMenuItems(menuData);
    }

    // Load delivery fee tiers
    const { data: tiersData, error: tiersError } = await supabase
      .from("delivery_fee_tiers")
      .select("*")
      .order("min_amount", { ascending: true });

    if (tiersError) {
      console.error("Error loading delivery tiers:", tiersError);
      toast.error("Failed to load delivery tiers: " + tiersError.message);
    } else if (tiersData) {
      setDeliveryTiers(tiersData);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    navigate("/");
  };

  const updateOrderStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);

      if (error) {
        console.error("Error updating order status:", error);
        toast.error(`Failed to update order status: ${error.message}`);
        
        // Check if it's an RLS policy issue
        if (error.message.includes("policy") || error.code === "42501") {
          toast.error("Database permissions error. Please apply the SQL migration from DATABASE_FIXES.md");
        }
        return;
      }

      // Update local state immediately for instant feedback
      setOrders(prevOrders => {
        const updatedOrders = prevOrders.map(order => 
          order.id === id ? { ...order, status } : order
        );
        
        // Recalculate stats from the updated orders
        const pending = updatedOrders.filter((o) => o.status === "pending").length;
        const inProgress = updatedOrders.filter((o) => o.status === "preparing").length;
        const delivered = updatedOrders.filter((o) => o.status === "delivered").length;
        setStats({ pending, inProgress, delivered });
        
        return updatedOrders;
      });

      toast.success(`Order status updated to ${status}!`);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(filePath, file);

    setUploadingImage(false);

    if (uploadError) {
      toast.error("Failed to upload image");
      return;
    }

    const { data } = supabase.storage.from("menu-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSaveMenuItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const imageFile = (e.currentTarget.elements.namedItem("image_file") as HTMLInputElement)?.files?.[0];
    let imageUrl = formData.get("image_url") as string;

    if (imageFile) {
      const uploadedUrl = await handleImageUpload({ target: { files: [imageFile] } } as any);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      price: parseInt(formData.get("price") as string),
      image_url: imageUrl || null,
      is_negotiable: formData.get("is_negotiable") === "on",
      is_available: formData.get("is_available") === "on",
      category: formData.get("category") as string,
      pinned: formData.get("pinned") === "on",
    };

    if (editingItem) {
      const { error } = await supabase
        .from("menu_items")
        .update(data)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Failed to update item");
        return;
      }
      toast.success("Item updated!");
    } else {
      const { error } = await supabase.from("menu_items").insert(data);

      if (error) {
        toast.error("Failed to create item");
        return;
      }
      toast.success("Item created!");
    }

    setMenuDialogOpen(false);
    setEditingItem(null);
    loadData();
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete item");
      return;
    }

    toast.success("Item deleted!");
    loadData();
  };

  const handleSaveDeliveryTier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      min_amount: parseInt(formData.get("min_amount") as string),
      max_amount: formData.get("max_amount") ? parseInt(formData.get("max_amount") as string) : null,
      fee: parseInt(formData.get("fee") as string),
    };

    if (editingTier) {
      const { error } = await supabase
        .from("delivery_fee_tiers")
        .update(data)
        .eq("id", editingTier.id);

      if (error) {
        toast.error("Failed to update tier");
        return;
      }
      toast.success("Tier updated!");
    } else {
      const { error } = await supabase.from("delivery_fee_tiers").insert(data);

      if (error) {
        toast.error("Failed to create tier");
        return;
      }
      toast.success("Tier created!");
    }

    setTierDialogOpen(false);
    setEditingTier(null);
    loadData();
  };

  const deleteDeliveryTier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tier?")) return;

    const { error } = await supabase.from("delivery_fee_tiers").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete tier");
      return;
    }

    toast.success("Tier deleted!");
    loadData();
  };

  const downloadOrderReceipt = async (orderId: string) => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) {
        console.error("Error loading order:", orderError);
        toast.error(`Failed to load order: ${orderError.message}`);
        if (orderError.message.includes("policy") || orderError.code === "42501") {
          toast.error("Database permissions error. Please apply the SQL migration from DATABASE_FIXES.md");
        }
        return;
      }

      if (!orderData) {
        toast.error("Order not found");
        return;
      }

      let pickupZone = null;
      if (orderData.pickup_zone_id) {
        const { data: zoneData, error: zoneError } = await supabase
          .from("pickup_zones")
          .select("id, name")
          .eq("id", orderData.pickup_zone_id)
          .single();

        if (zoneError) {
          console.error("Error loading pickup zone:", zoneError);
          toast.warning("Could not load pickup zone details");
        } else if (zoneData) {
          pickupZone = zoneData;
        }
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) {
        console.error("Error loading order items:", itemsError);
        toast.error(`Failed to load order items: ${itemsError.message}`);
        if (itemsError.message.includes("policy") || itemsError.message.includes("does not exist")) {
          toast.error("Order items table not found. Please apply the SQL migration from DATABASE_FIXES.md");
        }
        return;
      }

      const order = orderData;
      let orderItems = itemsData || [];

      if (orderItems.length > 0) {
        orderItems = await Promise.all(
          orderItems.map(async (item: any) => {
            if (item.item_id) {
              const { data: menuItem } = await supabase
                .from("menu_items")
                .select("title")
                .eq("id", item.item_id)
                .single();
              
              return {
                ...item,
                menu_items: menuItem ? { title: menuItem.title } : null
              };
            }
            return item;
          })
        );
      }

      if (orderItems.length === 0) {
        toast.warning("This order has no items. Receipt may be incomplete.");
      }

      const doc = new jsPDF({
        unit: 'mm',
        format: [80, 297]
      });

      const centerX = 40;
      let y = 10;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("BITESQUICKY", centerX, y, { align: "center" });
      y += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text("Fast Campus Food Delivery", centerX, y, { align: "center" });
      y += 4;
      doc.text("Tel: +254 114 097 160", centerX, y, { align: "center" });
      y += 6;

      const orderDate = new Date(order.created_at);
      const dateStr = orderDate.toLocaleDateString('en-GB');
      const timeStr = orderDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      doc.setFontSize(7);
      doc.text(`Date: ${dateStr}`, 5, y);
      doc.text(`Time: ${timeStr}`, 55, y, { align: "right" });
      y += 6;

      doc.text("========================================", centerX, y, { align: "center" });
      y += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Receipt: ${order.receipt_code}`, centerX, y, { align: "center" });
      y += 6;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Customer: ${order.contact_name || 'N/A'}`, 5, y);
      y += 4;
      doc.text(`Phone: ${order.contact_phone}`, 5, y);
      y += 4;
      
      const pickupZoneName = pickupZone?.name || 'N/A';
      doc.text(`Pickup: ${pickupZoneName}`, 5, y);
      y += 4;
      doc.text(`Status: ${order.status.toUpperCase()}`, 5, y);
      y += 4;

      if (order.room_number) {
        doc.text(`Room: ${order.room_number}`, 5, y);
        y += 4;
      }

      if (order.special_instructions) {
        doc.setFontSize(7);
        doc.text(`Note: ${order.special_instructions}`, 5, y);
        y += 4;
      }

      y += 2;
      doc.text("========================================", centerX, y, { align: "center" });
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text("ITEM", 5, y);
      doc.text("QTY", 50, y);
      doc.text("AMOUNT", 75, y, { align: "right" });
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.text("----------------------------------------", centerX, y, { align: "center" });
      y += 4;

      doc.setFontSize(7);
      orderItems.forEach((item: any) => {
        const itemName = item.menu_items?.title || 'Unknown Item';
        const displayName = itemName.length > 25 ? itemName.substring(0, 25) + '...' : itemName;
        doc.text(displayName, 5, y);
        doc.text(`${item.quantity}`, 52, y);
        doc.text(`${item.subtotal}`, 75, y, { align: "right" });
        y += 4;

        doc.setFontSize(6);
        doc.text(`@ KES ${item.price_at_time} each`, 5, y);
        doc.setFontSize(7);
        y += 4;
      });

      y += 1;
      doc.text("========================================", centerX, y, { align: "center" });
      y += 5;

      const subtotal = order.total_amount - order.delivery_fee;
      doc.setFontSize(8);
      doc.text("Subtotal:", 5, y);
      doc.text(`KES ${subtotal}`, 75, y, { align: "right" });
      y += 5;

      doc.text("Delivery Fee:", 5, y);
      doc.text(`KES ${order.delivery_fee}`, 75, y, { align: "right" });
      y += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("TOTAL:", 5, y);
      doc.text(`KES ${order.total_amount}`, 75, y, { align: "right" });
      y += 7;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text("========================================", centerX, y, { align: "center" });
      y += 5;

      doc.setFontSize(7);
      doc.text("Thank you for your order!", centerX, y, { align: "center" });
      y += 4;
      doc.text("Please keep this receipt for reference", centerX, y, { align: "center" });
      y += 4;
      doc.setFontSize(6);
      doc.text("Order queries: WhatsApp +254 114 097 160", centerX, y, { align: "center" });

      doc.save(`BitesQuicky-${order.receipt_code}.pdf`);
      toast.success("Receipt downloaded successfully!");
    } catch (err) {
      console.error("Error generating receipt:", err);
      toast.error("Failed to generate receipt. Please try again.");
    }
  };

  const exportOrders = () => {
    const csv = [
      ["Receipt Code", "Name", "Contact", "Zone", "Status", "Total", "Date"],
      ...orders.map((o) => [
        o.receipt_code,
        o.contact_name || "",
        o.contact_phone,
        o.pickup_zone_id || "",
        o.status,
        o.total_amount,
        new Date(o.created_at).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="BitesQuicky" className="h-12" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell
              onOrderClick={(orderId) => {
                setSelectedOrderId(orderId);
                setOrderDetailsOpen(true);
              }}
            />
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Orders
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                In Progress
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.delivered}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders">
          <TabsList className="mb-6">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="menu">Menu Manager</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Fees</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Orders</CardTitle>
                <Button onClick={exportOrders} variant="outline">
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                    <p className="text-muted-foreground">
                      Orders will appear here once customers start placing them.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">
                            {order.receipt_code}
                          </TableCell>
                          <TableCell>{order.contact_name || "N/A"}</TableCell>
                          <TableCell>{order.contact_phone}</TableCell>
                          <TableCell className="font-semibold">KES {order.total_amount}</TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(value) =>
                                updateOrderStatus(order.id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="preparing">
                                  Preparing
                                </SelectItem>
                                <SelectItem value="delivered">
                                  Delivered
                                </SelectItem>
                                <SelectItem value="cancelled">
                                  Cancelled
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOrderId(order.id);
                                  setOrderDetailsOpen(true);
                                }}
                                data-testid={`button-view-order-${order.id}`}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => downloadOrderReceipt(order.id)}
                                data-testid={`button-download-receipt-${order.id}`}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Manager Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Menu Items</CardTitle>
                <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingItem(null);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? "Edit" : "Add"} Menu Item
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveMenuItem} className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          name="title"
                          defaultValue={editingItem?.title}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          defaultValue={editingItem?.description}
                        />
                      </div>
                      <div>
                        <Label htmlFor="price">Price (KES)</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          defaultValue={editingItem?.price}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select name="category" defaultValue={editingItem?.category || "food"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="snacks">Snacks</SelectItem>
                            <SelectItem value="food">Food</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Image Upload</Label>
                        <Input
                          id="image_file"
                          name="image_file"
                          type="file"
                          accept="image/*"
                          disabled={uploadingImage}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Or enter an image URL below (optional)
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="image_url">Image URL (Optional)</Label>
                        <Input
                          id="image_url"
                          name="image_url"
                          defaultValue={editingItem?.image_url || ""}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="pinned"
                          name="pinned"
                          defaultChecked={editingItem?.pinned}
                        />
                        <Label htmlFor="pinned">Pin to Top</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="is_negotiable"
                          name="is_negotiable"
                          defaultChecked={editingItem?.is_negotiable}
                        />
                        <Label htmlFor="is_negotiable">Negotiable Price</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="is_available"
                          name="is_available"
                          defaultChecked={
                            editingItem?.is_available ?? true
                          }
                        />
                        <Label htmlFor="is_available">Available</Label>
                      </div>
                      <Button type="submit" className="w-full" disabled={uploadingImage}>
                        {uploadingImage ? "Uploading..." : editingItem ? "Update" : "Create"} Item
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {menuItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No menu items yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start by adding your first menu item.
                    </p>
                    <Button
                      onClick={() => {
                        setEditingItem(null);
                        setMenuDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menuItems.map((item) => (
                      <Card key={item.id}>
                      <img
                        src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
                        alt={item.title}
                        className="w-full h-40 object-cover"
                      />
                      <CardContent className="pt-4">
                        <h3 className="font-semibold mb-2">{item.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.description}
                        </p>
                        <p className="text-lg font-bold text-primary mb-3">
                          KES {item.price}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant={item.category === "snacks" ? "default" : "secondary"}>
                            {item.category}
                          </Badge>
                          {item.pinned && (
                            <Badge variant="outline">Pinned</Badge>
                          )}
                          {item.is_negotiable && (
                            <Badge variant="secondary">Negotiable</Badge>
                          )}
                          <Badge
                            variant={item.is_available ? "default" : "outline"}
                          >
                            {item.is_available ? "Available" : "Out of Stock"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingItem(item);
                              setMenuDialogOpen(true);
                            }}
                            className="flex-1"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMenuItem(item.id)}
                            className="flex-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Fees Tab */}
          <TabsContent value="delivery">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Delivery Fee Tiers</CardTitle>
                <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setEditingTier(null)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Tier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTier ? "Edit" : "Add"} Delivery Fee Tier
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveDeliveryTier} className="space-y-4">
                      <div>
                        <Label htmlFor="min_amount">Minimum Order (KES)</Label>
                        <Input
                          id="min_amount"
                          name="min_amount"
                          type="number"
                          defaultValue={editingTier?.min_amount}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_amount">Maximum Order (KES)</Label>
                        <Input
                          id="max_amount"
                          name="max_amount"
                          type="number"
                          defaultValue={editingTier?.max_amount || ""}
                          placeholder="Leave empty for no limit"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fee">Delivery Fee (KES)</Label>
                        <Input
                          id="fee"
                          name="fee"
                          type="number"
                          defaultValue={editingTier?.fee}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        {editingTier ? "Update" : "Create"} Tier
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {deliveryTiers.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No delivery fee tiers yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Set up delivery fee tiers based on order amounts.
                    </p>
                    <Button
                      onClick={() => {
                        setEditingTier(null);
                        setTierDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Tier
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Min Amount</TableHead>
                        <TableHead>Max Amount</TableHead>
                        <TableHead>Delivery Fee</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryTiers.map((tier) => (
                        <TableRow key={tier.id}>
                        <TableCell>KES {tier.min_amount}</TableCell>
                        <TableCell>
                          {tier.max_amount ? `KES ${tier.max_amount}` : "No limit"}
                        </TableCell>
                        <TableCell>KES {tier.fee}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTier(tier);
                                setTierDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteDeliveryTier(tier.id)}
                            >
                              <Trash2 className="h-3 w-3" />
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
      </div>

      <OrderDetailsModal
        orderId={selectedOrderId}
        open={orderDetailsOpen}
        onOpenChange={setOrderDetailsOpen}
      />
    </div>
  );
};

export default Admin;