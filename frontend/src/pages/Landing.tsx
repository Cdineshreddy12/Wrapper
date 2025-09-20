import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Container,
  Section,
  MotionDiv,
  MotionList,
  PageTransition,
} from "@/components/ui";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Users,
  Zap,
  Shield,
  Sparkles,
  Play,
  Quote,
  Rocket,
  Database,
  Workflow,
  ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import Footer from "@/components/ui/footer";

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useKindeAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [userInteractions, setUserInteractions] = useState({
    hoveredFeatures: [] as number[],
    viewedSections: [] as string[],
    timeOnPage: 0
  });

  // Track user interactions for personalization
  useEffect(() => {
    const timer = setInterval(() => {
      setUserInteractions(prev => ({
        ...prev,
        timeOnPage: prev.timeOnPage + 1
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check authentication status quietly in background
  useEffect(() => {
    const checkAuthenticatedUser = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await api.get("/admin/auth-status");
          const status = response.data;

          if (status.hasUser && status.hasTenant) {
            console.log(
              "✅ Authenticated user already onboarded, redirecting to dashboard"
            );
            navigate("/dashboard", { replace: true });
          }
        } catch (error) {
          console.log(
            "ℹ️ Could not check auth status, letting user choose path"
          );
        }
      }
    };

    const timer = setTimeout(checkAuthenticatedUser, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, navigate]);

  // Personalized messaging based on interactions
  const getPersonalizedMessage = () => {
    if (userInteractions.timeOnPage > 30) {
      return "Still exploring? Let's get you started!";
    }
    if (userInteractions.hoveredFeatures.length > 2) {
      return "You seem interested in our features! Ready to try them?";
    }
    if (isAuthenticated && user) {
      return `Welcome back, ${user.givenName || 'there'}! Ready to continue?`;
    }
    return "Ready to transform your business?";
  };

  const handleGetStarted = async () => {
    setIsLoading(true);
    try {
      await login({
        isCreateOrg: true,
      });
    } catch (error) {
      toast.error("Failed to start sign in process");
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await login();
    } catch (error) {
      toast.error("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: Workflow,
      title: "Intelligent Automation",
      description: "Streamline operations with AI-powered workflows that adapt to your business needs",
      color: "blue",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Database,
      title: "Unified Data Platform",
      description: "Centralize all your business data with real-time synchronization and advanced analytics",
      color: "purple",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with end-to-end encryption and compliance certifications",
      color: "green",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Lightning Performance",
      description: "Optimized for speed with 99.9% uptime and sub-second response times",
      color: "orange",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const socialProof = [
    { name: "TechCorp", logo: "TC" },
    { name: "InnovateLab", logo: "IL" },
    { name: "FutureWorks", logo: "FW" },
    { name: "DataFlow", logo: "DF" },
    { name: "CloudScale", logo: "CS" },
    { name: "NextGen", logo: "NG" }
  ];

  const testimonials = [
    {
      quote: "This platform transformed our entire workflow. We've seen a 300% increase in productivity.",
      author: "Sarah Chen",
      role: "CTO, TechCorp",
      avatar: "SC"
    },
    {
      quote: "The automation features saved us 20 hours per week. It's like having a dedicated team member.",
      author: "Marcus Johnson",
      role: "Operations Director, InnovateLab",
      avatar: "MJ"
    },
    {
      quote: "Finally, a solution that scales with our business. The ROI was immediate and measurable.",
      author: "Elena Rodriguez",
      role: "CEO, FutureWorks",
      avatar: "ER"
    }
  ];

  const stats = [
    { value: "10,000+", label: "Active Users" },
    { value: "99.9%", label: "Uptime SLA" },
    { value: "50+", label: "Integrations" },
    { value: "24/7", label: "Support" }
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <div className="relative">
          {/* Navigation */}
          <nav className="border-b border-border bg-background sticky top-0 z-50">
            <Container className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <Rocket className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-foreground">Zopkit</span>
                </div>
                
                <div className="hidden md:flex items-center space-x-8">
                  <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
                  <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
                  <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
                </div>

                <div className="flex items-center space-x-3">
                  <Button variant="ghost" onClick={handleSignIn} disabled={isLoading}>
                    Sign In
                  </Button>
                  <Button onClick={handleGetStarted} disabled={isLoading} className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Starting...
                      </>
                    ) : (
                      <>
                        Get Started Free
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Container>
          </nav>

          {/* Hero Section */}
          <Section spacing="xl" className="relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
            
            {/* Animated Background Elements */}
            <div className="absolute inset-0">
              {/* Floating Orbs */}
              <motion.div
                className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-primary/20 to-cyan-500/20 rounded-full blur-xl"
                animate={{
                  y: [0, -20, 0],
                  x: [0, 10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-lg"
                animate={{
                  y: [0, 15, 0],
                  x: [0, -10, 0],
                  scale: [1, 0.9, 1],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2,
                }}
              />
              <motion.div
                className="absolute bottom-40 left-1/4 w-40 h-40 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-2xl"
                animate={{
                  y: [0, -25, 0],
                  x: [0, 15, 0],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 4,
                }}
              />
              
              {/* Grid Pattern */}
              <div className="absolute inset-0 bg-grid-slate-100 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] opacity-30" />
            </div>

            <Container>
              <div className="relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
                  {/* Left Content */}
                  <MotionDiv variant="fadeIn" className="space-y-8">
                    {/* Trust Badge */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Badge
                        variant="outline"
                        className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm font-medium rounded-full"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Trusted by 10,000+ teams worldwide
                        <motion.div
                          className="ml-2 w-2 h-2 bg-success rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </Badge>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
                        Transform Your
                        <motion.span
                          className="block bg-gradient-to-r from-primary via-purple-600 to-cyan-600 bg-clip-text text-transparent"
                          animate={{
                            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{
                            backgroundSize: "200% 200%",
                          }}
                        >
                          Business Operations
                        </motion.span>
                      </h1>
                    </motion.div>

                    {/* Subheadline */}
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="text-xl md:text-2xl text-muted-foreground leading-relaxed"
                    >
                      The all-in-one platform that combines{" "}
                      <span className="text-foreground font-semibold text-primary">
                        intelligent automation
                      </span>
                      ,{" "}
                      <span className="text-foreground font-semibold text-purple-600">
                        unified data management
                      </span>
                      , and{" "}
                      <span className="text-foreground font-semibold text-green-600">
                        enterprise security
                      </span>{" "}
                      to scale your business.
                    </motion.p>

                    {/* Welcome Message */}
                    {isAuthenticated && user && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.6 }}
                      >
                        <div className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-success/10 text-success border border-success/20">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Welcome back, {user.givenName || user.email}!
                        </div>
                      </motion.div>
                    )}

                    {/* CTA Buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                      className="flex flex-col sm:flex-row items-start gap-4"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Button
                          size="lg"
                          onClick={handleGetStarted}
                          disabled={isLoading}
                          className="h-14 text-lg px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-xl hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                        >
                          {/* Ripple Effect */}
                          <motion.div
                            className="absolute inset-0 bg-white/20 rounded-lg"
                            initial={{ scale: 0, opacity: 0 }}
                            whileTap={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                          
                          {isLoading ? (
                            <>
                              <motion.div
                                className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Getting Started...
                            </>
                          ) : (
                            <>
                              <motion.div
                                className="mr-2 h-5 w-5"
                                animate={{ 
                                  y: [0, -2, 0],
                                  rotate: [0, 5, -5, 0]
                                }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <Rocket className="h-5 w-5" />
                              </motion.div>
                              Get Started Free
                              <motion.div
                                className="ml-2 h-5 w-5"
                                animate={{ x: [0, 2, 0] }}
                                transition={{ 
                                  duration: 1.5, 
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <ArrowRight className="h-5 w-5" />
                              </motion.div>
                            </>
                          )}
                        </Button>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Button
                          variant="outline"
                          size="lg"
                          className="h-14 text-lg px-8 border-2 hover:bg-muted/50 group relative overflow-hidden"
                        >
                          {/* Ripple Effect */}
                          <motion.div
                            className="absolute inset-0 bg-primary/10 rounded-lg"
                            initial={{ scale: 0, opacity: 0 }}
                            whileTap={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                          
                          <motion.div
                            className="mr-2 h-5 w-5"
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Play className="h-5 w-5" />
                          </motion.div>
                          Book a Demo
                        </Button>
                      </motion.div>
                    </motion.div>

                    {/* Trust Indicators */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.8 }}
                      className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground"
                    >
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-success" />
                        <span className="font-medium">Enterprise Security</span>
                      </div>
                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                      <div className="flex items-center space-x-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <span className="font-medium">99.9% Uptime SLA</span>
                      </div>
                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">10,000+ Happy Teams</span>
                      </div>
                    </motion.div>
                  </MotionDiv>

                  {/* Right Content - Interactive Dashboard Preview */}
                  <MotionDiv
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, delay: 0.4 }}
                    className="relative"
                  >
                    <div className="relative">
                      {/* Main Dashboard Card */}
                      <motion.div
                        className="bg-card rounded-3xl p-8 border border-border shadow-2xl"
                        whileHover={{ y: -5 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Dashboard Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full" />
                            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                            <div className="w-3 h-3 bg-green-500 rounded-full" />
                          </div>
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            Live
                          </Badge>
                        </div>

                        {/* Dashboard Content */}
                        <div className="space-y-6">
                          {/* Stats Row */}
                          <div className="grid grid-cols-2 gap-4">
                            <motion.div
                              className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4"
                              whileHover={{ scale: 1.02 }}
                            >
                              <div className="text-2xl font-bold text-foreground">$2.4M</div>
                              <div className="text-sm text-muted-foreground">Revenue</div>
                              <div className="text-xs text-success">+12% this month</div>
                            </motion.div>
                            <motion.div
                              className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl p-4"
                              whileHover={{ scale: 1.02 }}
                            >
                              <div className="text-2xl font-bold text-foreground">1,247</div>
                              <div className="text-sm text-muted-foreground">Active Users</div>
                              <div className="text-xs text-success">+8% this week</div>
                            </motion.div>
                          </div>

                          {/* Chart Area */}
                          <div className="bg-muted/30 rounded-xl p-4 h-32 flex items-end space-x-2">
                            {[40, 60, 45, 80, 70, 90, 85].map((height, index) => (
                              <motion.div
                                key={index}
                                className="bg-gradient-to-t from-primary to-primary/60 rounded-t"
                                style={{ width: "12px", height: `${height}%` }}
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 1, delay: 1 + index * 0.1 }}
                              />
                            ))}
                          </div>

                          {/* Recent Activity */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-foreground">Recent Activity</h4>
                            {[
                              { action: "New user registered", time: "2 min ago" },
                              { action: "Payment processed", time: "5 min ago" },
                              { action: "Report generated", time: "10 min ago" },
                            ].map((item, index) => (
                              <motion.div
                                key={index}
                                className="flex items-center justify-between text-sm"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 1.5 + index * 0.2 }}
                              >
                                <span className="text-muted-foreground">{item.action}</span>
                                <span className="text-xs text-muted-foreground">{item.time}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>

                      {/* Floating Elements */}
                      <motion.div
                        className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-xl"
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [0, 180, 360],
                        }}
                        transition={{
                          duration: 8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <motion.div
                        className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-lg"
                        animate={{
                          scale: [1, 0.8, 1],
                          rotate: [360, 180, 0],
                        }}
                        transition={{
                          duration: 6,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 2,
                        }}
                      />
                    </div>
                  </MotionDiv>
                </div>

                {/* Stats Section */}
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 1 }}
                  className="mt-20"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
                    {stats.map((stat, index) => (
                      <motion.div
                        key={index}
                        className="text-center p-6 rounded-xl bg-card border border-border hover:bg-card/90 transition-all duration-300"
                        whileHover={{ y: -5, scale: 1.02 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                      >
                        <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                          {stat.value}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {stat.label}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </Container>
          </Section>

          {/* Enhanced Social Proof */}
          <Section spacing="lg" background="muted">
            <Container>
              <MotionDiv variant="fadeIn" className="text-center">
                <div className="mb-12">
                  <Badge
                    variant="outline"
                    className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm font-medium rounded-full mb-6"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Trusted by 10,000+ teams worldwide
                  </Badge>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                    Join Industry Leaders
                  </h3>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    From startups to Fortune 500 companies, teams trust Zopkit to power their growth
                  </p>
                </div>
                
                {/* Animated Company Logos */}
                <div className="relative">
                  <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
                    {socialProof.map((company, index) => (
                      <motion.div
                        key={index}
                        className="group cursor-pointer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        whileHover={{ y: -5, scale: 1.05 }}
                      >
                        <div className="flex items-center space-x-3 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/20 hover:shadow-lg transition-all duration-300 group-hover:bg-card/90">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-sm font-bold text-primary">{company.logo}</span>
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {company.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Enterprise Customer
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Floating Trust Indicators */}
                  <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm">
                    <motion.div
                      className="flex items-center space-x-2 px-4 py-2 rounded-full bg-success/10 text-success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                    >
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">SOC 2 Compliant</span>
                    </motion.div>
                    <motion.div
                      className="flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.9 }}
                    >
                      <Zap className="h-4 w-4" />
                      <span className="font-medium">99.9% Uptime</span>
                    </motion.div>
                    <motion.div
                      className="flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-600"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 1.0 }}
                    >
                      <Users className="h-4 w-4" />
                      <span className="font-medium">50+ Countries</span>
                    </motion.div>
                  </div>
                </div>
              </MotionDiv>
            </Container>
          </Section>

          {/* Enhanced Features Section */}
          <Section spacing="xl" id="features">
            <Container>
              <div className="max-w-7xl mx-auto">
                <MotionDiv variant="fadeIn" className="text-center mb-20">
                  <Badge
                    variant="outline"
                    className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm font-medium rounded-full mb-6"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Everything You Need
                  </Badge>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                    Powerful Features for
                    <motion.span
                      className="block bg-gradient-to-r from-primary via-purple-600 to-cyan-600 bg-clip-text text-transparent"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    >
                      Modern Businesses
                    </motion.span>
                  </h2>
                  <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                    Everything you need to scale your business, from automation to analytics, 
                    all in one integrated platform that grows with you.
                  </p>
                </MotionDiv>

                <MotionList staggerDelay={0.15} className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      className="group"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.15 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      onHoverStart={() => {
                        setUserInteractions(prev => ({
                          ...prev,
                          hoveredFeatures: [...new Set([...prev.hoveredFeatures, index])]
                        }));
                      }}
                    >
                      <Card className="h-full p-8 bg-card border-border hover:bg-card/90 hover:shadow-2xl transition-all duration-500 group-hover:border-primary/30 relative overflow-hidden">
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                        
                        <CardContent className="p-0 relative z-10">
                          {/* Icon with Enhanced Animation */}
                          <motion.div
                            className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg group-hover:shadow-xl`}
                            whileHover={{ rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 0.6 }}
                          >
                            <feature.icon className="h-8 w-8 text-white" />
                          </motion.div>

                          {/* Title with Enhanced Typography */}
                          <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                            {feature.title}
                          </h3>

                          {/* Description */}
                          <p className="text-muted-foreground leading-relaxed mb-6 text-base">
                            {feature.description}
                          </p>

                          {/* Feature Highlights */}
                          <div className="space-y-3">
                            {[
                              "Real-time processing",
                              "Advanced analytics",
                              "Enterprise security",
                              "24/7 support"
                            ].map((highlight, highlightIndex) => (
                              <motion.div
                                key={highlightIndex}
                                className="flex items-center space-x-3 text-sm"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.5 + highlightIndex * 0.1 }}
                              >
                                <div className={`w-2 h-2 bg-gradient-to-r ${feature.gradient} rounded-full`} />
                                <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                                  {highlight}
                                </span>
                              </motion.div>
                            ))}
                          </div>

                          {/* Learn More Link */}
                          <motion.div
                            className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            whileHover={{ x: 5 }}
                          >
                            <div className="flex items-center text-primary font-medium text-sm cursor-pointer">
                              Learn more
                              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </div>
                          </motion.div>
                        </CardContent>

                        {/* Floating Elements */}
                        <motion.div
                          className={`absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br ${feature.gradient} rounded-full opacity-0 group-hover:opacity-60`}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0, 0.6, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: index * 0.5,
                          }}
                        />
                      </Card>
                    </motion.div>
                  ))}
                </MotionList>

                {/* Feature Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="mt-20"
                >
                  <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-3xl p-12 border border-primary/10">
                    <div className="grid md:grid-cols-3 gap-8 text-center">
                      <div>
                        <div className="text-4xl font-bold text-primary mb-2">50+</div>
                        <div className="text-muted-foreground font-medium">Integrations</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-purple-600 mb-2">99.9%</div>
                        <div className="text-muted-foreground font-medium">Uptime SLA</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-cyan-600 mb-2">24/7</div>
                        <div className="text-muted-foreground font-medium">Support</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </Container>
          </Section>

          {/* Enhanced Product Showcase */}
          <Section spacing="xl" background="muted">
            <Container>
              <div className="max-w-7xl mx-auto">
                <MotionDiv variant="fadeIn" className="text-center mb-20">
                  <Badge
                    variant="outline"
                    className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm font-medium rounded-full mb-6"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Live Demo
                  </Badge>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                    See It In
                    <motion.span
                      className="block bg-gradient-to-r from-primary via-purple-600 to-cyan-600 bg-clip-text text-transparent"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    >
                      Action
                    </motion.span>
                  </h2>
                  <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                    Experience the power of our platform with this interactive demo. 
                    See how real businesses transform their operations with Zopkit.
                  </p>
                </MotionDiv>

                <MotionDiv variant="slideUp" className="relative">
                  <div className="bg-card rounded-3xl p-8 md:p-12 border border-border shadow-2xl relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-grid-slate-100 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] opacity-30" />
                    
                    <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
                      <div className="space-y-8">
                        <div>
                          <h3 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                            Real-time Dashboard
                          </h3>
                          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                            Monitor your business metrics with our intuitive dashboard. 
                            Get instant insights, track performance, and make data-driven decisions.
                          </p>
                        </div>
                        
                        {/* Enhanced Feature List */}
                        <div className="space-y-6">
                          {[
                            { icon: "⚡", title: "Live data synchronization", desc: "Real-time updates across all devices" },
                            { icon: "🎛️", title: "Customizable widgets", desc: "Build your perfect dashboard" },
                            { icon: "📊", title: "Advanced analytics", desc: "Deep insights and predictions" },
                            { icon: "🔒", title: "Enterprise security", desc: "Bank-grade encryption and compliance" }
                          ].map((feature, index) => (
                            <motion.div
                              key={index}
                              className="flex items-start space-x-4 p-4 rounded-xl hover:bg-muted/50 transition-colors duration-300"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              whileHover={{ x: 5 }}
                            >
                              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center text-2xl">
                                {feature.icon}
                              </div>
                              <div>
                                <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                                <p className="text-sm text-muted-foreground">{feature.desc}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Button 
                              size="lg"
                              className="h-14 text-lg px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-xl hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                            >
                              {/* Ripple Effect */}
                              <motion.div
                                className="absolute inset-0 bg-white/20 rounded-lg"
                                initial={{ scale: 0, opacity: 0 }}
                                whileTap={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                              />
                              
                              Try Interactive Demo
                              <motion.div
                                className="ml-2 h-5 w-5"
                                animate={{ 
                                  x: [0, 2, 0],
                                  y: [0, -2, 0]
                                }}
                                transition={{ 
                                  duration: 1.5, 
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <ArrowUpRight className="h-5 w-5" />
                              </motion.div>
                            </Button>
                          </motion.div>
                          
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Button 
                              variant="outline" 
                              size="lg"
                              className="h-14 text-lg px-8 border-2 hover:bg-muted/50 group relative overflow-hidden"
                            >
                              {/* Ripple Effect */}
                              <motion.div
                                className="absolute inset-0 bg-primary/10 rounded-lg"
                                initial={{ scale: 0, opacity: 0 }}
                                whileTap={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.2 }}
                              />
                              
                              <motion.div
                                className="mr-2 h-5 w-5"
                                whileHover={{ scale: 1.2, rotate: 5 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              >
                                <Play className="h-5 w-5" />
                              </motion.div>
                              Watch Video
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                      
                      {/* Enhanced Dashboard Preview */}
                      <div className="relative">
                        <motion.div
                          className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-3xl p-8 border border-primary/20 shadow-2xl"
                          whileHover={{ y: -5, scale: 1.02 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Dashboard Header */}
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-3">
                              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                              <div className="w-3 h-3 bg-green-500 rounded-full" />
                            </div>
                            <Badge variant="secondary" className="bg-success/10 text-success animate-pulse">
                              <div className="w-2 h-2 bg-success rounded-full mr-2 animate-ping" />
                              Live
                            </Badge>
                          </div>

                          {/* Animated Stats */}
                          <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                              <motion.div
                                className="bg-background/50 rounded-2xl p-6 border border-border/50"
                                whileHover={{ scale: 1.05 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-3xl font-bold text-foreground">$2.4M</div>
                                  <motion.div
                                    className="text-xs text-success font-medium"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    +12%
                                  </motion.div>
                                </div>
                                <div className="text-sm text-muted-foreground">Revenue</div>
                                <div className="text-xs text-success">+12% this month</div>
                              </motion.div>
                              
                              <motion.div
                                className="bg-background/50 rounded-2xl p-6 border border-border/50"
                                whileHover={{ scale: 1.05 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.4 }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-3xl font-bold text-foreground">1,247</div>
                                  <motion.div
                                    className="text-xs text-success font-medium"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                                  >
                                    +8%
                                  </motion.div>
                                </div>
                                <div className="text-sm text-muted-foreground">Active Users</div>
                                <div className="text-xs text-success">+8% this week</div>
                              </motion.div>
                            </div>
                            
                            {/* Animated Chart */}
                            <motion.div
                              className="bg-background/50 rounded-2xl p-6 border border-border/50"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6, delay: 0.6 }}
                            >
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-foreground">Conversion Rate</span>
                                <span className="text-lg font-bold text-primary">3.2%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-3 mb-2">
                                <motion.div
                                  className="bg-gradient-to-r from-primary to-cyan-500 h-3 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: "75%" }}
                                  transition={{ duration: 2, delay: 1 }}
                                />
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0%</span>
                                <span>100%</span>
                              </div>
                            </motion.div>

                            {/* Live Activity Feed */}
                            <motion.div
                              className="space-y-3"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.6, delay: 0.8 }}
                            >
                              <h4 className="font-semibold text-foreground text-sm">Live Activity</h4>
                              {[
                                { action: "New user registered", time: "2 min ago", color: "text-green-500" },
                                { action: "Payment processed", time: "5 min ago", color: "text-blue-500" },
                                { action: "Report generated", time: "10 min ago", color: "text-purple-500" },
                              ].map((item, index) => (
                                <motion.div
                                  key={index}
                                  className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/30 transition-colors"
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ duration: 0.4, delay: 1 + index * 0.2 }}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-2 h-2 rounded-full ${item.color} animate-pulse`} />
                                    <span className="text-muted-foreground">{item.action}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">{item.time}</span>
                                </motion.div>
                              ))}
                            </motion.div>
                          </div>
                        </motion.div>

                        {/* Floating Elements */}
                        <motion.div
                          className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-xl"
                          animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 180, 360],
                          }}
                          transition={{
                            duration: 8,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                        <motion.div
                          className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-lg"
                          animate={{
                            scale: [1, 0.8, 1],
                            rotate: [360, 180, 0],
                          }}
                          transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 2,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </MotionDiv>
              </div>
            </Container>
          </Section>

          {/* Enhanced Testimonials */}
          <Section spacing="xl" id="testimonials">
            <Container>
              <div className="max-w-7xl mx-auto">
                <MotionDiv variant="fadeIn" className="text-center mb-20">
                  <Badge
                    variant="outline"
                    className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm font-medium rounded-full mb-6"
                  >
                    <Quote className="w-4 h-4 mr-2" />
                    Customer Stories
                  </Badge>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                    What Our Customers
                    <motion.span
                      className="block bg-gradient-to-r from-primary via-purple-600 to-cyan-600 bg-clip-text text-transparent"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    >
                      Say
                    </motion.span>
                  </h2>
                  <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                    Join thousands of satisfied customers who have transformed their business with our platform. 
                    See how real companies achieve remarkable results.
                  </p>
                </MotionDiv>

                <MotionList staggerDelay={0.2} className="grid md:grid-cols-3 gap-8">
                  {testimonials.map((testimonial, index) => (
                    <motion.div
                      key={index}
                      className="group"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.2 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                    >
                      <Card className="h-full p-8 bg-card border-border hover:bg-card/90 hover:shadow-2xl transition-all duration-500 group-hover:border-primary/30 relative overflow-hidden">
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <CardContent className="p-0 relative z-10">
                          {/* Quote Icon */}
                          <motion.div
                            className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                            whileHover={{ rotate: [0, -5, 5, 0] }}
                          >
                            <Quote className="h-6 w-6 text-primary" />
                          </motion.div>

                          {/* Star Rating */}
                          <div className="flex items-center space-x-1 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <motion.div
                                key={star}
                                className="w-5 h-5 text-yellow-400"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: 0.5 + star * 0.1 }}
                              >
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </motion.div>
                            ))}
                          </div>

                          {/* Quote */}
                          <p className="text-lg text-foreground mb-8 leading-relaxed group-hover:text-foreground/90 transition-colors">
                            "{testimonial.quote}"
                          </p>

                          {/* Author */}
                          <div className="flex items-center space-x-4">
                            <motion.div
                              className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                              whileHover={{ rotate: 5 }}
                            >
                              <span className="text-white font-bold text-lg">
                                {testimonial.avatar}
                              </span>
                            </motion.div>
                            <div className="flex-1">
                              <div className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">
                                {testimonial.author}
                              </div>
                              <div className="text-sm text-muted-foreground font-medium">
                                {testimonial.role}
                              </div>
                              <div className="flex items-center space-x-2 mt-2">
                                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                <span className="text-xs text-success font-medium">Verified Customer</span>
                              </div>
                            </div>
                          </div>

                          {/* Company Logo Placeholder */}
                          <motion.div
                            className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            initial={{ opacity: 0, y: 10 }}
                            whileHover={{ opacity: 1, y: 0 }}
                          >
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                                <span className="font-bold text-xs">TC</span>
                              </div>
                              <span>TechCorp Inc.</span>
                            </div>
                          </motion.div>
                        </CardContent>

                        {/* Floating Elements */}
                        <motion.div
                          className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full opacity-0 group-hover:opacity-60"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0, 0.6, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: index * 0.5,
                          }}
                        />
                      </Card>
                    </motion.div>
                  ))}
                </MotionList>

                {/* Trust Indicators */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="mt-20"
                >
                  <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-3xl p-12 border border-primary/10">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-foreground mb-4">
                        Trusted by Industry Leaders
                      </h3>
                      <p className="text-muted-foreground">
                        Over 10,000 companies worldwide rely on Zopkit for their business operations
                      </p>
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-8 text-center">
                      <div>
                        <div className="text-4xl font-bold text-primary mb-2">4.9/5</div>
                        <div className="text-muted-foreground font-medium">Customer Rating</div>
                        <div className="text-sm text-muted-foreground mt-1">Based on 2,500+ reviews</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-purple-600 mb-2">98%</div>
                        <div className="text-muted-foreground font-medium">Customer Satisfaction</div>
                        <div className="text-sm text-muted-foreground mt-1">Would recommend us</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-cyan-600 mb-2">300%</div>
                        <div className="text-muted-foreground font-medium">Average ROI</div>
                        <div className="text-sm text-muted-foreground mt-1">Within first year</div>
                      </div>
                      <div>
                        <div className="text-4xl font-bold text-green-600 mb-2">24/7</div>
                        <div className="text-muted-foreground font-medium">Support</div>
                        <div className="text-sm text-muted-foreground mt-1">Always here to help</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </Container>
          </Section>

          {/* Pricing Preview Section */}
          <Section spacing="xl" background="muted">
            <Container>
              <div className="max-w-7xl mx-auto">
                <MotionDiv variant="fadeIn" className="text-center mb-20">
                  <Badge
                    variant="outline"
                    className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm font-medium rounded-full mb-6"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Simple Pricing
                  </Badge>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                    Choose Your
                    <motion.span
                      className="block bg-gradient-to-r from-primary via-purple-600 to-cyan-600 bg-clip-text text-transparent"
                      animate={{
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        backgroundSize: "200% 200%",
                      }}
                    >
                      Perfect Plan
                    </motion.span>
                  </h2>
                  <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                    Start free and scale as you grow. No hidden fees, no surprises.
                  </p>
                </MotionDiv>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                  {/* Starter Plan */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="relative"
                  >
                    <Card className="h-full p-8 bg-card border-border hover:border-primary/20 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10">
                        <div className="text-center mb-8">
                          <h3 className="text-2xl font-bold text-foreground mb-2">Starter</h3>
                          <p className="text-muted-foreground mb-6">Perfect for small teams</p>
                          <div className="text-5xl font-bold text-foreground mb-2">
                            Free
                          </div>
                          <p className="text-muted-foreground">Forever</p>
                        </div>

                        <ul className="space-y-4 mb-8">
                          {[
                            "Up to 5 team members",
                            "Basic analytics",
                            "Email support",
                            "5GB storage",
                            "Mobile app access"
                          ].map((feature, index) => (
                            <motion.div
                              key={index}
                              className="flex items-center space-x-3"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                            >
                              <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                              <span className="text-foreground">{feature}</span>
                            </motion.div>
                          ))}
                        </ul>

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <Button 
                            variant="outline" 
                            className="w-full h-12 text-lg border-2 hover:bg-primary hover:text-white transition-all duration-300 group relative overflow-hidden"
                          >
                            <motion.div
                              className="absolute inset-0 bg-primary/10 rounded-lg"
                              initial={{ scale: 0, opacity: 0 }}
                              whileTap={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            />
                            Get Started Free
                          </Button>
                        </motion.div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Pro Plan - Featured */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="relative"
                  >
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                      <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                    
                    <Card className="h-full p-8 bg-gradient-to-br from-primary/5 to-purple-500/5 border-2 border-primary/20 hover:border-primary/40 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10">
                        <div className="text-center mb-8">
                          <h3 className="text-2xl font-bold text-foreground mb-2">Pro</h3>
                          <p className="text-muted-foreground mb-6">For growing businesses</p>
                          <div className="text-5xl font-bold text-foreground mb-2">
                            $29
                            <span className="text-lg text-muted-foreground">/month</span>
                          </div>
                          <p className="text-muted-foreground">per user</p>
                        </div>

                        <ul className="space-y-4 mb-8">
                          {[
                            "Up to 50 team members",
                            "Advanced analytics & reporting",
                            "Priority support",
                            "100GB storage",
                            "API access",
                            "Custom integrations",
                            "Advanced security"
                          ].map((feature, index) => (
                            <motion.div
                              key={index}
                              className="flex items-center space-x-3"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                            >
                              <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                              <span className="text-foreground">{feature}</span>
                            </motion.div>
                          ))}
                        </ul>

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <Button 
                            className="w-full h-12 text-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl hover:shadow-2xl transition-all duration-300 group relative overflow-hidden"
                          >
                            <motion.div
                              className="absolute inset-0 bg-white/20 rounded-lg"
                              initial={{ scale: 0, opacity: 0 }}
                              whileTap={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            />
                            Start Free Trial
                          </Button>
                        </motion.div>
                      </div>
                    </Card>
                  </motion.div>

                  {/* Enterprise Plan */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="relative"
                  >
                    <Card className="h-full p-8 bg-card border-border hover:border-primary/20 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10">
                        <div className="text-center mb-8">
                          <h3 className="text-2xl font-bold text-foreground mb-2">Enterprise</h3>
                          <p className="text-muted-foreground mb-6">For large organizations</p>
                          <div className="text-5xl font-bold text-foreground mb-2">
                            Custom
                          </div>
                          <p className="text-muted-foreground">Contact us</p>
                        </div>

                        <ul className="space-y-4 mb-8">
                          {[
                            "Unlimited team members",
                            "Custom analytics & dashboards",
                            "24/7 dedicated support",
                            "Unlimited storage",
                            "Custom API development",
                            "White-label solution",
                            "SLA guarantee",
                            "On-premise deployment"
                          ].map((feature, index) => (
                            <motion.div
                              key={index}
                              className="flex items-center space-x-3"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                            >
                              <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                              <span className="text-foreground">{feature}</span>
                            </motion.div>
                          ))}
                        </ul>

                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          <Button 
                            variant="outline" 
                            className="w-full h-12 text-lg border-2 hover:bg-primary hover:text-white transition-all duration-300 group relative overflow-hidden"
                          >
                            <motion.div
                              className="absolute inset-0 bg-primary/10 rounded-lg"
                              initial={{ scale: 0, opacity: 0 }}
                              whileTap={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            />
                            Contact Sales
                          </Button>
                        </motion.div>
                      </div>
                    </Card>
                  </motion.div>
                </div>

                {/* Pricing Footer */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="mt-16 text-center"
                >
                  <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-2xl p-8 border border-primary/10">
                    <p className="text-muted-foreground mb-4">
                      All plans include 14-day free trial • No credit card required • Cancel anytime
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-success" />
                        <span className="text-muted-foreground">SOC 2 Compliant</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">99.9% Uptime SLA</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span className="text-muted-foreground">24/7 Support</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </Container>
          </Section>

          {/* Enhanced CTA Section */}
          <Section spacing="xl" background="muted">
            <Container>
              <MotionDiv variant="fadeIn" className="text-center max-w-6xl mx-auto">
                <div className="relative overflow-hidden">
                  {/* Background Elements */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-purple-500/10 to-cyan-500/10 rounded-3xl" />
                  <div className="absolute inset-0 bg-grid-slate-100 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] opacity-30" />
                  
                  {/* Floating Orbs */}
                  <motion.div
                    className="absolute top-8 left-8 w-20 h-20 bg-gradient-to-br from-primary/20 to-cyan-500/20 rounded-full blur-xl"
                    animate={{
                      y: [0, -20, 0],
                      x: [0, 10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.div
                    className="absolute bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-lg"
                    animate={{
                      y: [0, 15, 0],
                      x: [0, -10, 0],
                      scale: [1, 0.9, 1],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 2,
                    }}
                  />

                  <div className="relative z-10 bg-card/80 backdrop-blur-sm rounded-3xl p-12 md:p-20 border border-border/50 shadow-2xl">
                    {/* Header */}
                    <div className="mb-12">
                      <Badge
                        variant="outline"
                        className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary border-primary/20 text-sm font-medium rounded-full mb-6"
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        Limited Time Offer
                      </Badge>
                      
                      <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                        <motion.span
                          key={getPersonalizedMessage()}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                        >
                          {getPersonalizedMessage()}
                        </motion.span>
                        <motion.span
                          className="block bg-gradient-to-r from-primary via-purple-600 to-cyan-600 bg-clip-text text-transparent"
                          animate={{
                            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          style={{
                            backgroundSize: "200% 200%",
                          }}
                        >
                          {userInteractions.timeOnPage > 30 ? "Let's Get Started!" : "Your Business?"}
                        </motion.span>
                      </h2>
                      
                      <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                        Join thousands of companies already using our platform to scale their operations. 
                        Start your free trial today - no credit card required.
                      </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Button 
                          size="lg" 
                          onClick={handleGetStarted} 
                          disabled={isLoading}
                          className="h-16 text-xl px-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-2xl hover:shadow-3xl transition-all duration-300 group relative overflow-hidden"
                        >
                          {/* Ripple Effect */}
                          <motion.div
                            className="absolute inset-0 bg-white/20 rounded-lg"
                            initial={{ scale: 0, opacity: 0 }}
                            whileTap={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                          
                          {isLoading ? (
                            <>
                              <motion.div
                                className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              Getting Started...
                            </>
                          ) : (
                            <>
                              <motion.div
                                className="mr-3 h-6 w-6"
                                animate={{ 
                                  y: [0, -3, 0],
                                  rotate: [0, 10, -10, 0]
                                }}
                                transition={{ 
                                  duration: 2, 
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <Rocket className="h-6 w-6" />
                              </motion.div>
                              Start Free Trial
                              <motion.div
                                className="ml-3 h-6 w-6"
                                animate={{ x: [0, 3, 0] }}
                                transition={{ 
                                  duration: 1.5, 
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <ArrowRight className="h-6 w-6" />
                              </motion.div>
                            </>
                          )}
                        </Button>
                      </motion.div>
                      
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Button 
                          variant="outline" 
                          size="lg"
                          className="h-16 text-xl px-12 border-2 hover:bg-muted/50 group relative overflow-hidden"
                        >
                          {/* Ripple Effect */}
                          <motion.div
                            className="absolute inset-0 bg-primary/10 rounded-lg"
                            initial={{ scale: 0, opacity: 0 }}
                            whileTap={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                          
                          <motion.div
                            className="mr-3 h-6 w-6"
                            whileHover={{ scale: 1.3, rotate: 10 }}
                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                          >
                            <Play className="h-6 w-6" />
                          </motion.div>
                          Schedule Demo
                        </Button>
                      </motion.div>
                    </div>

                    {/* Trust Indicators */}
                    <div className="grid md:grid-cols-3 gap-8 mb-12">
                      <motion.div
                        className="flex items-center justify-center space-x-3 p-4 rounded-xl bg-success/10 border border-success/20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <CheckCircle className="h-6 w-6 text-success" />
                        <div className="text-left">
                          <div className="font-semibold text-success">14-day free trial</div>
                          <div className="text-sm text-success/70">Full access to all features</div>
                        </div>
                      </motion.div>
                      
                      <motion.div
                        className="flex items-center justify-center space-x-3 p-4 rounded-xl bg-primary/10 border border-primary/20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <Shield className="h-6 w-6 text-primary" />
                        <div className="text-left">
                          <div className="font-semibold text-primary">No credit card required</div>
                          <div className="text-sm text-primary/70">Start instantly</div>
                        </div>
                      </motion.div>
                      
                      <motion.div
                        className="flex items-center justify-center space-x-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
                        whileHover={{ scale: 1.05 }}
                      >
                        <Zap className="h-6 w-6 text-purple-600" />
                        <div className="text-left">
                          <div className="font-semibold text-purple-600">Cancel anytime</div>
                          <div className="text-sm text-purple-600/70">No long-term contracts</div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Social Proof */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.5 }}
                      className="border-t border-border/50 pt-8"
                    >
                      <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Users className="h-5 w-5 text-primary" />
                          <span className="font-medium">10,000+ companies trust us</span>
                        </div>
                        <div className="w-1 h-1 bg-muted-foreground rounded-full hidden md:block" />
                        <div className="flex items-center space-x-2">
                          <Shield className="h-5 w-5 text-success" />
                          <span className="font-medium">SOC 2 Compliant</span>
                        </div>
                        <div className="w-1 h-1 bg-muted-foreground rounded-full hidden md:block" />
                        <div className="flex items-center space-x-2">
                          <Zap className="h-5 w-5 text-purple-600" />
                          <span className="font-medium">99.9% Uptime SLA</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </MotionDiv>
            </Container>
          </Section>
        </div>
      </div>
      
      <Footer />
    </PageTransition>
  );
};

export default Landing;

