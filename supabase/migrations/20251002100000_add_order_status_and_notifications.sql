/*
  # Add Order Status and Notifications System

  1. Changes to Orders Table
    - Add `status` column to track order progress (pending, preparing, delivered, cancelled)
    - Default status is 'pending'

  2. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `type` (text) - notification type (e.g., 'new_order')
      - `message` (text) - notification message
      - `order_id` (uuid, foreign key to orders)
      - `read` (boolean) - whether notification has been read
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on `notifications` table
    - Allow public to insert notifications (for order creation)
    - Allow public to read and update notifications (for admin dashboard)

  4. Important Notes
    - Order status helps track fulfillment progress
    - Notifications provide real-time alerts for new orders
*/

-- Add status column to orders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE orders ADD COLUMN status text DEFAULT 'pending';
  END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  message text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert notifications
CREATE POLICY "Anyone can create notifications"
  ON notifications
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to read notifications
CREATE POLICY "Anyone can read notifications"
  ON notifications
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to update notifications
CREATE POLICY "Anyone can update notifications"
  ON notifications
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
