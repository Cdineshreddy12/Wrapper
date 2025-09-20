import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500",
        destructive:
          "bg-error-600 text-white shadow-sm hover:bg-error-700 active:bg-error-800 focus-visible:ring-error-500",
        outline:
          "border border-border bg-background text-text-primary shadow-sm hover:bg-surface-hover hover:text-text-primary active:bg-surface-active focus-visible:ring-ring-focus dark:border-gray-600 dark:text-white dark:hover:bg-gray-800 dark:hover:border-gray-500",
        secondary:
          "bg-secondary-100 text-secondary-900 shadow-sm hover:bg-secondary-200 active:bg-secondary-300 focus-visible:ring-secondary-500 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:active:bg-gray-600",
        ghost: 
          "text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-surface-active focus-visible:ring-ring-focus dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800",
        link: 
          "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 focus-visible:ring-primary-500 dark:text-primary-400 dark:hover:text-primary-300",
        success:
          "bg-success-600 text-white shadow-sm hover:bg-success-700 active:bg-success-800 focus-visible:ring-success-500",
        warning:
          "bg-warning-600 text-white shadow-sm hover:bg-warning-700 active:bg-warning-800 focus-visible:ring-warning-500",
      },
      size: {
        xs: "h-7 px-2 text-xs",
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4 text-sm",
        lg: "h-10 px-6 text-sm",
        xl: "h-11 px-8 text-base",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {loading && loadingText ? loadingText : children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
