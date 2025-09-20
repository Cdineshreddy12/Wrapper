# Design System Usage Guide

This guide shows you how to use the enhanced design system components to create uniform, polished, and professional UIs.

## Quick Start

### 1. Import Components
```tsx
import { 
  Container, 
  Section, 
  PageHeader, 
  MotionDiv, 
  SkeletonCard,
  EnhancedInput,
  StepIndicator 
} from '@/components/ui'
```

### 2. Basic Layout Structure
```tsx
export const MyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Container className="py-8">
        <PageHeader
          title="Page Title"
          description="Page description"
          actions={<Button>Action</Button>}
        />
      </Container>
      
      <Section spacing="lg" background="muted">
        <Container>
          {/* Your content */}
        </Container>
      </Section>
    </div>
  )
}
```

## Layout Components

### Container
Responsive container with consistent max-widths and padding.

```tsx
<Container size="lg" className="py-8">
  <h1>Content</h1>
</Container>
```

**Props:**
- `size`: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
- `center`: boolean (default: true)

### Section
Semantic sections with consistent spacing and backgrounds.

```tsx
<Section spacing="lg" background="muted">
  <h2>Section Content</h2>
</Section>
```

**Props:**
- `spacing`: "none" | "sm" | "md" | "lg" | "xl" | "2xl"
- `background`: "default" | "muted" | "accent" | "card"
- `as`: "section" | "div" | "article" | "aside"

### PageHeader
Consistent page headers with breadcrumbs and actions.

```tsx
<PageHeader
  title="Dashboard"
  description="Welcome to your dashboard"
  actions={
    <div className="flex items-center space-x-2">
      <Button variant="outline">Export</Button>
      <Button>Create New</Button>
    </div>
  }
  breadcrumbs={
    <div className="flex items-center space-x-2">
      <span>Home</span>
      <span>/</span>
      <span>Dashboard</span>
    </div>
  }
/>
```

## Motion Components

### MotionDiv
Animated div with predefined variants.

```tsx
<MotionDiv variant="slideUp" delay={0.2}>
  <Card>Animated content</Card>
</MotionDiv>
```

**Variants:**
- `fadeIn`: Fade in animation
- `slideUp`: Slide up from bottom
- `slideIn`: Slide in from left
- `scaleIn`: Scale in animation

### MotionList
Staggered list animations.

```tsx
<MotionList staggerDelay={0.1}>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</MotionList>
```

### PageTransition
Page-level transitions.

```tsx
<PageTransition>
  <div>Page content</div>
</PageTransition>
```

### HoverMotion
Hover animations.

```tsx
<HoverMotion scale={1.05} rotate={2}>
  <Card>Hover me</Card>
</HoverMotion>
```

### LoadingMotion
Loading state wrapper.

```tsx
<LoadingMotion
  isLoading={isLoading}
  loadingComponent={<SkeletonCard />}
>
  <div>Actual content</div>
</LoadingMotion>
```

## Enhanced Form Components

### EnhancedInput
Input with validation states and icons.

```tsx
<EnhancedInput
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  leftIcon={<Mail className="h-4 w-4" />}
  error="Please enter a valid email"
  success="Email format is valid"
  description="We'll never share your email"
/>
```

### EnhancedTextarea
Textarea with character count and validation.

```tsx
<EnhancedTextarea
  label="Message"
  placeholder="Enter your message"
  maxLength={500}
  showCount
  description="Maximum 500 characters"
/>
```

### EnhancedSelect
Select with validation states.

```tsx
<EnhancedSelect
  label="Country"
  placeholder="Select your country"
  options={[
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' }
  ]}
  error="Please select a country"
/>
```

### FormActions
Consistent form action buttons.

```tsx
<FormActions
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  onReset={handleReset}
  submitLabel="Save Changes"
  cancelLabel="Cancel"
  resetLabel="Reset"
  isLoading={isLoading}
/>
```

### FormSection
Organized form sections.

```tsx
<FormSection
  title="Personal Information"
  description="Enter your basic details"
>
  <EnhancedInput label="First Name" />
  <EnhancedInput label="Last Name" />
</FormSection>
```

## Loading States

### Skeleton Components
```tsx
// Card skeleton
<SkeletonCard showAvatar={true} showActions={true} />

// Table skeleton
<SkeletonTable rows={5} columns={4} />

// List skeleton
<SkeletonList items={5} showAvatar={true} />

// Form skeleton
<SkeletonForm fields={4} showSubmit={true} />

// Text skeleton
<SkeletonText lines={3} lastLineWidth="w-3/4" />
```

