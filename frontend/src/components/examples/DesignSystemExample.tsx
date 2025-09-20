import * as React from "react"
import { cn } from "@/lib/utils"
import { 
  Container, 
  Section, 
  PageHeader, 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  MotionDiv,
  MotionList,
  SkeletonCard,
  SkeletonTable,
  LoadingState,
  EnhancedInput,
  EnhancedTextarea,
  EnhancedSelect,
  FormActions,
  FormSection,
  StepIndicator,
  type Step
} from "@/components/ui"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Star
} from "lucide-react"

// Example steps for StepIndicator
const exampleSteps: Step[] = [
  {
    number: 1,
    title: "Personal Information",
    description: "Enter your basic details",
    icon: User,
    color: 'primary'
  },
  {
    number: 2,
    title: "Contact Details",
    description: "Add your contact information",
    icon: Mail,
    color: 'primary'
  },
  {
    number: 3,
    title: "Verification",
    description: "Verify your email address",
    icon: CheckCircle2,
    color: 'success'
  },
  {
    number: 4,
    title: "Complete",
    description: "Review and finish setup",
    icon: Star,
    isOptional: true
  }
]

export const DesignSystemExample = () => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(2)
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    country: ''
  })

  const handleSubmit = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header Example */}
      <Container className="py-8">
        <PageHeader
          title="Design System Showcase"
          description="Examples of our uniform, polished, and professional UI components"
          actions={
            <div className="flex items-center space-x-2">
              <Button variant="outline">Export</Button>
              <Button>Create New</Button>
            </div>
          }
          breadcrumbs={
            <div className="flex items-center space-x-2">
              <span>Home</span>
              <span>/</span>
              <span>Components</span>
              <span>/</span>
              <span className="text-foreground">Design System</span>
            </div>
          }
        />
      </Container>

      {/* Layout Components */}
      <Section spacing="lg" background="muted">
        <Container>
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Layout Components</h2>
              <p className="text-muted-foreground">
                Consistent spacing, containers, and sections for uniform layouts
              </p>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MotionDiv variant="slideUp" delay={0.1}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-primary" />
                      <span>User Profile</span>
                    </CardTitle>
                    <CardDescription>
                      Manage your personal information and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="default">Active</Badge>
                        <Badge variant="secondary">Verified</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last updated 2 hours ago
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>

              <MotionDiv variant="slideUp" delay={0.2}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-primary" />
                      <span>Notifications</span>
                    </CardTitle>
                    <CardDescription>
                      Configure your notification preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Email</Badge>
                        <Badge variant="outline">SMS</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        5 unread notifications
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>

              <MotionDiv variant="slideUp" delay={0.3}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="h-5 w-5 text-primary" />
                      <span>Settings</span>
                    </CardTitle>
                    <CardDescription>
                      Customize your application settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive">High Priority</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Requires attention
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </MotionDiv>
            </div>
          </div>
        </Container>
      </Section>

      {/* Form Components */}
      <Section spacing="lg">
        <Container>
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Enhanced Form Components</h2>
              <p className="text-muted-foreground">
                Consistent form styling with validation states and accessibility
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Form</CardTitle>
                  <CardDescription>
                    Example of enhanced form components with validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <EnhancedInput
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    leftIcon={<User className="h-4 w-4" />}
                    description="This will be displayed on your profile"
                  />

                  <EnhancedInput
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    leftIcon={<Mail className="h-4 w-4" />}
                    success="Email format is valid"
                  />

                  <EnhancedInput
                    label="Phone Number"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    leftIcon={<Phone className="h-4 w-4" />}
                  />

                  <EnhancedSelect
                    label="Country"
                    placeholder="Select your country"
                    value={formData.country}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                    options={[
                      { value: 'us', label: 'United States' },
                      { value: 'ca', label: 'Canada' },
                      { value: 'uk', label: 'United Kingdom' },
                      { value: 'au', label: 'Australia' }
                    ]}
                  />

                  <EnhancedTextarea
                    label="Message"
                    placeholder="Enter your message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    maxLength={500}
                    showCount
                    description="Maximum 500 characters"
                  />

                  <FormActions
                    onSubmit={handleSubmit}
                    onCancel={() => setFormData({ name: '', email: '', phone: '', message: '', country: '' })}
                    onReset={() => setFormData({ name: '', email: '', phone: '', message: '', country: '' })}
                    isLoading={isLoading}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step Indicator</CardTitle>
                  <CardDescription>
                    Interactive step indicator with animations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StepIndicator
                    steps={exampleSteps}
                    currentStep={currentStep}
                    onStepClick={setCurrentStep}
                    animated
                    showConnectors
                  />
                  
                  <div className="mt-6 flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                      disabled={currentStep <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setCurrentStep(Math.min(exampleSteps.length, currentStep + 1))}
                      disabled={currentStep >= exampleSteps.length}
                    >
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </Section>

      {/* Loading States */}
      <Section spacing="lg" background="muted">
        <Container>
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Loading States</h2>
              <p className="text-muted-foreground">
                Consistent loading patterns and skeleton components
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Skeleton Cards</h3>
                <div className="space-y-4">
                  <SkeletonCard />
                  <SkeletonCard showActions={false} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Skeleton Table</h3>
                <SkeletonTable rows={4} columns={3} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Loading State Toggle</h3>
              <div className="flex items-center space-x-4">
                <Button onClick={() => setIsLoading(!isLoading)}>
                  {isLoading ? 'Stop Loading' : 'Start Loading'}
                </Button>
                <LoadingState
                  isLoading={isLoading}
                  skeleton={<SkeletonCard />}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Dynamic Content</CardTitle>
                      <CardDescription>
                        This content appears when not loading
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        This is the actual content that would be displayed after loading.
                      </p>
                    </CardContent>
                  </Card>
                </LoadingState>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* Animations */}
      <Section spacing="lg">
        <Container>
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Animations & Motion</h2>
              <p className="text-muted-foreground">
                Subtle, performant animations for better user experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MotionDiv variant="fadeIn" delay={0.1}>
                <Card className="text-center p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Fade In</h3>
                  <p className="text-sm text-muted-foreground">Smooth entrance animation</p>
                </Card>
              </MotionDiv>

              <MotionDiv variant="slideUp" delay={0.2}>
                <Card className="text-center p-6">
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-6 w-6 text-success" />
                  </div>
                  <h3 className="font-semibold mb-2">Slide Up</h3>
                  <p className="text-sm text-muted-foreground">Upward motion entrance</p>
                </Card>
              </MotionDiv>

              <MotionDiv variant="scaleIn" delay={0.3}>
                <Card className="text-center p-6">
                  <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                  <h3 className="font-semibold mb-2">Scale In</h3>
                  <p className="text-sm text-muted-foreground">Scale-based entrance</p>
                </Card>
              </MotionDiv>

              <MotionDiv variant="slideIn" delay={0.4}>
                <Card className="text-center p-6">
                  <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold mb-2">Slide In</h3>
                  <p className="text-sm text-muted-foreground">Horizontal slide entrance</p>
                </Card>
              </MotionDiv>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  )
}

// Add missing import
import { Settings } from "lucide-react"
