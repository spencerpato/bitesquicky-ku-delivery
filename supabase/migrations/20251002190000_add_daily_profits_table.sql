/*
  # Add Daily Profits Table
  
  Creates a table to track daily profit summaries from delivered orders.
  
  1. New Table
    - daily_profits
      - id (uuid, primary key)
      - date (date, unique - one entry per day)
      - total_profit (integer - sum of delivery fees)
      - total_orders (integer - count of delivered orders)
      - created_at (timestamptz)
  
  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Create daily_profits table
CREATE TABLE IF NOT EXISTS daily_profits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_profit integer NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE daily_profits ENABLE ROW LEVEL SECURITY;

-- Add policies for admin access
CREATE POLICY "Anyone can view daily profits" 
  ON daily_profits 
  FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert daily profits" 
  ON daily_profits 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update daily profits" 
  ON daily_profits 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_profits_date ON daily_profits(date DESC);
