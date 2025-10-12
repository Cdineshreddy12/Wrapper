import {
  Users,
  Building,
  TrendingUp,
  Settings,
  PieChart,
  Package,
  Activity,
} from "lucide-react";
import { AppCode, ApplicationStatus } from "@/types/application";
import { memo } from "react";

// Memoized icon components to prevent unnecessary re-renders
const IconComponents = {
  crm: memo(() => <Users className="w-6 h-6" />),
  hr: memo(() => <Building className="w-6 h-6" />),
  affiliate: memo(() => <TrendingUp className="w-6 h-6" />),
  system: memo(() => <Settings className="w-6 h-6" />),
  finance: memo(() => <PieChart className="w-6 h-6" />),
  inventory: memo(() => <Package className="w-6 h-6" />),
  analytics: memo(() => <Activity className="w-6 h-6" />),
} as const;

/**
 * Get appropriate icon for application based on app code
 */
export const getApplicationIcon = (appCode: string) => {
  const IconComponent = IconComponents[appCode as AppCode];
  return IconComponent ? <IconComponent /> : <Package className="w-6 h-6" />;
};

/**
 * Get status color classes for application status badges
 */
export const getStatusColor = (status: string): string => {
  const statusColors: Record<ApplicationStatus, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    maintenance: "bg-yellow-100 text-yellow-800",
  };
  
  return statusColors[status.toLowerCase() as ApplicationStatus] || statusColors.inactive;
};
