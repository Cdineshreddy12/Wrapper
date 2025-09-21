import React, { useState, useEffect } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AnimatedCounter, AnimatedPercentage } from '@/components/ui/animated-number'
import {
  Building2, Plus, ArrowRight, LogIn, Shield, Users, Zap,
  BarChart, Clock, CheckCircle, Star, Play,
  Globe, Award,
  Download, Phone, Menu, X, ArrowUpRight,
  Sun, Moon
} from 'lucide-react'
import toast from 'react-hot-toast'

const Landing: React.FC = () => {
  const { login } = useKindeAuth()
  const { actualTheme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [stats, setStats] = useState({
    users: 0,
    projects: 0,
    satisfaction: 0
  })

  // Load stats - use default values for public landing page
  useEffect(() => {
    // Set default stats for landing page since this is a public page
    setStats({
      users: 1000,
      projects: 250,
      satisfaction: 98
    })
  }, [])

  const toggleDarkMode = () => {
    setTheme(actualTheme === 'light' ? 'dark' : 'light')
  }

  const handleJoinExistingOrg = async () => {
    setIsLoading(true)
    try {
      await login()
    } catch (error) {
      toast.error('Failed to sign in. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNewOrg = async () => {
    setIsLoading(true)
    try {
      await login()
    } catch (error) {
      toast.error('Failed to create organization. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    {
      title: 'Advanced Analytics',
      description: 'Get insights into your business performance with real-time analytics and reporting.',
      icon: BarChart,
      benefits: ['Real-time dashboards', 'Custom reports', 'Data visualization']
    },
    {
      title: 'Team Collaboration',
      description: 'Work together seamlessly with your team using our collaboration tools.',
      icon: Users,
      benefits: ['Team workspaces', 'Shared projects', 'Communication tools']
    },
    {
      title: 'Security First',
      description: 'Enterprise-grade security to keep your data safe and compliant.',
      icon: Shield,
      benefits: ['End-to-end encryption', 'SSO integration', 'Audit logs']
    },
    {
      title: 'Lightning Fast',
      description: 'Built for speed and performance to handle your growing business needs.',
      icon: Zap,
      benefits: ['Fast loading', 'Optimized performance', 'Scalable infrastructure']
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'CEO, TechCorp',
      avatar: 'SJ',
      rating: 5,
      content: 'Zopkit has transformed how we manage our business operations. The analytics are incredible!'
    },
    {
      name: 'Mike Chen',
      role: 'CTO, StartupXYZ',
      avatar: 'MC',
      rating: 5,
      content: 'The team collaboration features are outstanding. Our productivity has increased by 40%.'
    },
    {
      name: 'Emily Davis',
      role: 'Operations Manager, GlobalCorp',
      avatar: 'ED',
      rating: 5,
      content: 'Security and compliance features give us peace of mind. Highly recommended!'
    }
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-muted/30 -z-10" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-destructive/10 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Zopkit</h1>
                  <p className="text-sm text-muted-foreground">Business Management Suite</p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <div className="flex items-center space-x-6">
                  <a href="#features" className="text-muted-foreground hover:text-primary-600 transition-colors font-medium">Features</a>
                  <a href="#testimonials" className="text-muted-foreground hover:text-primary-600 transition-colors font-medium">Testimonials</a>
                  <a href="#pricing" className="text-muted-foreground hover:text-primary-600 transition-colors font-medium">Pricing</a>
                </div>

                <div className="flex items-center space-x-4">
                  <Badge className="animate-pulse bg-destructive text-destructive-foreground border-0 px-3 py-1">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    <AnimatedCounter 
                      value={stats.users} 
                      suffix="+ teams"
                      duration={2500}
                      easing="easeOut"
                    />
                  </Badge>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span className="font-medium">+1 (555) 123-4567</span>
                  </div>

                  <button
                    onClick={toggleDarkMode}
                    className="p-2 rounded-xl bg-card hover:bg-accent transition-colors group"
                    aria-label="Toggle dark mode"
                  >
                    {actualTheme === 'dark' ? (
                      <Sun className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    ) : (
                      <Moon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2 rounded-xl bg-card hover:bg-accent transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden mt-4 p-6 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50">
                <div className="space-y-4">
                  <a href="#features" className="block text-muted-foreground hover:text-primary-600 transition-colors font-medium">Features</a>
                  <a href="#testimonials" className="block text-muted-foreground hover:text-primary-600 transition-colors font-medium">Testimonials</a>
                  <a href="#pricing" className="block text-muted-foreground hover:text-primary-600 transition-colors font-medium">Pricing</a>

                  <div className="pt-4 border-t border-border/50">
                    <button
                      onClick={toggleDarkMode}
                      className="flex items-center space-x-3 text-muted-foreground hover:text-primary transition-colors font-medium w-full"
                      aria-label="Toggle dark mode"
                    >
                      {actualTheme === 'dark' ? (
                        <>
                          <Sun className="w-5 h-5" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-5 h-5" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <div className="pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto mb-16">
              <h1 className="text-6xl md:text-7xl font-black text-foreground mb-8 leading-tight">
                Transform Your
                <span className="text-primary"> Business</span>
                Operations
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-12 leading-relaxed">
                The all-in-one platform for modern businesses. Manage, analyze, and grow with powerful tools designed for success.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
                <Button size="lg" className="text-xl px-12 py-6 font-bold">
                  Get Started Free
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
                <Button variant="outline" size="lg" className="text-xl px-12 py-6 font-bold">
                  <Play className="mr-3 h-6 w-6" />
                  Watch Demo
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    <AnimatedCounter 
                      value={stats.users} 
                      suffix="+"
                      duration={3000}
                      easing="easeOut"
                    />
                  </div>
                  <div className="text-muted-foreground flex items-center justify-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Active Users
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-accent mb-2">
                    <AnimatedCounter 
                      value={stats.projects} 
                      suffix="+"
                      duration={3000}
                      delay={200}
                      easing="easeOut"
                    />
                  </div>
                  <div className="text-muted-foreground flex items-center justify-center gap-2">
                    <BarChart className="w-5 h-5 text-accent" />
                    Projects Completed
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-destructive mb-2">
                    <AnimatedPercentage 
                      value={stats.satisfaction} 
                      duration={3000}
                      delay={400}
                      easing="easeOut"
                    />
                  </div>
                  <div className="text-muted-foreground flex items-center justify-center gap-2">
                    <Star className="w-5 h-5 text-destructive" />
                    Customer Satisfaction
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-20" id="features">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-foreground mb-6">Powerful Features</h2>
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to manage and grow your business in one place
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center group hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base mb-4">{feature.description}</CardDescription>
                    <div className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 mr-2 text-destructive" />
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Join Existing Organization */}
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <CardHeader className="text-center pb-8">
                  <div className="w-20 h-20 bg-destructive rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <LogIn className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl mb-4">Join Your Team</CardTitle>
                  <CardDescription className="text-lg">
                    Access your organization's workspace instantly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
                        <Shield className="h-5 w-5 text-destructive" />
                      </div>
                      <span className="font-medium">Secure authentication with Kinde SSO</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
                        <Users className="h-5 w-5 text-destructive" />
                      </div>
                      <span className="font-medium">Instant access to team workspace</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-destructive/10 rounded-xl flex items-center justify-center">
                        <Clock className="h-5 w-5 text-destructive" />
                      </div>
                      <span className="font-medium">All your projects and data ready</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleJoinExistingOrg} 
                    className="w-full h-12 text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing In...' : 'Sign In to My Organization'}
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>

              {/* Create New Organization */}
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <CardHeader className="text-center pb-8">
                  <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Plus className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl mb-4">Start Your Journey</CardTitle>
                  <CardDescription className="text-lg">
                    Create your organization and lead your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">Full administrator privileges</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">Custom subdomain and branding</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">14-day premium trial included</span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateNewOrg} 
                    className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Getting Started...' : 'Create New Organization'}
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="py-20 bg-muted/50" id="testimonials">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-foreground mb-6">Loved by Teams Worldwide</h2>
              <p className="text-2xl text-muted-foreground max-w-4xl mx-auto">
                Join thousands of teams who trust Zopkit to power their business operations
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-6">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mr-4">
                        <span className="text-white font-bold">{testimonial.avatar}</span>
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{testimonial.name}</div>
                        <div className="text-muted-foreground text-sm">{testimonial.role}</div>
                      </div>
                    </div>
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-destructive fill-current" />
                      ))}
                    </div>
                    <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h3 className="text-5xl font-black text-foreground mb-6">Ready to Transform Your Business?</h3>
              <p className="text-2xl text-muted-foreground mb-12">
                Join thousands of teams already using Zopkit to streamline their operations
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button size="lg" className="text-xl px-12 py-6 font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                  Start Free Trial
                  <ArrowUpRight className="ml-3 h-6 w-6" />
                </Button>
                <Button variant="outline" size="lg" className="text-xl px-12 py-6 font-bold border-primary text-primary hover:bg-primary/10">
                  <Download className="mr-3 h-6 w-6" />
                  Download Brochure
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Landing