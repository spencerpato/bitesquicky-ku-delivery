import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  title,
  description,
  price,
  imageUrl,
  isNegotiable,
  isPinned,
  category,
  onOrderClick,
}: MenuCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow relative">
      {isPinned && (
        <Badge className="absolute top-2 right-2 z-10" variant="default">
          📌 Pinned
        </Badge>
      )}
      <div className="h-48 overflow-hidden">
        <img
          src={imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400"}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {category && (
            <Badge variant={category === "snacks" ? "default" : "secondary"}>
              {category}
            </Badge>
          )}
          {isNegotiable && (
            <Badge variant="outline">
              Negotiable
            </Badge>
          )}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-3">{description}</p>
        <p className="text-2xl font-bold text-primary">KES {price}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={onOrderClick} className="w-full">
          Order Now
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MenuCard;