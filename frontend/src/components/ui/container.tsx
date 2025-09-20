import * as React from "react"
import { cn } from "@/lib/utils"

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  center?: boolean
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "lg", center = true, ...props }, ref) => {
    const sizeClasses = {
      sm: "max-w-2xl",
      md: "max-w-4xl", 
      lg: "max-w-6xl",
      xl: "max-w-7xl",
      "2xl": "max-w-8xl",
      full: "max-w-full"
    }

    return (
      <div
        ref={ref}
        className={cn(
          "w-full px-4 sm:px-6 lg:px-8",
          sizeClasses[size],
          center && "mx-auto",
          className
        )}
        {...props}
      />
    )
  }
)
Container.displayName = "Container"

export { Container }
