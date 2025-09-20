import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonTextProps {
  lines?: number
  className?: string
  lastLineWidth?: string
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, className, lastLineWidth = "w-3/4" }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            className={cn(
              "h-4",
              index === lines - 1 && lastLineWidth
            )}
          />
        ))}
      </div>
    )
  }
)
SkeletonText.displayName = "SkeletonText"

interface SkeletonCardProps {
  showAvatar?: boolean
  showActions?: boolean
  className?: string
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ showAvatar = true, showActions = true, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card p-6 space-y-4",
          className
        )}
      >
        <div className="flex items-start space-x-4">
          {showAvatar && (
            <Skeleton className="h-12 w-12 rounded-full" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-2 pt-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        )}
      </div>
    )
  }
)
SkeletonCard.displayName = "SkeletonCard"

interface SkeletonTableProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 4, showHeader = true, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {showHeader && (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-3/4" />
            ))}
          </div>
        )}
        
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    "h-4",
                    colIndex === columns - 1 ? "w-1/2" : "w-3/4"
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }
)
SkeletonTable.displayName = "SkeletonTable"

interface SkeletonListProps {
  items?: number
  showAvatar?: boolean
  className?: string
}

const SkeletonList = React.forwardRef<HTMLDivElement, SkeletonListProps>(
  ({ items = 5, showAvatar = true, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        {Array.from({ length: items }).map((_, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
            {showAvatar && (
              <Skeleton className="h-10 w-10 rounded-full" />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    )
  }
)
SkeletonList.displayName = "SkeletonList"

interface SkeletonFormProps {
  fields?: number
  showSubmit?: boolean
  className?: string
}

const SkeletonForm = React.forwardRef<HTMLDivElement, SkeletonFormProps>(
  ({ fields = 4, showSubmit = true, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-6", className)}>
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        
        {showSubmit && (
          <div className="flex items-center space-x-3 pt-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
        )}
      </div>
    )
  }
)
SkeletonForm.displayName = "SkeletonForm"

// Loading state wrapper
interface LoadingStateProps {
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
}

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ isLoading, skeleton, children, className }, ref) => {
    return (
      <div ref={ref} className={cn(className)}>
        {isLoading ? skeleton : children}
      </div>
    )
  }
)
LoadingState.displayName = "LoadingState"

export {
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonForm,
  LoadingState
}
