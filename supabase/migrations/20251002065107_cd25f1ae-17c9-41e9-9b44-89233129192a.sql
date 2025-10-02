-- Allow public SELECT on orders so insert().select() can return the row
CREATE POLICY "Anyone can view orders"
ON public.orders
FOR SELECT
TO public
USING (true);