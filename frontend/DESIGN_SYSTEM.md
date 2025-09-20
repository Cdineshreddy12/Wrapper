# Design System Guide

A comprehensive design system for building uniform, polished, and professional React applications using shadcn/ui and TailwindCSS.

## Table of Contents

1. [Design Principles](#design-principles)
2. [Spacing & Layout](#spacing--layout)
3. [Typography](#typography)
4. [Colors & Theming](#colors--theming)
5. [Components](#components)
6. [Animations](#animations)
7. [Accessibility](#accessibility)
8. [Best Practices](#best-practices)

## Design Principles

### 1. Consistency
- Use semantic color tokens instead of hardcoded colors
- Follow the 4pt/8pt grid system for all spacing
- Maintain consistent component patterns across the app

### 2. Accessibility
- WCAG AA+ color contrast compliance
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management

### 3. Performance
- Subtle, performant animations
- Optimized loading states
- Minimal bundle impact

### 4. Responsiveness
- Mobile-first approach
- Consistent breakpoints
- Flexible layouts

## Spacing & Layout

### Grid System
We use a 4pt/8pt grid system for consistent spacing:

```css
/* Spacing Scale */
space-1    = 4px   (0.25rem)
space-2    = 8px   (0.5rem)
space-3    = 12px  (0.75rem)
space-4    = 16px  (1rem)
space-6    = 24px  (1.5rem)
space-8    = 32px  (2rem)
space-12   = 48px  (3rem)
space-16   = 64px  (4rem)
space-24   = 96px  (6rem)
space-32   = 128px (8rem)
```

### Layout Components

#### Container
```tsx
<Container size="lg" className="py-8">
  {/* Content */}
</Container>
```

#### Section
```tsx
<Section spacing="lg" className="bg-muted/50">
  {/* Content */}
</Section>
```

#### Page Header
```tsx
<PageHeader
  title="Dashboard"
  description="Welcome to your dashboard"
  actions={<Button>Add Item</Button>}
/>
```

## Typography

### Font Scale
```css
text-xs    = 12px  (0.75rem)  - Captions, labels
text-sm    = 14px  (0.875rem) - Small text, metadata
text-base  = 16px  (1rem)     - Body text
text-lg    = 18px  (1.125rem) - Large body text
text-xl    = 20px  (1.25rem)  - Small headings
text-2xl   = 24px  (1.5rem)   - Medium headings
text-3xl   = 30px  (1.875rem) - Large headings
text-4xl   = 36px  (2.25rem)  - Extra large headings
```

### Font Weights
```css
font-thin      = 100
font-light     = 300
font-normal    = 400
font-medium    = 500
font-semibold  = 600
font-bold      = 700
font-extrabold = 800
font-black     = 900
```

### Typography Components

#### Heading
```tsx
<Heading level={1} className="text-4xl font-bold">
  Main Title
</Heading>
```

#### Text
```tsx
<Text variant="body" className="text-muted-foreground">
  Body text content
</Text>
```

## Colors & Theming

### Semantic Color Tokens
Always use semantic tokens for consistent theming:

```css
/* Backgrounds */
bg-background          - Main background
bg-card               - Card backgrounds
bg-muted              - Muted backgrounds
bg-accent             - Accent backgrounds

/* Text */
text-foreground       - Primary text
text-muted-foreground - Secondary text
text-destructive      - Error text

/* Interactive */
bg-primary            - Primary actions
bg-secondary          - Secondary actions
bg-destructive        - Destructive actions
```

### Color Usage Examples
```tsx
// ✅ Good - Using semantic tokens
<div className="bg-card text-card-foreground border border-border">
  <h3 className="text-foreground font-semibold">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>

// ❌ Bad - Using hardcoded colors
<div className="bg-white text-gray-900 border border-gray-200">
  <h3 className="text-gray-900 font-semibold">Title</h3>
  <p className="text-gray-600">Description</p>
</div>
```

## Components

### Button Variants
```tsx
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Action</Button>
<Button variant="ghost">Ghost Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link Action</Button>
```

### Card Components
```tsx
<Card className="p-6">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Form Components
```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input placeholder="Enter your email" {...field} />
      </FormControl>
      <FormDescription>
        We'll never share your email.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Animations

### Animation Classes
```css
/* Entrance Animations */
animate-fade-in      - Fade in
animate-slide-up     - Slide up from bottom
animate-slide-in     - Slide in from left
animate-scale-in     - Scale in

/* Exit Animations */
animate-fade-out     - Fade out
animate-slide-out    - Slide out to left
animate-scale-out    - Scale out

/* Continuous Animations */
animate-float        - Gentle floating
animate-shimmer      - Loading shimmer
animate-pulse-slow   - Slow pulse
```

### Motion Components
```tsx
<MotionDiv
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</MotionDiv>
```

## Accessibility

### Focus Management
```tsx
// Focus ring on interactive elements
<Button className="focus:ring-2 focus:ring-primary focus:ring-offset-2">
  Button
</Button>
```

### ARIA Labels
```tsx
<Button
  aria-label="Close dialog"
  aria-describedby="dialog-description"
>
  <X className="h-4 w-4" />
</Button>
```

### Screen Reader Support
```tsx
<div role="alert" aria-live="polite">
  Error message
</div>
```

## Best Practices

### 1. Component Structure
```tsx
// ✅ Good - Consistent structure
interface ComponentProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Component = ({ 
  title, 
  description, 
  children, 
  className 
}: ComponentProps) => {
  return (
    <div className={cn("base-styles", className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
};
```

### 2. Responsive Design
```tsx
// ✅ Good - Mobile-first responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

### 3. Loading States
```tsx
// ✅ Good - Consistent loading patterns
{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-4 w-5/6" />
  </div>
) : (
  <div>{content}</div>
)}
```

### 4. Error Handling
```tsx
// ✅ Good - Consistent error states
{error ? (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error.message}</AlertDescription>
  </Alert>
) : (
  <div>{content}</div>
)}
```

## Component Examples

### Refactored StepIndicator
```tsx
interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export const StepIndicator = ({ 
  steps, 
  currentStep, 
  onStepClick, 
  className 
}: StepIndicatorProps) => {
  return (
    <div className={cn("space-y-6", className)}>
      {steps.map((step, index) => {
        const status = getStepStatus(step.number, currentStep);
        const isLastStep = index === steps.length - 1;
        const isClickable = onStepClick && status !== 'disabled';
        
        return (
          <div key={step.number} className="relative">
            <div 
              className={cn(
                "flex items-start space-x-4 transition-all duration-200",
                isClickable && "cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2"
              )}
              onClick={isClickable ? () => onStepClick(step.number) : undefined}
            >
              {/* Step Circle */}
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
                  status === 'completed' && "bg-primary text-primary-foreground",
                  status === 'active' && "bg-primary text-primary-foreground ring-2 ring-primary/20",
                  status === 'error' && "bg-destructive text-destructive-foreground",
                  status === 'upcoming' && "bg-muted text-muted-foreground border border-border"
                )}>
                  {status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : status === 'error' ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{step.number}</span>
                  )}
                </div>
                
                {/* Progress line */}
                {!isLastStep && (
                  <div className={cn(
                    "absolute top-8 left-1/2 w-px h-6 -translate-x-1/2",
                    status === 'completed' ? "bg-primary/30" : "bg-border"
                  )} />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center space-x-2">
                  {step.icon && (
                    <step.icon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className={cn(
                    "text-sm font-medium transition-colors",
                    status === 'active' && "text-primary",
                    status === 'completed' && "text-foreground",
                    status === 'error' && "text-destructive",
                    status === 'upcoming' && "text-muted-foreground"
                  )}>
                    {step.title}
                  </h3>
                  {step.isOptional && (
                    <Badge variant="secondary" className="text-xs">
                      Optional
                    </Badge>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

This design system provides a solid foundation for building consistent, accessible, and professional React applications. Follow these guidelines to ensure your UI remains uniform and polished across your entire application.
