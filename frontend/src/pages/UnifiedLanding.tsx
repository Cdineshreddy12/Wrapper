import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Building2, ArrowRight, LogIn, Shield, Users, Zap, 
  CheckCircle, Star, Rocket, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

const UnifiedLanding: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useKindeAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Auto-redirect authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      checkUserStatus()
    }
  }, [isAuthenticated, user])

  const checkUserStatus = async () => {
    try {
      const response = await api.get('/admin/auth-status')
      if (response.data.hasUser && response.data.hasTenant) {
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      console.log('User needs to complete setup')
    }
  }

  const handleLogin = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }

    setIsLoading(true)
    try {
      // Call simplified auth endpoint
      const response = await api.post('/auth/login', { email })
      
      // Redirect to Kinde for authentication
      window.location.href = response.data.authUrl
      
    } catch (error) {
      toast.error('Failed to start login process')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />

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
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Trusted by 10,000+ teams
            </Badge>
          </div>
        </nav>

        <div className="container mx-auto px-4 pb-16">
          {/* Hero Section */}
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-6 bg-blue-50 text-blue-700 border-blue-200 px-4 py-2">
              <Rocket className="w-4 h-4 mr-2" />
              One Platform, Endless Possibilities
            </Badge>
            
            <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Your Complete
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Business Platform
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Access all your business tools from one secure platform. 
              Smart authentication automatically connects you to your workspace or helps you create one.
            </p>

            {isAuthenticated && user && (
              <div className="mb-8 inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border border-green-200">
                <CheckCircle className="w-4 h-4 mr-2" />
                Welcome back, {user.given_name || user.email}!
                <span className="ml-2 text-xs bg-green-100 px-2 py-1 rounded-full">Checking your workspace...</span>
              </div>
            )}
          </div>

          {/* Unified Login Section */}
          <div className="max-w-md mx-auto mb-16">
            <Card className="p-8 hover:shadow-2xl transition-all duration-300 bg-white/80 backdrop-blur-sm border-white/50">
              <CardHeader className="text-center pb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <LogIn className="h-10 w-10 text-white" />
                </div>
                <CardTitle className="text-2xl mb-2">Get Started</CardTitle>
                <CardDescription className="text-lg text-gray-600">
                  Enter your email to access your workspace or create a new one
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Enter your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-lg"
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  
                  <Button 
                    onClick={handleLogin} 
                    className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 mb-1">Smart Authentication</p>
                      <p className="text-sm text-blue-700">
                        We'll automatically detect if you belong to an organization or help you create a new one.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Access</h3>
              <p className="text-sm text-gray-600">Enterprise-grade security with single sign-on</p>
            </div>
            
            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Team Ready</h3>
              <p className="text-sm text-gray-600">Built for teams of all sizes with role-based access</p>
            </div>
            
            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">All-in-One</h3>
              <p className="text-sm text-gray-600">CRM, HR, Accounting, and more in one platform</p>
            </div>
            
            <div className="text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/20 hover:bg-white/70 transition-all duration-300">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Easy Setup</h3>
              <p className="text-sm text-gray-600">Get started in minutes, not hours</p>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="font-medium">SOC 2 Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">99.9% Uptime</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">10,000+ Teams</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Global Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnifiedLanding