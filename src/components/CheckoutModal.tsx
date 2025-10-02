import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import jsPDF from "jspdf";

interface PickupZone {
  id: string;
  name: string;
  requires_room_number: boolean;
}

interface DeliveryFeeTier {
  id: string;
  min_amount: number;
  max_amount: number | null;
  fee: number;
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
}

const CheckoutModal = ({ open, onOpenChange }: CheckoutModalProps) => {
  const { items, totalPrice, clearCart } = useCart();
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pickupZoneId, setPickupZoneId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [zones, setZones] = useState<PickupZone[]>([]);
  const [deliveryTiers, setDeliveryTiers] = useState<DeliveryFeeTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptCode, setReceiptCode] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderSubtotal, setOrderSubtotal] = useState(0);
  const [orderDeliveryFee, setOrderDeliveryFee] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);

  useEffect(() => {
    if (open) {
      loadZones();
      loadDeliveryTiers();
    }
  }, [open]);

  const loadZones = async () => {
    const { data } = await supabase.from("pickup_zones").select("*");
    if (data) setZones(data);
  };

  const loadDeliveryTiers = async () => {
    const { data } = await supabase
      .from("delivery_fee_tiers")
      .select("*")
      .order("min_amount", { ascending: true });
    if (data) setDeliveryTiers(data);
  };

  const calculateDeliveryFee = (orderValue: number) => {
    const tier = deliveryTiers.find(
      (t) =>
        orderValue >= t.min_amount &&
        (t.max_amount === null || orderValue <= t.max_amount)
    );
    return tier?.fee || 0;
  };

  const selectedZone = zones.find((z) => z.id === pickupZoneId);
  const deliveryFee = calculateDeliveryFee(totalPrice);
  const totalAmount = totalPrice + deliveryFee;

  const generateReceiptCode = () => {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = date.getTime().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `BQ-${dateStr}-${timeStr}-${random}`;
  };

  const downloadReceipt = () => {
    if (!selectedZone) return;

    // Thermal receipt size: 80mm width (about 3 inches)
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 297] // 80mm width, auto height
    });

    const centerX = 40;
    let y = 10;

    // Header
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

    // Date and Time
    const orderDate = new Date();
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

    // Divider
    doc.text("========================================", centerX, y, { align: "center" });
    y += 5;

    // Receipt Code
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Receipt: ${receiptCode}`, centerX, y, { align: "center" });
    y += 6;

    // Customer Details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Customer: ${contactName}`, 5, y);
    y += 4;
    doc.text(`Phone: ${contactPhone}`, 5, y);
    y += 4;
    doc.text(`Pickup: ${selectedZone.name}`, 5, y);
    y += 4;

    if (roomNumber) {
      doc.text(`Room: ${roomNumber}`, 5, y);
      y += 4;
    }

    if (specialInstructions) {
      doc.setFontSize(7);
      doc.text(`Note: ${specialInstructions}`, 5, y);
      y += 4;
    }

    y += 2;
    doc.text("========================================", centerX, y, { align: "center" });
    y += 5;

    // Items Header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("ITEM", 5, y);
    doc.text("QTY", 50, y);
    doc.text("AMOUNT", 75, y, { align: "right" });
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text("----------------------------------------", centerX, y, { align: "center" });
    y += 4;

    // Items
    doc.setFontSize(7);
    orderItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;

      // Item name (wrapped if too long)
      const itemName = item.title.length > 25 ? item.title.substring(0, 25) + '...' : item.title;
      doc.text(itemName, 5, y);
      doc.text(`${item.quantity}`, 52, y);
      doc.text(`${itemTotal}`, 75, y, { align: "right" });
      y += 4;

      // Show unit price
      doc.setFontSize(6);
      doc.text(`@ KES ${item.price} each`, 5, y);
      doc.setFontSize(7);
      y += 4;
    });

    y += 1;
    doc.text("========================================", centerX, y, { align: "center" });
    y += 5;

    // Totals
    doc.setFontSize(8);
    doc.text("Subtotal:", 5, y);
    doc.text(`KES ${orderSubtotal}`, 75, y, { align: "right" });
    y += 5;

    doc.text("Delivery Fee:", 5, y);
    doc.text(`KES ${orderDeliveryFee}`, 75, y, { align: "right" });
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text("TOTAL:", 5, y);
    doc.text(`KES ${orderTotal}`, 75, y, { align: "right" });
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text("========================================", centerX, y, { align: "center" });
    y += 5;

    // Footer
    doc.setFontSize(7);
    doc.text("Thank you for your order!", centerX, y, { align: "center" });
    y += 4;
    doc.text("Please keep this receipt for reference", centerX, y, { align: "center" });
    y += 4;
    doc.setFontSize(6);
    doc.text("Order queries: WhatsApp +254 114 097 160", centerX, y, { align: "center" });

    doc.save(`BitesQuicky-${receiptCode}.pdf`);
  };

  const handleSubmit = async () => {
    if (!contactName || !pickupZoneId || !contactPhone) {
      toast.error("Please fill all required fields");
      return;
    }

    if (selectedZone?.requires_room_number && !roomNumber) {
      toast.error("Room number is required for this zone");
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setLoading(true);
    const code = generateReceiptCode();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        receipt_code: code,
        contact_name: contactName,
        contact_phone: contactPhone,
        pickup_zone_id: pickupZoneId,
        room_number: selectedZone?.requires_room_number ? roomNumber : null,
        special_instructions: specialInstructions || null,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        item_id: null,
        quantity: null,
      })
      .select()
      .single();

    if (orderError || !order) {
      setLoading(false);
      toast.error("Failed to place order");
      return;
    }

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: order.id,
      item_id: item.id,
      quantity: item.quantity,
      price_at_time: item.price,
      subtotal: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      setLoading(false);
      toast.error("Failed to save order items");
      return;
    }

    await supabase.from("notifications").insert({
      type: "new_order",
      message: `New order ${code} from ${contactName} - KES ${totalAmount}`,
      order_id: order.id,
      read: false,
    });

    setLoading(false);

    setOrderItems(items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      quantity: item.quantity
    })));
    setOrderSubtotal(totalPrice);
    setOrderDeliveryFee(deliveryFee);
    setOrderTotal(totalAmount);
    setReceiptCode(code);
    setShowReceipt(true);
    clearCart();
    toast.success("Order placed successfully!");
  };

  const sendViaWhatsApp = () => {
    const itemsList = orderItems
      .map((item) => `${item.quantity}x ${item.title}`)
      .join(", ");
    const message = `Hi! I've placed an order on BitesQuicky.\n\nReceipt Code: ${receiptCode}\nName: ${contactName}\nItems: ${itemsList}\nTotal: KES ${orderTotal}\nContact: ${contactPhone}`;
    window.open(
      `https://wa.me/254114097160?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const handleClose = () => {
    setContactName("");
    setContactPhone("");
    setPickupZoneId("");
    setRoomNumber("");
    setSpecialInstructions("");
    setShowReceipt(false);
    setReceiptCode("");
    setOrderItems([]);
    setOrderSubtotal(0);
    setOrderDeliveryFee(0);
    setOrderTotal(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {!showReceipt ? (
          <>
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.quantity}x {item.title}
                    </span>
                    <span className="font-semibold">
                      KES {item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <Label>Full Name</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label>Phone Number</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+254..."
                />
              </div>

              <div>
                <Label>Pickup Zone</Label>
                <Select value={pickupZoneId} onValueChange={setPickupZoneId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedZone?.requires_room_number && (
                <div>
                  <Label>Room Number</Label>
                  <Input
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g., A101"
                  />
                </div>
              )}

              <div>
                <Label>Special Instructions (Optional)</Label>
                <Textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g., Extra cheese, vanilla flavor, no onions, etc."
                />
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">KES {totalPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="font-semibold">KES {deliveryFee}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">KES {totalAmount}</span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Placing Order..." : "Confirm Order"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Order Confirmed! 🎉</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Receipt Preview */}
              <div className="bg-white text-black p-4 rounded-lg border-2 border-dashed border-muted font-mono text-xs">
                <div className="text-center mb-3">
                  <p className="text-base font-bold">BITESQUICKY</p>
                  <p className="text-[10px]">Fast Campus Food Delivery</p>
                  <p className="text-[10px]">Tel: +254 114 097 160</p>
                </div>

                <div className="flex justify-between text-[10px] mb-2">
                  <span>Date: {new Date().toLocaleDateString('en-GB')}</span>
                  <span>Time: {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}</span>
                </div>

                <div className="border-t border-b border-dashed border-gray-400 py-2 my-2">
                  <p className="text-center font-bold text-sm">Receipt: {receiptCode}</p>
                </div>

                <div className="space-y-1 mb-2 text-[10px]">
                  <p>Customer: {contactName}</p>
                  <p>Phone: {contactPhone}</p>
                  <p>Pickup: {selectedZone?.name}</p>
                  {roomNumber && <p>Room: {roomNumber}</p>}
                  {specialInstructions && (
                    <p className="text-[9px]">Note: {specialInstructions}</p>
                  )}
                </div>

                <div className="border-t border-dashed border-gray-400 my-2"></div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold text-[10px]">
                    <span>ITEM</span>
                    <span>QTY</span>
                    <span>AMOUNT</span>
                  </div>
                  <div className="border-t border-dotted border-gray-300"></div>

                  {orderItems.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="flex-1 pr-2 truncate">{item.title}</span>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <span className="w-16 text-right">{item.price * item.quantity}</span>
                      </div>
                      <div className="text-[9px] text-gray-600 pl-1">
                        @ KES {item.price} each
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-gray-400 my-2"></div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>KES {orderSubtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>KES {orderDeliveryFee}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t border-gray-400 pt-1 mt-1">
                    <span>TOTAL:</span>
                    <span>KES {orderTotal}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-400 my-2"></div>

                <div className="text-center space-y-1 text-[10px]">
                  <p>Thank you for your order!</p>
                  <p className="text-[9px]">Keep this receipt for reference</p>
                  <p className="text-[9px]">Queries: WhatsApp +254 114 097 160</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={sendViaWhatsApp} className="flex-1">
                  Send via WhatsApp
                </Button>
                <Button
                  onClick={downloadReceipt}
                  variant="outline"
                  className="flex-1"
                >
                  Download PDF
                </Button>
              </div>

              <Button
                onClick={handleClose}
                variant="secondary"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