### LoadingState Wrapper
```tsx
<LoadingState
  isLoading={isLoading}
  skeleton={<SkeletonCard />}
>
  <div>Actual content</div>
</LoadingState>
```

## Step Indicator

### Basic Usage
```tsx
const steps = [
  {
    number: 1,
    title: "Personal Info",
    description: "Enter your details",
    icon: User,
    color: 'primary'
  },
  {
    number: 2,
    title: "Verification",
    description: "Verify your email",
    icon: CheckCircle2,
    color: 'success'
  }
]

<StepIndicator
  steps={steps}
  currentStep={currentStep}
  onStepClick={setCurrentStep}
  animated={true}
  showConnectors={true}
/>
```

### Variants
```tsx
// Default horizontal
<StepIndicator steps={steps} currentStep={1} />

// Compact
<StepIndicator steps={steps} currentStep={1} variant="compact" />

// Vertical
<StepIndicator steps={steps} currentStep={1} variant="vertical" />
```

## Best Practices

### 1. Consistent Spacing
Use the 4pt/8pt grid system:
```tsx
// ✅ Good
<div className="space-y-4 p-6">
  <h2 className="text-2xl font-bold">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>

// ❌ Avoid
<div className="space-y-3 p-5">
  <h2 className="text-2xl font-bold">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

### 2. Semantic Colors
Always use semantic color tokens:
```tsx
// ✅ Good
<div className="bg-card text-card-foreground border border-border">
  <h3 className="text-foreground">Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>

// ❌ Avoid
<div className="bg-white text-gray-900 border border-gray-200">
  <h3 className="text-gray-900">Title</h3>
  <p className="text-gray-600">Description</p>
</div>
```

### 3. Responsive Design
Use mobile-first responsive classes:
```tsx
// ✅ Good
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Content */}
</div>

// ❌ Avoid
<div className="grid grid-cols-3 gap-6">
  {/* Content */}
</div>
```

### 4. Accessibility
Always include proper ARIA labels and focus management:
```tsx
// ✅ Good
<Button
  aria-label="Close dialog"
  className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
>
  <X className="h-4 w-4" />
</Button>
```

### 5. Loading States
Always provide loading states for async operations:
```tsx
// ✅ Good
{isLoading ? (
  <SkeletonCard />
) : (
  <Card>
    <CardContent>Actual content</CardContent>
  </Card>
)}
```

### 6. Form Validation
Use consistent validation patterns:
```tsx
// ✅ Good
<EnhancedInput
  label="Email"
  error={errors.email?.message}
  success={isValid ? "Email is valid" : undefined}
/>
```

## Common Patterns

### Card Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map((item, index) => (
    <MotionDiv key={item.id} variant="slideUp" delay={index * 0.1}>
      <Card>
        <CardHeader>
          <CardTitle>{item.title}</CardTitle>
          <CardDescription>{item.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{item.content}</p>
        </CardContent>
      </Card>
    </MotionDiv>
  ))}
</div>
```

### Data Table with Loading
```tsx
<LoadingState
  isLoading={isLoading}
  skeleton={<SkeletonTable rows={5} columns={4} />}
>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((item) => (
        <TableRow key={item.id}>
          <TableCell>{item.name}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell>
            <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
              {item.status}
            </Badge>
          </TableCell>
          <TableCell>
            <Button variant="ghost" size="sm">Edit</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</LoadingState>
```

### Form with Validation
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormSection title="Personal Information">
      <EnhancedInput
        label="Full Name"
        {...form.register('name')}
        error={form.formState.errors.name?.message}
      />
      
      <EnhancedInput
        label="Email"
        type="email"
        {...form.register('email')}
        error={form.formState.errors.email?.message}
      />
    </FormSection>
    
    <FormSection title="Additional Information">
      <EnhancedTextarea
        label="Message"
        {...form.register('message')}
        error={form.formState.errors.message?.message}
        maxLength={500}
        showCount
      />
    </FormSection>
    
    <FormActions
      onSubmit={form.handleSubmit(onSubmit)}
      onReset={() => form.reset()}
      isLoading={isSubmitting}
    />
  </form>
</Form>
```

This design system provides everything you need to build consistent, accessible, and professional React applications. Follow these patterns and guidelines to ensure your UI remains uniform and polished across your entire application.
