import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import { Loader as Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  item_id: string;
  quantity: number;
  price_at_time: number;
  subtotal: number;
  menu_items?: {
    title: string;
  };
}

interface PickupZone {
  id: string;
  name: string;
}

interface Order {
  id: string;
  receipt_code: string;
  contact_name: string;
  contact_phone: string;
  delivery_fee: number;
  total_amount: number;
  status: string;
  room_number: string | null;
  special_instructions: string | null;
  created_at: string;
  pickup_zone_id: string | null;
  pickup_zone?: PickupZone | null;
}

interface OrderDetailsModalProps {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OrderDetailsModal = ({ orderId, open, onOpenChange }: OrderDetailsModalProps) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId && open) {
      loadOrderDetails();
    }
  }, [orderId, open]);

  const loadOrderDetails = async () => {
    if (!orderId) return;

    setLoading(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) {
        console.error("Error loading order:", orderError);
        toast.error(`Failed to load order details: ${orderError.message}`);
        if (orderError.message.includes("policy") || orderError.code === "42501") {
          toast.error("Database permissions error. Please apply the SQL migration from DATABASE_FIXES.md");
        }
        setLoading(false);
        return;
      }

      if (!orderData) {
        toast.error("Order not found");
        setLoading(false);
        return;
      }

      const orderWithZone: Order = {
        ...orderData,
        pickup_zone: null
      } as Order;

      if (orderWithZone.pickup_zone_id) {
        const { data: zoneData, error: zoneError } = await supabase
          .from("pickup_zones")
          .select("id, name")
          .eq("id", orderWithZone.pickup_zone_id)
          .single();

        if (zoneError) {
          console.error("Error loading pickup zone:", zoneError);
          toast.warning("Could not load pickup zone details");
        } else if (zoneData) {
          orderWithZone.pickup_zone = zoneData;
        }
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsError) {
        console.error("Error loading order items:", itemsError);
        toast.error(`Failed to load order items: ${itemsError.message}`);
        if (itemsError.message.includes("does not exist")) {
          toast.error("Order items table not found. Please apply the SQL migration.");
        }
      }

      if (itemsData && itemsData.length > 0) {
        const itemsWithTitles = await Promise.all(
          itemsData.map(async (item: any) => {
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
        setOrderItems(itemsWithTitles);
      } else {
        setOrderItems([]);
        if (!itemsError) {
          toast.warning("No items found for this order");
        }
      }

      setOrder(orderWithZone);
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    if (!order) {
      toast.error("No order data available");
      return;
    }

    if (orderItems.length === 0) {
      toast.warning("Order has no items. Receipt may be incomplete.");
    }

    try {

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
      doc.text(`Customer: ${order.contact_name}`, 5, y);
      y += 4;
      doc.text(`Phone: ${order.contact_phone}`, 5, y);
      y += 4;
      
      const pickupZoneName = order.pickup_zone?.name || 'N/A';
      doc.text(`Pickup: ${pickupZoneName}`, 5, y);
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
      orderItems.forEach((item) => {
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

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) return null;

  const subtotal = order.total_amount - order.delivery_fee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Receipt Code</p>
              <p className="font-semibold">{order.receipt_code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-semibold">{order.contact_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-semibold">{order.contact_phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pickup Zone</p>
              <p className="font-semibold">{order.pickup_zone?.name || 'N/A'}</p>
            </div>
            {order.room_number && (
              <div>
                <p className="text-sm text-muted-foreground">Room Number</p>
                <p className="font-semibold">{order.room_number}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-semibold">
                {new Date(order.created_at).toLocaleString()}
              </p>
            </div>
            {order.special_instructions && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Special Instructions</p>
                <p className="font-semibold">{order.special_instructions}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Order Items</h3>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-muted/20 rounded"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.menu_items?.title || 'Unknown Item'}</p>
                    <p className="text-sm text-muted-foreground">
                      KES {item.price_at_time} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold">KES {item.subtotal}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">KES {subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span className="font-semibold">KES {order.delivery_fee}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span className="text-primary">KES {order.total_amount}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={downloadReceipt} className="flex-1">
              Download Receipt
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;
