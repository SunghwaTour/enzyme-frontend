# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **frontend-only** repository for the Enzyme Reservation System (효소방 관리 시스템), a Korean enzyme bath management system. It's a React + TypeScript + Vite application that connects to a **separate Django REST API backend**.

**Important:** This repository contains ONLY the frontend code. The backend API is in a separate repository.

## Commands

### Development
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Type check without emitting files
npm run type-check

# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Type Checking
Always run `npm run type-check` before committing to catch TypeScript errors. The build command also performs type checking.

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (optional)

## Architecture

### Tech Stack
- **React 18** with TypeScript
- **Vite** for bundling and dev server
- **Wouter** for client-side routing (lightweight React Router alternative)
- **TanStack React Query** for server state management
- **Supabase** for authentication (JWT-based)
- **Stripe** for payment processing
- **shadcn/ui** (Radix UI primitives) for UI components
- **Tailwind CSS** for styling

### Backend Communication

All API requests go to a **separate Django REST Framework backend**. API endpoints are centralized in `src/lib/apiEndpoints.ts`.

**Key points:**
- Backend base URL is `VITE_API_URL` environment variable
- All endpoints use **trailing slashes** (Django convention)
- Authentication uses **Supabase JWT tokens** in `Authorization: Bearer <token>` header
- Django uses **underscores** in action names (e.g., `/api/customers/verify_pin/`)
- WebSocket connections use **Django Channels** for real-time updates

### Authentication Flow

1. Users authenticate via **Supabase** (Google OAuth)
2. JWT token is stored by Supabase client
3. Token is included in all API requests to Django backend via `Authorization` header
4. Django backend validates the Supabase JWT token
5. The `useAuth` hook manages auth state and user data

**Public routes** (no auth required):
- `/customer-app` - Tablet interface for customers
- `/customer` - Alias for customer app
- `/booking` - Customer booking interface
- `/login` - Login page
- `/auth/callback` - OAuth callback

**Protected routes** (require authentication):
- All admin routes (Dashboard, Room Management, etc.)

### State Management

**Server state:** TanStack React Query
- Query keys: `['entity', id]` or `['entity', 'list']`
- Configured in `src/lib/queryClient.ts`
- Authentication headers automatically added via `getAuthHeaders()`

**Client state:** React useState/useContext (minimal)

### Routing Structure

Using **Wouter** for routing:
- `/` - Dashboard (admin)
- `/rooms` - Room management
- `/bookings` - Booking management
- `/customers` - Customer management
- `/passes` - Pass/membership management
- `/sensors` - Sensor monitoring (temperature/humidity)
- `/safety` - Safety checklist management
- `/quotes` - Quote management
- `/contracts` - Contract management
- `/customer-app` - Customer tablet interface (public)

### Real-time Updates

WebSocket connections for real-time sensor data:
- `useWebSocket` hook in `src/hooks/useWebSocket.ts`
- Connects to Django Channels endpoints: `/ws/sensors/` or `/ws/alerts/`
- Handles automatic reconnection with exponential backoff

## Key Files & Directories

### Core Application
- `src/App.tsx` - Main app with routing and layout
- `src/main.tsx` - Entry point

### Shared Schema
- `src/shared/schema.ts` - **Drizzle ORM schema and Zod validation schemas**
  - Complete database schema with all tables, enums, relations
  - TypeScript types and validation for all entities
  - This is the **single source of truth** for data structures

### API & Data Fetching
- `src/lib/apiEndpoints.ts` - All backend API endpoints
- `src/lib/queryClient.ts` - React Query configuration with auth
- `src/lib/supabase.ts` - Supabase client configuration

### Authentication
- `src/hooks/useAuth.ts` - Authentication hook
- `src/lib/authUtils.ts` - Auth utility functions

### Components
- `src/components/ui/` - shadcn/ui components (Radix UI primitives)
- `src/components/` - Custom business components
  - `RoomCard.tsx`, `BookingForm.tsx`, `CustomerForm.tsx`, etc.

### Pages
- `src/pages/` - Route page components
  - Each page corresponds to a route in App.tsx

### Configuration
- `vite.config.ts` - Vite configuration with path aliases
- `tailwind.config.ts` - Tailwind CSS theme configuration
- `tsconfig.json` - TypeScript configuration

## Path Aliases

Configured in `vite.config.ts`:
- `@/` → `src/`
- `@shared/` → `src/shared/`
- `@assets/` → `src/assets/`

Example: `import { Button } from "@/components/ui/button"`

## Working with the Backend

### API Request Pattern
```typescript
import { API_ENDPOINTS } from '@/lib/apiEndpoints';
import { useQuery, useMutation } from '@tanstack/react-query';

// GET request
const { data } = useQuery({
  queryKey: [API_ENDPOINTS.ROOMS.LIST],
});

// POST/PATCH request
const mutation = useMutation({
  mutationFn: async (data) => {
    return apiRequest('POST', API_ENDPOINTS.ROOMS.LIST, data);
  },
});
```

### Django Conventions
- **Trailing slashes:** All endpoints end with `/`
- **Underscores:** Action names use underscores: `/verify_pin/`, not `/verify-pin/`
- **Query params:** Filtering uses query strings: `?phone=123&date=2024-01-01`

## Styling

### Tailwind CSS
Utility-first CSS with custom theme in `tailwind.config.ts`. HSL-based color system using CSS variables.

### shadcn/ui Components
Pre-built accessible components based on Radix UI. Components are copied into `src/components/ui/` and can be customized.

## Data Schema

The `src/shared/schema.ts` file contains:
- **Database tables:** rooms, customers, bookings, passes, sensors, etc.
- **Enums:** roomStatus, bookingStatus, passType, lifecycleStage, etc.
- **Relations:** Drizzle relations between tables
- **Zod schemas:** Validation schemas for all insert operations
- **TypeScript types:** Exported types for all entities

**Important:** When creating or updating entities, always use the Zod schemas for validation:
- `insertCustomerSchema`
- `insertBookingSchema`
- `insertRoomSchema`
- etc.

## Korean Language Support

The UI is in Korean (한국어). Key terminology:
- 효소방 - Enzyme bath facility
- 관 - Room/chamber
- 예약 - Booking/reservation
- 고객 - Customer
- 이용권 - Pass/membership
- 센서 - Sensor
- 안전 - Safety

## Deployment

Designed for deployment on **Vercel**:
1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy

Build output goes to `dist/` directory.

## Common Patterns

### Adding a new page
1. Create component in `src/pages/YourPage.tsx`
2. Add route in `src/App.tsx` (inside Router component)
3. Add navigation link in AppSidebar if needed

### Adding a new API endpoint
1. Add to `API_ENDPOINTS` object in `src/lib/apiEndpoints.ts`
2. Ensure it matches Django backend URL structure
3. Use in components via React Query

### Adding shadcn/ui components
Components are already installed. Import from `@/components/ui/`:
```typescript
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
```

### WebSocket integration
```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

useWebSocket({
  endpoint: 'sensors', // or 'alerts'
  onSensorReading: (reading) => {
    // Handle new sensor data
  },
});
```

## Important Notes

1. **Separate backend:** This repo is frontend-only. Backend API is separate.
2. **Supabase auth:** Authentication is handled by Supabase, not Django's built-in auth.
3. **Django conventions:** Backend uses Django REST Framework conventions (trailing slashes, underscores).
4. **Type safety:** Use TypeScript types from `src/shared/schema.ts` for type safety.
5. **Real-time features:** Sensor monitoring uses WebSockets via Django Channels.
6. **Payment processing:** Stripe integration for booking payments.
