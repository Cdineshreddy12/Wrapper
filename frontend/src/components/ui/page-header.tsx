import * as React from "react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
  showSeparator?: boolean
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ 
    className, 
  title,
  description,
  actions,
  breadcrumbs,
    showSeparator = true,
    ...props 
  }, ref) => {
  return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        {breadcrumbs && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {breadcrumbs}
            </div>
        )}
        
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          {description && (
              <p className="text-lg text-muted-foreground">
                {description}
              </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      
        {showSeparator && <Separator />}
    </div>
  )
}
)
PageHeader.displayName = "PageHeader"

// StatsHeader component for dashboard-style headers with statistics
interface StatItem {
    label: string
    value: string | number
  icon: React.ComponentType<{ className?: string }>
    trend?: {
      value: string
      isPositive: boolean
    }
}

interface StatsHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  stats: StatItem[]
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
  showSeparator?: boolean
}

const StatsHeader = React.forwardRef<HTMLDivElement, StatsHeaderProps>(
  ({ 
    className, 
  title,
  description,
  stats,
  actions,
    breadcrumbs,
    showSeparator = true,
    ...props 
  }, ref) => {
  return (
      <div ref={ref} className={cn("space-y-6", className)} {...props}>
        {breadcrumbs && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {breadcrumbs}
          </div>
        )}
        
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          {description && (
              <p className="text-lg text-muted-foreground">
                {description}
              </p>
          )}
        </div>
          
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
        {stats && stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <Card key={index} className="p-6">
                  <CardContent className="p-0">
            <div className="flex items-center justify-between">
                      <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                        <p className="text-2xl font-bold text-foreground">
                          {stat.value}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                {stat.trend && (
                          <div className={cn(
                            "flex items-center space-x-1 text-sm font-medium",
                            stat.trend.isPositive ? "text-success" : "text-destructive"
                          )}>
                            {stat.trend.isPositive ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span>{stat.trend.value}</span>
              </div>
              )}
            </div>
          </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>
        )}
      
        {showSeparator && <Separator />}
    </div>
  )
} 
)
StatsHeader.displayName = "StatsHeader"

export { PageHeader, StatsHeader }