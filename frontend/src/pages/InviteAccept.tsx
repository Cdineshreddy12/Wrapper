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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Simplified Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Your Team</h1>
          <p className="text-gray-600">Sign in to accept your invitation</p>
        </div>

        {/* Authentication Only */}
        {!isAuthenticated ? (
          <Card className="shadow-lg border-0">
            <CardContent className="p-8">
              <SocialLogin
                orgCode={invitation?.orgCode}
                title=""
                subtitle=""
                onSuccess={() => {
                  toast.success('Welcome! Setting up your account...')
                  // handleAcceptInvitation will be called automatically via useEffect
                }}
                onError={(error) => {
                  toast.error(error)
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span className="text-green-600 font-medium">Welcome back!</span>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                You're signed in as <strong>{user?.email}</strong>
              </p>
              <Button
                onClick={handleAcceptInvitation}
                className="w-full"
                disabled={accepting}
                size="lg"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Joining your team...
                  </>
                ) : (
                  'Join Team'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Minimal Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Secure access powered by Google
          </p>
        </div>
      </div>
    </div>
  )
} 