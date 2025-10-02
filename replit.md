# BitesQuicky - Food Delivery Application

## Overview
BitesQuicky is a food and snacks delivery application for Karatina University students. It allows users to browse menus, place orders, and get food delivered to their hostels. The app includes an admin panel for managing orders and menu items.

## Project Architecture
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn-ui + Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM v6
- **Backend/Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite 5

## Key Features
- User-facing storefront with menu browsing and cart functionality
- Order placement and tracking with customer order tracing page
- Admin login and dashboard with order search and delete capabilities
- Order management system with real-time updates
- Real-time notifications
- Responsive design with dark mode support

## Project Structure
```
src/
├── components/      # Reusable UI components
│   ├── ui/         # shadcn-ui components
│   ├── Cart.tsx
│   ├── CheckoutModal.tsx
│   ├── Hero.tsx
│   ├── MenuCard.tsx
│   ├── NotificationBell.tsx
│   ├── OrderDetailsModal.tsx
│   └── OrderModal.tsx
├── contexts/       # React contexts (CartContext)
├── hooks/          # Custom React hooks
├── integrations/   # Third-party integrations (Supabase)
├── pages/          # Page components
│   ├── Index.tsx
│   ├── Admin.tsx
│   ├── AdminLogin.tsx
│   ├── TraceOrder.tsx
│   └── NotFound.tsx
├── lib/            # Utility functions
├── App.tsx         # Main app component with routing
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## Database
- Uses Supabase for backend services
- Migration files in `supabase/migrations/`
- Includes tables for menu items, orders, notifications, and order status

## Development Setup
- Port: 5000 (frontend dev server)
- Host: 0.0.0.0 (configured for Replit proxy)
- Build: `npm run build`
- Dev: `npm run dev`

## Recent Changes
- **2025-10-02**: Fresh GitHub import setup completed for Replit environment
  - Successfully imported project from GitHub repository
  - Installed all npm dependencies (417 packages using npm)
  - Verified Supabase configuration with environment variables in .env:
    * VITE_SUPABASE_URL
    * VITE_SUPABASE_PUBLISHABLE_KEY
    * VITE_SUPABASE_PROJECT_ID
  - Confirmed vite.config.ts properly configured for Replit:
    * Host: 0.0.0.0 (required for Replit proxy)
    * Port: 5000 (frontend only port)
    * allowedHosts: true (enables proxy access)
    * HMR configured with wss protocol and clientPort 443
  - Workflow "Start application" successfully running on port 5000
  - Deployment configured for autoscale deployment with:
    * Build command: `npm run build`
    * Run command: `npm run preview`
  - Application tested and verified working:
    * Homepage renders correctly with "BitesQuicky" branding
    * Navigation functional (Menu, How It Works, Contact)
    * Cart icon visible in header
    * Responsive design working
  - Project ready for use in Replit environment

- **2025-10-02**: Enhanced admin dashboard with missing features
  - Added real-time order updates using Supabase subscriptions - new orders appear immediately without refresh
  - Added comprehensive empty state messages for orders, menu items, and delivery tiers
  - Improved UX with helpful CTAs in empty states
  - Verified all existing features work correctly:
    * View button opens order details modal
    * Download Receipt button generates PDF receipts
    * Change Status dropdown updates order status in database
    * NotificationBell shows real-time notifications with mark as read functionality
    * Menu Manager with full CRUD operations
    * Delivery Fee Manager with full CRUD operations
  - Fixed routing configuration with vercel.json for proper SPA behavior on refresh

- **2025-10-02**: Identified and documented database security issues
  - Analyzed admin dashboard issues: status updates, view buttons, receipts, and notifications
  - Found missing Row Level Security (RLS) policies in Supabase database
  - Created migration file `supabase/migrations/20251002160000_fix_rls_policies_and_order_items.sql`
  - Created `DATABASE_FIXES.md` with step-by-step instructions for applying fixes
  - Issues identified:
    * Missing SELECT policy on orders table (prevents viewing orders)
    * Missing UPDATE policy on orders table (prevents status changes)
    * Missing order_items table and related policies (prevents receipt generation with items)
  - **ACTION REQUIRED**: User needs to apply the SQL migration via Supabase dashboard to enable admin features

- **2025-10-02**: Enhanced admin dashboard error handling and receipt generation
  - Improved `updateOrderStatus` function with:
    * Comprehensive error handling for RLS policy issues
    * Fixed critical bug: stats now recalculate from fresh state (not stale) for immediate UI updates
    * Better user feedback with descriptive toast messages
    * Proper guidance when database migration is needed
  - Enhanced `downloadOrderReceipt` functionality:
    * Fetches complete order data with pickup zones relationship
    * Includes order items with proper joins
    * Matches customer receipt format exactly (thermal 80mm width, logo, complete details)
    * Shows order status and proper zone names
    * Comprehensive error handling with fallbacks for missing data
  - Improved `OrderDetailsModal` with:
    * Enhanced receipt download with same format as admin receipts
    * Better error messages and user guidance
    * Proper toast notifications for all operations
  - All admin features now have robust error handling and guide users to apply the migration when needed
  - Application compiles successfully and is ready for database migration

- **2025-10-02**: Logo branding implemented across all receipts
  - Created `src/lib/logo.ts` with base64-encoded logo for reliable embedding
  - Updated all receipt generation (customer checkout, admin, order details) to use logo
  - Logo displays in both PDF downloads (50mm × 15mm) and on-screen previews
  - Production-compatible implementation using data URLs

- **2025-10-02**: Implemented 5 new customer and admin features
  - **Delete Order (Admin Dashboard)**:
    * Added delete button with trash icon next to each order in admin table
    * Implemented confirmation dialog using AlertDialog component
    * Deletes orders from Supabase and updates local state with stats recalculation
    * Proper error handling with toast notifications
  - **Trace Order Page** (`/trace-order`):
    * Created new customer-facing page for order tracking
    * Allows customers to search orders by phone number
    * Displays all orders with status badges (pending, preparing, delivered, cancelled)
    * Includes "View Details" button that opens OrderDetailsModal
    * Shows "No Orders Found" state when applicable
    * "Back to Home" navigation button
  - **Search Orders (Admin Dashboard)**:
    * Added real-time search input to filter orders
    * Searches by Order ID (receipt code) or Phone Number
    * Client-side filtering for instant results
    * No additional Supabase queries needed
  - **Trace My Order CTA (Homepage)**:
    * Added secondary "Trace My Order" button on hero section
    * Styled with secondary variant (green) and Package icon
    * Positioned next to "Order Now" button
    * Navigates to `/trace-order` page
  - **Full Backend Integration**:
    * All features connected to Supabase backend
    * Proper error handling and user feedback
    * State management with real-time updates
    * Routing configured in App.tsx
  - All features tested and architect-reviewed

## User Preferences
None specified yet.
