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
- Order placement and tracking
- Admin login and dashboard
- Order management system
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
- **2025-10-02**: Successfully imported project from GitHub and configured for Replit environment
  - Installed all npm dependencies (417 packages)
  - Vite config already properly configured to bind to 0.0.0.0:5000 with allowedHosts: true
  - Workflow "Start application" running successfully on port 5000
  - Deployment configured for autoscale with build and preview commands
  - Supabase integration already set up with credentials
  - Application tested and verified working correctly

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

## User Preferences
None specified yet.
