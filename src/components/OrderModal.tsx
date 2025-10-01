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
import jsPDF from "jspdf";

interface MenuItem {
  id: string;
  title: string;
  price: number;
  image_url: string;
}

interface PickupZone {
  id: string;
  name: string;
  delivery_fee: number;
  requires_room_number: boolean;
}

interface OrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
}

const OrderModal = ({ open, onOpenChange, item }: OrderModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [pickupZoneId, setPickupZoneId] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [zones, setZones] = useState<PickupZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptCode, setReceiptCode] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (open) {
      loadZones();
    }
  }, [open]);

  const loadZones = async () => {
    const { data } = await supabase.from("pickup_zones").select("*");
    if (data) setZones(data);
  };

  const selectedZone = zones.find((z) => z.id === pickupZoneId);
  const deliveryFee = selectedZone?.delivery_fee || 0;
  const totalAmount = item ? item.price * quantity + deliveryFee : 0;

  const generateReceiptCode = () => {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    const timeStr = date.getTime().toString().slice(-4);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `BQ-${dateStr}-${timeStr}-${random}`;
  };

  const downloadReceipt = () => {
    if (!item || !selectedZone) return;

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("BitesQuicky Receipt", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Receipt Code: ${receiptCode}`, 20, 40);
    doc.text(`Item: ${item.title}`, 20, 50);
    doc.text(`Quantity: ${quantity}`, 20, 60);
    doc.text(`Price: KES ${item.price * quantity}`, 20, 70);
    doc.text(`Pickup Zone: ${selectedZone.name}`, 20, 80);
    doc.text(`Delivery Fee: KES ${deliveryFee}`, 20, 90);
    doc.text(`Total: KES ${totalAmount}`, 20, 100);
    doc.text(`Contact: ${contactPhone}`, 20, 110);
    
    doc.save(`BitesQuicky-${receiptCode}.pdf`);
  };

  const handleSubmit = async () => {
    if (!item || !pickupZoneId || !contactPhone) {
      toast.error("Please fill all required fields");
      return;
    }

    if (selectedZone?.requires_room_number && !roomNumber) {
      toast.error("Room number is required for this zone");
      return;
    }

    setLoading(true);
    const code = generateReceiptCode();

    const { error } = await supabase.from("orders").insert({
      receipt_code: code,
      item_id: item.id,
      quantity,
      pickup_zone_id: pickupZoneId,
      room_number: selectedZone?.requires_room_number ? roomNumber : null,
      contact_phone: contactPhone,
      special_instructions: specialInstructions || null,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to place order");
      return;
    }

    setReceiptCode(code);
    setShowReceipt(true);
    toast.success("Order placed successfully!");
  };

  const sendViaWhatsApp = () => {
    const message = `Hi! I've placed an order on BitesQuicky.\n\nReceipt Code: ${receiptCode}\nItem: ${item?.title}\nQuantity: ${quantity}\nTotal: KES ${totalAmount}\nContact: ${contactPhone}`;
    window.open(
      `https://wa.me/254114097160?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const handleClose = () => {
    setQuantity(1);
    setPickupZoneId("");
    setRoomNumber("");
    setContactPhone("");
    setSpecialInstructions("");
    setShowReceipt(false);
    setReceiptCode("");
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {!showReceipt ? (
          <>
            <DialogHeader>
              <DialogTitle>Order {item.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-2xl font-bold text-primary">
                    KES {item.price}
                  </p>
                </div>
              </div>

              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
                        {zone.name} (+KES {zone.delivery_fee})
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
                <Label>Contact Phone</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+254..."
                />
              </div>

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
                  <span className="font-semibold">
                    KES {item.price * quantity}
                  </span>
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
                  <strong>Item:</strong> {item.title}
                </p>
                <p>
                  <strong>Quantity:</strong> {quantity}
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
                <Button onClick={downloadReceipt} variant="outline" className="flex-1">
                  Download PDF
                </Button>
              </div>

              <Button onClick={handleClose} variant="secondary" className="w-full">
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderModal;