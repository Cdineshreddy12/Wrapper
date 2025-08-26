import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, Plus, ArrowRight, LogIn, Shield, Users, Zap, 
  BarChart, Target, Settings, Clock, CheckCircle, Star,
  Rocket, Globe, Lock, Briefcase, TrendingUp, Award
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const Landing: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useKindeAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Check authentication status quietly in background
  useEffect(() => {
    const checkAuthenticatedUser = async () => {
      if (isAuthenticated && user) {
        try {
          // Quietly check if user is already fully onboarded
          const response = await api.get('/admin/auth-status')
          const status = response.data

          if (status.hasUser && status.hasTenant) {
            // User is fully onboarded - redirect to dashboard silently
            console.log('✅ Authenticated user already onboarded, redirecting to dashboard')
            navigate('/dashboard', { replace: true })
          }
          // If not onboarded, let them stay on landing page to choose their path
        } catch (error) {
          console.log('ℹ️ Could not check auth status, letting user choose path')
          // Let user stay on landing page
        }
      }
    }

    // Add small delay to avoid flashing
    const timer = setTimeout(checkAuthenticatedUser, 100)
    return () => clearTimeout(timer)
  }, [isAuthenticated, user, navigate])

  const handleJoinExistingOrg = async () => {
    setIsLoading(true)
    try {
      // Use Kinde's built-in organization handling
      // Kinde will handle organization selection if user belongs to multiple orgs
      await login()
    } catch (error) {
      toast.error('Failed to sign in. Please try again.')
      setIsLoading(false)
    }
  }

  const handleCreateNewOrg = async () => {
    if (isAuthenticated) {
      // Check if user is an invited user (they should skip onboarding)
      try {
        const response = await api.get('/admin/auth-status')
        const isInvitedUser = response.data.authStatus?.onboardingCompleted === true || 
                              response.data.authStatus?.userType === 'INVITED_USER' ||
                              response.data.authStatus?.isInvitedUser === true
        
        if (isInvitedUser) {
          // INVITED USERS: Always go to dashboard (they skip onboarding)
          console.log('✅ Invited user detected, redirecting to dashboard (skipping onboarding)')
          navigate('/dashboard', { replace: true })
          return
        }
      } catch (error) {
        console.log('ℹ️ Could not check auth status, proceeding with onboarding')
      }
      
      // User is already authenticated, go directly to Kinde organization onboarding
      navigate('/onboarding/kinde-org')
      return
    }
    
    setIsLoading(true)
    try {
      // Use Kinde's built-in organization creation
      await login({
        isCreateOrg: true
      })
    } catch (error) {
      toast.error('Failed to start sign in process')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Zopkit
                </h1>
                <p className="text-xs text-gray-500 -mt-1">Business Suite</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Trusted by 10,000+ teams
              </Badge>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 pb-16">
          {/* Hero Section */}
          <div className="text-center mb-16 max-w-5xl mx-auto">
            <div className="mb-8">
              <Badge variant="outline" className="mb-6 bg-blue-50 text-blue-700 border-blue-200 px-4 py-2">
                <Rocket className="w-4 h-4 mr-2" />
                The Complete Business SaaS Suite
              </Badge>
              <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Your
                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Business Operations
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                All-in-one business management platform that scales with your team. 
                From project management to analytics, permissions to payments - everything you need in one place.
              </p>
              
              {isAuthenticated && user && (
                <div className="mb-8 inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Welcome back, {user.givenName || user.email}!
                  <span className="ml-2 text-xs bg-green-100 px-2 py-1 rounded-full">Ready to continue</span>
                </div>
              )}
            </div>

            {/* Key Features Grid */}
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Team Management</h3>
                <p className="text-sm text-gray-600">Advanced role-based permissions and user management</p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Analytics & Reporting</h3>
                <p className="text-sm text-gray-600">Real-time insights and comprehensive reporting</p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Enterprise Security</h3>
                <p className="text-sm text-gray-600">Bank-level security with SSO integration</p>
              </div>
              <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Lightning Fast</h3>
                <p className="text-sm text-gray-600">Optimized performance with intelligent caching</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 mb-16">
            
            {/* Existing Organization Flow */}
            <Card className="p-8 hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-white/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <CardHeader className="text-center pb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <LogIn className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl mb-2">Join Your Team</CardTitle>
                  <CardDescription className="text-lg text-gray-600">
                    Access your organization's workspace instantly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 text-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Shield className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium">Secure authentication with Kinde SSO</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium">Instant access to team workspace</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-medium">All your projects and data ready</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900 mb-1">Smart Organization Detection</p>
                        <p className="text-sm text-green-700">
                          Automatically detects your organizations or lets you choose from multiple teams.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleJoinExistingOrg} 
                    className="w-full h-12 text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        Sign In to My Organization
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </div>
            </Card>

            {/* New Organization Flow */}
            <Card className="p-8 hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-blue-200 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <CardHeader className="text-center pb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Plus className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl mb-2">Start Your Journey</CardTitle>
                  <CardDescription className="text-lg text-gray-600">
                    Create your organization and lead your team
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 text-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Award className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium">Full administrator privileges</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Globe className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium">Custom subdomain and branding</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Star className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium">14-day premium trial included</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium">Invite unlimited team members</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 mb-1">Perfect For Growing Teams</p>
                        <p className="text-sm text-blue-700">
                          Ideal for startups, growing businesses, and teams switching platforms. Setup takes less than 3 minutes!
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCreateNewOrg} 
                    className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Getting Started...
                      </>
                    ) : (
                      <>
                        Create New Organization
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </div>
            </Card>
          </div>

          {/* Business Suite Features */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Complete Business Suite</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Everything your growing business needs, integrated seamlessly into one powerful platform
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 hover:bg-white/90 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                  <Briefcase className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Project Management</h3>
                <p className="text-gray-600 mb-4">Advanced project tracking, task management, and team collaboration tools</p>
                <ul className="text-sm text-gray-500 space-y-2">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Kanban boards & Gantt charts</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Time tracking & reporting</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Resource management</li>
                </ul>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 hover:bg-white/90 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center mb-6">
                  <Lock className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Access Control</h3>
                <p className="text-gray-600 mb-4">Granular permissions system with role-based access control</p>
                <ul className="text-sm text-gray-500 space-y-2">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Custom role builder</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />SSO integration</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Audit trails</li>
                </ul>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50 hover:bg-white/90 transition-all duration-300">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mb-6">
                  <TrendingUp className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Business Intelligence</h3>
                <p className="text-gray-600 mb-4">Real-time analytics and comprehensive business insights</p>
                <ul className="text-sm text-gray-500 space-y-2">
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Custom dashboards</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Performance metrics</li>
                  <li className="flex items-center"><CheckCircle className="w-4 h-4 mr-2 text-green-500" />Predictive analytics</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="max-w-4xl mx-auto mt-16 text-center">
            <Card className="bg-white/70 backdrop-blur-sm border-white/50">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Need Help Choosing?</h3>
                <p className="text-gray-600 mb-8 text-lg">
                  Not sure which option is right for you? Here's a quick guide to help you decide:
                </p>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="text-left bg-green-50 rounded-xl p-6 border border-green-100">
                    <h4 className="font-semibold text-green-900 text-lg mb-4 flex items-center">
                      <LogIn className="w-5 h-5 mr-2" />
                      Choose "Join Your Team" if:
                    </h4>
                    <ul className="text-green-700 space-y-2">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-1 text-green-600" />
                        <span>Someone invited you to join their organization</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-1 text-green-600" />
                        <span>You're returning to an existing workspace</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-1 text-green-600" />
                        <span>You received an invitation email</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-1 text-green-600" />
                        <span>You already have account credentials</span>
                      </li>
                    </ul>
                  </div>
                  <div className="text-left bg-blue-50 rounded-xl p-6 border border-blue-100">
                    <h4 className="font-semibold text-blue-900 text-lg mb-4 flex items-center">
                      <Plus className="w-5 h-5 mr-2" />
                      Choose "Start Your Journey" if:
                    </h4>
                    <ul className="text-blue-700 space-y-2">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-1 text-blue-600" />
                        <span>You're starting a new business or project</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-1 text-blue-600" />
                        <span>You want to be the organization owner</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-1 text-blue-600" />
                        <span>You're evaluating Zopkit for your team</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 mt-1 text-blue-600" />
                        <span>This is your first time using our platform</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="max-w-4xl mx-auto mt-12 text-center">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 border border-white/30">
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Enterprise Security</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">99.9% Uptime SLA</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">10,000+ Happy Teams</span>
                </div>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Global Infrastructure</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Landing 