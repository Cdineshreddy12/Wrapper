import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { motion, AnimatePresence } from 'framer-motion'
import { HeroSection, StackedCardsSection, DemoSection, TrustIndicators } from '@/components/landing'
import { ZopkitNavbar } from '@/components/ui/zopkit-navbar'
import { AuroraBackground } from '@/components/ui/aurora-background'
import EcosystemDemo from './EcosystemDemo'
import api from '@/lib/api'

const Landing: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useKindeAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  // Check authentication status quietly in background
  useEffect(() => {
    const checkAuthenticatedUser = async () => {
      if (isAuthenticated) {
        try {
          // Quietly check if user is already fully onboarded
          const response = await api.fetch('/admin/auth-status') as { data: any }
          const status = response.data

          if (status.hasUser && status.hasTenant) {
            // User is fully onboarded - redirect to dashboard silently
            console.log('✅ Authenticated user already onboarded, redirecting to dashboard')
            navigate('/dashboard', { replace: true })
          }
        } catch (error) {
          console.log('ℹ️ Could not check auth status, letting user choose path')
        }
      }
    }

    const timer = setTimeout(checkAuthenticatedUser, 100)
    return () => clearTimeout(timer)
  }, [isAuthenticated, navigate])

  const handleLogin = async () => {
    setIsLoading(true)
    try {
        await login()
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
      }
  }

  const handleAppSelect = (appId: number | null) => {
    // For now, just open demo modal. In production, this could navigate to specific app pages
    if (appId) {
      setShowDemo(true)
    }
  }

  // Business Suite Applications
  const businessApps = [
    {
      id: 1,
      name: 'CRM',
      description: 'Customer Relationship Management',
      icon: null,
      image: '/crm-dashboard.svg',
      color: 'from-blue-500 to-cyan-500',
      features: ['Leads Management', 'Contact Database', 'Opportunities Tracking', 'AI Agent Assistant', 'Product Orders', 'Invoice Management', 'Sales Orders', 'Advanced Reports']
    },
    {
      id: 2,
      name: 'HRMS',
      description: 'Human Resource Management System',
      icon: null,
      image: '/hrms.svg',
      color: 'from-green-500 to-emerald-500',
      features: ['Employee Management', 'Payroll Processing', 'Performance Tracking', 'Recruitment']
    },
    {
      id: 3,
      name: 'Project Management',
      description: 'Advanced Project Tracking',
      icon: null,
      image: '/project-management.svg',
      color: 'from-purple-500 to-pink-500',
      features: ['Kanban Boards', 'Gantt Charts', 'Time Tracking', 'Resource Management']
    },
    {
      id: 4,
      name: 'Operations Management',
      description: 'Streamline Operations',
      icon: null,
      image: '/operations-management.svg',
      color: 'from-orange-500 to-red-500',
      features: ['Process Automation', 'Workflow Designer', 'Task Management', 'Performance Metrics']
    },
    {
      id: 5,
      name: 'Finance Management',
      description: 'Financial Operations Suite',
      icon: null,
      image: '/finance-management.svg',
      color: 'from-indigo-500 to-purple-500',
      features: ['Accounting', 'Budgeting', 'Financial Reporting', 'Expense Tracking']
    },
    {
      id: 6,
      name: 'Zopkit Academy',
      description: 'Learning & Development',
      icon: null,
      image: '/zopkit-academy.svg',
      color: 'from-teal-500 to-green-500',
      features: ['Course Management', 'Employee Training', 'Certifications', 'Learning Analytics']
    }
  ]

  return (
    <div className="relative">
      <AuroraBackground className="min-h-screen">
          {/* Navigation */}
          <ZopkitNavbar
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            onLogin={handleLogin}
            onShowDemo={() => setShowDemo(true)}
          />

        {/* Main Content */}
        <main className="pt-20 w-full">
          <HeroSection
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            onLogin={handleLogin}
          />
      
          <StackedCardsSection
            businessApps={businessApps}
            setActiveApp={handleAppSelect}
          />
           <EcosystemDemo/>
          {/* <CostSavingsSection /> */}
      
          <DemoSection
            showDemo={showDemo}
            setShowDemo={setShowDemo}
          />
          <TrustIndicators />
        </main>
      </AuroraBackground>

      {/* Demo Modal - Outside Aurora Background */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">📅</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Schedule a Demo</h3>
                      <p className="text-sm text-gray-600">See Zopkit in action with a personalized demo</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowDemo(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className="text-gray-500">✕</span>
                  </motion.button>
                </div>
              </div>

              <div className="p-6">
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="John Smith"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Acme Corporation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="CEO, CTO, Manager..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Size
                      </label>
                      <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white">
                        <option value="">Select company size</option>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-1000">201-1000 employees</option>
                        <option value="1000+">1000+ employees</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Demo Time
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white">
                      <option value="">Select preferred time</option>
                      <option value="morning">Morning (9 AM - 12 PM)</option>
                      <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                      <option value="evening">Evening (5 PM - 8 PM)</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Comments
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                      placeholder="Tell us about your specific needs or questions..."
                    />
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowDemo(false)}
                      className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Schedule Demo
                    </button>
                </div>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    By submitting this form, you agree to receive communication about Zopkit's services.
                    We respect your privacy and will never share your information.
                  </p>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Landing 