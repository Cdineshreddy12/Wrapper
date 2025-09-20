import { useState } from 'react'
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Badge,
  Input,
  Label,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormSwitch
} from '@/components/ui'
import { 
  Users, 
  Settings, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal
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

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-custom section-padding">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-text-primary mb-4">
            Design System Showcase
          </h1>
          <p className="text-lg text-text-secondary max-w-3xl">
            A comprehensive demonstration of our unified design system with consistent spacing, 
            typography, colors, and component patterns inspired by Linear, Notion, and Vercel.
          </p>
        </div>

        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-text-primary mb-8">Color Palette</h2>
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
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-success-50"></div>
                  <span className="text-sm font-mono">success-50</span>
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
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-warning-50"></div>
                  <span className="text-sm font-mono">warning-50</span>
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
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-error-50"></div>
                  <span className="text-sm font-mono">error-50</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-text-primary mb-8">Typography</h2>
          <Card>
            <CardContent className="space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-text-primary mb-2">Heading 1</h1>
                <p className="text-sm text-text-muted">text-4xl font-bold</p>
              </div>
              <div>
                <h2 className="text-3xl font-semibold text-text-primary mb-2">Heading 2</h2>
                <p className="text-sm text-text-muted">text-3xl font-semibold</p>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-text-primary mb-2">Heading 3</h3>
                <p className="text-sm text-text-muted">text-2xl font-semibold</p>
              </div>
              <div>
                <h4 className="text-xl font-medium text-text-primary mb-2">Heading 4</h4>
                <p className="text-sm text-text-muted">text-xl font-medium</p>
              </div>
              <div>
                <p className="text-base text-text-primary mb-2">
                  Body text - This is how regular paragraph text appears in our design system. 
                  It uses a comfortable line height and appropriate font weight for readability.
                </p>
                <p className="text-sm text-text-muted">text-base (default)</p>
              </div>
              <div>
                <p className="text-sm text-text-secondary mb-2">
                  Small text - Used for captions, metadata, and secondary information.
                </p>
                <p className="text-sm text-text-muted">text-sm</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-text-primary mb-8">Buttons</h2>
          <div className="space-y-8">
            {/* Button Variants */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Variants</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            {/* Button Sizes */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Sizes</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="xs">Extra Small</Button>
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </div>
            </div>

            {/* Button States */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">States</h3>
              <div className="flex flex-wrap gap-4">
                <Button>Normal</Button>
                <Button loading loadingText="Loading...">Loading</Button>
                <Button disabled>Disabled</Button>
                <Button variant="outline" loading>Loading Outline</Button>
              </div>
            </div>

            {/* Icon Buttons */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Icon Buttons</h3>
              <div className="flex flex-wrap gap-4">
                <Button size="icon-sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon-lg" variant="outline">
                  <Settings className="h-5 w-5" />
                </Button>
                <Button size="icon" variant="destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Form Components */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-text-primary mb-8">Form Components</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Form */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Form</CardTitle>
                <CardDescription>Standard form inputs with validation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                />
                
                <FormTextarea
                  label="Description"
                  placeholder="Tell us about yourself"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Form Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Form Controls</CardTitle>
                <CardDescription>Checkboxes, switches, and other controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={formData.status === 'active'}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="text-primary-600"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="status"
                        value="inactive"
                        checked={formData.status === 'inactive'}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="text-primary-600"
                      />
                      <span className="text-sm">Inactive</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cards */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-text-primary mb-8">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>Standard card with default styling</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  This is a basic card component with consistent padding and styling.
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
                <CardDescription>Card with enhanced shadow</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  This card has a more prominent shadow for better visual hierarchy.
                </p>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardHeader>
                <CardTitle>Outlined Card</CardTitle>
                <CardDescription>Card with prominent border</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary">
                  This card uses a thicker border for emphasis.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-text-primary mb-8">Badges</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="destructive">Error</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="ghost">Ghost</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge size="sm">Small</Badge>
                <Badge size="default">Default</Badge>
                <Badge size="lg">Large</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Data Table Example */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-text-primary mb-8">Data Table</h2>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage your team members and their roles</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search and Filters */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input 
                      placeholder="Search members..." 
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>

                {/* Table */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-secondary-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-background divide-y divide-border">
                      <tr className="hover:bg-surface-hover">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-text-primary">John Doe</div>
                              <div className="text-sm text-text-muted">john@example.com</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                          Administrator
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="success">Active</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Button size="icon-sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon-sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon-sm" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-surface-hover">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-secondary-100 flex items-center justify-center">
                              <Users className="h-4 w-4 text-secondary-600" />
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-text-primary">Jane Smith</div>
                              <div className="text-sm text-text-muted">jane@example.com</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                          User
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="warning">Pending</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Button size="icon-sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon-sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="icon-sm" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Usage Guidelines */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-text-primary mb-8">Usage Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-success-600">Do's</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-success-500 mt-2"></div>
                  <p className="text-sm">Use consistent spacing with the 4px grid system</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-success-500 mt-2"></div>
                  <p className="text-sm">Maintain proper contrast ratios for accessibility</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-success-500 mt-2"></div>
                  <p className="text-sm">Use semantic color variants (success, error, warning)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-success-500 mt-2"></div>
                  <p className="text-sm">Follow the established component patterns</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-error-600">Don'ts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-error-500 mt-2"></div>
                  <p className="text-sm">Don't use arbitrary colors outside the design system</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-error-500 mt-2"></div>
                  <p className="text-sm">Avoid inconsistent spacing and typography</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-error-500 mt-2"></div>
                  <p className="text-sm">Don't skip focus states and accessibility features</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-error-500 mt-2"></div>
                  <p className="text-sm">Avoid creating custom components when existing ones work</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
