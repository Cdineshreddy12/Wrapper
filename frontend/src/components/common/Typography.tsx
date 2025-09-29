import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// cva config for shadcn/ui typography variants
const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote: "mt-6 border-l-2 pl-6 italic text-muted-foreground",
      list: "my-6 ml-6 list-disc [&>li]:mt-2",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
      code: "relative rounded bg-muted px-[0.3em] py-[0.2em] font-mono text-sm font-semibold",
      inlineCode: "rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold",
      caption: "text-xs text-muted-foreground",
      overline: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
      label: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      // Add more as needed
    },
  },
  defaultVariants: {
    variant: "p",
  },
})

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  asChild?: boolean
  as?: React.ElementType
  children: React.ReactNode
}

/**
 * Reusable Typography component supporting all shadcn/ui typography variants.
 * Usage:
 * <Typography variant="h1">Heading 1</Typography>
 * <Typography variant="blockquote">Quote</Typography>
 * <Typography variant="p">Paragraph</Typography>
 */
export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    {
      className,
      variant = "p",
      as,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    // Map variant to default HTML tag if not provided
    const tagMap: Record<string, React.ElementType> = {
      h1: "h1",
      h2: "h2",
      h3: "h3",
      h4: "h4",
      p: "p",
      blockquote: "blockquote",
      list: "ul",
      lead: "p",
      large: "div",
      small: "small",
      muted: "p",
      code: "pre",
      inlineCode: "code",
      caption: "p",
      overline: "p",
      label: "label",
    }
    const Component: React.ElementType =
      as || (variant && tagMap[variant]) || "p"

    return (
      <Component
        ref={ref}
        className={cn(typographyVariants({ variant }), className)}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
Typography.displayName = "Typography"
