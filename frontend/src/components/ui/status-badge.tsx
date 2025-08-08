import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

export type StatusType = 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'pending' 
  | 'active' 
  | 'inactive'
  | 'draft'
  | 'published'

interface StatusBadgeProps {
  status: StatusType | string
  label?: string
  icon?: LucideIcon
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<StatusType, {
  color: string
  label: string
}> = {
  success: {
    color: 'bg-green-100 text-green-800 hover:bg-green-200',
    label: 'Success'
  },
  warning: {
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    label: 'Warning'
  },
  error: {
    color: 'bg-red-100 text-red-800 hover:bg-red-200',
    label: 'Error'
  },
  info: {
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    label: 'Info'
  },
  pending: {
    color: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
    label: 'Pending'
  },
  active: {
    color: 'bg-green-100 text-green-800 hover:bg-green-200',
    label: 'Active'
  },
  inactive: {
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    label: 'Inactive'
  },
  draft: {
    color: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    label: 'Draft'
  },
  published: {
    color: 'bg-green-100 text-green-800 hover:bg-green-200',
    label: 'Published'
  }
}

const sizeClasses = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-2.5 py-1.5',
  lg: 'text-base px-3 py-2'
}

export function StatusBadge({
  status,
  label,
  icon: Icon,
  className,
  size = 'sm'
}: StatusBadgeProps) {
  const config = statusConfig[status as StatusType]
  const displayLabel = label || config?.label || status
  const colorClass = config?.color || 'bg-gray-100 text-gray-800 hover:bg-gray-200'

  return (
    <Badge 
      className={cn(
        colorClass,
        sizeClasses[size],
        'inline-flex items-center gap-1.5 font-medium',
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {displayLabel}
    </Badge>
  )
}

// Specific status badge components for common use cases
export function UserStatusBadge({ 
  isActive, 
  onboardingCompleted 
}: { 
  isActive: boolean
  onboardingCompleted: boolean 
}) {
  if (!isActive) {
    return <StatusBadge status="inactive" />
  }
  
  if (!onboardingCompleted) {
    return <StatusBadge status="pending" label="Setup Required" />
  }
  
  return <StatusBadge status="active" />
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, StatusType> = {
    succeeded: 'success',
    paid: 'success',
    failed: 'error',
    canceled: 'inactive',
    refunded: 'warning',
    disputed: 'error',
    pending: 'pending'
  }
  
  return <StatusBadge status={statusMap[status] || 'info'} label={status} />
}

export function SubscriptionStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, StatusType> = {
    active: 'success',
    trialing: 'info',
    past_due: 'warning',
    canceled: 'inactive',
    unpaid: 'error',
    incomplete: 'pending'
  }
  
  return <StatusBadge status={statusMap[status] || 'info'} label={status} />
} 