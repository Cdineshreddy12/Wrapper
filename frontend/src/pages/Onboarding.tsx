import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { markUserAsOnboarded, updateOnboardingStep, getSavedOnboardingData } from '@/hooks/usePostLoginRedirect'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { 
  Building2, 
  Crown, 
  CreditCard, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Globe,
  Zap,
  Shield,
  Star
} from 'lucide-react'
import toast from 'react-hot-toast'
import { authAPI, onboardingAPI } from '../lib/api'
import api from '@/lib/api'

interface Plan {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  popular?: boolean
  maxUsers: number
  maxProjects: number
}

interface SocialProvider {
  id: string
  name: string
  icon: string
  url: string
  description: string
  primary?: boolean
}

const plans: Plan[] = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    description: 'Try our platform with time-limited access',
    maxUsers: 5,
    maxProjects: 10,
    features: [
      '5 team members',
      '10 projects',
      'Basic CRM access only',
      'Leads & Contacts management',
      'Dashboard access',
      '1GB storage',
      '⏰ Limited time access'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Perfect for small teams getting started',
    maxUsers: 5,
    maxProjects: 10,
    features: [
      '5 team members',
      '10 projects',
      'Basic permissions',
      'Email support',
      '10GB storage',
      '✨ 14-day free trial'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    description: 'Advanced features for growing businesses',
    maxUsers: 25,
    maxProjects: 50,
    popular: true,
    features: [
      '25 team members',
      '50 projects', 
      'Advanced permissions',
      'Priority support',
      '100GB storage',
      'Custom integrations',
      'Analytics dashboard',
      '✨ 14-day free trial'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    description: 'Full-scale solution for large organizations',
    maxUsers: 100,
    maxProjects: 500,
    features: [
      '100+ team members',
      'Unlimited projects',
      'Enterprise permissions',
      '24/7 phone support',
      '1TB storage',
      'Custom integrations',
      'Advanced analytics',
      'SLA guarantee',
      'Dedicated account manager',
      '✨ 14-day free trial'
    ]
  }
]

const defaultProviders: SocialProvider[] = [
  {
    id: 'google',
    name: 'Google',
    icon: '🔍',
    url: '/api/auth/oauth/google',
    description: 'Sign in with Google',
    primary: true
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    url: '/api/auth/oauth/github',
    description: 'Sign in with GitHub'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: '🪟',
    url: '/api/auth/oauth/microsoft',
    description: 'Sign in with Microsoft'
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: '🍎',
    url: '/api/auth/oauth/apple',
    description: 'Sign in with Apple'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    url: '/api/auth/oauth/linkedin',
    description: 'Sign in with LinkedIn'
  }
]

export function Onboarding() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, user, login } = useKindeAuth()
  const [currentStep, setCurrentStep] = useState(1)

  const [isLoading, setIsLoading] = useState(false)

  const [isLoadingSavedData, setIsLoadingSavedData] = useState(false)
  const [dataWasRestored, setDataWasRestored] = useState(false)
  const [userModifiedData, setUserModifiedData] = useState(false)
  const [isSubdomainChecking, setIsSubdomainChecking] = useState(false)
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [providers, setProviders] = useState<SocialProvider[]>(defaultProviders)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  const [isOnboardingFetched, setIsOnboardingFetched] = useState(false)
  
  // Check for messages from URL params
  const authError = searchParams.get('error')
  const fromLogin = searchParams.get('from') === 'login'
  const step = searchParams.get('step')

  const [formData, setFormData] = useState({
    // Company info (user fills these)
    companyName: '',
    subdomain: '',
    industry: '',
    // User info (auto-populated from Kinde user)
    adminEmail: user?.email || '',
    adminName: user ? `${user.givenName} ${user.familyName}`.trim() : '',
    // Plan selection
    selectedPlan: 'trial',
    // Team invites
    teamEmails: ['']
  })

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || !user) return;

      try {
        setIsOnboardingFetched(false); 
        console.log('🔍 Onboarding: Checking if user already completed onboarding...');
        const response = await api.get('/admin/auth-status');
        const authStatus = response.data.authStatus;
        setIsOnboardingFetched(true);
        console.log('📊 Onboarding: Auth status check result:', authStatus);
        console.log('📊 Onboarding: Full response data:', response.data);
        
        if(isOnboardingFetched)
        {
              // Check multiple possible status indicators
                    const isOnboarded = authStatus?.onboardingCompleted || 
                    response.data.user?.onboardingCompleted ||
                    response.data.onboardingCompleted;
            const needsOnboarding = authStatus?.needsOnboarding || 
                        response.data.user?.needsOnboarding ||
                        response.data.needsOnboarding;
                        
            console.log('🔍 Onboarding: Computed status - isOnboarded:', isOnboarded, 'needsOnboarding:', needsOnboarding);

            // If user has completed onboarding, redirect to dashboard
            if (isOnboarded && !needsOnboarding) {
            console.log('✅ Onboarding: User already completed onboarding, redirecting to dashboard immediately');
            toast.success('Welcome back! Redirecting to your dashboard...', {
            duration: 2000,
            icon: '🎉'
            });
            // Immediate redirect - no delay
            navigate('/dashboard?welcome=true&returning=true', { replace: true });
            return;
            }
        }
        
        console.log('🔄 Onboarding: User needs to complete onboarding');
      } catch (error) {
        console.error('❌ Onboarding: Error checking auth status:', error);
 
        // Continue with onboarding if there's an error
      }
      finally{
        setIsOnboardingFetched(true);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, user, navigate,isOnboardingFetched]);



  // Update form data when user data becomes available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        adminEmail: user.email || '',
        adminName: user.givenName && user.familyName 
          ? `${user.givenName} ${user.familyName}`.trim()
          : user.givenName || user.email || ''
      }));
    }
  }, [user]);

  // Load saved onboarding data when user becomes available
  useEffect(() => {
    const loadSavedData = async () => {
      if (user?.email) {
        console.log('🔄 Starting data load for user:', user.email);
        setIsLoadingSavedData(true);
        try {
          console.log('📋 Calling getSavedOnboardingData for:', user.email);
          const savedData = await getSavedOnboardingData(user.email);
          console.log('📦 Raw response from getSavedOnboardingData:', savedData);
          
          if (savedData?.data?.savedFormData) {
            console.log('✅ Found saved onboarding data:', savedData.data.savedFormData);
            
            // Merge saved data with current form data, preserving user auth info
            const mergedData = {
              ...savedData.data.savedFormData,
              // Always keep the current user's email and name from Kinde
              adminEmail: user.email || '',
              adminName: user.givenName && user.familyName 
                ? `${user.givenName} ${user.familyName}`.trim()
                : user.givenName || user.email || ''
            };
            
            console.log('🔄 Merging saved data with current form:', mergedData);
            
            setFormData(prev => {
              console.log('📝 Previous form data:', prev);
              const newFormData = {
                ...prev,
                ...mergedData
              };
              console.log('📝 New form data after merge:', newFormData);
              return newFormData;
            });
            
            setDataWasRestored(true);
            console.log('✅ Data restoration flag set to true');
            
            // Set the current step if available and not coming from login
            if (savedData.data.onboardingStep && !fromLogin) {
              const stepNumber = parseInt(savedData.data.onboardingStep.replace('step_', '')) || 1;
              console.log('📍 Resuming onboarding at step:', stepNumber);
              setCurrentStep(stepNumber);
            }
            
            toast.success('Previous progress restored!', {
              duration: 3000,
              icon: '📋'
            });
          } else {
            console.log('ℹ️ No saved onboarding data found in response:', savedData);
          }
        } catch (error: any) {
          console.error('❌ Failed to load saved onboarding data:', error);
          console.error('❌ Error details:', error.response?.data || error.message);
        } finally {
          setIsLoadingSavedData(false);
          console.log('🏁 Data loading completed');
        }
      } else {
        console.log('⏭️ No user email available, skipping data load');
      }
    };

    // Add delay to ensure user data is available
    if (user?.email) {
      console.log('🚀 User data available, starting data load...');
      loadSavedData();
    } else {
      console.log('⏳ Waiting for user data...');
    }
  }, [user, fromLogin]);

  // Set initial step based on authentication status
  useEffect(() => {
    if (isAuthenticated && user) {
      // User is authenticated, skip to step 2
      setCurrentStep(2);
    } else if (step) {
      setCurrentStep(parseInt(step) || 1);
    }
  }, [isAuthenticated, user, step]);

  // Fetch available social providers on component mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await authAPI.getProviders()
        if (response.data.success && response.data.data.providers) {
          setProviders(response.data.data.providers)
        }
      } catch (error) {
        console.error('Failed to fetch social providers:', error)
        // Use default providers as fallback
      }
    }

    fetchProviders()
  }, [])

  // Auto-generate subdomain from company name
  useEffect(() => {
    if (formData.companyName && !formData.subdomain) {
      const suggested = formData.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20)
      
      setFormData(prev => ({ ...prev, subdomain: suggested }))
    }
  }, [formData.companyName])

  // Check subdomain availability
  useEffect(() => {
    const checkSubdomain = async () => {
      if (!formData.subdomain || formData.subdomain.length < 3) {
        setSubdomainAvailable(null)
        return
      }

      setIsSubdomainChecking(true)
      try {
        const response = await onboardingAPI.checkSubdomain(formData.subdomain)
        setSubdomainAvailable(response.data.available)
      } catch (error) {
        console.error('Error checking subdomain:', error)
        setSubdomainAvailable(false)
      } finally {
        setIsSubdomainChecking(false)
      }
    }

    const debounceTimer = setTimeout(checkSubdomain, 500)
    return () => clearTimeout(debounceTimer)
  }, [formData.subdomain])

  const handleFormDataChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (dataWasRestored) {
      setUserModifiedData(true);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Step 1: OAuth Authentication - check if user is authenticated
      if (!isAuthenticated || !user) {
        toast.error('Please complete authentication first')
        return
      }
    }

    if (currentStep === 2) {
      // Step 2: Company info validation
      if (!formData.companyName || !formData.subdomain) {
        toast.error('Please fill in all required fields')
        return
      }
      if (subdomainAvailable === false) {
        toast.error('Please choose an available subdomain')
        return
      }
    }

    const nextStep = Math.min(currentStep + 1, 4)
    
    // Update onboarding step in backend
    try {
      if (isAuthenticated && user) {
        // Prepare form data to save based on current step
        let currentFormData = {};
        if (currentStep === 2) {
          // Save company information step
          currentFormData = {
            companyName: formData.companyName,
            subdomain: formData.subdomain,
            industry: formData.industry
          };
        } else if (currentStep === 3) {
          // Save plan selection step
          currentFormData = {
            companyName: formData.companyName,
            subdomain: formData.subdomain,
            industry: formData.industry,
            selectedPlan: formData.selectedPlan
          };
        } else if (currentStep === 4) {
          // Save team emails step
          currentFormData = {
            companyName: formData.companyName,
            subdomain: formData.subdomain,
            industry: formData.industry,
            selectedPlan: formData.selectedPlan,
            teamEmails: formData.teamEmails
          };
        }

        await updateOnboardingStep(`step_${nextStep}`, {
          currentStep: nextStep,
          completedStep: currentStep,
          timestamp: new Date().toISOString()
        }, user.email, currentFormData)
      }
    } catch (error) {
      console.error('Failed to update onboarding step:', error)
      // Continue anyway - step tracking is not critical
    }

    setCurrentStep(nextStep)
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handlePlanSelect = (planId: string) => {
    setFormData(prev => ({ ...prev, selectedPlan: planId }))
    if (dataWasRestored) {
      setUserModifiedData(true);
    }
  }

  const handleTeamEmailChange = (index: number, email: string) => {
    const newEmails = [...formData.teamEmails]
    newEmails[index] = email
    setFormData(prev => ({ ...prev, teamEmails: newEmails }))
    if (dataWasRestored) {
      setUserModifiedData(true);
    }
  }

  const addTeamEmail = () => {
    setFormData(prev => ({ 
      ...prev, 
      teamEmails: [...prev.teamEmails, ''] 
    }))
  }

  const removeTeamEmail = (index: number) => {
    if (formData.teamEmails.length > 1) {
      const newEmails = formData.teamEmails.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, teamEmails: newEmails }))
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      const selectedPlan = plans.find(p => p.id === formData.selectedPlan)!
      
      const onboardingData = {
        companyName: formData.companyName,
        subdomain: formData.subdomain,
        industry: formData.industry,
        adminEmail: formData.adminEmail,
        adminName: formData.adminName,
        selectedPlan: formData.selectedPlan,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        maxUsers: selectedPlan.maxUsers,
        maxProjects: selectedPlan.maxProjects,
        teamEmails: formData.teamEmails.filter(email => email.trim() !== ''),
        socialProvider: 'kinde'
      }

      console.log('🚀 Starting onboarding process with data:', onboardingData);
      
      // Call backend API to complete onboarding
      const response = await onboardingAPI.complete(onboardingData);
      const { tenantId, subdomain, kindeOrgCode, checkoutUrl, redirectToPayment, organization } = response.data;
      
      console.log('✅ Onboarding API completed successfully:', response.data);
      
      // Mark user as onboarded with the organization ID
      if (tenantId) {
        await markUserAsOnboarded(tenantId);
        console.log('✅ User marked as onboarded with organization:', tenantId);
      }
      
      // Handle different plan types
      if (formData.selectedPlan === 'trial') {
        // Trial plan - go directly to dashboard with trial info
        const trialDuration = process.env.NODE_ENV === 'production' ? '14 days' : '5 minutes';
        toast.success(
          `🎉 Welcome to ${organization?.name || formData.companyName}! Your ${trialDuration} trial has started.`,
          {
            duration: 3000,
            icon: '⏰'
          }
        );
        
        // Redirect to dashboard immediately for trial plan - NO DELAY
        console.log('🚀 Onboarding: Redirecting to dashboard immediately after trial completion');
        navigate(`/dashboard?welcome=true&plan=trial&subdomain=${subdomain}&onboarding=complete`, { replace: true });
      } else if (checkoutUrl && redirectToPayment) {
        // Paid plan with immediate payment requirement
        toast.success(
          `🎉 Welcome to ${organization?.name || formData.companyName}! Redirecting to payment setup...`,
          {
            duration: 2000,
            icon: '💳'
          }
        );
        
        // Redirect to Stripe checkout - Reduced delay
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 800);
      } else {
        // Paid plan with trial - go to dashboard with trial message
        toast.success(
          `🎉 Welcome to ${organization?.name || formData.companyName}! Your 14-day free trial has started.`,
          {
            duration: 3000,
            icon: '🎉'
          }
        );
        
        // Redirect to dashboard with trial info - NO DELAY
        console.log('🚀 Onboarding: Redirecting to dashboard immediately after paid plan completion');
        navigate(`/dashboard?welcome=true&trial=true&plan=${formData.selectedPlan}&subdomain=${subdomain}&onboarding=complete`, { replace: true });
      }
      
    } catch (error: any) {
      console.error('❌ Onboarding completion failed:', error);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        // Organization already exists
        toast.error(
          error.response.data.message || 'This email is already associated with an organization.',
          {
            duration: 6000,
            icon: '⚠️'
          }
        );
        
        // Optionally show existing organization info
        if (error.response.data.data?.existingOrganization) {
          const existing = error.response.data.data.existingOrganization;
          toast(
            `Existing organization: ${existing.name} (${existing.subdomain})`,
            {
              duration: 4000,
              icon: 'ℹ️'
            }
          );
        }
      } else {
        toast.error(
          error.response?.data?.message || 'Failed to complete onboarding. Please try again.',
          {
            duration: 5000,
            icon: '❌'
          }
        );
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle authentication initiation
  const handleStartAuthentication = () => {
    setIsLoading(true)
    try {
      // Use Kinde's login method
      login();
    } catch (error) {
      console.error('Authentication error:', error)
      toast.error('Failed to start authentication')
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Choose Your Authentication Method</h2>
              <p className="text-gray-600">Sign in securely with your preferred account</p>
            </div>

            {!isAuthenticated ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <Shield className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-medium text-blue-900 mb-2 text-center">Secure Social Authentication</h3>
                  <p className="text-sm text-blue-700 mb-6 text-center">
                    Choose your preferred social login provider. Your credentials are never stored on our servers.
                  </p>
                  
                  <div className="grid gap-3">
                    {providers.map((provider) => (
                      <Button
                        key={provider.id}
                        onClick={handleStartAuthentication}
                        disabled={isLoading}
                        variant={provider.primary ? "default" : "outline"}
                        className="w-full flex items-center justify-center space-x-3 py-3"
                      >
                        <span className="text-lg">{provider.icon}</span>
                        <span>
                          {isLoading ? 'Redirecting...' : provider.description}
                        </span>
                      </Button>
                    ))}
                    
                    {/* Alternative login option */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Button
                        onClick={handleStartAuthentication}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full"
                      >
                        {isLoading ? 'Redirecting...' : 'Continue with Kinde'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-medium text-green-900 mb-2">Authentication Successful!</h3>
                  <p className="text-sm text-green-700 mb-4">
                    Welcome, {user?.givenName}! Your account ({user?.email}) is now authenticated.
                  </p>
                  <div className="text-left bg-white rounded-lg p-4 border">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium">{user?.givenName} {user?.familyName}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Authenticated via Kinde
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Company Information</h2>
              <p className="text-gray-600">Tell us about your organization</p>
              {isLoadingSavedData && (
                <div className="flex items-center justify-center mt-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Loading saved progress...
                </div>
              )}
              {!isLoadingSavedData && (formData.companyName || formData.subdomain || formData.industry) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4 mx-auto max-w-md">
                  <div className="flex items-center justify-center space-x-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Previous progress restored - feel free to modify</span>
                  </div>
                </div>
              )}
              
              {/* Debug info - remove after testing */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2 text-xs space-y-2">
                  <div>
                    <strong>Debug:</strong> Company: "{formData.companyName}", Subdomain: "{formData.subdomain}", Industry: "{formData.industry}", DataRestored: {dataWasRestored ? 'true' : 'false'}
                  </div>
                  <div>
                    User: {user?.email || 'None'}, Loading: {isLoadingSavedData ? 'true' : 'false'}
                  </div>
                  <button 
                    onClick={async () => {
                      if (user?.email) {
                        console.log('🧪 Manual test of getSavedOnboardingData...');
                        try {
                          const result = await getSavedOnboardingData(user.email);
                          console.log('🧪 Manual test result:', result);
                          alert('Check console for API test result');
                        } catch (error) {
                          console.error('🧪 Manual test error:', error);
                          alert('API test failed - check console');
                        }
                      }
                    }}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Test API
                  </button>
                  <button 
                    onClick={async () => {
                      if (user?.email) {
                        console.log('🧪 Manual test of updateOnboardingStep...');
                        try {
                          await updateOnboardingStep('step_2', { test: true }, user.email, {
                            companyName: 'Test Company',
                            subdomain: 'testcompany',
                            industry: 'Technology'
                          });
                          console.log('✅ Test data saved successfully');
                          alert('Test data saved - now try loading again');
                        } catch (error) {
                          console.error('🧪 Save test error:', error);
                          alert('Save test failed - check console');
                        }
                      }
                    }}
                    className="bg-green-500 text-white px-2 py-1 rounded text-xs ml-2"
                  >
                    Save Test Data
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Company Name *
                  {formData.companyName && !isLoadingSavedData && (
                    <span className="ml-2 text-xs text-green-600">(restored)</span>
                  )}
                </label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => handleFormDataChange('companyName', e.target.value)}
                  placeholder="Enter your company name"
                  className={`w-full ${formData.companyName && !isLoadingSavedData ? 'ring-1 ring-green-200 bg-green-50/30' : ''}`}
                  disabled={isLoadingSavedData}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subdomain *
                  {formData.subdomain && !isLoadingSavedData && (
                    <span className="ml-2 text-xs text-green-600">(restored)</span>
                  )}
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={formData.subdomain}
                    onChange={(e) => handleFormDataChange('subdomain', e.target.value)}
                    placeholder="yourcompany"
                    className={`flex-1 ${formData.subdomain && !isLoadingSavedData ? 'ring-1 ring-green-200 bg-green-50/30' : ''}`}
                    disabled={isLoadingSavedData}
                  />
                  <span className="text-gray-500">.yourapp.com</span>
                </div>
                {isSubdomainChecking && (
                  <p className="text-sm text-gray-500 mt-1">Checking availability...</p>
                )}
                {subdomainAvailable === true && (
                  <p className="text-sm text-green-600 mt-1 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Available
                  </p>
                )}
                {subdomainAvailable === false && (
                  <p className="text-sm text-red-600 mt-1">Not available</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Industry
                  {formData.industry && !isLoadingSavedData && (
                    <span className="ml-2 text-xs text-green-600">(restored)</span>
                  )}
                </label>
                <Input
                  value={formData.industry}
                  onChange={(e) => handleFormDataChange('industry', e.target.value)}
                  placeholder="e.g., Technology, Healthcare, Finance"
                  className={`w-full ${formData.industry && !isLoadingSavedData ? 'ring-1 ring-green-200 bg-green-50/30' : ''}`}
                  disabled={isLoadingSavedData}
                />
              </div>
            </div>

            {/* Show authenticated user info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-900">Administrator Account</h4>
                  <p className="text-sm text-gray-600">
                    {user?.givenName} ({user?.email}) will be the organization administrator
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Crown className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
              <p className="text-gray-600">Select a plan that works best for your team</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 mx-auto max-w-md">
                <div className="flex items-center justify-center space-x-2 text-blue-800">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Free tier available • No credit card required</span>
                </div>
              </div>
              {formData.selectedPlan && formData.selectedPlan !== 'professional' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2 mx-auto max-w-md">
                  <div className="flex items-center justify-center space-x-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {plans.find(p => p.id === formData.selectedPlan)?.name} plan restored - you can change it
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
              {plans.map((plan) => (
                <Card 
                  key={plan.id}
                  className={`relative cursor-pointer transition-all duration-200 ${
                    formData.selectedPlan === plan.id 
                      ? 'ring-2 ring-blue-600 shadow-lg transform scale-105' 
                      : 'hover:shadow-md hover:scale-102'
                                          } ${plan.id === 'trial' ? 'border-green-300 bg-green-50/20' : ''}`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600">
                      Most Popular
                    </Badge>
                  )}
                  {plan.id === 'trial' && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-600">
                      Trial
                    </Badge>
                  )}
                  {formData.selectedPlan === plan.id && (
                    <div className="absolute -top-2 -right-2">
                      <div className="bg-green-600 text-white rounded-full p-1">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="space-y-1">
                      {plan.id === 'trial' ? (
                        <div className="text-2xl font-bold text-amber-600">
                          TRIAL
                        </div>
                      ) : (
                        <>
                          <div className="text-lg text-green-600 font-semibold">
                            FREE for 14 days
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            ${plan.price}
                            <span className="text-lg text-gray-500 font-normal">/month</span>
                          </div>
                          <p className="text-xs text-gray-500">after trial period</p>
                        </>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className={`h-4 w-4 flex-shrink-0 ${
                          feature.includes('✨') ? 'text-blue-600' : 
                          feature.includes('🎯') ? 'text-green-600' : 
                          'text-green-600'
                        }`} />
                        <span className={`text-sm ${
                          feature.includes('✨') || feature.includes('🎯') ? 'font-medium' : ''
                        } ${feature.includes('🎯') ? 'text-green-700' : ''}`}>{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-600 mb-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm">
                  {formData.selectedPlan === 'trial' ? 
                    'Trial plan - no payment required' : 
                    'Secure payment powered by Stripe'
                  }
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {formData.selectedPlan === 'trial' ? 
                  'Start building immediately with our trial plan. Upgrade before trial expires to continue access.' :
                  'Your trial starts immediately. Payment information will be collected at the end of your trial period.'
                }
              </p>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Invite Your Team</h2>
              <p className="text-gray-600">Add team members to get started (optional)</p>
              {formData.teamEmails.some(email => email.trim() !== '') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4 mx-auto max-w-md">
                  <div className="flex items-center justify-center space-x-2 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {formData.teamEmails.filter(email => email.trim() !== '').length} team member(s) restored - modify as needed
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {formData.teamEmails.map((email, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">
                        Team Member {index + 1}
                        {email.trim() !== '' && (
                          <span className="ml-2 text-xs text-green-600">(restored)</span>
                        )}
                      </label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => handleTeamEmailChange(index, e.target.value)}
                        placeholder="colleague@company.com"
                        className={`w-full ${email.trim() !== '' ? 'ring-1 ring-green-200 bg-green-50/30' : ''}`}
                      />
                    </div>
                    {formData.teamEmails.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTeamEmail(index)}
                        className="mt-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={addTeamEmail}
                className="w-full border-dashed border-2 hover:border-blue-300 hover:bg-blue-50/50"
              >
                <Users className="h-4 w-4 mr-2" />
                Add Another Team Member
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Secure Team Invitations</h4>
                  <p className="text-sm text-blue-800">
                    Team members will receive email invitations with instructions to join your organization via social SSO.
                    They can use the same authentication methods you just used.
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    You can always invite more team members later from the dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="backdrop-blur-sm bg-white/90 border-0 shadow-xl">
                <CardContent className="p-8">
                  {renderStepContent()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </Button>

            <div className="flex items-center space-x-4">
              {/* Show modification indicator */}
              {dataWasRestored && userModifiedData && (
                <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <CheckCircle className="h-4 w-4" />
                  <span>Changes saved automatically</span>
                </div>
              )}

              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  className="flex items-center space-x-2"
                  disabled={isLoadingSavedData}
                >
                  <span>Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="space-y-4">
                  {/* Data Summary before completion */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md ml-auto">
                    <h4 className="font-medium text-gray-900 mb-2">Review Your Setup</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Company:</span>
                        <span className="font-medium">{formData.companyName || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subdomain:</span>
                        <span className="font-medium">{formData.subdomain || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plan:</span>
                        <span className="font-medium">
                          {plans.find(p => p.id === formData.selectedPlan)?.name || 'Professional'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Team Members:</span>
                        <span className="font-medium">
                          {formData.teamEmails.filter(email => email.trim() !== '').length || 0}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Use "Previous" to modify any information
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleComplete}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating Your Workspace...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Complete Setup & Start Trial</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 