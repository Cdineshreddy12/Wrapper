# Migration Guide: Transitioning to New Architecture

## Overview
This guide helps you migrate from the current project structure to the new feature-based architecture following the React Router scaffold recommendations.

## 🔄 Migration Steps

### Step 1: Update Import Paths

#### Old Import Pattern:
```tsx
import { UserCard } from '@/components/users/UserCard'
import { useUsers } from '@/hooks/useUsers'
```

#### New Import Pattern:
```tsx
import { UserCard } from '@/features/users/components/UserCard'
import { useUsers } from '@/features/users/hooks/useUsers'
```

### Step 2: Move Components to Features

#### User Management Components:
```bash
# Move user components
mv src/components/users/* src/features/users/components/
mv src/hooks/useUsers.ts src/features/users/hooks/
mv src/services/users.api.ts src/features/users/services/
```

#### Organization Components:
```bash
# Move organization components
mv src/components/organization/* src/features/organizations/components/
mv src/hooks/useOrganization.ts src/features/organizations/hooks/
```

#### Analytics Components:
```bash
# Move analytics components
mv src/components/analytics/* src/features/analytics/components/
mv src/hooks/useAnalytics.ts src/features/analytics/hooks/
```

### Step 3: Update App.tsx

#### Replace Current App.tsx:
```tsx
// Old App.tsx - Replace with new structure
import React, { Suspense } from "react"
import { Routes, Route } from "react-router-dom"
import { ErrorBoundary } from "@/errors/ErrorBoundary"
import { SuspenseFallback } from "@/components/common/SuspenseFallback"
import AppShell from "./components/layout/AppShell"

// Lazy load routes for better performance
const Home = React.lazy(() => import("./routes/Home"))
const Dashboard = React.lazy(() => import("./routes/Dashboard"))

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Suspense fallback={<SuspenseFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ErrorBoundary>
  )
}
```

### Step 4: Update State Management

#### Replace Context with Zustand:
```tsx
// Old: useContext pattern
const { user, setUser } = useContext(UserContext)

// New: Zustand store
import { useAuthStore } from '@/stores/auth.store'
const { user, login, logout } = useAuthStore()
```

### Step 5: Update API Calls

#### Use Enhanced API Client:
```tsx
// Old: Direct fetch calls
const response = await fetch('/api/users')

// New: Enhanced API client
import { apiClient } from '@/lib/api'
const users = await apiClient.fetch('/users')
```

### Step 6: Update Error Handling

#### Wrap Components with Error Boundaries:
```tsx
// Wrap feature components
<ErrorBoundary fallback={<ErrorFallback />}>
  <UserManagement />
</ErrorBoundary>
```

## 📁 File Migration Checklist

### Components to Move:
- [ ] `src/components/users/*` → `src/features/users/components/`
- [ ] `src/components/organization/*` → `src/features/organizations/components/`
- [ ] `src/components/analytics/*` → `src/features/analytics/components/`
- [ ] `src/components/application/*` → `src/features/applications/components/`

### Hooks to Move:
- [ ] `src/hooks/useUsers.ts` → `src/features/users/hooks/`
- [ ] `src/hooks/useOrganization.ts` → `src/features/organizations/hooks/`
- [ ] `src/hooks/useAnalytics.ts` → `src/features/analytics/hooks/`

### Services to Move:
- [ ] `src/services/users.api.ts` → `src/features/users/services/`
- [ ] `src/services/organizations.api.ts` → `src/features/organizations/services/`

### Layout Components:
- [ ] Move layout components to `src/components/layout/`
- [ ] Update imports in layout components

## 🔧 Configuration Updates

### 1. Update tsconfig.json
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@components/*": ["./components/*"],
      "@features/*": ["./features/*"],
      "@lib/*": ["./lib/*"],
      "@hooks/*": ["./hooks/*"],
      "@stores/*": ["./stores/*"],
      "@types/*": ["./types/*"]
    }
  }
}
```

### 2. Update vite.config.ts
The vite.config.ts has been enhanced with proper aliases and optimizations.

### 3. Environment Variables
Copy `.env.example` to `.env.local` and configure:
```bash
cp .env.example .env.local
```

## 🧪 Testing the Migration

### 1. Run Development Server
```bash
npm run dev
```

### 2. Check for Import Errors
- Look for missing imports in console
- Update import paths as needed

### 3. Test Key Functionality
- [ ] User authentication
- [ ] User management
- [ ] Organization management
- [ ] Analytics dashboard
- [ ] Navigation

### 4. Run Tests
```bash
npm run test
npm run test:e2e
```

## 🚨 Common Issues and Solutions

### Issue 1: Import Path Errors
**Problem**: Components can't find their imports
**Solution**: Update import paths to use new aliases

### Issue 2: State Management Issues
**Problem**: Context not working after migration
**Solution**: Replace useContext with Zustand stores

### Issue 3: Routing Issues
**Problem**: Routes not loading properly
**Solution**: Ensure lazy loading is implemented correctly

### Issue 4: Build Errors
**Problem**: TypeScript errors during build
**Solution**: Update type definitions and imports

## 📋 Post-Migration Checklist

### Code Quality:
- [ ] All imports updated
- [ ] No TypeScript errors
- [ ] All tests passing
- [ ] No console errors

### Functionality:
- [ ] Authentication working
- [ ] User management functional
- [ ] Organization management working
- [ ] Analytics dashboard loading
- [ ] Navigation working

### Performance:
- [ ] Bundle size optimized
- [ ] Lazy loading working
- [ ] No performance regressions

### Documentation:
- [ ] Update README.md
- [ ] Update component documentation
- [ ] Update API documentation

## 🎯 Benefits After Migration

1. **Better Organization**: Feature-based structure
2. **Improved Performance**: Lazy loading and bundle optimization
3. **Enhanced DX**: Better tooling and documentation
4. **Scalability**: Ready for team growth
5. **Maintainability**: Clear patterns and guidelines

## 🆘 Getting Help

If you encounter issues during migration:

1. **Check Documentation**: Review `docs/` directory
2. **Check Examples**: Look at new component examples
3. **Review Patterns**: Follow established patterns
4. **Test Incrementally**: Migrate one feature at a time

The new architecture provides a solid foundation for scalable, maintainable React applications with enterprise-grade features and excellent developer experience.
