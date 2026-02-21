import React, { useEffect, useState, useRef } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { ZopkitRoundLoader } from '@/components/common/feedback/ZopkitRoundLoader'
import { useNavigate } from '@tanstack/react-router'
import { config } from '@/lib/config'

export function AuthCallback() {
  const { isLoading, isAuthenticated, error, getToken, user } = useKindeAuth()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)
  // Use useRef instead of useState to prevent React StrictMode from resetting it
  const hasProcessedRef = useRef(false)
  const processingRef = useRef(false)
  const processedCodesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const codeParam = urlParams.get('code')

      if (hasProcessedRef.current || processingRef.current) {
        return
      }

      if (isLoading) {
        return
      }

      if (error) {
        // Handle different types of errors
        const errorMessage = error.message || (error as any)?.error_description || ''
        const errorCode = (error as any)?.error || ''
        
        const isInvalidGrant = errorMessage.includes('invalid_grant') || 
                              errorMessage.includes('refresh token') ||
                              errorMessage.includes('malformed') ||
                              errorCode === 'invalid_grant'
        
        const isServerError = errorMessage.includes('server_error') ||
                             errorCode === 'server_error' ||
                             (error as any)?.status_code === 500
        
        // If we're authenticated despite the error, it might be a React StrictMode duplicate attempt
        // The invalid_grant/server_error can occur if the code was already consumed
        if (isAuthenticated && user) {
          if (isInvalidGrant || isServerError) {
            
            // Clear the authorization code from URL to prevent retries
            if (codeParam) {
              try {
                const url = new URL(window.location.href)
                url.searchParams.delete('code')
                url.searchParams.delete('state')
                window.history.replaceState({}, '', url.toString())
              } catch (e) {
              }
            }
            
            try {
              localStorage.removeItem('kinde_backup_token')
              localStorage.removeItem('kinde_token')
              localStorage.removeItem('kinde_refresh_token')
            } catch (e) {
              // ignore
            }
          } else {
            // Continue with normal flow since authentication succeeded
          }
        } else {
          // Only treat as real error if we're not authenticated
          if (isInvalidGrant) {
            console.error('❌ AuthCallback: invalid_grant error - possible causes:')
            console.error('   1. Authorization code already used (React StrictMode duplicate)')
            console.error('   2. Refresh token is malformed or expired')
            console.error('   3. Redirect URI mismatch')
            console.error('   4. Client ID mismatch')
            
            // Clear authorization code from URL
            if (codeParam) {
              try {
                const url = new URL(window.location.href)
                url.searchParams.delete('code')
                url.searchParams.delete('state')
                window.history.replaceState({}, '', url.toString())
              } catch (e) {
                // Ignore
              }
            }
            
            try {
              localStorage.removeItem('kinde_backup_token')
              localStorage.removeItem('kinde_token')
              localStorage.removeItem('kinde_refresh_token')
            } catch (e) {
              // ignore
            }
          } else if (isServerError) {
            console.error('❌ AuthCallback: server_error (500) - Kinde server issue')
            console.error('   This could be:')
            console.error('   1. Temporary Kinde server issue')
            console.error('   2. Malformed request to Kinde')
            console.error('   3. Rate limiting')
            console.error('   Waiting and retrying...')
            
            // For server errors, wait a bit and retry
            setTimeout(() => {
              if (!isAuthenticated) {
                hasProcessedRef.current = false
                processingRef.current = false
                setProcessing(false)
              }
            }, 2000)
            return
          }
          
          console.error('❌ AuthCallback: Kinde SDK error:', error)
          hasProcessedRef.current = true
          // Don't navigate away yet - let the error UI handle it
          return
        }
      }

      try {
        const stateParam = urlParams.get('state')
        
        // Prevent processing the same authorization code multiple times
        if (codeParam) {
          if (processedCodesRef.current.has(codeParam)) {
            // Clear from URL and proceed
            try {
              const url = new URL(window.location.href)
              url.searchParams.delete('code')
              url.searchParams.delete('state')
              window.history.replaceState({}, '', url.toString())
            } catch (e) {
              // Ignore
            }
            // If authenticated, proceed with normal flow
            if (isAuthenticated && user) {
              hasProcessedRef.current = true
              // Continue to normal flow below
            } else {
              return
            }
          } else {
            // Mark this code as processed
            processedCodesRef.current.add(codeParam)
          }
        }
        
        if (!codeParam && !isAuthenticated) {
          navigate({ to: '/login', replace: true })
          return
        }
        
        // If we have a code but it's been processed, clear it from URL
        if (codeParam && hasProcessedRef.current) {
          try {
            const url = new URL(window.location.href)
            url.searchParams.delete('code')
            window.history.replaceState({}, '', url.toString())
          } catch (e) {
            // Ignore
          }
        }
        
        // Mark as processing to prevent duplicate runs (using refs for React StrictMode)
        hasProcessedRef.current = true
        processingRef.current = true
        setProcessing(true)

        if (stateParam) {
          try {
            let stateData: any = null
            
            // Try parsing as plain JSON first
            try {
              stateData = JSON.parse(stateParam)
            } catch (jsonError) {
              // If plain JSON parsing fails, try base64 decoding (Kinde's format)
              try {
                const decodedState = atob(stateParam)
                stateData = JSON.parse(decodedState)
              } catch (base64Error) {
                // If both fail, it might be URL encoded or in a different format
                try {
                  const decodedState = decodeURIComponent(stateParam)
                  stateData = JSON.parse(decodedState)
                } catch (urlError) {
                  // This is likely Kinde's internal state format, proceed with normal flow
                  stateData = null
                }
              }
            }
            
            // Only process if we have valid state data with CRM-specific fields
            if (stateData && stateData.app_code && stateData.redirect_url) {

              // Check if there are errors in the state data
              if (stateData.error) {

                // Redirect to CRM with error
                const errorUrl = new URL(stateData.redirect_url)
                errorUrl.searchParams.set('error', stateData.error)
                errorUrl.searchParams.set('error_description', stateData.error_description || 'Authentication failed')
                errorUrl.searchParams.set('app_code', stateData.app_code)

                window.location.href = errorUrl.toString()
                return
              }

              // Wait for authentication to complete before getting token
              // The Kinde SDK handles the token exchange automatically
              if (!isAuthenticated || !user) {
                // Reset processing flags so we can retry when authenticated
                hasProcessedRef.current = false
                processingRef.current = false
                setProcessing(false)
                return
              }

              // Now that we're authenticated, get the token
              // This should work because Kinde SDK has already exchanged the code
              try {
                const token = await getToken()

                if (token) {
                  // Validate token and get user context using backend
                  const backendUrl = config.WRAPPER_DOMAIN
                  const response = await fetch(`${backendUrl}/auth/validate`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      token,
                      app_code: stateData.app_code
                    }),
                  })

                  if (response.ok) {
                    const validation = await response.json()

                    if (validation.success) {
                      // Generate app-specific token
                      const appTokenResponse = await fetch(`${backendUrl}/auth/generate-app-token`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          token,
                          app_code: stateData.app_code
                        }),
                      })

                      if (appTokenResponse.ok) {
                        const appTokenData = await appTokenResponse.json()

                        // Redirect to CRM with token
                        const redirectUrl = new URL(stateData.redirect_url)
                        redirectUrl.searchParams.set('token', appTokenData.token)
                        redirectUrl.searchParams.set('expires_at', appTokenData.expiresAt)
                        redirectUrl.searchParams.set('app_code', stateData.app_code)

                        window.location.href = redirectUrl.toString()
                        return
                      }
                    }
                  }

                  console.error('❌ AuthCallback: Failed to validate or generate app token')
                }
              } catch (tokenError) {
                console.error('❌ AuthCallback: Error getting token:', tokenError)
                // Continue with normal flow if token retrieval fails
              }
            } else if (stateData) {
              // State exists but is not CRM flow (likely Kinde's internal state)
            }
          } catch (parseError) {
            console.error('❌ AuthCallback: Failed to parse state data:', parseError)
            // Continue with normal flow even if state parsing fails
          }
        }
        
        // If not CRM flow or failed, proceed with normal flow
        // Check for onboarding completion with refresh parameter
        const refreshParam = urlParams.get('refresh')
        const onboardingParam = urlParams.get('onboarding')

        // Wait for authentication to complete
        if (!isAuthenticated || !user) {
          // Reset processing flags so we can retry when authenticated
          hasProcessedRef.current = false
          processingRef.current = false
          setProcessing(false)
          return
        }

        // Check if this is onboarding completion with refresh needed
        if (onboardingParam === 'complete' && refreshParam === 'true') {

          // Force a page reload to ensure fresh authentication state
          setTimeout(() => {
            window.location.href = '/dashboard?onboarding=complete'
          }, 1000)
          return
        }

        // If user has a pending invitation (e.g. returned from sign-in on invite accept page), send them to invite flow first
        const pendingInvitationToken = localStorage.getItem('pendingInvitationToken')
        if (pendingInvitationToken) {
          navigate({ to: `/invite/accept?token=${pendingInvitationToken}`, replace: true })
          return
        }

        // Normal flow - redirect to dashboard
        if (onboardingParam === 'complete') {
          navigate({ to: '/dashboard?onboarding=complete', replace: true })
        } else {
          navigate({ to: '/dashboard', replace: true })
        }
        
      } catch (error) {
        console.error('❌ AuthCallback error:', error)
        setProcessing(false)
        // On error, redirect to login after a delay
        setTimeout(() => {
          navigate({ to: '/login', replace: true })
        }, 2000)
      }
    }

    // Small delay to ensure Kinde has processed the callback
    const timer = setTimeout(handleCallback, 500)
    
    // Cleanup: Clear old processed codes (keep only last 10 to prevent memory leaks)
    return () => {
      clearTimeout(timer)
      // Keep only the most recent 10 codes
      if (processedCodesRef.current.size > 10) {
        const codesArray = Array.from(processedCodesRef.current)
        processedCodesRef.current = new Set(codesArray.slice(-10))
      }
    }
  }, [isLoading, isAuthenticated, error, getToken, navigate, processing, user])

  // Only show error UI if we're not authenticated AND there's a real error
  // Don't show error if authentication succeeded (React StrictMode duplicate attempt)
  if (error && !isAuthenticated) {
    const errorMessage = error.message || (error as any)?.error_description || ''
    const errorCode = (error as any)?.error || ''
    
    const isInvalidGrant = errorMessage.includes('invalid_grant') || 
                          errorMessage.includes('refresh token') ||
                          errorMessage.includes('malformed') ||
                          errorCode === 'invalid_grant'
    
    const isServerError = errorMessage.includes('server_error') ||
                         errorCode === 'server_error' ||
                         (error as any)?.status_code === 500
    
    console.error('Kinde auth error:', error)
    
    // For server errors, show retry option
    if (isServerError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-orange-50">
          <div className="text-center max-w-md px-4">
            <div className="text-orange-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-orange-900 mb-2">Server Error</h2>
            <p className="text-orange-700 mb-4">
              The authentication server encountered an error. This is usually temporary.
            </p>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  // Clear URL params and retry
                  try {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('code')
                    url.searchParams.delete('state')
                    window.history.replaceState({}, '', url.toString())
                  } catch (e) {
                    // Ignore
                  }
                  navigate({ to: '/login', replace: true })
                }}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 mr-2"
              >
                Try Again
              </button>
              <button 
                onClick={() => navigate({ to: '/login', replace: true })}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      )
    }
    
    // For invalid_grant errors, provide more helpful information
    if (isInvalidGrant) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-yellow-50">
          <div className="text-center max-w-md px-4">
            <div className="text-yellow-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">Authentication Issue</h2>
            <p className="text-yellow-700 mb-4">
              There was an issue with token exchange. This can happen if:
            </p>
            <ul className="text-left text-yellow-700 mb-4 space-y-2">
              <li>• The authorization code was already used</li>
              <li>• The refresh token is expired or malformed</li>
              <li>• There's a redirect URI mismatch</li>
            </ul>
            <p className="text-yellow-600 text-sm mb-4">
              Please try logging in again.
            </p>
            <button 
              onClick={() => {
                try {
                  localStorage.removeItem('kinde_backup_token');
                  localStorage.removeItem('kinde_token');
                  localStorage.removeItem('kinde_refresh_token');
                } catch (e) {
                  // ignore
                }
                navigate({ to: '/login', replace: true });
              }}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }
    
    // For other errors, show standard error UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">Authentication Error</h2>
          <p className="text-red-700 mb-4">{error.message || 'An error occurred during authentication'}</p>
          <button 
            onClick={() => navigate({ to: '/login', replace: true })}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <ZopkitRoundLoader size="xl" className="mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {processing ? 'Processing CRM authentication...' : 'Completing authentication...'}
        </h2>
        <p className="text-gray-600">
          {processing ? 'Redirecting to your application...' : 'Please wait while we log you in.'}
        </p>
      </div>
    </div>
  )
} 