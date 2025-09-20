import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring-focus focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-100 text-primary-800 hover:bg-primary-200",
        secondary:
          "border-transparent bg-secondary-100 text-secondary-800 hover:bg-secondary-200",
        destructive:
          "border-transparent bg-error-100 text-error-800 hover:bg-error-200",
        success:
          "border-transparent bg-success-100 text-success-800 hover:bg-success-200",
        warning:
          "border-transparent bg-warning-100 text-warning-800 hover:bg-warning-200",
        outline: 
          "text-text-primary border-border",
        ghost:
          "border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants } 