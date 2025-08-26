import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, CheckCircle, Crown, Users, Mail, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'

// Define plan options
const plans = [
  {
    id: 'trial',
    name: 'Free Trial',
    price: 0,
    maxUsers: 5,
    maxProjects: 10,
    description: 'Time-limited trial access'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29,
    maxUsers: 25,
    maxProjects: 25,
    description: '14-day free trial, then $29/month'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    maxUsers: 100,
    maxProjects: 100,
    description: '14-day free trial, then $99/month'
  }
]

export function SimpleOnboarding() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useKindeAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    subdomain: '',
    industry: '',
    selectedPlan: 'trial',
    teamEmails: ['']
  })

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    navigate('/')
    return null
  }

  const handleCreateOrganization = async () => {
    if (!formData.companyName.trim()) {
      toast.error('Please enter your company name')
      return
    }
    if (!formData.subdomain.trim()) {
      toast.error('Please enter a subdomain')
      return
    }

    setIsLoading(true)
    try {
      const selectedPlan = plans.find(p => p.id === formData.selectedPlan) || plans[1]
      
      const requestData = {
        companyName: formData.companyName,
        subdomain: formData.subdomain,
        industry: formData.industry,
        adminEmail: user.email,
        adminName: `${user.givenName} ${user.familyName}`.trim() || user.email,
        selectedPlan: formData.selectedPlan,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        maxUsers: selectedPlan.maxUsers,
        maxProjects: selectedPlan.maxProjects,
        teamEmails: formData.teamEmails.filter(email => email.trim() !== '')
      }

      // Create organization and onboard user
      const response = await api.post('/onboarding/create-organization', requestData)

      if (response.data.success) {
        toast.success('Organization created successfully!')
        navigate('/dashboard')
      } else {
        toast.error(response.data.message || 'Failed to create organization')
      }
    } catch (error: any) {
      console.error('Error creating organization:', error)
      toast.error(error.response?.data?.message || 'Failed to create organization')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTeamEmailChange = (index: number, email: string) => {
    const newEmails = [...formData.teamEmails]
    newEmails[index] = email
    setFormData(prev => ({ ...prev, teamEmails: newEmails }))
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

  const selectedPlan = plans.find(p => p.id === formData.selectedPlan) || plans[1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Create Your Organization</CardTitle>
          <p className="text-gray-600">
            Hi {user.givenName}! Let's set up your workspace.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Acme Inc."
                value={formData.companyName}
                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                type="text"
                placeholder="e.g., Technology, Healthcare, Finance"
                value={formData.industry}
                onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="subdomain">Subdomain *</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="subdomain"
                type="text"
                placeholder="acme"
                value={formData.subdomain}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                }))}
                className="flex-1"
              />
              <span className="text-gray-500 text-sm">.wrapper.app</span>
            </div>
          </div>

          <div>
            <Label htmlFor="plan">Select Plan</Label>
            <Select
              value={formData.selectedPlan}
              onValueChange={(value) => setFormData(prev => ({ ...prev, selectedPlan: value }))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-sm text-gray-500">{plan.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Team Members (Optional)
            </Label>
            <div className="space-y-2">
              {formData.teamEmails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={email}
                    onChange={(e) => handleTeamEmailChange(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.teamEmails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeTeamEmail(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTeamEmail}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Team members will receive invitations after your organization is created
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Crown className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">Selected Plan: {selectedPlan.name}</p>
                <ul className="space-y-1">
                  <li className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Up to {selectedPlan.maxUsers} users</span>
                  </li>
                  <li className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Up to {selectedPlan.maxProjects} projects</span>
                  </li>
                  <li className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Administrator privileges</span>
                  </li>
                  {selectedPlan.price > 0 && (
                    <li className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>14-day free trial</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handleCreateOrganization}
            className="w-full"
            size="lg"
            disabled={isLoading || !formData.companyName.trim() || !formData.subdomain.trim()}
          >
            {isLoading ? 'Creating Organization...' : 'Create Organization'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 