-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true);

-- Storage policies for menu images
CREATE POLICY "Menu images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

CREATE POLICY "Admins can upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Admins can update menu images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images');

CREATE POLICY "Admins can delete menu images"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images');

-- Create delivery fee tiers table
CREATE TABLE public.delivery_fee_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_amount INTEGER NOT NULL,
  max_amount INTEGER,
  fee INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on delivery_fee_tiers
ALTER TABLE public.delivery_fee_tiers ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_fee_tiers
CREATE POLICY "Anyone can view delivery fee tiers"
ON public.delivery_fee_tiers FOR SELECT
USING (true);

-- Add trigger for delivery_fee_tiers updated_at
CREATE TRIGGER update_delivery_fee_tiers_updated_at
BEFORE UPDATE ON public.delivery_fee_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default delivery fee tiers
INSERT INTO public.delivery_fee_tiers (min_amount, max_amount, fee)
VALUES 
  (0, 199, 10),
  (200, 500, 15),
  (501, NULL, 20);

-- Add category, pinned, and view_count to menu_items
ALTER TABLE public.menu_items
ADD COLUMN category TEXT NOT NULL DEFAULT 'food',
ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- Remove pickup_zone_id from orders (we'll calculate delivery fee based on order value)
ALTER TABLE public.orders
DROP COLUMN pickup_zone_id;