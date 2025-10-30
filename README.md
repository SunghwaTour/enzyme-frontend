# Enzyme Reservation - Frontend

React + Vite + TypeScript frontend for the Enzyme Reservation System.

## 🚀 Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components (Radix UI primitives)
- **TanStack React Query** - Server state management
- **Wouter** - Client-side routing
- **Supabase** - Authentication
- **Stripe** - Payment processing

## 📦 Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── BookingForm.tsx
│   │   ├── CustomerForm.tsx
│   │   ├── RoomCard.tsx
│   │   └── ...
│   ├── pages/            # Route pages
│   │   ├── Dashboard.tsx
│   │   ├── RoomManagement.tsx
│   │   ├── CustomerApp.tsx
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useWebSocket.ts
│   ├── lib/              # Utilities
│   │   ├── queryClient.ts
│   │   ├── supabase.ts
│   │   └── apiEndpoints.ts
│   └── shared/           # Shared types and schemas
│       └── schema.ts
└── index.html
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual values
```

### Environment Variables

Create a `.env` file:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe (optional)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Running Locally

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

### Build

```bash
# Type check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Run TypeScript type checking |

## 🌐 Deployment

This frontend is designed to be deployed on **Vercel**.

### Quick Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Configure environment variables:
   - `VITE_API_URL` - Your backend API URL
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anon key
   - `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
5. Deploy!

### Build Configuration

Vite is configured to build optimized static files to the `dist/` directory. See `vite.config.ts` for configuration details.

## 🔐 Authentication

Uses **Supabase Auth** with Google OAuth:

1. User clicks "Login with Google"
2. Redirected to Supabase OAuth flow
3. JWT token stored in localStorage
4. Token sent with API requests via `Authorization: Bearer <token>` header

## 💳 Payment Processing

Integrated with **Stripe** for booking payments:

- Test mode: Use card `4242 4242 4242 4242`
- Production: Configure with live Stripe keys

## 🏗️ Architecture

### State Management

- **TanStack React Query** for server state
- Query keys: `['entity', id]` or `['entity', 'list']`
- Automatic cache invalidation on mutations

### Routing

Using **Wouter** (lightweight alternative to React Router):

```typescript
<Route path="/" component={Dashboard} />
<Route path="/rooms" component={RoomManagement} />
<Route path="/customers" component={CustomerManagement} />
```

### API Communication

All API calls go through `apiEndpoints.ts`:

```typescript
import { API_ENDPOINTS } from '@/lib/apiEndpoints';

// GET request
fetch(API_ENDPOINTS.ROOMS.LIST)

// Dynamic endpoint
fetch(API_ENDPOINTS.ROOMS.DETAIL(roomId))
```

Backend URL is configured via `VITE_API_URL` environment variable.

## 🎨 Styling

### Tailwind CSS

Utility-first CSS framework:

```tsx
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow">
  <Button variant="default" size="lg">Click me</Button>
</div>
```

### shadcn/ui Components

Pre-built accessible components:

```tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog } from "@/components/ui/dialog"
```

## 📱 Features

### Admin Dashboard
- Room management
- Booking management
- Customer management
- Sensor monitoring
- Safety checklists
- Quote & contract management

### Customer App (Tablet Interface)
- PIN-based authentication
- Room booking with calendar
- Stripe payment integration
- Real-time availability

### Real-time Updates
- WebSocket connection for sensor data
- Live temperature & humidity monitoring
- Instant status updates

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Build validation
npm run build
```

## 📚 Additional Resources

- **Backend Repository**: Separate Django REST API repository
- **API Documentation**: See backend repository for API endpoint details

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make changes and test: `npm run dev`
3. Type check: `npm run type-check`
4. Build: `npm run build`
5. Commit: `git commit -m "Add my feature"`
6. Push: `git push origin feature/my-feature`
7. Create a Pull Request

## 📄 License

MIT

## 🔗 Related Projects

- **Backend**: Django + DRF API (separate repository)
- **Database**: Supabase PostgreSQL
- **Deployment**: Vercel (frontend), GCP Cloud Run (backend)
