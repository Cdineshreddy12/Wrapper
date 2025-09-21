import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, AlertTriangle, Users, Building2 } from 'lucide-react'
import { SocialLogin } from '@/components/auth/SocialLogin'
import toast from 'react-hot-toast'
import api from '@/lib/api'

interface InvitationDetails {
  email: string
  organizationName: string
  inviterName: string
  roles: string[]
  message?: string
  orgCode: string
}

export function InviteAccept() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, user, isLoading } = useKindeAuth()
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const orgCode = searchParams.get('org')
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitationDetails = async () => {
      // If we have a token, use token-based flow
      if (token) {
        try {
          console.log('🔍 Fetching invitation details by token:', { token })
          
          const response = await api.get('/invitations/details-by-token', {
            params: { token }
          })

          if (response.data.success) {
            setInvitation(response.data.invitation)
          } else {
            setError(response.data.message || 'Failed to load invitation')
          }
          setLoading(false)
        } catch (err: any) {
          console.error('Error fetching invitation by token:', err)
          if (err.response?.status === 404) {
            setError('Invitation not found or has expired')
          } else if (err.response?.status === 410) {
            setError('This invitation has expired')
          } else if (err.response?.status === 409) {
            setError('This invitation has already been accepted')
          } else {
            setError('Unable to load invitation details')
          }
          setLoading(false)
        }
        return
      }

      // Legacy flow with org and email parameters
      if (!orgCode) {
        setError('Invalid invitation link - missing organization or token')
        setLoading(false)
        return
      }

      try {
        console.log('🔍 Fetching invitation details:', { orgCode, email })
        
        const response = await api.get('/invitations/details', {
          params: { org: orgCode, email: email || '' }
        })

        if (response.data.success) {
          setInvitation(response.data.invitation)
        } else {
          setError(response.data.message || 'Failed to load invitation')
        }
        setLoading(false)
      } catch (err: any) {
        console.error('Error fetching invitation:', err)
        if (err.response?.status === 404) {
          setError('Invitation not found or has expired')
        } else {
          setError('Unable to load invitation details')
        }
        setLoading(false)
      }
    }

    fetchInvitationDetails()
  }, [orgCode, email, token])

  // Handle post-authentication invite acceptance
  useEffect(() => {
    if (isAuthenticated && user && invitation && !accepting) {
      console.log('✅ User authenticated with invitation, proceeding to accept...')
      // Add a small delay to ensure auth state is fully settled
      const timer = setTimeout(() => {
        handleAcceptInvitation()
      }, 1000) // Increased delay to ensure auth state is fully settled
      
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, user, invitation, accepting])

  // Additional effect to handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && user && !invitation && token) {
      console.log('🔄 User authenticated but invitation not loaded, refetching...')
      // User just authenticated, refetch invitation details
      const fetchInvitationDetails = async () => {
        try {
          const response = await api.get('/invitations/details-by-token', {
            params: { token }
          })

          if (response.data.success) {
            setInvitation(response.data.invitation)
          } else {
            setError(response.data.message || 'Failed to load invitation')
          }
        } catch (err: any) {
          console.error('Error refetching invitation after auth:', err)
          setError('Failed to load invitation details after authentication')
        }
      }
      
      fetchInvitationDetails()
    }
  }, [isAuthenticated, user, token])

  // Store invitation context in localStorage to preserve it during authentication
  useEffect(() => {
    if (token) {
      localStorage.setItem('pendingInvitationToken', token)
      console.log('💾 Stored invitation token in localStorage:', token)
    }
    
    // Cleanup on unmount
    return () => {
      if (token) {
        localStorage.removeItem('pendingInvitationToken')
        console.log('🧹 Cleaned up invitation token from localStorage')
      }
    }
  }, [token])

  // Check for pending invitation on mount
  useEffect(() => {
    const pendingToken = localStorage.getItem('pendingInvitationToken')
    if (pendingToken && !token) {
      console.log('🔄 Found pending invitation token in localStorage:', pendingToken)
      // Redirect back to invitation acceptance with the stored token
      navigate(`/invite/accept?token=${pendingToken}`, { replace: true })
    }
  }, [token, navigate])

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) {
      console.log('❌ Cannot accept invitation:', { hasInvitation: !!invitation, hasUser: !!user })
      return
    }

    console.log('🚀 Starting invitation acceptance process...', {
      invitation: invitation,
      user: user,
      token: token
    })

    setAccepting(true)
    try {
      // Use token-based acceptance if we have a token
      if (token) {
        console.log('✅ Accepting invitation by token:', { 
          token, 
          kindeUserId: user.id 
        })
        
        const response = await api.post('/invitations/accept-by-token', {
          token,
          kindeUserId: user.id
        })

        console.log('✅ Invitation acceptance response:', response.data)

        if (response.data.success) {
          toast.success(`Welcome to ${invitation.organizationName}!`)
          
          // INVITED USERS: Always redirect to dashboard (they skip onboarding)
          // The backend ensures onboardingCompleted=true for invited users
          console.log('🎉 Invitation accepted successfully, redirecting to dashboard...')
          setTimeout(() => {
            navigate('/dashboard?welcome=true&invited=true')
          }, 1500)
        } else {
          throw new Error(response.data.message || 'Failed to accept invitation')
        }
      } else {
        // Legacy org/email based acceptance
        console.log('✅ Accepting invitation:', { 
          org: invitation.orgCode, 
          email: invitation.email, 
          kindeUserId: user.id 
        })
        
        const response = await api.post('/invitations/accept', {
          org: invitation.orgCode,
          email: invitation.email,
          kindeUserId: user.id
        })

        console.log('✅ Invitation acceptance response:', response.data)

        if (response.data.success) {
          toast.success(`Welcome to ${invitation.organizationName}!`)
          
          // INVITED USERS: Always redirect to dashboard (they skip onboarding)
          // The backend ensures onboardingCompleted=true for invited users
          console.log('🎉 Invitation accepted successfully, redirecting to dashboard...')
          setTimeout(() => {
            navigate('/dashboard?welcome=true&invited=true')
          }, 1500)
        } else {
          throw new Error(response.data.message || 'Failed to accept invitation')
        }
      }
    } catch (err: any) {
      console.error('❌ Error accepting invitation:', err)
      if (err.response?.status === 409) {
        toast.error('This invitation has already been accepted')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      } else if (err.response?.status === 410) {
        toast.error('This invitation has expired')
        setAccepting(false)
      } else {
        toast.error(err.response?.data?.message || 'Failed to accept invitation. Please try again.')
        setAccepting(false)
      }
    }
  }

  const handleSignIn = () => {
    // If user is already authenticated, just accept the invitation
    if (isAuthenticated && user) {
      handleAcceptInvitation()
      return
    }

    // Otherwise, trigger authentication with the specific org
    // The SocialLogin component will handle this
  }

  const handleDecline = () => {
    toast.error('Invitation declined')
    navigate('/landing')
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/landing')} 
              className="w-full"
              variant="outline"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <CardTitle>Joining Organization</CardTitle>
            <CardDescription>Please wait while we set up your access...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-lg text-gray-600">Join your team on Wrapper</p>
        </div>

        {/* Invitation Details */}
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">{invitation?.organizationName}</CardTitle>
            <CardDescription>
              {invitation?.inviterName} has invited you to join their team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invitation Details */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Invitation Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Email:</span>
                    <span className="text-blue-900 font-medium">{invitation?.email}</span>
                  </div>
                  {invitation?.roles && invitation.roles.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">Role:</span>
                      <span className="text-blue-900 font-medium">{invitation.roles.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {invitation?.message && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-medium text-amber-900 mb-2">Personal Message</h3>
                  <p className="text-sm text-amber-800 italic">"{invitation.message}"</p>
                </div>
              )}
            </div>

            {/* Authentication */}
            {!isAuthenticated ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Sign in to accept this invitation
                  </p>
                </div>
                
                <SocialLogin
                  orgCode={invitation?.orgCode}
                  title="Accept Invitation"
                  subtitle="Sign in to join the team"
                  onSuccess={() => {
                    toast.success('Authentication successful!')
                    // handleAcceptInvitation will be called automatically via useEffect
                  }}
                  onError={(error) => {
                    toast.error(error)
                  }}
                />
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">You're signed in as {user?.email}</span>
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    onClick={handleAcceptInvitation}
                    className="flex-1"
                    disabled={accepting}
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Joining...
                      </>
                    ) : (
                      'Accept Invitation'
                    )}
                  </Button>
                  <Button 
                    onClick={handleDecline}
                    variant="outline"
                    disabled={accepting}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            )}

            {/* Features Preview */}
            <div className="border-t pt-6">
              <h3 className="font-medium text-gray-900 mb-3">What you'll get access to:</h3>
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Integrated CRM and business tools</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Team collaboration features</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Analytics and reporting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Secure workspace access</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Having trouble? Contact {invitation?.inviterName || 'your team administrator'} for help.
          </p>
        </div>
      </div>
    </div>
  )
} 