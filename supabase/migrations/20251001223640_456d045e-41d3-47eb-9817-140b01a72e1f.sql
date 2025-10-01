-- Recreate pickup_zones table (without delivery_fee since that's now based on order value)
CREATE TABLE IF NOT EXISTS public.pickup_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  requires_room_number BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on pickup_zones
ALTER TABLE public.pickup_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pickup zones"
  ON public.pickup_zones
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage pickup zones"
  ON public.pickup_zones
  FOR ALL
  USING (true);

-- Insert default pickup zones
INSERT INTO public.pickup_zones (name, requires_room_number) VALUES
  ('Main Gate', false),
  ('Runda Hostels', true),
  ('Spring Valley Hostels', true),
  ('Library', false),
  ('Cafeteria', false)
ON CONFLICT DO NOTHING;

-- Create order_items table for cart functionality
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  item_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  price_at_time INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view order items"
  ON public.order_items
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert order items"
  ON public.order_items
  FOR INSERT
  WITH CHECK (true);

-- Modify orders table for cart checkout
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS pickup_zone_id UUID;

-- Make item_id and quantity nullable since they'll be in order_items now
ALTER TABLE public.orders 
  ALTER COLUMN item_id DROP NOT NULL,
  ALTER COLUMN quantity DROP NOT NULL;