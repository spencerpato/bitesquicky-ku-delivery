/*
  # Fix RLS Policies and Add Order Items Table
  
  1. Add missing RLS policies for orders table
    - Allow anyone to SELECT orders (for admin dashboard)
    - Allow anyone to UPDATE orders (for status changes)
  
  2. Create order_items table if it doesn't exist
    - Stores individual items in each order
    - Supports multiple items per order
  
  3. Add contact_name field to orders
    - Store customer name for better order management
  
  4. Add missing policies for order_items
*/

-- Add contact_name column to orders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN contact_name text;
  END IF;
END $$;

-- Create order_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES menu_items(id),
  quantity integer NOT NULL,
  price_at_time integer NOT NULL,
  subtotal integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Add missing policies for orders table
DO $$ 
BEGIN
  -- Add SELECT policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Anyone can view orders'
  ) THEN
    CREATE POLICY "Anyone can view orders" 
      ON orders 
      FOR SELECT 
      USING (true);
  END IF;

  -- Add UPDATE policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Anyone can update orders'
  ) THEN
    CREATE POLICY "Anyone can update orders" 
      ON orders 
      FOR UPDATE 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- Add policies for order_items table
DO $$ 
BEGIN
  -- Add INSERT policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' AND policyname = 'Anyone can create order items'
  ) THEN
    CREATE POLICY "Anyone can create order items" 
      ON order_items 
      FOR INSERT 
      WITH CHECK (true);
  END IF;

  -- Add SELECT policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' AND policyname = 'Anyone can view order items'
  ) THEN
    CREATE POLICY "Anyone can view order items" 
      ON order_items 
      FOR SELECT 
      USING (true);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_id ON order_items(item_id);

-- Remove old item_id column from orders table if it exists (old schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'item_id'
  ) THEN
    ALTER TABLE orders DROP COLUMN item_id;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE orders DROP COLUMN quantity;
  END IF;
END $$;
