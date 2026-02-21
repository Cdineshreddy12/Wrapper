import React from 'react'

// Public / Landing
export const Landing = React.lazy(() => import('@/features/landing/pages').then(m => ({ default: m.Landing })))
export const ProductPage = React.lazy(() => import('@/features/landing/pages').then(m => ({ default: m.ProductPage })))
export const IndustryPage = React.lazy(() => import('@/features/landing/pages').then(m => ({ default: m.IndustryPage })))
export const PrivacyPolicy = React.lazy(() => import('@/features/landing/pages').then(m => ({ default: m.PrivacyPolicy })))
export const TermsOfService = React.lazy(() => import('@/features/landing/pages').then(m => ({ default: m.TermsOfService })))
export const CookiePolicy = React.lazy(() => import('@/features/landing/pages').then(m => ({ default: m.CookiePolicy })))
export const Security = React.lazy(() => import('@/features/landing/pages').then(m => ({ default: m.Security })))
export const Pricing = React.lazy(() => import('@/features/landing/pages').then(m => ({ default: m.Pricing })))

// Auth
export const Login = React.lazy(() => import('@/features/auth/pages/Login').then(m => ({ default: m.Login })))
export const AuthCallback = React.lazy(() => import('@/features/auth/pages/AuthCallback').then(m => ({ default: m.AuthCallback })))
export const InviteAccept = React.lazy(() => import('@/features/auth/pages/InviteAccept').then(m => ({ default: m.InviteAccept })))

// Onboarding
export const OnboardingPage = React.lazy(() => import('@/features/onboarding/indexOptimized').then(m => ({ default: m.OnboardingPage })))

// Billing / Payments
export const PaymentSuccess = React.lazy(() => import('@/features/billing/pages/PaymentSuccess'))
export const PaymentCancelled = React.lazy(() => import('@/features/billing/pages/PaymentCancelled'))
export const PaymentDetailsPage = React.lazy(() => import('@/features/billing/pages/PaymentDetailsPage').then(m => ({ default: m.PaymentDetailsPage })))
export const BillingUpgradePage = React.lazy(() => import('@/features/billing/pages/BillingUpgradePage').then(m => ({ default: m.BillingUpgradePage })))
export const Billing = React.lazy(() => import('@/features/billing').then(m => ({ default: m.Billing })))

// Dashboard
export const SuiteDashboard = React.lazy(() => import('@/features/dashboard/pages/SuiteDashboard'))
export const ActivityDashboard = React.lazy(() => import('@/features/dashboard/pages/ActivityDashboardPage').then(m => ({ default: m.ActivityDashboard })))

// Applications
export const ApplicationPage = React.lazy(() => import('@/features/applications/pages/ApplicationPage').then(m => ({ default: m.ApplicationPage })))
export const ApplicationDetailsPage = React.lazy(() => import('@/features/applications/pages/ApplicationDetailsPage').then(m => ({ default: m.ApplicationDetailsPage })))

// Users
export const UserManagementDashboard = React.lazy(() => import('@/features/users/components/UserManagementDashboard').then(m => ({ default: m.UserManagementDashboard })))
export const InviteUserPage = React.lazy(() => import('@/features/users/pages/InviteUserPage').then(m => ({ default: m.InviteUserPage })))
export const UserDetailsPage = React.lazy(() => import('@/features/users/pages/UserDetailsPage').then(m => ({ default: m.UserDetailsPage })))
export const UserApplicationAccessPage = React.lazy(() => import('@/features/users/pages/UserApplicationAccess'))

// Roles
export const RolesPage = React.lazy(() => import('@/features/roles/pages/RolesPage').then(m => ({ default: m.RolesPage })))
export const RoleDetailsPage = React.lazy(() => import('@/features/roles/pages/RoleDetailsPage').then(m => ({ default: m.RoleDetailsPage })))
export const RoleBuilderPage = React.lazy(() => import('@/features/roles/pages/RoleBuilderPage').then(m => ({ default: m.RoleBuilderPage })))

// Organizations
export const OrganizationPage = React.lazy(() => import('@/features/organizations').then(m => ({ default: m.OrganizationPage })))

// Permissions / Settings
export const Permissions = React.lazy(() => import('@/features/permissions').then(m => ({ default: m.Permissions })))
export const Settings = React.lazy(() => import('@/features/settings').then(m => ({ default: m.Settings })))

// Company Admin
export const AdminDashboardPage = React.lazy(() => import('@/features/admin').then(m => ({ default: m.AdminDashboardPage })))
export const TenantDetailsPage = React.lazy(() => import('@/features/admin/pages/TenantDetailsPage').then(m => ({ default: m.TenantDetailsPage })))
export const CampaignDetailsPage = React.lazy(() => import('@/features/admin/pages/CampaignDetailsPage').then(m => ({ default: m.CampaignDetailsPage })))

// Misc
export const NotFound = React.lazy(() => import('@/features/NotFound'))
