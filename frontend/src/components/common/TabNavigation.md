# TabNavigation Component

A highly reusable and configurable tab navigation component built with React and TypeScript.

## Features

- ✅ **Fully Configurable**: Customize tabs, icons, styling, and behavior
- ✅ **TypeScript Support**: Full type safety with comprehensive interfaces
- ✅ **CVA Variants**: Built-in variant system using Class Variance Authority
- ✅ **Icon Support**: Built-in Lucide React icon integration
- ✅ **Responsive Design**: Horizontal and vertical orientations
- ✅ **Accessibility**: Keyboard navigation and ARIA support
- ✅ **Custom Styling**: Granular control over all styling aspects
- ✅ **Event Handling**: Callback support for tab changes
- ✅ **Disabled State**: Support for disabled tabs
- ✅ **Multiple Sizes**: Small, medium, and large variants
- ✅ **Three Variants**: Default, Pills, and Underline styles

## Basic Usage

```tsx
import { TabNavigation, TabItem } from "@/components/common/TabNavigation"
import { User, Settings, Bell } from "lucide-react"

const tabs: TabItem[] = [
  {
    id: "account",
    label: "Account",
    icon: User,
    content: <div>Account content here</div>
  },
  {
    id: "settings", 
    label: "Settings",
    icon: Settings,
    content: <div>Settings content here</div>
  },
  {
    id: "notifications",
    label: "Notifications", 
    icon: Bell,
    content: <div>Notifications content here</div>
  }
]

function MyComponent() {
  return (
    <TabNavigation
      tabs={tabs}
      defaultValue="account"
      onValueChange={(value) => console.log("Tab changed:", value)}
    />
  )
}
```

## Props

### TabNavigationProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `TabItem[]` | - | Array of tab configurations |
| `defaultValue` | `string` | - | Initial active tab ID |
| `value` | `string` | - | Controlled active tab ID |
| `onValueChange` | `(value: string) => void` | - | Callback when tab changes |
| `className` | `string` | - | Custom CSS classes for the container |
| `tabsListClassName` | `string` | - | Custom CSS classes for the tab list |
| `tabsTriggerClassName` | `string` | - | Custom CSS classes for tab triggers |
| `tabsContentClassName` | `string` | - | Custom CSS classes for tab content |
| `orientation` | `"horizontal" \| "vertical"` | `"horizontal"` | Tab orientation |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Tab size variant |

### TabItem

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✅ | Unique identifier for the tab |
| `label` | `string` | ✅ | Display text for the tab |
| `icon` | `LucideIcon` | ❌ | Optional icon component |
| `disabled` | `boolean` | ❌ | Whether the tab is disabled |
| `content` | `React.ReactNode` | ✅ | Content to display when tab is active |

## Examples

### Basic Tabs with Icons

```tsx
const tabs: TabItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    content: <DashboardContent />
  },
  {
    id: "analytics",
    label: "Analytics", 
    icon: BarChart3,
    content: <AnalyticsContent />
  }
]

<TabNavigation tabs={tabs} defaultValue="dashboard" />
```

### Disabled Tabs

```tsx
const tabs: TabItem[] = [
  {
    id: "active",
    label: "Active Tab",
    content: <div>This tab is active</div>
  },
  {
    id: "disabled",
    label: "Disabled Tab",
    disabled: true,
    content: <div>This tab is disabled</div>
  }
]

<TabNavigation tabs={tabs} defaultValue="active" />
```

### Custom Styling

```tsx
<TabNavigation
  tabs={tabs}
  tabsListClassName="bg-gray-100 rounded-lg p-1"
  tabsTriggerClassName="data-[state=active]:bg-white data-[state=active]:shadow-sm"
  tabsContentClassName="p-6 bg-gray-50 rounded-lg"
  size="lg"
/>
```

### Vertical Orientation

```tsx
<TabNavigation
  tabs={tabs}
  orientation="vertical"
  className="flex flex-row gap-4"
/>
```

### Controlled Component

```tsx
const [activeTab, setActiveTab] = useState("account")

<TabNavigation
  tabs={tabs}
  value={activeTab}
  onValueChange={setActiveTab}
/>
```

### Different Sizes

```tsx
// Small tabs
<TabNavigation tabs={tabs} size="sm" />

// Medium tabs (default)
<TabNavigation tabs={tabs} size="md" />

// Large tabs
<TabNavigation tabs={tabs} size="lg" />
```

### Variants

The component supports three built-in variants using CVA (Class Variance Authority):

```tsx
// Default variant - standard tabs with background
<TabNavigation tabs={tabs} variant="default" />

// Pills variant - rounded pill-like tabs
<TabNavigation tabs={tabs} variant="pills" />

// Underline variant - minimal with underline indicator
<TabNavigation tabs={tabs} variant="underline" />
```

#### Variant Styling

- **Default**: Standard tabs with muted background, active state has white background with shadow
- **Pills**: Rounded pill-shaped tabs with primary color for active state
- **Underline**: Minimal styling with underline indicator for active tab

## TabNavigationList Component

For cases where you only need the tab list without content:

```tsx
import { TabNavigationList } from "@/components/common/TabNavigation"

<TabNavigationList
  tabs={tabs}
  value={activeTab}
  onValueChange={setActiveTab}
  size="md"
/>
```

## Styling

The component uses Tailwind CSS classes and supports custom styling through the className props:

- `className`: Main container styling
- `tabsListClassName`: Tab list container styling  
- `tabsTriggerClassName`: Individual tab trigger styling
- `tabsContentClassName`: Tab content area styling

## Accessibility

The component includes built-in accessibility features:

- Keyboard navigation (Arrow keys, Tab, Enter, Space)
- ARIA attributes for screen readers
- Focus management
- Proper semantic HTML structure

## Dependencies

- React 18+
- TypeScript 4.5+
- Lucide React (for icons)
- Tailwind CSS (for styling)
- Radix UI Tabs (for base functionality)
- Class Variance Authority (CVA) (for variant management)

## Examples File

See `TabNavigationExample.tsx` for comprehensive usage examples including:
- Basic tab navigation
- Custom styling
- Different sizes
- Disabled states
- Vertical orientation
- Controlled components
