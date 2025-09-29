import { AppSidebar } from "@/components/app-sidebar"
import { RouteBreadcrumb } from "@/components/route-breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useKindeAuth } from "@kinde-oss/kinde-auth-react"
import { Home, BarChart3, Building2, Users, Crown, Shield, Activity, CreditCard, Clock, X, Zap, ChevronRight } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate, useLocation, useSearchParams, useParams, Outlet, Link } from "react-router-dom"
import { Card, CardContent, Button, Badge } from "../ui"
import { cn } from "@/lib/utils"

interface TrialInfo {
  plan: string
  endDate: Date
  daysRemaining: number
  checkoutUrl?: string
}

const getDashboardNavigation = () => [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Home,
    children: [
      { name: 'Overview', href: '/dashboard?tab=overview', icon: BarChart3 },
      { name: 'Applications', href: '/dashboard?tab=applications', icon: Building2 },
      { name: 'Team', href: '/dashboard?tab=users', icon: Users },
      { name: 'Roles', href: '/dashboard?tab=roles', icon: Crown },
     
      { name: 'App Management', href: '/dashboard/user-application-management', icon: Shield },

      { name: 'Analytics', href: '/dashboard?tab=analytics', icon: Activity },
    ]
  },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Usage', href: '/dashboard/usage', icon: Activity },
  { name: 'Admin', href: '/admin', icon: Crown },
]

const getOrganizationNavigation = (orgCode: string) => [
  { name: 'Dashboard', href: `/org/${orgCode}`, icon: Home },
  { name: 'Analytics', href: `/org/${orgCode}/analytics`, icon: BarChart3 },
  { name: 'Users', href: `/org/${orgCode}/users`, icon: Users },
  { name: 'App Management', href: `/org/${orgCode}/user-application-management`, icon: Shield },
  { name: 'Billing', href: `/org/${orgCode}/billing`, icon: CreditCard },
  { name: 'Usage', href: `/org/${orgCode}/usage`, icon: Activity },
  { name: 'Permissions', href: `/org/${orgCode}/permissions`, icon: Shield },
  { name: 'Admin', href: '/admin', icon: Crown },
]
export  function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Dashboard'])
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null)
  const [showTrialBanner, setShowTrialBanner] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const params = useParams()
  const { user, logout } = useKindeAuth()

  // Determine which navigation to use based on current route
  const isOrganizationRoute = location.pathname.startsWith('/org/')
  const orgCode = params.orgCode
  const navigation = isOrganizationRoute && orgCode 
    ? getOrganizationNavigation(orgCode) 
    : getDashboardNavigation()

  // Check for trial information from URL params or localStorage
  useEffect(() => {
    const isTrial = searchParams.get('trial') === 'true'
    const plan = searchParams.get('plan')
    const trialEndDate = localStorage.getItem('trialEndDate')
    const pendingCheckoutUrl = localStorage.getItem('pendingCheckoutUrl')

    if (isTrial || trialEndDate) {
      const endDate = trialEndDate ? new Date(trialEndDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      
      setTrialInfo({
        plan: plan || 'professional',
        endDate,
        daysRemaining,
        checkoutUrl: pendingCheckoutUrl || undefined
      })
      setShowTrialBanner(true)
    }
  }, [searchParams])

  const handleUpgradeNow = () => {
    const checkoutUrl = localStorage.getItem('pendingCheckoutUrl')
    if (checkoutUrl) {
      window.location.href = checkoutUrl
    } else {
      navigate('/dashboard/billing')
    }
  }

  const dismissTrialBanner = () => {
    setShowTrialBanner(false)
  }

  const handleLogout = () => {
    logout()
  }

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  const isActive = (href: string) => {
    if (href.includes('?tab=')) {
      const [basePath, tabParam] = href.split('?tab=')
      return location.pathname === basePath && searchParams.get('tab') === tabParam
    }
    return location.pathname === href
  }

  const renderNavigationItem = (item: any, isChild = false) => {
    const active = isActive(item.href)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.name)

    return (
      <div key={item.name}>
        <div className="flex items-center">
          <Link
            to={item.href}
            className={cn(
              'group flex items-center flex-1 text-sm font-medium rounded-md transition-colors',
              isChild ? 'pl-8 py-1.5' : 'px-2 py-2',
              active
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <item.icon className={cn('h-4 w-4', !sidebarCollapsed && 'mr-3')} />
            {!sidebarCollapsed && item.name}
          </Link>
          {hasChildren && !sidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 mr-2"
              onClick={() => toggleExpanded(item.name)}
            >
              {isExpanded ? (
                <ChevronRight className="h-3 w-3 rotate-90 transition-transform" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
        {hasChildren && isExpanded && !sidebarCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children.map((child: any) => renderNavigationItem(child, true))}
          </div>
        )}
      </div>
    )
  }
  return (
    <SidebarProvider>
      <AppSidebar variant="inset"/>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <RouteBreadcrumb className="mt-3" />
          </div>
        </header>
        <main className="flex-1">
          {/* Trial Banner */}
          {showTrialBanner && trialInfo && (
            <div className="bg-primary">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Card className="m-4 border-0 bg-white/95 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Zap className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Free Trial Active
                          </h3>
                          <p className="text-sm text-gray-600">
                            {trialInfo.daysRemaining > 0 ? (
                              <>
                                <Clock className="inline h-4 w-4 mr-1" />
                                {trialInfo.daysRemaining} days remaining on your {trialInfo.plan} trial
                              </>
                            ) : (
                              <span className="text-orange-600 font-medium">
                                Trial expired - upgrade to continue using all features
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {trialInfo.plan.charAt(0).toUpperCase() + trialInfo.plan.slice(1)} Plan
                        </Badge>
                        <Button onClick={handleUpgradeNow} size="sm">
                          {trialInfo.daysRemaining > 0 ? 'Setup Payment' : 'Upgrade Now'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={dismissTrialBanner}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

