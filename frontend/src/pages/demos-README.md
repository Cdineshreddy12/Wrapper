# Demo Pages

This directory contains interactive demonstration pages for our design system components.

## Available Demos

### 🎯 Demo Index (`/demos`)
- **Route**: `/demos`
- **Description**: Central hub for all component demonstrations
- **Features**: 
  - Overview of all available demos
  - Quick navigation to specific components
  - Getting started guide
  - Design system information

### 💀 Skeleton Loader (`/skeleton-demo`)
- **Route**: `/skeleton-demo`
- **Description**: Comprehensive demonstration of the skeleton loader component
- **Features**:
  - Interactive variant selection (Default, Shimmer, Pulse, Wave, Glow)
  - Size and shape customization
  - Real-time preview
  - Pre-configured component examples
  - Code examples for different use cases
  - Loading state demonstrations

### 📄 Section Examples (`/section-examples`)
- **Route**: `/section-examples`
- **Description**: Examples of the Section component variations
- **Features**:
  - Different section variants
  - Header action examples
  - Loading and error states
  - Responsive design examples

## How to Access

1. **Direct Navigation**: Visit `/demos` to see all available demonstrations
2. **Individual Components**: Navigate directly to specific demo pages
3. **From Dashboard**: Add navigation links in your dashboard menu

## Features

- **Interactive**: All demos are fully interactive with real-time updates
- **Copy-Paste Ready**: Code examples can be copied directly
- **Responsive**: All demos work perfectly on mobile and desktop
- **Accessible**: Built with accessibility best practices
- **TypeScript**: Full type safety and IntelliSense support

## Adding New Demos

To add a new demo page:

1. Create a new component in this directory
2. Add the route to `App.tsx`
3. Add an entry to the `demos` array in `DemoIndexPage.tsx`
4. Follow the existing patterns for consistency

## Design System Integration

All demo pages use our design system:
- **Colors**: Primary blue, secondary light blue, and semantic colors
- **Typography**: Inter font family with proper hierarchy
- **Spacing**: 4px modular scale
- **Components**: Consistent use of Card, Button, Badge, and other UI components
- **Layout**: Container and Section components for consistent structure

## Best Practices

- Keep demos focused on specific components or patterns
- Include both basic and advanced usage examples
- Provide copy-paste ready code
- Make demos interactive where possible
- Follow accessibility guidelines
- Use consistent styling and layout patterns
