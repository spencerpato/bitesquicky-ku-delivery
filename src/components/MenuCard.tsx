import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface MenuCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isNegotiable: boolean;
  isPinned?: boolean;
  category?: string;
  onOrderClick: () => void;
}

const MenuCard = ({
  id,
  title,
  description,
  price,
  imageUrl,
  isNegotiable,
  isPinned,
  category,
  onOrderClick,
}: MenuCardProps) => {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({ id, title, price, image_url: imageUrl || null });
    onOrderClick();
    toast.success(`${title} added to cart!`);
  };
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow relative flex flex-col">
      {isPinned && (
        <Badge className="absolute top-1 right-1 md:top-2 md:right-2 z-10 text-xs" variant="default">
          📌 Pinned
        </Badge>
      )}
      <div className="h-32 md:h-40 lg:h-48 overflow-hidden">
        <img
          src={imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="pt-2 md:pt-4 pb-2 md:pb-3 flex-1">
        <div className="flex flex-wrap gap-1 md:gap-2 mb-1 md:mb-2">
          {category && (
            <Badge variant={category === "snacks" ? "default" : "secondary"} className="text-[10px] md:text-xs">
              {category}
            </Badge>
          )}
          {isNegotiable && (
            <Badge variant="outline" className="text-[10px] md:text-xs">
              Negotiable
            </Badge>
          )}
        </div>
        <h3 className="text-sm md:text-lg lg:text-xl font-semibold mb-1 md:mb-2 line-clamp-1">{title}</h3>
        <p className="text-muted-foreground text-xs md:text-sm mb-2 md:mb-3 line-clamp-2">{description}</p>
        <p className="text-lg md:text-xl lg:text-2xl font-bold text-primary">KES {price}</p>
      </CardContent>
      <CardFooter className="pt-0 pb-2 md:pb-4">
        <Button onClick={handleAddToCart} className="w-full gap-1 md:gap-2 h-8 md:h-10 text-xs md:text-sm">
          <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MenuCard;