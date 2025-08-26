import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Users, Plus, ArrowRight, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export function LandingPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, user } = useKindeAuth()
  const [orgCode, setOrgCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Check authentication status quietly in background
  useEffect(() => {
    const checkAuthenticatedUser = async () => {
      if (isAuthenticated && user) {
        try {
          // Quietly check if user is already fully onboarded
          const response = await api.get('/onboarding/status')
          const status = response.data

          if (status.user && status.isOnboarded && !status.needsOnboarding) {
            // User is fully onboarded - redirect to dashboard silently
            console.log('✅ Authenticated user already onboarded, redirecting to dashboard')
            navigate('/dashboard', { replace: true })
          } else if (status.authStatus?.onboardingCompleted === true || 
                     status.authStatus?.userType === 'INVITED_USER' ||
                     status.authStatus?.isInvitedUser === true) {
            // INVITED USERS: Always go to dashboard (they skip onboarding)
            console.log('✅ Invited user detected, redirecting to dashboard (skipping onboarding)')
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

  const handleSignInWithOrg = async () => {
    if (!orgCode.trim()) {
      toast.error('Please enter your organization code')
      return
    }

    setIsLoading(true)
    try {
      // Sign in with specific organization context
      await login({
        orgCode: orgCode.trim()
      })
    } catch (error) {
      toast.error('Failed to sign in. Please check your organization code.')
      setIsLoading(false)
    }
  }

  const handleCreateNewOrg = async () => {
    if (isAuthenticated) {
      // User is already authenticated, go directly to onboarding
      navigate('/onboarding')
      return
    }
    
    setIsLoading(true)
    try {
      // Sign in without organization context - we'll handle org creation after auth
      await login()
    } catch (error) {
      toast.error('Failed to start sign in process')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-white to-purple-500">
      <div className="container mx-auto px-4 py-16">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Welcome to Wrapper</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The complete business management platform for modern teams
          </p>
          {isAuthenticated && user && (
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              ✅ Signed in as {user.givenName || user.email}
            </div>
          )}
        </div>

        {/* Two Flow Options */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          
          {/* Existing Organization Flow */}
          <Card className="p-8 hover:shadow-xl transition-all duration-200">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">I Have an Organization</CardTitle>
              <CardDescription className="text-base">
                Sign in to your existing organization workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="orgCode">Organization Code</Label>
                  <Input
                    id="orgCode"
                    type="text"
                    placeholder="org_abc123xyz"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    className="mt-1"
                    onKeyPress={(e) => e.key === 'Enter' && handleSignInWithOrg()}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the organization code provided by your administrator
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Access your team's workspace instantly</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>All your projects and data available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Collaborate with your team members</span>
                </div>
              </div>

              <Button 
                onClick={handleSignInWithOrg} 
                className="w-full" 
                size="lg"
                disabled={!orgCode.trim() || isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In to Organization'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* New Organization Flow */}
          <Card className="p-8 hover:shadow-xl transition-all duration-200 border-blue-200">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Create New Organization</CardTitle>
              <CardDescription className="text-base">
                Start your own organization and invite your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>You'll be the organization administrator</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Choose your subdomain and branding</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>14-day free trial included</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Invite team members and set permissions</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Perfect for:</strong> New businesses, teams starting fresh, or organizations switching platforms
                </p>
              </div>

              <Button 
                onClick={handleCreateNewOrg} 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? 'Starting...' : 'Create New Organization'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Not sure which option to choose? Here's a quick guide:
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <p className="font-medium text-gray-900">Choose "I Have an Organization" if:</p>
                <ul className="text-gray-600 mt-1 space-y-1">
                  <li>• Someone invited you to join</li>
                  <li>• You have an organization code</li>
                  <li>• You're returning to existing workspace</li>
                </ul>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Choose "Create New Organization" if:</p>
                <ul className="text-gray-600 mt-1 space-y-1">
                  <li>• You're starting a new business</li>
                  <li>• You want to be the administrator</li>
                  <li>• You're evaluating the platform</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
} 