import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle } from "lucide-react";
import Hero from "@/components/Hero";
import MenuCard from "@/components/MenuCard";
import OrderModal from "@/components/OrderModal";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  is_negotiable: boolean;
}

const Index = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("created_at", { ascending: false });
    
    if (data) setMenuItems(data);
  };

  const handleOrderClick = (item: MenuItem) => {
    setSelectedItem(item);
    setOrderModalOpen(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/95 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="BitesQuicky" className="h-12" />
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#menu" className="hover:text-primary transition-colors">
              Menu
            </a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">
              How It Works
            </a>
            <a href="#contact" className="hover:text-primary transition-colors">
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="pt-16">
        <Hero />
      </div>

      {/* Menu Section */}
      <section id="menu" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Menu</h2>
            <p className="text-muted-foreground text-lg">
              Fresh, delicious, and delivered fast
            </p>
          </div>

          {menuItems.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-lg">Menu items coming soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <MenuCard
                  key={item.id}
                  {...item}
                  imageUrl={item.image_url}
                  isNegotiable={item.is_negotiable}
                  onOrderClick={() => handleOrderClick(item)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Pick from Menu</h3>
              <p className="text-muted-foreground">
                Browse our delicious selection of food and snacks
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Place Your Order</h3>
              <p className="text-muted-foreground">
                Select your pickup zone and contact details
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">We Deliver Fast 🚴</h3>
              <p className="text-muted-foreground">
                Get your order delivered right to your hostel
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-8">Get In Touch</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              asChild
              className="gap-2"
            >
              <a href="https://wa.me/254114097160" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="gap-2"
            >
              <a href="tel:+254703998717">
                <Phone className="h-5 w-5" />
                Call Us
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="gap-2"
            >
              <a href="mailto:bitesquicky@gmail.com">
                <Mail className="h-5 w-5" />
                Email
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <img src={logo} alt="BitesQuicky" className="h-16 mx-auto mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              BitesQuicky is your trusted delivery service at Karatina
              University. Fresh bites, delivered quick.
            </p>
          </div>

          <div className="flex justify-center gap-6 mb-8 text-sm">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Report Issue
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 BitesQuicky. All rights reserved.</p>
            <Link to="/admin-login" className="text-xs opacity-30 hover:opacity-50 transition-opacity">
              Made with ❤️
            </Link>
          </div>
        </div>
      </footer>

      <OrderModal
        open={orderModalOpen}
        onOpenChange={setOrderModalOpen}
        item={selectedItem}
      />
    </div>
  );
};

export default Index;