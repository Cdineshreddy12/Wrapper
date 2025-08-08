import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, ArrowRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

export function OrganizationSetup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [formData, setFormData] = useState({
    companyName: '',
    subdomain: '',
    email: searchParams.get('email') || '',
    name: searchParams.get('name') || '',
    kindeUserId: searchParams.get('kinde_user_id') || ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  // Auto-generate subdomain from company name
  useEffect(() => {
    if (formData.companyName && !formData.subdomain) {
      const generatedSubdomain = formData.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20)
      
      setFormData(prev => ({ ...prev, subdomain: generatedSubdomain }))
    }
  }, [formData.companyName])

  // Check subdomain availability
  useEffect(() => {
    if (formData.subdomain.length >= 3) {
      checkSubdomainAvailability()
    } else {
      setSubdomainAvailable(null)
    }
  }, [formData.subdomain])

  const checkSubdomainAvailability = async () => {
    if (checkingSubdomain) return
    
    setCheckingSubdomain(true)
    try {
      const response = await api.post('/onboarding/check-subdomain', {
        subdomain: formData.subdomain
      })
      setSubdomainAvailable(response.data.available)
    } catch (error) {
      console.error('Error checking subdomain:', error)
      setSubdomainAvailable(false)
    } finally {
      setCheckingSubdomain(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.companyName.trim()) {
      toast.error('Company name is required')
      return
    }

    if (!formData.subdomain.trim()) {
      toast.error('Subdomain is required')
      return
    }

    if (subdomainAvailable === false) {
      toast.error('Please choose an available subdomain')
      return
    }

    if (!formData.kindeUserId) {
      toast.error('Authentication error. Please try logging in again.')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post('/auth/setup-organization', {
        companyName: formData.companyName,
        subdomain: formData.subdomain,
        kindeUserId: formData.kindeUserId,
        email: formData.email,
        name: formData.name
      })

      toast.success('Organization created successfully!')
      
      // Redirect to the new organization's dashboard
      window.location.href = response.data.dashboardUrl

    } catch (error: any) {
      console.error('Organization setup failed:', error)
      toast.error(error.response?.data?.message || 'Failed to create organization')
      setIsLoading(false)
    }
  }

  const getSubdomainStatus = () => {
    if (!formData.subdomain) return null
    if (formData.subdomain.length < 3) return { color: 'text-gray-500', message: 'At least 3 characters required' }
    if (checkingSubdomain) return { color: 'text-blue-600', message: 'Checking availability...' }
    if (subdomainAvailable === true) return { color: 'text-green-600', message: 'Available!' }
    if (subdomainAvailable === false) return { color: 'text-red-600', message: 'Not available' }
    return null
  }

  const subdomainStatus = getSubdomainStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 shadow-2xl bg-white/90 backdrop-blur-sm border-white/50">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl mb-2">Create Your Organization</CardTitle>
            <CardDescription className="text-gray-600">
              Set up your workspace in just a few steps
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName" className="text-sm font-medium">
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Acme Corporation"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="subdomain" className="text-sm font-medium">
                  Your Workspace URL *
                </Label>
                <div className="mt-1 flex">
                  <Input
                    id="subdomain"
                    type="text"
                    placeholder="acme"
                    value={formData.subdomain}
                    onChange={(e) => handleInputChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    className="rounded-r-none"
                  />
                  <div className="bg-gray-50 border border-l-0 border-gray-300 rounded-r-md px-3 py-2 text-sm text-gray-500 flex items-center">
                    .zopkit.com
                  </div>
                </div>
                {subdomainStatus && (
                  <p className={`text-sm mt-1 ${subdomainStatus.color}`}>
                    {subdomainStatus.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="mt-1"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be the primary admin account
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 mb-1">What you'll get:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Complete business suite access</li>
                    <li>• Admin privileges for your organization</li>
                    <li>• 14-day free trial of all features</li>
                    <li>• Custom subdomain and branding</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg" 
              disabled={isLoading || subdomainAvailable === false || !formData.companyName.trim()}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Creating Organization...
                </>
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By creating an organization, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default OrganizationSetup