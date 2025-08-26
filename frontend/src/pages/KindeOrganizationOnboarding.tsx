import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { 
  Building2, 
  Crown, 
  CreditCard, 
  Users, 
  CheckCircle, 
  ArrowRight,
  Globe,
  Zap,
  Shield,
  Star,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
  maxUsers: number;
  maxProjects: number;
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
    description: 'Full-featured solution for large organizations',
    maxUsers: 100,
    maxProjects: 200,
    features: [
      '100 team members',
      '200 projects',
      'Advanced security',
      'Dedicated support',
      'Unlimited storage',
      'Custom integrations',
      'Advanced analytics',
      'SLA guarantees'
    ]
  }
];

export default function KindeOrganizationOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, login, isLoading } = useKindeAuth();
  
  const [formData, setFormData] = useState({
    companyName: '',
    subdomain: '',
    industry: '',
    selectedPlan: 'trial'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user came from Kinde organization creation
  const action = searchParams.get('action');
  const isFromKindeOrgCreation = action === 'create_organization';

  useEffect(() => {
    if (!isAuthenticated) {
      // If not authenticated, redirect to login with organization creation
      console.log('🔐 User not authenticated, redirecting to Kinde organization creation...');
      return;
    }

    if (isFromKindeOrgCreation && user) {
      console.log('🏢 User authenticated from Kinde organization creation:', user);
      // Pre-fill company name if available from Kinde
      if (user.organization && user.organization.name) {
        setFormData(prev => ({
          ...prev,
          companyName: user.organization.name
        }));
      }
    }
  }, [isAuthenticated, user, isFromKindeOrgCreation]);

  const handleStartOrgCreation = () => {
    console.log('🚀 Starting Kinde organization creation flow...');
    
    // Use Kinde's built-in organization creation
    login({
      isCreateOrg: true,
      app_state: {
        redirectTo: '/onboarding/kinde-org',
        action: 'create_organization'
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user) {
      toast.error('Please authenticate first');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedPlan = plans.find(p => p.id === formData.selectedPlan) || plans[0];
      
      const requestData = {
        companyName: formData.companyName,
        subdomain: formData.subdomain,
        industry: formData.industry,
        adminEmail: user.email,
        adminName: user.givenName || user.email,
        selectedPlan: selectedPlan.id,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        maxUsers: selectedPlan.maxUsers,
        maxProjects: selectedPlan.maxProjects,
        teamEmails: []
      };

      console.log('📤 Syncing organization data:', requestData);

      // Create organization and onboard user
      const response = await api.post('/onboarding/create-organization', requestData);

      if (response.data.success) {
        toast.success('Organization setup completed successfully!');
        navigate('/dashboard');
      } else {
        toast.error(response.data.message || 'Failed to complete organization setup');
      }
    } catch (error: any) {
      console.error('Error completing organization setup:', error);
      toast.error(error.response?.data?.message || 'Failed to complete organization setup');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Create Your Organization</CardTitle>
            <p className="text-gray-600">
              Let's set up your workspace using Kinde's secure organization management.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Secure Organization Creation</p>
                  <p>We use Kinde's built-in organization management for enhanced security and compliance.</p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleStartOrgCreation}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Building2 className="h-5 w-5 mr-2" />
              Create Organization with Kinde
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedPlan = plans.find(p => p.id === formData.selectedPlan) || plans[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Organization Setup
          </h1>
          <p className="text-gray-600">
            Welcome back, {user.givenName}! Let's complete your organization configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Organization Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Organization Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Acme Inc."
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        required
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
                        required
                        className="flex-1"
                      />
                      <span className="text-gray-500 text-sm">.wrapper.app</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="selectedPlan">Plan Selection</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {plans.map((plan) => (
                        <div
                          key={plan.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            formData.selectedPlan === plan.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, selectedPlan: plan.id }))}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{plan.name}</div>
                              <div className="text-sm text-gray-600">${plan.price}/month</div>
                            </div>
                            {plan.popular && (
                              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                Popular
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || !formData.companyName || !formData.subdomain}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Completing Setup...
                      </>
                    ) : (
                      <>
                        Complete Organization Setup
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Plan Details */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2" />
                  {selectedPlan.name} Plan
                </CardTitle>
                <div className="text-3xl font-bold text-gray-900">
                  ${selectedPlan.price}
                  <span className="text-lg font-normal text-gray-600">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{selectedPlan.maxUsers} team members</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{selectedPlan.maxProjects} projects</span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Features:</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {selectedPlan.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
