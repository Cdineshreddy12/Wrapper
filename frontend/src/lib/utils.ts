import { User } from "@/types/user-management"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatNumber(amount: number) {
  return new Intl.NumberFormat('en-US').format(amount)
}

export function formatPercentage(percentage: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(percentage)
}

export const getUserStatus = (user: User): string => {
  if (!user.isActive) return 'Pending';
  if (!user.onboardingCompleted) return 'Setup Required';
  return 'Active';
}

export const getStatusColor = (user: User): string => {
  const status = getUserStatus(user);
  switch (status) {
    case 'Active': 
      return 'bg-green-100 text-green-800';
    case 'Pending': 
      return 'bg-yellow-100 text-yellow-800';
    case 'Setup Required': 
      return 'bg-orange-100 text-orange-800';
    default: 
      return 'bg-gray-100 text-gray-800';
  }
}
