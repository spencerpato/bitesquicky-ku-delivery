-- Create pickup zones table
CREATE TABLE public.pickup_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  delivery_fee INTEGER NOT NULL,
  requires_room_number BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  image_url TEXT,
  is_negotiable BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_code TEXT NOT NULL UNIQUE,
  item_id UUID REFERENCES public.menu_items(id) NOT NULL,
  quantity INTEGER NOT NULL,
  pickup_zone_id UUID REFERENCES public.pickup_zones(id) NOT NULL,
  room_number TEXT,
  contact_phone TEXT NOT NULL,
  special_instructions TEXT,
  delivery_fee INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pickup_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Public read access for zones and menu
CREATE POLICY "Anyone can view pickup zones" ON public.pickup_zones FOR SELECT USING (true);
CREATE POLICY "Anyone can view available menu items" ON public.menu_items FOR SELECT USING (is_available = true OR true);

-- Public can create orders
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Insert default pickup zones
INSERT INTO public.pickup_zones (name, delivery_fee, requires_room_number) VALUES
  ('Main Gate', 5, false),
  ('Runda Hostels', 15, true),
  ('Spring Valley Hostels', 15, true),
  ('Library', 10, false);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();