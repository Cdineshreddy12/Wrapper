import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "none" | "sm" | "md" | "lg" | "xl" | "2xl"
  background?: "default" | "muted" | "accent" | "card"
  as?: "section" | "div" | "article" | "aside"
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ 
    className, 
    spacing = "lg", 
    background = "default",
    as: Component = "section",
    ...props 
  }, ref) => {
    const spacingClasses = {
      none: "",
      sm: "py-4",
      md: "py-8", 
      lg: "py-12",
      xl: "py-16",
      "2xl": "py-24"
    }

    const backgroundClasses = {
      default: "",
      muted: "bg-muted/50",
      accent: "bg-accent/50",
      card: "bg-card"
    }

    return React.createElement(
      Component,
      {
        ref,
        className: cn(
          "w-full",
          spacingClasses[spacing],
          backgroundClasses[background],
          className
        ),
        ...props
      }
    )
  }
)
Section.displayName = "Section"

export { Section }
