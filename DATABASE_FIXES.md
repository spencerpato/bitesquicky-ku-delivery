# Database Fixes for BitesQuicky Admin Dashboard

## Issues Identified

The admin dashboard is experiencing issues due to missing Row Level Security (RLS) policies in the Supabase database:

1. **Status updates not persisting** - Missing UPDATE policy on orders table
2. **View button not showing order details** - Missing SELECT policy on orders table  
3. **Receipts not showing items** - Missing order_items table and SELECT policy
4. **Notifications not appearing** - Already has correct policies, should work

## How to Apply Fixes

You need to run the SQL commands in your Supabase dashboard:

1. Go to https://supabase.com and log into your project
2. Navigate to the SQL Editor
3. Copy and paste the SQL from `supabase/migrations/20251002160000_fix_rls_policies_and_order_items.sql`
4. Click "Run" to execute

## What the Migration Does

1. **Adds `contact_name` column** to orders table to store customer names
2. **Creates `order_items` table** to support multiple items per order
3. **Adds RLS policies** to allow:
   - SELECT on orders (view orders in admin dashboard)
   - UPDATE on orders (change order status)
   - SELECT and INSERT on order_items (for receipts and order creation)
4. **Creates indexes** for better query performance
5. **Removes old columns** (`item_id`, `quantity`) from orders table if they exist

## Verification

After running the migration, test these features in the admin dashboard:

- [ ] View orders in the Orders tab
- [ ] Change order status using the dropdown
- [ ] Click the View button to see order details
- [ ] Click Download Receipt to generate a PDF with order items
- [ ] Place a new order and see if notification appears

## Alternative: Manual Steps

If you prefer to apply fixes manually via Supabase Dashboard UI:

1. **Add Policies to `orders` table:**
   - Policy Name: "Anyone can view orders"
   - Policy Command: SELECT
   - Policy Definition: `true`
   - Policy Name: "Anyone can update orders"
   - Policy Command: UPDATE  
   - Policy Definition: `true`

2. **Create `order_items` table** (if it doesn't exist)
3. **Add Policies to `order_items` table:**
   - Allow SELECT: `true`
   - Allow INSERT: `true`

## Need Help?

If you encounter any errors while running the migration, please share the error message so I can help troubleshoot.
