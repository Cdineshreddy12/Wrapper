import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { motion, AnimatePresence } from 'framer-motion'
import { StackedCardsSection, DemoSection, TrustIndicators } from '@/components/landing'
import EcosystemDemo from './EcosystemDemo'
import { VisualHub } from '@/components/landing/VisualHub'
import { DynamicIcon } from '@/components/landing/Icons'
import { ArrowRight, Play, ChevronRight, FileText, GraduationCap, Users, Zap, Mail, Phone, MapPin } from 'lucide-react'
import api from '@/lib/api'
import { Product } from '@/types'
import toast from 'react-hot-toast'

import { WorkflowVisualizer } from '@/components/landing/WorkflowVisualizer'
import { products } from '@/data/content'
import { getAllIndustries } from '@/data/industryPages'

// Import the new resizable navbar components
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar"
import { LandingFooter } from "@/components/layout/LandingFooter"


// Removed local products definition



const Landing: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useKindeAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  const [activeProduct, setActiveProduct] = useState<Product>(products[0])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showProductsDropdown, setShowProductsDropdown] = useState(false)
  const [showIndustriesDropdown, setShowIndustriesDropdown] = useState(false)
  const productsDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const industriesDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    jobTitle: '',
    companySize: '',
    preferredTime: '',
    comments: ''
  })
  const [isSubmittingContact, setIsSubmittingContact] = useState(false)

  // Refs for auto-scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const productRefs = useRef<Map<string | number, HTMLButtonElement>>(new Map())

  // Scroll to top when landing page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Check authentication status quietly in background
  useEffect(() => {
    const checkAuthenticatedUser = async () => {
      if (isAuthenticated) {
        try {
          // Quietly check if user is already fully onboarded
          const response = await api.get('/api/admin/auth-status')
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

  // Auto-rotate products every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveProduct((prev) => {
        const currentIndex = products.findIndex((p) => p.id === prev.id);
        const nextIndex = (currentIndex + 1) % products.length;
        return products[nextIndex];
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to active product
  useEffect(() => {
    const activeButton = productRefs.current.get(activeProduct.id);
    const scrollContainer = scrollContainerRef.current;

    if (activeButton && scrollContainer) {
      // Calculate the position to scroll to center the active button
      const containerWidth = scrollContainer.offsetWidth;
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;

      // Center the button in the container
      const scrollPosition = buttonLeft - (containerWidth / 2) + (buttonWidth / 2);

      scrollContainer.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [activeProduct]);

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      // Get Google connection ID from environment variable for custom auth
      const googleConnectionId = import.meta.env.VITE_KINDE_GOOGLE_CONNECTION_ID
      
      if (!googleConnectionId) {
        console.error('❌ VITE_KINDE_GOOGLE_CONNECTION_ID is not configured')
        // Fallback to standard login if connection ID not configured
        await login()
      } else {
        // Use Kinde custom auth with connection ID
        console.log('🔄 Using custom auth with Google connection ID')
        await login({ connectionId: googleConnectionId })
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const allProducts = [
    { id: 'operations-management', name: 'Operations Management' },
    { id: 'b2b-crm', name: 'B2B CRM' },
    { id: 'financial-accounting', name: 'Financial Accounting' },
    { id: 'project-management', name: 'Project Management' },
    { id: 'hrms', name: 'HRMS' },
    { id: 'esop-system', name: 'ESOP System' },
    { id: 'affiliate-connect', name: 'Affiliate Connect' },
    { id: 'flowtilla', name: 'Flowtilla' },
    { id: 'zopkit-academy', name: 'Zopkit Academy' },
    { id: 'zopkit-itsm', name: 'Zopkit ITSM' },
    { id: 'b2c-crm', name: 'B2C CRM' },
  ];

  const handleProductsMouseEnter = () => {
    if (productsDropdownTimeoutRef.current) {
      clearTimeout(productsDropdownTimeoutRef.current);
    }
    setShowProductsDropdown(true);
  };

  const handleProductsMouseLeave = () => {
    productsDropdownTimeoutRef.current = setTimeout(() => {
      setShowProductsDropdown(false);
    }, 300);
  };

  const allIndustries = [
    { slug: 'e-commerce', name: 'E-Commerce & Retail' },
    { slug: 'saas', name: 'SaaS & Technology' },
    { slug: 'manufacturing', name: 'Manufacturing' },
    { slug: 'professional-services', name: 'Professional Services' },
  ];

  const handleIndustriesMouseEnter = () => {
    if (industriesDropdownTimeoutRef.current) {
      clearTimeout(industriesDropdownTimeoutRef.current);
    }
    setShowIndustriesDropdown(true);
  };

  const handleIndustriesMouseLeave = () => {
    industriesDropdownTimeoutRef.current = setTimeout(() => {
      setShowIndustriesDropdown(false);
    }, 300);
  };

  // Handle nav links: path links use React Router; hash links scroll in-page
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/')) {
      e.preventDefault();
      navigate(href);
      return;
    }
    e.preventDefault();
    const targetId = href.replace('#', '');
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      const navbarOffset = 100;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navbarOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const navItems = [
    { name: "Pricing", link: "/pricing" },
    { name: "Workflows", link: "#workflows" },
    { name: "Contact Us", link: "#pricing" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans overflow-x-hidden relative">

      {/* Ambient Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-100" />

        {/* Dynamic Spotlight - Shifted Left to match content */}
        <motion.div
          animate={{
            background: `radial-gradient(circle at 60% 40%, ${activeProduct.color === 'blue' ? '#3b82f6' :
              activeProduct.color === 'green' ? '#10b981' :
                activeProduct.color === 'purple' ? '#a855f7' :
                  activeProduct.color === 'orange' ? '#f97316' :
                    activeProduct.color === 'indigo' ? '#6366f1' : '#14b8a6'
              }15 0%, transparent 60%)`
          }}
          className="absolute top-[-20%] right-[-10%] w-[100vw] h-[100vh] blur-[120px] transition-colors duration-1000 ease-in-out"
        />
      </div>

      {/* Resizable Navbar */}
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <div className="flex-1 flex flex-row items-center justify-center space-x-1 text-sm font-medium text-slate-700 transition duration-200 px-4 min-w-0">
            {/* Products Dropdown */}
            <div
              className="relative shrink-0"
              onMouseEnter={handleProductsMouseEnter}
              onMouseLeave={handleProductsMouseLeave}
            >
              <button
                className="px-3 py-2 text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 whitespace-nowrap"
              >
                Products
                <ChevronRight size={16} className={`transition-transform ${showProductsDropdown ? 'rotate-90' : ''}`} />
              </button>
              {showProductsDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  {allProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {product.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Industries Dropdown */}
            <div
              className="relative shrink-0"
              onMouseEnter={handleIndustriesMouseEnter}
              onMouseLeave={handleIndustriesMouseLeave}
            >
              <button
                className="px-3 py-2 text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 whitespace-nowrap"
              >
                Industries
                <ChevronRight size={16} className={`transition-transform ${showIndustriesDropdown ? 'rotate-90' : ''}`} />
              </button>
              {showIndustriesDropdown && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                  {allIndustries.map((industry) => (
                    <button
                      key={industry.slug}
                      onClick={() => navigate(`/industries/${industry.slug}`)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {industry.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.link}
                onClick={(e) => handleAnchorClick(e, item.link)}
                className="px-3 py-2 text-slate-700 hover:text-slate-900 font-medium transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {item.name}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <NavbarButton
              variant="outline"
              onClick={handleLogin}
              disabled={isLoading}
              as="button"
              className="rounded-xl px-6 py-2.5"
            >
              {isLoading ? 'Loading...' : 'Sign In'}
            </NavbarButton>
            <NavbarButton
              variant="gradient"
              onClick={() => setShowDemo(true)}
              as="button"
              className="rounded-xl px-6 py-2.5"
            >
              Start Free Trial
            </NavbarButton>
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={true}
            onClose={() => {}}
          >
            <div className="mb-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-4">Products</div>
              {allProducts.map((product) => (
                <a
                  key={product.id}
                  href={`/products/${product.id}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition"
                >
                  {product.name}
                </a>
              ))}
            </div>
            <div className="mb-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-4">Industries</div>
              {allIndustries.map((industry) => (
                <a
                  key={industry.slug}
                  href={`/industries/${industry.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition"
                >
                  {industry.name}
                </a>
              ))}
            </div>
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  handleAnchorClick(e, item.link);
                }}
                className="relative text-neutral-600 dark:text-neutral-300 cursor-pointer"
              >
                <span className="block">{item.name}</span>
              </a>
            ))}
            <div className="flex w-full flex-col gap-3">
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogin();
                }}
                variant="outline"
                className="w-full rounded-xl"
                as="button"
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Sign In'}
              </NavbarButton>
              <NavbarButton
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowDemo(true);
                }}
                variant="gradient"
                className="w-full rounded-xl"
                as="button"
              >
                Start Free Trial
              </NavbarButton>
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* Main Content */}
      <main className="relative pt-24 lg:pt-36 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 overflow-visible">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-0 items-center">

          {/* Left Column: Content (Compressed to 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-8 lg:pr-6 relative z-20">

            <div className="space-y-6 relative">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 w-fit shadow-sm"
              >
                <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${activeProduct.gradient} animate-pulse`}></span>
                <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Complete Business Operations Suite</span>
              </motion.div>

              <div className="relative h-[160px] lg:h-[200px] w-full z-20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeProduct.id}
                    initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute top-0 left-0 w-full"
                  >
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-5 text-slate-900">
                      <span className={`bg-clip-text text-transparent bg-gradient-to-r ${activeProduct.gradient}`}>
                        {activeProduct.name}
                      </span>
                    </h1>
                    <p className="text-lg text-slate-500 leading-relaxed max-w-md font-normal border-l-2 border-slate-200 pl-4">
                      {activeProduct.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center mt-24 gap-4 z-20">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogin}
                disabled={isLoading}
                className={`
                    w-full sm:w-auto relative px-8 py-4 rounded-xl font-bold text-white transition-all duration-300
                    bg-gradient-to-r ${activeProduct.gradient} shadow-lg shadow-blue-500/20
                    overflow-hidden group
                  `}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? 'Loading...' : 'Start Free Trial →'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all group shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 group-hover:text-slate-900 transition-colors">
                  <Play className="w-3 h-3 fill-current ml-0.5 text-slate-700" />
                </div>
                <span>Watch 2-Min Demo</span>
              </motion.button>
            </div>

            {/* Product "Launchpad" Selector */}
            <div className="mt-6 pt-8 border-t border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Application</p>
                <span className="text-xs text-slate-400">0{activeProduct.id} / {products.length}</span>
              </div>

              <style>{`
                .gradient-scrollbar::-webkit-scrollbar {
                  height: 6px;
                }
                .gradient-scrollbar::-webkit-scrollbar-track {
                  background: rgba(241, 245, 249, 0.5);
                  border-radius: 4px;
                }
                .gradient-scrollbar::-webkit-scrollbar-thumb {
                  background: linear-gradient(to right, #8bade2ff, #bba0f8ff, #e9a1c5ff);
                  border-radius: 4px;
                }
                .gradient-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: linear-gradient(to right, #9fbdffff, #bc98faff, rgba(236, 160, 194, 1));
                }
              `}</style>

              <div ref={scrollContainerRef} className="flex flex-row gap-3 overflow-x-auto gradient-scrollbar pb-4">
                {products.map((product) => (
                  <button
                    key={product.id}
                    ref={(el) => {
                      if (el) productRefs.current.set(product.id, el);
                    }}
                    onClick={() => setActiveProduct(product)}
                    onDoubleClick={() => navigate(`/products/${product.id}`)}
                    className={`
                        relative group flex flex-col items-start justify-between p-3 rounded-xl border transition-all duration-300 h-28 w-32 min-w-[128px] overflow-hidden text-left shrink-0
                        ${activeProduct.id === product.id
                        ? 'bg-white border-slate-300 ring-2 ring-slate-200 shadow-lg'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'}
                      `}
                    title="Double-click to view details"
                  >
                    {/* Hover Glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                    <div className="flex justify-between w-full items-start">
                      <div className={`
                           p-1.5 rounded-lg transition-colors duration-300
                           ${activeProduct.id === product.id ? `bg-gradient-to-br ${product.gradient} text-white` : 'bg-slate-100 text-slate-500 group-hover:text-slate-700 group-hover:bg-slate-200'}
                         `}>
                        <DynamicIcon name={product.iconName} className="w-4 h-4" />
                      </div>

                      {activeProduct.id === product.id && (
                        <motion.div layoutId="active-indicator" className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                      )}
                    </div>

                    <div className="flex flex-col gap-1 mt-auto w-full">
                      <span className={`text-[11px] font-semibold tracking-wide ${activeProduct.id === product.id ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900'}`}>
                        {product.name}
                      </span>
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Double-click for details →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Visual Hub (Expanded to 7 cols and shifted left) */}
          <div className="lg:col-span-7 relative z-10 flex justify-center lg:justify-start items-center h-full min-h-[500px]">
            {/* The w-[90%] constrains the width, and lg:-ml-6 pulls the center point to the left */}
            <div className="w-full lg:w-[100%] flex justify-center lg:-ml-6">
              <VisualHub product={activeProduct} />
            </div>
          </div>
        </div>
      </main>

      {/* Solutions by product — vertical scrolling cards */}
      <section id="solutions">
        <StackedCardsSection
          businessApps={products.map(p => ({
            ...p,
            icon: (props: any) => <DynamicIcon name={p.iconName} {...props} />
          }))}
          activeProduct={activeProduct}
          onProductChange={setActiveProduct}
        />
      </section>
      <section id="workflows" className="py-10 bg-white">
        <WorkflowVisualizer />
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Solutions by Industry
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Every industry has unique challenges. Discover how our platform is tailored to your specific needs.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {getAllIndustries().map((industry) => {
              // Map industry slugs to icon names and gradients
              const industryConfig: Record<string, { icon: string; gradient: string }> = {
                'e-commerce': { icon: 'ShoppingCart', gradient: 'from-orange-500 to-amber-600' },
                'saas': { icon: 'Briefcase', gradient: 'from-blue-500 to-indigo-600' },
                'manufacturing': { icon: 'Box', gradient: 'from-slate-600 to-slate-800' },
                'professional-services': { icon: 'Users', gradient: 'from-purple-500 to-pink-600' }
              };
              
              const config = industryConfig[industry.slug] || { icon: 'Building2', gradient: 'from-slate-500 to-slate-700' };
              const topStats = industry.hero.stats.slice(0, 2);
              
              return (
                <motion.div
                  key={industry.slug}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all overflow-hidden group cursor-pointer"
                  onClick={() => navigate(`/industries/${industry.slug}`)}
                >
                  <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />
                  <div className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-4 text-white`}>
                      <DynamicIcon name={config.icon} className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {industry.name}
                    </h3>
                    <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                      {industry.hero.subheadline}
                    </p>
                    <div className="space-y-2 mb-4">
                      {topStats.map((stat, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {stat.label}: {stat.value}
                        </div>
                      ))}
                    </div>
                    <button className="w-full mt-4 px-4 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 group-hover:bg-blue-50 group-hover:text-blue-600">
                      Explore Solution
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <EcosystemDemo />
      <DemoSection
        showDemo={showDemo}
        setShowDemo={setShowDemo}
      />
      <TrustIndicators />

      {/* Contact Us Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Email</h4>
                      <a href="mailto:sales@zopkit.com" className="text-slate-600 hover:text-blue-600 transition-colors">
                        sales@zopkit.com
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Phone</h4>
                      <p className="text-slate-600">8971055515</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">Address</h4>
                      <p className="text-slate-600">
                        Hi-Tech City, Hyderabad
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-8 border-t border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-4">Business Hours</h4>
                <div className="space-y-2 text-slate-600">
                  <p>Monday - Friday: 9:00 AM - 6:00 PM PST</p>
                  <p>Saturday - Sunday: Closed</p>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="bg-slate-50 p-6 md:p-8 rounded-2xl border border-slate-200 overflow-hidden">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Send us a Message</h3>
              <form 
                className="max-w-full"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setIsSubmittingContact(true)
                  
                  try {
                    const response = await api.post('/contact/submit', contactForm)
                    
                    if (response.data.success) {
                      toast.success('Thank you for contacting us! We will get back to you soon.')
                      // Reset form
                      setContactForm({
                        name: '',
                        email: '',
                        company: '',
                        phone: '',
                        jobTitle: '',
                        companySize: '',
                        preferredTime: '',
                        comments: ''
                      })
                    } else {
                      throw new Error(response.data.message || 'Failed to submit contact form')
                    }
                  } catch (error: any) {
                    console.error('Contact form submission error:', error)
                    toast.error(error.response?.data?.message || 'Failed to submit contact form. Please try again.')
                  } finally {
                    setIsSubmittingContact(false)
                  }
                }}
              >
                {/* Top Section: Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm md:text-base"
                      placeholder="John Smith"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm md:text-base"
                      placeholder="john@company.com"
                    />
                  </div>
                </div>
                
                {/* Bottom Section: Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      required
                      value={contactForm.company}
                      onChange={(e) => setContactForm(prev => ({ ...prev, company: e.target.value }))}
                      className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm md:text-base"
                      placeholder="Acme Corporation"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm md:text-base"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                
                {/* Second Row: Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-slate-700 mb-2">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      name="jobTitle"
                      required
                      value={contactForm.jobTitle}
                      onChange={(e) => setContactForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                      className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm md:text-base"
                      placeholder="CEO, CTO, Manager..."
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="companySize" className="block text-sm font-medium text-slate-700 mb-2">
                      Company Size
                    </label>
                    <select
                      id="companySize"
                      name="companySize"
                      value={contactForm.companySize}
                      onChange={(e) => setContactForm(prev => ({ ...prev, companySize: e.target.value }))}
                      className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm md:text-base"
                    >
                      <option value="">Select company size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501-1000">501-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>
                </div>
                
                {/* Preferred Demo Time: Full Width */}
                <div className="mb-5">
                  <label htmlFor="preferredTime" className="block text-sm font-medium text-slate-700 mb-2">
                    Preferred Demo Time
                  </label>
                  <select
                    id="preferredTime"
                    name="preferredTime"
                    className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white text-sm md:text-base"
                  >
                    <option value="">Select preferred time</option>
                    <option value="morning">Morning (9 AM - 12 PM)</option>
                    <option value="afternoon">Afternoon (12 PM - 5 PM)</option>
                    <option value="evening">Evening (5 PM - 8 PM)</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
                
                {/* Additional Comments: Full Width */}
                <div className="mb-5">
                  <label htmlFor="comments" className="block text-sm font-medium text-slate-700 mb-2">
                    Additional Comments
                  </label>
                  <textarea
                    id="comments"
                    name="comments"
                    rows={5}
                    value={contactForm.comments}
                    onChange={(e) => setContactForm(prev => ({ ...prev, comments: e.target.value }))}
                    className="w-full px-4 py-2.5 md:py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none bg-white text-sm md:text-base"
                    placeholder="Tell us about your specific needs or questions..."
                  />
                </div>
                
                {/* Send Message Button at Bottom */}
                <div className="flex justify-center">
                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="w-full md:w-auto px-8 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-sm md:text-base shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingContact ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Resources Section */}
      <section id="resources" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Resources & Support
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Everything you need to get started and succeed with Zopkit.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer group">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                <FileText className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Documentation</h3>
              <p className="text-slate-600 text-sm">Comprehensive guides and API docs</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer group">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                <GraduationCap className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Academy</h3>
              <p className="text-slate-600 text-sm">Video tutorials and courses</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer group">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                <Users className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Community</h3>
              <p className="text-slate-600 text-sm">Join our user community</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-300 transition cursor-pointer group">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                <Zap className="w-6 h-6 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Support</h3>
              <p className="text-slate-600 text-sm">24/7 customer support</p>
            </div>
          </div>
        </div>
      </section>

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
      <LandingFooter />
    </div>
  )
}

export default Landing

