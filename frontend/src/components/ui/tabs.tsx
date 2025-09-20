import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

interface TabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined)

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    onValueChange: (value: string) => void
  }
>(({ className, value, onValueChange, ...props }, ref) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div ref={ref} className={cn("w-full", className)} {...props} />
  </TabsContext.Provider>
))
Tabs.displayName = "Tabs"

const tabsListVariants = cva(
  "inline-flex items-center justify-center rounded-md p-1 text-text-secondary",
  {
    variants: {
      variant: {
        default: "bg-surface-hover dark:bg-gray-800/50",
        outline: "bg-background border border-border dark:bg-gray-900/50 dark:border-gray-700",
        ghost: "bg-transparent",
        pill: "bg-surface-hover rounded-full dark:bg-gray-800/50",
      },
      size: {
        sm: "h-8 text-xs",
        default: "h-10 text-sm",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof tabsListVariants>
>(({ className, variant, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(tabsListVariants({ variant, size }), className)}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 dark:focus-visible:ring-gray-600 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        ghost: "",
        pill: "rounded-full",
      },
      size: {
        sm: "px-2 py-1 text-xs",
        default: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string
  } & VariantProps<typeof tabsTriggerVariants>
>(({ className, value: triggerValue, variant, size, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs")
  }

  const { value, onValueChange } = context
  const isActive = value === triggerValue

  return (
    <button
      ref={ref}
      className={cn(
        tabsTriggerVariants({ variant, size }),
        isActive 
          ? "bg-surface text-text-primary shadow-sm border border-border dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:shadow-md" 
          : "text-text-secondary hover:text-text-primary hover:bg-surface/50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800/70",
        className
      )}
      onClick={() => onValueChange(triggerValue)}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
  }
>(({ className, value: contentValue, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("TabsContent must be used within Tabs")
  }

  const { value } = context

  if (value !== contentValue) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 dark:focus-visible:ring-gray-600",
        className
      )}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants } 