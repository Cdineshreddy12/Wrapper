import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Badge,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormSwitch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Progress,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Skeleton,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DataTable
} from '@/components/ui'
import { 
  Settings, 
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle,
  Loader2,
  ChevronDown,
  Sun,
  Moon,
  Palette,
  Layout,
  Zap,
  Target,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  Star,
  DollarSign,
  Tag,
  Copy,
  User,
  LogOut
} from 'lucide-react'

export function DesignSystemShowcase() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    description: '',
    notifications: true,
    marketing: false,
    status: 'active'
  })
  
  const [activeTab, setActiveTab] = useState('overview')
  const { theme, isDarkMode, changeTheme, toggleDarkMode } = useTheme()
  const [showSheet, setShowSheet] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [progress, setProgress] = useState(65)
  const [isLoading, setIsLoading] = useState(false)
  const [showAlert] = useState(true)
  const [demoTab1, setDemoTab1] = useState('tab1')
  const [demoTab2, setDemoTab2] = useState('tab1')
  const [demoTab3, setDemoTab3] = useState('tab1')
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isTableLoading, setIsTableLoading] = useState(false)

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }


  const handleLoading = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  const handleTableRefresh = () => {
    setIsTableLoading(true)
    setTimeout(() => setIsTableLoading(false), 1500)
  }

  const handleUserAction = (action: string, user: any) => {
    console.log(`${action} user:`, user)
    // In a real app, you would handle the actual action here
  }

  const handleProductAction = (action: string, product: any) => {
    console.log(`${action} product:`, product)
    // In a real app, you would handle the actual action here
  }

  const themes = [
    { name: 'Blue', value: 'blue', color: 'bg-blue-500' },
    { name: 'Purple', value: 'purple', color: 'bg-purple-500' },
    { name: 'Green', value: 'green', color: 'bg-green-500' },
    { name: 'Orange', value: 'orange', color: 'bg-orange-500' },
    { name: 'Pink', value: 'pink', color: 'bg-pink-500' },
  ]

  const sampleUsers = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', avatar: '/api/placeholder/32/32', lastLogin: '2024-01-15', department: 'Engineering', salary: '$95,000' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'inactive', avatar: '/api/placeholder/32/32', lastLogin: '2024-01-10', department: 'Marketing', salary: '$75,000' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Viewer', status: 'active', avatar: '/api/placeholder/32/32', lastLogin: '2024-01-14', department: 'Sales', salary: '$65,000' },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Manager', status: 'active', avatar: '/api/placeholder/32/32', lastLogin: '2024-01-15', department: 'Engineering', salary: '$110,000' },
    { id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', role: 'User', status: 'pending', avatar: '/api/placeholder/32/32', lastLogin: '2024-01-12', department: 'Support', salary: '$55,000' },
    { id: '6', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', status: 'active', avatar: '/api/placeholder/32/32', lastLogin: '2024-01-15', department: 'HR', salary: '$85,000' },
  ]

  const sampleProducts = [
    { id: '1', name: 'Premium Widget', category: 'Electronics', price: '$299.99', stock: 45, status: 'active', rating: 4.8, sales: 1250 },
    { id: '2', name: 'Basic Widget', category: 'Electronics', price: '$99.99', stock: 0, status: 'out_of_stock', rating: 4.2, sales: 890 },
    { id: '3', name: 'Deluxe Widget', category: 'Electronics', price: '$499.99', stock: 12, status: 'active', rating: 4.9, sales: 340 },
    { id: '4', name: 'Widget Accessory', category: 'Accessories', price: '$49.99', stock: 200, status: 'active', rating: 4.5, sales: 2100 },
    { id: '5', name: 'Widget Pro', category: 'Electronics', price: '$799.99', stock: 8, status: 'low_stock', rating: 4.7, sales: 180 },
  ]


  const stats = [
    { label: 'Total Users', value: '2,543', change: '+12%', trend: 'up' },
    { label: 'Revenue', value: '$45,231', change: '+8%', trend: 'up' },
    { label: 'Orders', value: '1,234', change: '-3%', trend: 'down' },
    { label: 'Conversion', value: '3.2%', change: '+0.5%', trend: 'up' },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header with Theme Controls */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container-custom py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                Design System Showcase
              </h1>
              <p className="text-text-secondary">
                Comprehensive UI component library with unified theming
              </p>
            </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-hover rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${themes.find(t => t.value === theme)?.color || 'bg-blue-500'}`} />
                    <span className="text-sm text-text-secondary capitalize">{theme}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleDarkMode}
                    className="gap-2"
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    {isDarkMode ? 'Light' : 'Dark'} Mode
                  </Button>
              <Sheet open={showSheet} onOpenChange={setShowSheet}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Palette className="h-4 w-4" />
                    Themes
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Theme Customization</SheetTitle>
                    <SheetDescription>
                      Choose your preferred color theme. Current: {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {themes.map((themeOption) => (
                      <Button
                        key={themeOption.value}
                        variant={theme === themeOption.value ? "default" : "outline"}
                        className="justify-start gap-3"
                        onClick={() => changeTheme(themeOption.value as any)}
                      >
                        <div className={`w-4 h-4 rounded-full ${themeOption.color}`} />
                        {themeOption.name}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom section-padding">
        {/* Quick Stats with Animations */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card variant="elevated" padding="lg" className="hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <Layout className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">Components</p>
                <p className="text-2xl font-bold text-text-primary">30+</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg" className="hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-success-100 rounded-lg">
                <Zap className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">Variants</p>
                <p className="text-2xl font-bold text-text-primary">80+</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg" className="hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-warning-100 rounded-lg">
                <Palette className="h-6 w-6 text-warning-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">Themes</p>
                <p className="text-2xl font-bold text-text-primary">5+</p>
              </div>
            </div>
          </Card>

          <Card variant="elevated" padding="lg" className="hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-accent-100 rounded-lg">
                <Target className="h-6 w-6 text-accent-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary">Accessible</p>
                <p className="text-2xl font-bold text-text-primary">100%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList variant="outline" className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="components">Components</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="data">Data Display</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Alerts Section */}
            {showAlert && (
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This is a comprehensive showcase of our design system. Use the tabs above to explore different component categories.
                </AlertDescription>
              </Alert>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} variant="elevated" padding="lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-text-secondary">
                      {stat.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold text-text-primary">
                        {stat.value}
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${
                        stat.trend === 'up' ? 'text-success-600' : 'text-error-600'
                      }`}>
                        {stat.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingUp className="h-4 w-4 rotate-180" />}
                        {stat.change}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progress Section */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Progress Indicators</CardTitle>
                <CardDescription>Different progress states and animations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Project Completion</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => setProgress(Math.min(100, progress + 10))}>
                    Increase
                  </Button>
                  <Button variant="outline" onClick={() => setProgress(Math.max(0, progress - 10))}>
                    Decrease
                  </Button>
                </div>
              </CardContent>
            </Card>

                {/* Theme Demonstration */}
                <Card variant="elevated" padding="lg">
                  <CardHeader>
                    <CardTitle>Theme Demonstration</CardTitle>
                    <CardDescription>See how the current theme affects all components</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <Button variant="default">Primary Button</Button>
                      <Button variant="outline">Outline Button</Button>
                      <Button variant="secondary">Secondary Button</Button>
                      <Button variant="ghost">Ghost Button</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="default">Primary Badge</Badge>
                      <Badge variant="success">Success Badge</Badge>
                      <Badge variant="warning">Warning Badge</Badge>
                      <Badge variant="destructive">Error Badge</Badge>
                    </div>
                    <div className="p-4 bg-primary-50 dark:bg-primary-950/20 rounded-lg">
                      <p className="text-primary-800 dark:text-primary-200">
                        This text uses primary colors that change with the theme
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Color Palette */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary-600">Primary</CardTitle>
                      <CardDescription>Main brand colors</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary-600"></div>
                        <span className="text-sm font-mono">primary-600</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary-100"></div>
                        <span className="text-sm font-mono">primary-100</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary-50"></div>
                        <span className="text-sm font-mono">primary-50</span>
                      </div>
                    </CardContent>
                  </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-success-600">Success</CardTitle>
                  <CardDescription>Positive actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-success-600"></div>
                    <span className="text-sm font-mono">success-600</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-success-100"></div>
                    <span className="text-sm font-mono">success-100</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-warning-600">Warning</CardTitle>
                  <CardDescription>Caution states</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-warning-600"></div>
                    <span className="text-sm font-mono">warning-600</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-warning-100"></div>
                    <span className="text-sm font-mono">warning-100</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-error-600">Error</CardTitle>
                  <CardDescription>Error states</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-error-600"></div>
                    <span className="text-sm font-mono">error-600</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-error-100"></div>
                    <span className="text-sm font-mono">error-100</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Components Tab */}
          <TabsContent value="components" className="space-y-8">
            {/* Buttons Section */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>Various button styles with improved dark mode visibility</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-primary">Button Variants</h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-primary">Button Sizes</h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <Button size="xs">Extra Small</Button>
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-primary">Button States</h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <Button loading={isLoading} onClick={handleLoading}>
                      {isLoading ? 'Loading...' : 'Click to Load'}
                    </Button>
                    <Button variant="outline" disabled>Disabled Outline</Button>
                    <Button variant="ghost" disabled>Disabled Ghost</Button>
                    <Button variant="secondary" disabled>Disabled Secondary</Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-text-primary">Dark Mode Preview</h4>
                  <div className="p-4 bg-gray-900 rounded-lg">
                    <div className="flex flex-wrap items-center gap-4">
                      <Button variant="default">Default</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="link">Link</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card variant="default">
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>A standard card with default styling</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary">This is the content of a default card.</p>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>Elevated Card</CardTitle>
                  <CardDescription>A card with more pronounced shadow</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary">Use this for important information.</p>
                </CardContent>
              </Card>

              <Card variant="outlined">
                <CardHeader>
                  <CardTitle>Outlined Card</CardTitle>
                  <CardDescription>A card with stronger border</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-text-secondary">Great for grouping content.</p>
                </CardContent>
              </Card>
            </div>

            {/* Badges Section */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Badges</CardTitle>
                <CardDescription>Status indicators and labels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="ghost">Ghost</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge size="sm">Small</Badge>
                  <Badge size="default">Default</Badge>
                  <Badge size="lg">Large</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Tabs</CardTitle>
                <CardDescription>Different tab styles and variants with improved dark mode support</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-text-primary">Default Style</h4>
                    <Tabs value={demoTab1} onValueChange={setDemoTab1} className="w-full">
                      <TabsList>
                        <TabsTrigger value="tab1">Overview</TabsTrigger>
                        <TabsTrigger value="tab2">Analytics</TabsTrigger>
                        <TabsTrigger value="tab3">Settings</TabsTrigger>
                      </TabsList>
                      <TabsContent value="tab1" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">This is the overview content with better contrast in both light and dark modes.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="tab2" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">Analytics data and charts would go here.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="tab3" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">Settings and configuration options.</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-text-primary">Outline Style</h4>
                    <Tabs value={demoTab2} onValueChange={setDemoTab2} className="w-full">
                      <TabsList variant="outline">
                        <TabsTrigger value="tab1">Profile</TabsTrigger>
                        <TabsTrigger value="tab2">Security</TabsTrigger>
                        <TabsTrigger value="tab3">Notifications</TabsTrigger>
                      </TabsList>
                      <TabsContent value="tab1" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">User profile information and preferences.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="tab2" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">Security settings and password management.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="tab3" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">Notification preferences and alerts.</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-text-primary">Pill Style</h4>
                    <Tabs value={demoTab3} onValueChange={setDemoTab3} className="w-full">
                      <TabsList variant="pill">
                        <TabsTrigger value="tab1" variant="pill">All</TabsTrigger>
                        <TabsTrigger value="tab2" variant="pill">Active</TabsTrigger>
                        <TabsTrigger value="tab3" variant="pill">Archived</TabsTrigger>
                      </TabsList>
                      <TabsContent value="tab1" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">All items with pill-style tabs for better visual hierarchy.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="tab2" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">Active items only.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="tab3" className="mt-4">
                        <div className="p-4 bg-surface-hover rounded-lg">
                          <p className="text-text-secondary">Archived items for reference.</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms" className="space-y-8">
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
                <CardDescription>Comprehensive form components with validation</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <FormInput
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('name', e.target.value)}
                    required
                  />
                  
                  <FormInput
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('email', e.target.value)}
                    required
                    error={formData.email && !formData.email.includes('@') ? 'Please enter a valid email address' : undefined}
                  />
                  
                  <FormSelect
                    label="Role"
                    placeholder="Select a role"
                    value={formData.role}
                    onValueChange={(value: string) => handleInputChange('role', value)}
                    options={[
                      { value: 'admin', label: 'Administrator' },
                      { value: 'user', label: 'User' },
                      { value: 'viewer', label: 'Viewer' },
                    ]}
                    required
                  />
                  
                  <FormTextarea
                    label="Description"
                    placeholder="Tell us about yourself"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                    rows={3}
                  />
                  
                  <FormSwitch
                    label="Email Notifications"
                    description="Receive email updates about your account"
                    checked={formData.notifications}
                    onCheckedChange={(checked: boolean) => handleInputChange('notifications', checked)}
                  />
                  
                  <FormCheckbox
                    label="Marketing Communications"
                    description="Receive updates about new features and products"
                    checked={formData.marketing}
                    onCheckedChange={(checked: boolean) => handleInputChange('marketing', checked)}
                  />
                  
                  <div className="flex gap-4">
                    <Button type="submit" loading={isLoading} onClick={handleLoading}>
                      Submit Form
                    </Button>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Display Tab */}
          <TabsContent value="data" className="space-y-8">
            {/* Advanced Data Table - Users */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Advanced Data Table - Users</CardTitle>
                <CardDescription>Comprehensive user management with search, sorting, selection, and actions</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={sampleUsers}
                  columns={[
                    {
                      key: 'name',
                      label: 'User',
                      sortable: true,
                      searchable: true,
                      render: (user) => (
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-text-muted">{user.department}</div>
                          </div>
                        </div>
                      )
                    },
                    {
                      key: 'email',
                      label: 'Email',
                      sortable: true,
                      searchable: true,
                      render: (user) => (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-text-muted" />
                          {user.email}
                        </div>
                      )
                    },
                    {
                      key: 'role',
                      label: 'Role',
                      sortable: true,
                      render: (user) => (
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      )
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      sortable: true,
                      render: (user) => (
                        <Badge 
                          variant={user.status === 'active' ? 'success' : user.status === 'pending' ? 'warning' : 'secondary'}
                          className="capitalize"
                        >
                          {user.status}
                        </Badge>
                      )
                    },
                    {
                      key: 'lastLogin',
                      label: 'Last Login',
                      sortable: true,
                      render: (user) => (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-text-muted" />
                          {user.lastLogin}
                        </div>
                      )
                    },
                    {
                      key: 'salary',
                      label: 'Salary',
                      sortable: true,
                      render: (user) => (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-success-600" />
                          <span className="font-mono">{user.salary}</span>
                        </div>
                      )
                    }
                  ]}
                  actions={[
                    {
                      key: 'view',
                      label: 'View Details',
                      icon: Eye,
                      onClick: (user) => handleUserAction('view', user)
                    },
                    {
                      key: 'edit',
                      label: 'Edit User',
                      icon: Edit,
                      onClick: (user) => handleUserAction('edit', user)
                    },
                    {
                      key: 'settings',
                      label: 'Settings',
                      icon: Settings,
                      onClick: (user) => handleUserAction('settings', user),
                      separator: true
                    },
                    {
                      key: 'delete',
                      label: 'Delete User',
                      icon: Trash2,
                      variant: 'destructive',
                      onClick: (user) => handleUserAction('delete', user),
                      disabled: (user) => user.role === 'Admin'
                    }
                  ]}
                  selectable={true}
                  selectedItems={selectedUsers}
                  onSelectionChange={setSelectedUsers}
                  getItemId={(user) => user.id}
                  loading={isTableLoading}
                  onRefresh={handleTableRefresh}
                  searchPlaceholder="Search users..."
                  pageSize={5}
                />
              </CardContent>
            </Card>

            {/* Product Inventory Table */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Product Inventory Table</CardTitle>
                <CardDescription>Product management with stock levels, ratings, and sales data</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={sampleProducts}
                  columns={[
                    {
                      key: 'name',
                      label: 'Product',
                      sortable: true,
                      searchable: true,
                      render: (product) => (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Tag className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-text-muted">{product.category}</div>
                          </div>
                        </div>
                      )
                    },
                    {
                      key: 'price',
                      label: 'Price',
                      sortable: true,
                      render: (product) => (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-success-600" />
                          <span className="font-mono font-semibold">{product.price}</span>
                        </div>
                      )
                    },
                    {
                      key: 'stock',
                      label: 'Stock',
                      sortable: true,
                      render: (product) => (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            product.stock === 0 ? 'bg-error-500' : 
                            product.stock < 20 ? 'bg-warning-500' : 
                            'bg-success-500'
                          }`} />
                          <span className="font-mono">{product.stock}</span>
                        </div>
                      )
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      sortable: true,
                      render: (product) => {
                        const statusConfig = {
                          active: { variant: 'success' as const, label: 'In Stock' },
                          out_of_stock: { variant: 'destructive' as const, label: 'Out of Stock' },
                          low_stock: { variant: 'warning' as const, label: 'Low Stock' }
                        }
                        const config = statusConfig[product.status as keyof typeof statusConfig] || statusConfig.active
                        return (
                          <Badge variant={config.variant}>
                            {config.label}
                          </Badge>
                        )
                      }
                    },
                    {
                      key: 'rating',
                      label: 'Rating',
                      sortable: true,
                      render: (product) => (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-warning-500 fill-current" />
                          <span className="font-mono">{product.rating}</span>
                        </div>
                      )
                    },
                    {
                      key: 'sales',
                      label: 'Sales',
                      sortable: true,
                      render: (product) => (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-success-600" />
                          <span className="font-mono">{product.sales.toLocaleString()}</span>
                        </div>
                      )
                    }
                  ]}
                  actions={[
                    {
                      key: 'view',
                      label: 'View Product',
                      icon: Eye,
                      onClick: (product) => handleProductAction('view', product)
                    },
                    {
                      key: 'edit',
                      label: 'Edit Product',
                      icon: Edit,
                      onClick: (product) => handleProductAction('edit', product)
                    },
                    {
                      key: 'duplicate',
                      label: 'Duplicate',
                      icon: Copy,
                      onClick: (product) => handleProductAction('duplicate', product),
                      separator: true
                    },
                    {
                      key: 'delete',
                      label: 'Delete Product',
                      icon: Trash2,
                      variant: 'destructive',
                      onClick: (product) => handleProductAction('delete', product)
                    }
                  ]}
                  selectable={true}
                  selectedItems={selectedProducts}
                  onSelectionChange={setSelectedProducts}
                  getItemId={(product) => product.id}
                  searchPlaceholder="Search products..."
                  pageSize={4}
                />
              </CardContent>
            </Card>

            {/* Simple Table Example */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Simple Table</CardTitle>
                <CardDescription>Basic table without advanced features for comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleUsers.slice(0, 3).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                            {user.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Avatars Section */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Avatars</CardTitle>
                <CardDescription>User profile images and fallbacks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src="/api/placeholder/40/40" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarImage src="/api/placeholder/40/40" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>BJ</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-8">
            {/* Alerts Section */}
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This is an informational alert with some important details.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-success-200 bg-success-50">
                <CheckCircle className="h-4 w-4 text-success-600" />
                <AlertDescription className="text-success-800">
                  Success! Your changes have been saved.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-warning-200 bg-warning-50">
                <AlertCircle className="h-4 w-4 text-warning-600" />
                <AlertDescription className="text-warning-800">
                  Warning: Please review your input before proceeding.
                </AlertDescription>
              </Alert>
              
              <Alert className="border-error-200 bg-error-50">
                <XCircle className="h-4 w-4 text-error-600" />
                <AlertDescription className="text-error-800">
                  Error: Something went wrong. Please try again.
                </AlertDescription>
              </Alert>
            </div>

            {/* Loading States */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Loading States</CardTitle>
                <CardDescription>Different loading indicators and skeletons</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading content...</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Navigation Tab */}
          <TabsContent value="navigation" className="space-y-8">
            {/* Dialog Example */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Modals & Dialogs</CardTitle>
                <CardDescription>Modal dialogs and confirmation prompts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                      <Button>Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove your data from our servers.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => setShowDialog(false)}>
                          Delete
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Dropdown Menu Example */}
            <Card variant="elevated" padding="lg">
              <CardHeader>
                <CardTitle>Dropdown Menus</CardTitle>
                <CardDescription>Context menus and action dropdowns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Actions <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}