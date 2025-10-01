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
import {
  Package,
  Clock,
  CheckCircle,
  LogOut,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import logo from "@/assets/logo.png";

interface Order {
  id: string;
  receipt_code: string;
  quantity: number;
  contact_phone: string;
  room_number: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  menu_items: { title: string };
  pickup_zones: { name: string };
}

interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  is_negotiable: boolean;
  is_available: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, delivered: 0 });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);

  useEffect(() => {
    const isAuth = localStorage.getItem("adminAuth");
    if (!isAuth) {
      navigate("/admin-login");
      return;
    }

    loadData();
  }, [navigate]);

  const loadData = async () => {
    // Load orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select(`
        *,
        menu_items(title),
        pickup_zones(name)
      `)
      .order("created_at", { ascending: false });

    if (ordersData) {
      setOrders(ordersData as any);
      setStats({
        pending: ordersData.filter((o) => o.status === "pending").length,
        inProgress: ordersData.filter((o) => o.status === "in_progress").length,
        delivered: ordersData.filter((o) => o.status === "delivered").length,
      });
    }

    // Load menu items
    const { data: menuData } = await supabase
      .from("menu_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (menuData) setMenuItems(menuData);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    navigate("/");
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update order");
      return;
    }

    toast.success("Order updated!");
    loadData();
  };

  const handleSaveMenuItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      price: parseInt(formData.get("price") as string),
      image_url: formData.get("image_url") as string,
      is_negotiable: formData.get("is_negotiable") === "on",
      is_available: formData.get("is_available") === "on",
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

  const exportOrders = () => {
    const csv = [
      ["Receipt Code", "Item", "Qty", "Zone", "Contact", "Status", "Total", "Date"],
      ...orders.map((o) => [
        o.receipt_code,
        o.menu_items.title,
        o.quantity,
        o.pickup_zones.name,
        o.contact_phone,
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
          <Button variant="ghost" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">
                            {order.receipt_code}
                          </TableCell>
                          <TableCell>{order.menu_items.title}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>{order.pickup_zones.name}</TableCell>
                          <TableCell>{order.contact_phone}</TableCell>
                          <TableCell>KES {order.total_amount}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.status === "delivered"
                                  ? "default"
                                  : order.status === "in_progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {order.status}
                            </Badge>
                          </TableCell>
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
                                <SelectItem value="in_progress">
                                  In Progress
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                  <DialogContent className="max-w-md">
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
                        <Label htmlFor="image_url">Image URL</Label>
                        <Input
                          id="image_url"
                          name="image_url"
                          defaultValue={editingItem?.image_url}
                          placeholder="https://..."
                          required
                        />
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
                      <Button type="submit" className="w-full">
                        {editingItem ? "Update" : "Create"} Item
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <Card key={item.id}>
                      <img
                        src={item.image_url}
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
                        <div className="flex gap-2 mb-3">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;