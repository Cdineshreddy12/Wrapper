import * as React from "react"
import { motion, type HTMLMotionProps, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"

// Common animation variants
const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
}

const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const slideInVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
}

const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 }
}

const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

// Motion Components
interface MotionDivProps extends HTMLMotionProps<"div"> {
  variant?: "fadeIn" | "slideUp" | "slideIn" | "scaleIn"
  delay?: number
  duration?: number
}

const MotionDiv = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ 
    className, 
    variant = "fadeIn", 
    delay = 0, 
    duration = 0.3,
    children,
    ...props 
  }, ref) => {
    const variants = {
      fadeIn: fadeInVariants,
      slideUp: slideUpVariants,
      slideIn: slideInVariants,
      scaleIn: scaleInVariants
    }

    return (
      <motion.div
        ref={ref}
        className={cn(className)}
        variants={variants[variant]}
        initial="hidden"
        animate="visible"
        transition={{
          duration,
          delay,
          ease: "easeOut"
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
MotionDiv.displayName = "MotionDiv"

interface MotionListProps extends HTMLMotionProps<"ul"> {
  staggerDelay?: number
}

const MotionList = React.forwardRef<HTMLUListElement, MotionListProps>(
  ({ className, staggerDelay = 0.1, children, ...props }, ref) => {
    return (
      <motion.ul
        ref={ref}
        className={cn(className)}
        variants={staggerContainerVariants}
        initial="hidden"
        animate="visible"
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return (
              <motion.li
                key={index}
                variants={slideUpVariants}
                transition={{
                  duration: 0.3,
                  delay: index * staggerDelay,
                  ease: "easeOut"
                }}
              >
                {child}
              </motion.li>
            )
          }
          return null
        })}
      </motion.ul>
    )
  }
)
MotionList.displayName = "MotionList"

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

const PageTransition = React.forwardRef<HTMLDivElement, PageTransitionProps>(
  ({ className, children }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn("w-full", className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.3,
          ease: "easeInOut"
        }}
      >
        {children}
      </motion.div>
    )
  }
)
PageTransition.displayName = "PageTransition"

// Hover animation wrapper
interface HoverMotionProps extends HTMLMotionProps<"div"> {
  scale?: number
  rotate?: number
  duration?: number
}

const HoverMotion = React.forwardRef<HTMLDivElement, HoverMotionProps>(
  ({ 
    className, 
    scale = 1.02, 
    rotate = 0, 
    duration = 0.2,
    children,
    ...props 
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(className)}
        whileHover={{ 
          scale, 
          rotate,
          transition: { duration, ease: "easeOut" }
        }}
        whileTap={{ 
          scale: 0.98,
          transition: { duration: 0.1 }
        }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
HoverMotion.displayName = "HoverMotion"

// Loading animation wrapper
interface LoadingMotionProps extends HTMLMotionProps<"div"> {
  isLoading: boolean
  loadingComponent?: React.ReactNode
}

const LoadingMotion = React.forwardRef<HTMLDivElement, LoadingMotionProps>(
  ({ 
    className, 
    isLoading, 
    loadingComponent,
    children,
    ...props 
  }, ref) => {
    if (isLoading) {
      return (
        <motion.div
          ref={ref}
          className={cn("flex items-center justify-center", className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          {...props}
        >
          {loadingComponent || (
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
        </motion.div>
      )
    }

    return (
      <motion.div
        ref={ref}
        className={cn(className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)
LoadingMotion.displayName = "LoadingMotion"

export {
  MotionDiv,
  MotionList,
  PageTransition,
  HoverMotion,
  LoadingMotion
}

export {
  fadeInVariants,
  slideUpVariants,
  slideInVariants,
  scaleInVariants,
  staggerContainerVariants
}
