import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "text-text-primary",
        muted: "text-text-muted",
        error: "text-error-600",
        success: "text-success-600",
        warning: "text-warning-600",
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
      required: {
        true: "after:content-['*'] after:ml-1 after:text-error-500",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      required: false,
    },
  }
)

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  required?: boolean
  optional?: boolean
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant, size, required, optional, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(labelVariants({ variant, size, required }), className)}
        {...props}
      >
        {children}
        {optional && (
          <span className="ml-1 text-xs text-text-muted font-normal">
            (optional)
          </span>
        )}
      </label>
    )
  }
)
Label.displayName = "Label"

export { Label, labelVariants }