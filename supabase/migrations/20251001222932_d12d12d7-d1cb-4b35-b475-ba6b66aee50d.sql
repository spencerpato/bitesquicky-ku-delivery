-- Fix RLS policies for menu_items to allow admin operations
DROP POLICY IF EXISTS "Anyone can view available menu items" ON public.menu_items;

CREATE POLICY "Anyone can view menu items"
  ON public.menu_items
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert menu items"
  ON public.menu_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update menu items"
  ON public.menu_items
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete menu items"
  ON public.menu_items
  FOR DELETE
  USING (true);

-- Fix RLS policies for delivery_fee_tiers
CREATE POLICY "Anyone can insert delivery fee tiers"
  ON public.delivery_fee_tiers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update delivery fee tiers"
  ON public.delivery_fee_tiers
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete delivery fee tiers"
  ON public.delivery_fee_tiers
  FOR DELETE
  USING (true);

-- Remove pickup_zones table as it's no longer needed
DROP TABLE IF EXISTS public.pickup_zones CASCADE;