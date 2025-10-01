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

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("BitesQuicky Receipt", 105, 20, { align: "center" });

    doc.setFontSize(12);
    let y = 40;
    doc.text(`Receipt Code: ${receiptCode}`, 20, y);
    y += 10;
    doc.text(`Name: ${contactName}`, 20, y);
    y += 10;
    doc.text(`Phone: ${contactPhone}`, 20, y);
    y += 10;
    doc.text(`Pickup Zone: ${selectedZone.name}`, 20, y);
    if (roomNumber) {
      y += 10;
      doc.text(`Room Number: ${roomNumber}`, 20, y);
    }
    y += 15;

    doc.text("Items:", 20, y);
    y += 10;
    items.forEach((item) => {
      doc.text(
        `${item.quantity}x ${item.title} - KES ${item.price * item.quantity}`,
        20,
        y
      );
      y += 8;
    });

    y += 5;
    doc.text(`Subtotal: KES ${totalPrice}`, 20, y);
    y += 10;
    doc.text(`Delivery Fee: KES ${deliveryFee}`, 20, y);
    y += 10;
    doc.setFontSize(14);
    doc.text(`Total: KES ${totalAmount}`, 20, y);

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

    setLoading(false);

    if (itemsError) {
      toast.error("Failed to save order items");
      return;
    }

    setReceiptCode(code);
    setShowReceipt(true);
    clearCart();
    toast.success("Order placed successfully!");
  };

  const sendViaWhatsApp = () => {
    const itemsList = items
      .map((item) => `${item.quantity}x ${item.title}`)
      .join(", ");
    const message = `Hi! I've placed an order on BitesQuicky.\n\nReceipt Code: ${receiptCode}\nName: ${contactName}\nItems: ${itemsList}\nTotal: KES ${totalAmount}\nContact: ${contactPhone}`;
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
                  placeholder="Any special requests?"
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

            <div className="space-y-4 text-center">
              <div className="p-6 bg-secondary/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Receipt Code
                </p>
                <p className="text-2xl font-bold text-primary">
                  {receiptCode}
                </p>
              </div>

              <div className="text-left space-y-2">
                <p>
                  <strong>Name:</strong> {contactName}
                </p>
                <p>
                  <strong>Items:</strong> {items.length} item(s)
                </p>
                <p>
                  <strong>Subtotal:</strong> KES {totalPrice}
                </p>
                <p>
                  <strong>Delivery Fee:</strong> KES {deliveryFee}
                </p>
                <p>
                  <strong>Total:</strong> KES {totalAmount}
                </p>
                <p>
                  <strong>Contact:</strong> {contactPhone}
                </p>
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
