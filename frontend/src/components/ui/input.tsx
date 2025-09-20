import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "h-8 px-2 text-xs",
        default: "h-9 px-3 text-sm",
        lg: "h-10 px-4 text-base",
      },
      variant: {
        default: "border-border focus-visible:ring-ring-focus",
        error: "border-error-500 focus-visible:ring-error-500",
        success: "border-success-500 focus-visible:ring-success-500",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: boolean
  success?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, variant, error, success, ...props }, ref) => {
    const inputVariant = error ? "error" : success ? "success" : variant

    return (
      <input
        type={type}
        className={cn(inputVariants({ size, variant: inputVariant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants } 