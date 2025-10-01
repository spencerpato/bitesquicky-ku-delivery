import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const Hero = () => {
  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false })
  );

  const foodImages = [
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800&q=80",
    "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=800&q=80",
  ];

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[hsl(14,100%,96%)] to-[hsl(142,76%,96%)]">
      <div className="absolute inset-0 opacity-10">
        <Carousel
          plugins={[plugin.current]}
          className="w-full h-full"
          opts={{ loop: true }}
        >
          <CarouselContent>
            {foodImages.map((img, index) => (
              <CarouselItem key={index}>
                <div className="h-screen">
                  <img
                    src={img}
                    alt="Delicious food"
                    className="w-full h-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="container relative z-10 px-4 mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">
          Get Food & Snacks <br />
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Delivered to Your Hostel
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Skip the queue. Add just Ksh 5, 10, or 15 depending on your pickup zone.
        </p>
        <Button
          size="lg"
          onClick={scrollToMenu}
          className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          Order Now <ChevronDown className="ml-2 h-5 w-5" />
        </Button>
        <div className="mt-8 text-lg text-muted-foreground">
          🍴 Try our mouth-watering delicacies
        </div>
      </div>
    </section>
  );
};

export default Hero;