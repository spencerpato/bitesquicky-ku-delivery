import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MenuCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  isNegotiable: boolean;
  onOrderClick: () => void;
}

const MenuCard = ({
  title,
  description,
  price,
  imageUrl,
  isNegotiable,
  onOrderClick,
}: MenuCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          {isNegotiable && (
            <Badge variant="secondary" className="ml-2">
              Negotiable
            </Badge>
          )}
        </div>
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