# Wrapper Frontend

This is the frontend application for the Wrapper multi-tenant SaaS platform.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_APP_URL=http://localhost:3001
   VITE_DEFAULT_SUBDOMAIN=demo
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Kinde SSO Authentication

The application uses Kinde for Single Sign-On (SSO) authentication. The authentication flow:

1. User enters their organization subdomain on the login page
2. Frontend calls the backend API to get the Kinde auth URL for that organization
3. User is redirected to Kinde for authentication
4. After successful auth, Kinde redirects back to `/auth/callback`
5. Backend handles the callback and sets an HTTP-only cookie with the JWT token
6. Frontend checks authentication status and redirects to dashboard

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── auth/      # Authentication components
│   ├── layout/    # Layout components
│   └── ui/        # Base UI components
├── lib/           # Utilities and API client
├── pages/         # Page components
├── stores/        # Zustand state stores
└── App.tsx        # Main application component
```

## Key Features

- **Kinde SSO Integration**: Secure authentication with organization-based login
- **Multi-tenant Support**: Subdomain-based tenant isolation
- **Role-based Access Control**: Permission management
- **Real-time Analytics**: Dashboard with usage metrics
- **Billing Integration**: Stripe-powered subscription management

## Development

### Adding New Pages

1. Create a new component in `src/pages/`
2. Add the route in `App.tsx`
3. Update navigation in `DashboardLayout` if needed

### API Integration

All API calls should go through the centralized API client in `src/lib/api.ts`. The client handles:
- Authentication headers
- Error handling
- Response interceptors

### State Management

The app uses Zustand for state management with the following stores:
- `authStore`: User authentication state
- `tenantStore`: Current tenant information
- `subscriptionStore`: Billing and subscription data

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Troubleshooting

### Styles Not Applying
- Ensure PostCSS is configured correctly
- Check that Tailwind CSS is imported in `src/index.css`
- Verify the `postcss.config.js` file exists

### Authentication Issues
- Check that the backend is running on the correct port
- Verify the subdomain exists in the database
- Ensure cookies are enabled in the browser
- Check the browser console for CORS errors

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000/api` |
| `VITE_APP_URL` | Frontend application URL | `http://localhost:3001` |
| `VITE_DEFAULT_SUBDOMAIN` | Default subdomain for development | `demo` |

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Query** for server state management
- **Zustand** for client state management
- **React Router** for routing
- **Axios** for API calls
- **React Hook Form** for form handling
- **Recharts** for data visualization

## Features

### 🏢 Multi-Tenant Architecture
- Tenant-aware routing and data isolation
- Dynamic tenant switching
- Tenant-specific branding and settings

### 📊 Analytics Dashboard
- Real-time metrics and KPIs
- Interactive charts and graphs
- Usage analytics and performance monitoring
- Exportable reports

### 👥 User Management
- User invitation system
- Role-based access control
- Team member management
- Activity tracking

### 💳 Billing & Subscriptions
- Stripe integration for payments
- Plan management and upgrades
- Billing history and invoices
- Usage-based billing

### 🔒 Authentication & Security
- Kinde Auth integration
- JWT token management
- Protected routes
- Permission-based access

### 📈 Usage Monitoring
- API usage tracking
- Resource consumption metrics
- Rate limiting visualization
- Alert system

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components
│   └── auth/           # Authentication components
├── pages/              # Page components
├── stores/             # Zustand state stores
├── lib/                # Utilities and API client
├── hooks/              # Custom React hooks
└── types/              # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Configure your environment variables:
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Wrapper
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building

Build for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## API Integration

The frontend communicates with the backend through a well-defined REST API:

- **Authentication**: JWT-based auth with Kinde
- **Data Fetching**: TanStack Query for caching and synchronization
- **Error Handling**: Centralized error handling with toast notifications
- **Type Safety**: Full TypeScript coverage for API responses

## State Management

### Zustand Stores

- `authStore` - Authentication state and user data
- `tenantStore` - Tenant information and user management
- `subscriptionStore` - Billing and subscription data

### TanStack Query

- Server state management
- Automatic caching and revalidation
- Background updates
- Optimistic updates

## UI Components

Built with shadcn/ui for consistency and accessibility:

- **Forms**: React Hook Form integration
- **Data Display**: Tables, cards, badges
- **Navigation**: Sidebar, breadcrumbs, tabs
- **Feedback**: Toasts, loading states, error boundaries
- **Charts**: Recharts integration for analytics

## Routing

Protected routes with role-based access:

```
/login              # Authentication
/                   # Dashboard (protected)
/analytics          # Analytics page (protected)
/users              # User management (protected)
/billing            # Billing & subscriptions (protected)
/usage              # Usage analytics (protected)
/permissions        # Permission management (protected)
/settings           # Settings (protected)
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow React best practices
- Use functional components with hooks
- Implement proper error boundaries

### Component Structure

```tsx
// Component with proper TypeScript
interface ComponentProps {
  title: string
  onAction: () => void
}

export function Component({ title, onAction }: ComponentProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Button onClick={onAction}>Action</Button>
    </div>
  )
}
```

### API Calls

```tsx
// Using TanStack Query
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => userAPI.getUsers(),
})
```

## Performance

- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Components loaded on demand
- **Caching**: Aggressive caching with TanStack Query
- **Optimization**: Vite's built-in optimizations

## Testing

```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## Deployment

### Environment Variables

Production environment variables:

```env
VITE_API_URL=https://api.yourapp.com
VITE_APP_NAME=Your App Name
```

### Build & Deploy

```bash
# Build for production
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, AWS S3, etc.)
```

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation
4. Submit pull requests for review

## License

MIT License - see LICENSE file for details 