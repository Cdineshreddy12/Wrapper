import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, Variants, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  CreditCard,
  Users,
  Home,
  FileText,
  Zap,
  Coins,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Shield,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { subscriptionAPI, creditAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

// Floating Particles Component
const FloatingParticles: React.FC = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 bg-blue-400/30 rounded-full blur-sm"
          initial={{
            x: `${particle.x}%`,
            y: `${particle.y}%`,
            opacity: 0,
          }}
          animate={{
            y: [`${particle.y}%`, `${particle.y - 20}%`, `${particle.y}%`],
            x: [`${particle.x}%`, `${particle.x + (Math.random() - 0.5) * 10}%`, `${particle.x}%`],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Shimmer Effect Component
const Shimmer: React.FC<{ className?: string }> = ({ className = "" }) => (
  <motion.div
    className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent ${className}`}
    animate={{
      x: ['-100%', '200%'],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    }}
  />
);

// Confetti Component
const Confetti: React.FC = () => {
  const confettiColors = ['#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1 + Math.random() * 1.5,
    rotation: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-2 h-2"
          style={{ backgroundColor: piece.color }}
          initial={{
            x: `${piece.x}%`,
            y: -10,
            rotate: piece.rotation,
            opacity: 1,
          }}
          animate={{
            y: '100vh',
            rotate: piece.rotation + 360,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
};

// Helper component for counting up numbers with enhanced animation
const CountUp: React.FC<{ end: number; prefix?: string; suffix?: string }> = ({ end, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) => Math.floor(current));

  useEffect(() => {
    spring.set(end);
  }, [end, spring]);

  useEffect(() => {
    return display.onChange((latest) => setCount(latest));
  }, [display]);

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </motion.span>
  );
};

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showConfetti, setShowConfetti] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse position tracking for parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        mouseX.set((e.clientX - rect.left) / rect.width);
        mouseY.set((e.clientY - rect.top) / rect.height);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Confetti timeout
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Animations variants for cards
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 30, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 14
      }
    }
  };

  const floatingVariants: Variants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  // Get payment details from URL parameters
  const sessionId = searchParams.get('session_id');
  const urlPaymentType = searchParams.get('type');

  // Determine payment type
  const determinePaymentType = () => {
    if (urlPaymentType && ['subscription', 'credit_purchase'].includes(urlPaymentType)) {
      return urlPaymentType;
    }
    if (sessionId) {
      if (sessionId.startsWith('mock_session_')) {
        return searchParams.get('plan') ? 'subscription' : 'credit_purchase';
      }
      return 'subscription';
    }
    return 'subscription';
  };

  const paymentType = determinePaymentType();

  // Fetch payment details
  const { data: paymentData, isLoading: paymentLoading, error: paymentError } = useQuery({
    queryKey: ['payment', sessionId, paymentType],
    queryFn: async () => {
      if (!sessionId) throw new Error('Session ID is required');
      if (paymentType === 'subscription') {
        return await subscriptionAPI.getPaymentDetailsBySession(sessionId);
      } else {
        return await creditAPI.getPaymentDetails(sessionId);
      }
    },
    enabled: !!sessionId,
    retry: 3
  });

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionAPI.getCurrent(),
    enabled: paymentType === 'subscription'
  });

  const { data: creditData, isLoading: creditLoading } = useQuery({
    queryKey: ['credit'],
    queryFn: () => creditAPI.getCurrentBalance(),
    enabled: !!sessionId
  });

  // Unwrap API responses
  const rawPayload = paymentData?.data;
  const paymentDetails = rawPayload?.success === true ? rawPayload.data : rawPayload;
  
  const subscription = subscriptionData?.data?.success === true ? subscriptionData.data.data : subscriptionData?.data;
  const creditBalance = creditData?.data?.success === true ? creditData.data.data : creditData?.data;

  const paymentInfo = paymentDetails;

  // For subscription success, show the plan they just paid for (from receipt) so "Current Plan" is correct
  // even if the webhook hasn't updated the subscription yet.
  const effectivePlan =
    paymentType === 'subscription' && paymentInfo?.planId
      ? paymentInfo.planId
      : subscription?.plan || 'free';

  // Store previous state for comparison
  const getPreviousState = () => {
    if (!creditBalance || !paymentInfo) return null;

    const currentCredits = Number(creditBalance?.availableCredits || 0);
    const currentPaidCredits = Number(creditBalance?.paidCredits || 0);
    const currentFreeCredits = Number(creditBalance?.freeCredits || 0);

    if (paymentType === 'credit_purchase') {
      const creditsAdded = Number(paymentInfo.credits ?? paymentInfo.creditsAdded ?? 0)
        || (paymentInfo.amount != null ? Math.floor(Number(paymentInfo.amount) * 100) : 0);
      return {
        credits: Math.max(0, currentCredits - creditsAdded),
        paidCredits: Math.max(0, currentPaidCredits - creditsAdded),
        freeCredits: currentFreeCredits,
        plan: subscription?.plan || 'free'
      };
    }

    if (paymentType === 'subscription') {
      const planHierarchy = ['free', 'starter', 'professional', 'enterprise'];
      const currentIndex = planHierarchy.indexOf(effectivePlan);
      const previousPlan = currentIndex > 0 ? planHierarchy[currentIndex - 1] : 'free';

      return {
        credits: currentCredits,
        paidCredits: currentPaidCredits,
        freeCredits: currentFreeCredits,
        plan: previousPlan
      };
    }

    return null;
  };

  const previousState = getPreviousState();
  const creditsFromPayment = paymentType === 'credit_purchase' ? (paymentInfo?.credits ?? paymentInfo?.creditsAdded ?? 0) : 0;
  
  const currentState = creditBalance ? {
    credits: Number(creditBalance?.availableCredits || 0) || Number(creditsFromPayment),
    paidCredits: Number(creditBalance?.paidCredits || 0) || Number(creditsFromPayment),
    freeCredits: Number(creditBalance?.freeCredits || 0),
    plan: effectivePlan
  } : creditsFromPayment ? {
    credits: Number(creditsFromPayment),
    paidCredits: Number(creditsFromPayment),
    freeCredits: 0,
    plan: effectivePlan
  } : null;

  const planDetails = paymentInfo && paymentType === 'subscription' ? {
    name: paymentInfo.planName || paymentInfo.planId,
    price: paymentInfo.amount,
    billingCycle: paymentInfo.billingCycle,
    features: paymentInfo.features || [],
    subscription: paymentInfo.subscription
  } : null;

  if (paymentLoading || subscriptionLoading || (paymentType === 'credit_purchase' && creditLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Confirming payment...</p>
        </div>
      </div>
    );
  }

  if (paymentError || !sessionId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-red-100 shadow-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <Zap className="w-8 h-8" />
            </div>
            <CardTitle className="text-red-900">Payment Error</CardTitle>
            <CardDescription>{paymentError instanceof Error ? paymentError.message : 'Missing session information'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/billing')} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl py-6">
              Return to Billing
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Common Header for all success states
  const PageHeader = () => (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className="border-b border-slate-200 bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-sm"
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <motion.div
            className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-lg"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            Z
          </motion.div>
          <span className="text-xl font-black text-slate-900 tracking-tight bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Zopkit
          </span>
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          <Badge className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 font-bold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-md">
            <motion.div
              className="w-2 h-2 bg-blue-600 rounded-full"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            Payment Confirmed
          </Badge>
        </motion.div>
      </div>
    </motion.div>
  );

  const CelebrationCard = () => {
    const x = useTransform(mouseX, [0, 1], [-10, 10]);
    const y = useTransform(mouseY, [0, 1], [-10, 10]);

    return (
      <div className="relative perspective-1000 w-full max-w-lg mx-auto mb-12" ref={cardRef}>
        {showConfetti && <Confetti />}
        <FloatingParticles />
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotateX: 20 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{ x, y }}
          className="bg-gradient-to-br from-blue-50 via-blue-50/80 to-white rounded-[3rem] pt-16 pb-12 px-10 text-center shadow-[0_40px_80px_-15px_rgba(59,130,246,0.2)] border-b-8 border-r-4 border-blue-200 relative z-10 overflow-visible group"
        >
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-transparent to-blue-50/30 rounded-[3rem] opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
          <Shimmer className="rounded-[3rem]" />

          {/* Ribbon with enhanced animation */}
          <motion.div
            className="absolute -top-6 left-1/2 -translate-x-1/2 w-[115%] flex justify-center items-center z-20"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="h-10 w-8 bg-gradient-to-b from-blue-700 to-blue-800 transform skew-y-12 translate-y-6 translate-x-2 rounded-l-sm shadow-lg" />
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white text-2xl font-black py-4 px-12 rounded-xl relative flex items-center justify-center shadow-2xl"
              whileHover={{ scale: 1.05 }}
              animate={{ boxShadow: [
                "0 20px 40px -12px rgba(59, 130, 246, 0.4)",
                "0 25px 50px -12px rgba(59, 130, 246, 0.5)",
                "0 20px 40px -12px rgba(59, 130, 246, 0.4)"
              ] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.span
                className="drop-shadow-lg relative z-10"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {paymentType === 'credit_purchase' ? 'Credits Added!' : 'Plan Upgraded!'}
              </motion.span>
              <div className="absolute top-1 left-2 right-2 bottom-1 border-2 border-dashed border-white/20 rounded-lg" />
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
            </motion.div>
            <div className="h-10 w-8 bg-gradient-to-b from-blue-700 to-blue-800 transform -skew-y-12 translate-y-6 -translate-x-2 rounded-r-sm shadow-lg" />
          </motion.div>

          <div className="mt-4 relative z-10">
            <motion.p
              className="text-blue-600 font-black text-xl uppercase tracking-[0.2em] mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {paymentType === 'credit_purchase' 
                ? <><span className="mr-2">Unlocked</span><CountUp end={currentState?.credits ?? 0} /> Credits</>
                : `Welcome to ${planDetails?.name || 'Premium'}`
              }
            </motion.p>

            <motion.div
              className="relative w-40 h-40 mx-auto mb-8"
              variants={floatingVariants}
              animate="animate"
            >
              {/* Multiple glow layers */}
              <motion.div
                className="absolute inset-0 bg-blue-400/30 rounded-full blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              />
              
              <div className="absolute inset-2 bg-gradient-to-tr from-white via-blue-50 to-white rounded-full shadow-inner border-4 border-white flex items-center justify-center relative overflow-hidden">
                <Shimmer />
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Coins className="w-20 h-20 text-blue-500 drop-shadow-xl" fill="currentColor" />
                </motion.div>
              </div>
              
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={{ scale: 1.1, rotate: 360 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200, duration: 0.5 }}
                className="absolute bottom-2 right-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white font-black text-2xl w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-2xl"
              >
                $
              </motion.div>

              {/* Orbiting stars */}
              {[0, 120, 240].map((angle, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3"
                  style={{
                    top: '50%',
                    left: '50%',
                    originX: 0.5,
                    originY: 0.5,
                  }}
                  animate={{
                    rotate: [angle, angle + 360],
                    x: [0, Math.cos((angle * Math.PI) / 180) * 80],
                    y: [0, Math.sin((angle * Math.PI) / 180) * 80],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.3,
                  }}
                >
                  <Star className="w-3 h-3 text-blue-400 fill-blue-400" />
                </motion.div>
              ))}
            </motion.div>

            <motion.h2
              className="text-2xl font-black text-slate-900 mb-3 tracking-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              The All-in-One Platform
            </motion.h2>
            <motion.p
              className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto mb-8 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              Your workspace is now supercharged with new capabilities and increased limits.
            </motion.p>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
            >
              <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 hover:from-blue-200 hover:to-blue-300 border-0 px-6 py-2 rounded-full font-black uppercase text-xs tracking-widest shadow-md relative overflow-hidden group">
                <Shimmer />
                <span className="relative z-10 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" />
                  {paymentType === 'credit_purchase' ? 'Transaction Complete' : 'Active Subscription'}
                </span>
              </Badge>
            </motion.div>
          </div>
        </motion.div>
        <motion.div
          className="absolute -bottom-6 left-10 right-10 h-12 bg-blue-200/30 blur-3xl rounded-full"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-200/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, -40, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      <PageHeader />

      <motion.div 
        className="container mx-auto px-6 py-16 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-5xl mx-auto">
          <CelebrationCard />

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Main Stats Column */}
            <div className="lg:col-span-8 space-y-8">
              {/* Summary Card */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white group hover:shadow-blue-100/50 transition-all duration-500 relative">
                  {/* Animated border gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Shimmer className="rounded-[2.5rem] opacity-0 group-hover:opacity-100" />
                  
                  <CardHeader className="p-8 bg-gradient-to-br from-slate-50/80 to-white border-b border-slate-100 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                          <motion.div
                            className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl text-white shadow-lg"
                            whileHover={{ rotate: 360, scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Zap className="w-6 h-6" />
                          </motion.div>
                          Account Updated
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" />
                          {paymentType === 'subscription' ? 'Plan Details' : 'Credit Balance Change'}
                        </CardDescription>
                      </div>
                      {currentState && (
                        <motion.div
                          className="text-right"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: "spring" }}
                        >
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">New Total</p>
                          <motion.p
                            className="text-3xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent tracking-tighter"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <CountUp end={currentState.credits} />
                          </motion.p>
                        </motion.div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      {/* Before */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                          Previous State
                        </h3>
                        <div className="space-y-3">
                          {previousState && (
                            <>
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-slate-100 transition-colors">
                                <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700">Total Credits</span>
                                <span className="text-lg font-black text-slate-400 group-hover:text-slate-600">{previousState.credits.toLocaleString()}</span>
                              </div>
                              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-slate-100 transition-colors">
                                <span className="text-sm font-bold text-slate-500 group-hover:text-slate-700">Plan Status</span>
                                <span className="text-sm font-black text-slate-400 uppercase group-hover:text-slate-600">{previousState.plan}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* After */}
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                          New Balance
                        </h3>
                        <div className="space-y-3">
                          {currentState && (
                            <>
                              <motion.div 
                                className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-2xl flex justify-between items-center relative overflow-hidden group shadow-lg shadow-blue-100/50"
                                whileHover={{ scale: 1.02, borderColor: "rgb(59 130 246)" }}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                              >
                                <Shimmer className="rounded-2xl" />
                                <div className="relative z-10">
                                  <span className="text-sm font-bold text-blue-700 flex items-center gap-2">
                                    <Shield className="w-3 h-3" />
                                    Total Credits
                                  </span>
                                  <motion.div
                                    className="flex items-center gap-2 mt-1"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5, type: "spring" }}
                                  >
                                    <span className="text-xs font-black text-blue-600 bg-white/90 px-2 py-0.5 rounded-full shadow-sm border border-blue-200">
                                      +{(currentState.credits - (previousState?.credits || 0)).toLocaleString()}
                                    </span>
                                  </motion.div>
                                </div>
                                <motion.span
                                  className="text-2xl font-black bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent relative z-10"
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  <CountUp end={currentState.credits} />
                                </motion.span>
                                <motion.div
                                  className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full translate-x-1/2 -translate-y-1/2"
                                  animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                                  transition={{ duration: 3, repeat: Infinity }}
                                />
                              </motion.div>
                              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-center">
                                <span className="text-sm font-bold text-blue-700">Current Plan</span>
                                <span className="text-sm font-black text-blue-900 uppercase bg-white/80 px-3 py-1 rounded-full shadow-sm">{currentState.plan}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 pt-4">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="w-full px-10 py-8 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 hover:from-blue-700 hover:via-blue-700 hover:to-blue-800 text-white font-black rounded-[2rem] transition-all shadow-2xl shadow-blue-200/50 flex items-center justify-center gap-4 text-xl group relative overflow-hidden"
                  >
                    <Shimmer className="opacity-30" />
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                    />
                    <Home className="w-7 h-7 relative z-10 group-hover:rotate-12 transition-transform" />
                    <span className="relative z-10">Enter Dashboard</span>
                    <motion.div
                      className="absolute -inset-1 bg-blue-400 rounded-[2rem] blur opacity-0 group-hover:opacity-50 transition-opacity"
                      animate={{ opacity: [0, 0.3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={() => navigate('/billing')}
                    variant="outline"
                    className="px-10 py-8 border-2 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 text-slate-600 hover:text-blue-700 font-black rounded-[2rem] transition-all flex items-center justify-center gap-3 text-lg group"
                  >
                    <CreditCard className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    View Billing
                  </Button>
                </motion.div>
              </motion.div>
            </div>

            {/* Sidebar Column */}
            <div className="lg:col-span-4 space-y-8">
              {/* Receipt Details */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white group hover:shadow-2xl hover:shadow-blue-100/30 transition-all duration-500 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0 group-hover:from-blue-50/50 group-hover:to-transparent transition-all duration-500 rounded-[2.5rem]" />
                  <Shimmer className="rounded-[2.5rem] opacity-0 group-hover:opacity-100" />
                  <CardHeader className="pb-4 relative z-10">
                    <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <motion.div
                        className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors"
                        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </motion.div>
                      Receipt
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <motion.div
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:border-blue-200 transition-colors"
                      whileHover={{ scale: 1.02 }}
                    >
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction ID</p>
                      <p className="font-mono text-[10px] text-slate-600 break-all leading-tight group-hover:text-blue-700 transition-colors">
                        {paymentInfo?.transactionId || sessionId}
                      </p>
                    </motion.div>
                    <div className="flex justify-between items-end border-t border-slate-100 pt-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Paid</p>
                        <motion.p
                          className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {paymentInfo?.amount ? formatCurrency(paymentInfo.amount) : '---'}
                        </motion.p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: "spring" }}
                      >
                        <Badge className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0 font-black px-4 py-1 rounded-full text-[10px] tracking-widest mb-1 shadow-lg shadow-blue-100 relative overflow-hidden">
                          <Shimmer className="opacity-50" />
                          <span className="relative z-10 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            PAID
                          </span>
                        </Badge>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Help Card */}
              <motion.div variants={itemVariants}>
                <motion.div
                  className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl shadow-blue-200"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Animated background orbs */}
                  <motion.div
                    className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <motion.div
                    className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                  />
                  
                  {/* Floating particles */}
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-white/30 rounded-full"
                      style={{
                        left: `${20 + i * 15}%`,
                        top: `${30 + i * 10}%`,
                      }}
                      animate={{
                        y: [0, -20, 0],
                        opacity: [0.3, 0.6, 0.3],
                      }}
                      transition={{
                        duration: 2 + i * 0.5,
                        repeat: Infinity,
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                  
                  <div className="relative z-10">
                    <motion.div
                      className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-lg"
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Users className="w-6 h-6 text-white" />
                    </motion.div>
                    <h4 className="text-xl font-black mb-2 tracking-tight flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                      Need Help?
                    </h4>
                    <p className="text-blue-100/80 text-sm leading-relaxed mb-8 font-medium">
                      Our premium support team is available 24/7 to assist with your upgrade.
                    </p>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white rounded-[1.25rem] py-6 font-black tracking-widest uppercase text-xs relative overflow-hidden group/btn"
                      >
                        <Shimmer className="opacity-0 group-hover/btn:opacity-50" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <Shield className="w-4 h-4" />
                          Contact Support
                        </span>
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
