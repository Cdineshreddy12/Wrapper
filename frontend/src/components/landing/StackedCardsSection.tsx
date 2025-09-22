import React, { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

interface BusinessApp {
  id: number
  name: string
  description: string
  icon: any
  image: string | null
  color: string
  features: string[]
}

interface StackedCardsSectionProps {
  businessApps: BusinessApp[]
  setActiveApp: (id: number | null) => void
}

// Sample data for demonstration
const sampleApps: BusinessApp[] = [
  {
    id: 1,
    name: "CRM Pro",
    description: "Comprehensive customer relationship management system designed to streamline your sales process and improve customer satisfaction.",
    icon: null,
    image: null,
    color: "from-blue-500 to-blue-600",
    features: ["Lead Management", "Sales Pipeline", "Customer Analytics", "Email Integration"]
  },
  {
    id: 2,
    name: "TaskFlow",
    description: "Advanced project management tool that helps teams collaborate effectively and deliver projects on time with powerful automation features.",
    icon: null,
    image: null,
    color: "from-green-500 to-green-600",
    features: ["Project Planning", "Team Collaboration", "Time Tracking", "Automated Workflows"]
  },
  {
    id: 3,
    name: "DataViz",
    description: "Professional data visualization platform that transforms complex datasets into actionable insights with interactive dashboards.",
    icon: null,
    image: null,
    color: "from-purple-500 to-purple-600",
    features: ["Interactive Charts", "Real-time Analytics", "Custom Dashboards", "Data Export"]
  },
  {
    id: 4,
    name: "SecureVault",
    description: "Enterprise-grade security solution providing comprehensive protection for your digital assets and sensitive information.",
    icon: null,
    image: null,
    color: "from-red-500 to-red-600",
    features: ["Data Encryption", "Access Control", "Audit Trails", "Compliance Reporting"]
  }
]

const StackedCardsSection: React.FC<StackedCardsSectionProps> = ({
  businessApps = sampleApps,
  setActiveApp = () => {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  })

  const [imageErrors, setImageErrors] = useState<{[key: number]: boolean}>({})

  // Fixed timing: Ensure all 6 cards fit within 100% scroll with proper spacing
  const totalCards = businessApps.length
  const cardVisibilityDuration = 0.12 // Each card visible for 12% of scroll (6 cards = 72%)
  const transitionDuration = 0.02 // Quick 2% transition between cards (6 transitions = 12%)
  // Total: 84%, leaving 16% for smooth start/end transitions

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: `${Math.max(300, totalCards * 80)}vh` }}
    >
      <div className="sticky top-20 h-screen flex items-center justify-center px-4">
        {businessApps.map((app: BusinessApp, index: number) => {
          // Fixed timing: Each card gets equal time within 100% scroll
          const isLastCard = index === totalCards - 1
          const cardStart = index * (cardVisibilityDuration + transitionDuration)
          const cardFullyVisible = cardStart + transitionDuration
          const cardStartExit = isLastCard ? 1.0 : cardStart + cardVisibilityDuration
          const cardEnd = isLastCard ? 1.0 : cardStartExit + transitionDuration

          // Stacking position: current card at 0, previous cards stack above
          const yPosition = useTransform(
            scrollYProgress,
            [cardStart, cardFullyVisible, cardStartExit, cardEnd],
            [80, 0, 0, isLastCard ? 0 : -(index + 1) * 25]
          )

          const opacity = useTransform(
            scrollYProgress,
            [cardStart, cardFullyVisible, cardStartExit, cardEnd],
            [0, 1, 1, isLastCard ? 1 : 0.4]
          )

          const stackScale = useTransform(
            scrollYProgress,
            [cardStart, cardFullyVisible, cardStartExit, cardEnd],
            [0.9, 1, 1, isLastCard ? 1 : 0.94]
          )

          return (
            <motion.div
              key={app.id}
              className="absolute inset-0 flex items-center justify-center w-full"
              style={{
                y: yPosition,
                scale: stackScale,
                opacity,
                zIndex: index + 10,
                // Anti-blur properties
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                WebkitTransform: 'translateZ(0)',
                willChange: 'transform, opacity',
              } as any}
            >
              <div className="w-full h-[90vh] max-w-7xl mx-4">
                {/* Stacked card with anti-blur optimizations */}
                <motion.div
                  className="bg-white rounded-2xl shadow-2xl border border-gray-300 overflow-hidden"
                  style={{
                    // Anti-blur rendering
                    transform: 'translate3d(0, 0, 0)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    // Dynamic shadow based on current visibility
                    boxShadow: index === 0
                      ? '0 20px 40px -8px rgba(0, 0, 0, 0.15)'
                      : `0 ${4 + index * 2}px ${8 + index * 4}px -4px rgba(0, 0, 0, 0.1)`,
                  } as React.CSSProperties}
                  // Smooth stacking animation
                  transition={{
                    type: "tween",
                    ease: "easeOut",
                    duration: 0.6
                  }}
                >
                  <div className="grid lg:grid-cols-2 gap-0 min-h-[70vh]">

                    {/* Image Section - Crisp rendering */}
                    <div
                      className="relative bg-gray-50 p-8 flex items-center justify-center"
                      style={{
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                      } as React.CSSProperties}
                    >
                      <div
                        className="relative w-full h-64 bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200"
                        style={{
                          transform: 'translateZ(0)',
                          backfaceVisibility: 'hidden',
                        } as React.CSSProperties}
                      >
                        {app.image && !imageErrors[app.id] ? (
                          <img
                            src={app.image}
                            alt={app.name}
                            className="w-full h-full object-cover rounded-xl"
                            style={{
                              transform: 'translateZ(0)',
                              backfaceVisibility: 'hidden',
                              imageRendering: 'crisp-edges',
                            } as React.CSSProperties}
                            onError={() => {
                              setImageErrors(prev => ({ ...prev, [app.id]: true }))
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-8">
                            <div className={`w-16 h-16 bg-gradient-to-br ${app.color} rounded-xl flex items-center justify-center mb-4 text-white`}>
                              <span className="text-2xl font-bold">{app.name.charAt(0)}</span>
                            </div>
                            <h4 className="text-lg font-semibold text-gray-800">{app.name}</h4>
                            <p className="text-sm text-gray-500">Business Solution</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Section - Crisp text rendering */}
                    <div
                      className="p-8 lg:p-12 flex flex-col justify-center bg-white"
                      style={{
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                      } as React.CSSProperties}
                    >

                      {/* App Header */}
                      <div className="flex items-center mb-6">
                        <div className="bg-gray-100 text-gray-600 font-medium text-sm px-3 py-1 rounded-lg mr-4">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className={`w-10 h-10 bg-gradient-to-br ${app.color} rounded-lg flex items-center justify-center text-white`}>
                          <span className="text-sm font-bold">{app.name.charAt(0)}</span>
                        </div>
                      </div>

                      {/* Title - Better typography */}
                      <h3 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                        {app.name}
                      </h3>

                      {/* Description - Improved contrast */}
                      <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                        {app.description}
                      </p>

                      {/* Features - Cleaner design */}
                      <div className="space-y-3 mb-8">
                        {app.features.slice(0, 4).map((feature: string, featureIndex: number) => (
                          <div
                            key={featureIndex}
                            className="flex items-center text-gray-800 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100"
                          >
                            <CheckCircle className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" />
                            <span className="font-medium">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA Button - No transform blur */}
                      <button
                        className={`bg-gradient-to-r ${app.color} text-white px-8 py-4 text-lg rounded-xl font-semibold
                                 hover:shadow-lg transition-shadow duration-200
                                 focus:outline-none focus:ring-4 focus:ring-blue-200`}
                        style={{
                          transform: 'translateZ(0)',
                          backfaceVisibility: 'hidden',
                          WebkitFontSmoothing: 'antialiased',
                        } as React.CSSProperties}
                        onClick={() => setActiveApp(app.id)}
                        aria-label={`View demo for ${app.name}`}
                      >
                        View Demo
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Clear progress indicator showing current active card */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-50 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-gray-200">
        {businessApps.map((_, index) => {
          const isLastCard = index === totalCards - 1
          const cardStart = index * (cardVisibilityDuration + transitionDuration)
          const cardFullyVisible = cardStart + transitionDuration
          const cardStartExit = isLastCard ? 1.0 : cardStart + cardVisibilityDuration
          const cardEnd = isLastCard ? 1.0 : cardStartExit + transitionDuration

          return (
            <motion.div
              key={index}
              className="relative"
            >
              <motion.div
                className="w-3 h-3 rounded-full border-2"
                style={{
                  backgroundColor: useTransform(
                    scrollYProgress,
                    [cardStart, cardFullyVisible, cardStartExit, cardEnd],
                    ["#f3f4f6", "#3b82f6", "#3b82f6", isLastCard ? "#3b82f6" : "#e5e7eb"]
                  ),
                  borderColor: useTransform(
                    scrollYProgress,
                    [cardStart, cardFullyVisible, cardStartExit, cardEnd],
                    ["#d1d5db", "#3b82f6", "#3b82f6", isLastCard ? "#3b82f6" : "#d1d5db"]
                  ),
                  scale: useTransform(
                    scrollYProgress,
                    [cardStart, cardFullyVisible, cardStartExit, cardEnd],
                    [1, 1.3, 1.3, isLastCard ? 1.3 : 1]
                  )
                }}
              />
              {/* Card number label */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600 whitespace-nowrap">
                {index + 1}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Clear progress indicator showing current active card */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-50 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-gray-200">
        {businessApps.map((_, index) => {
          const isLastCard = index === totalCards - 1
          const cardStart = index * (cardVisibilityDuration + transitionDuration)
          const cardFullyVisible = cardStart + transitionDuration
          const cardStartExit = isLastCard ? 1.0 : cardStart + cardVisibilityDuration
          const cardEnd = isLastCard ? 1.0 : cardStartExit + transitionDuration

          return (
            <motion.div
              key={index}
              className="relative"
            >
              <motion.div
                className="w-3 h-3 rounded-full border-2"
                style={{
                  backgroundColor: useTransform(
                    scrollYProgress,
                    [cardStart, cardFullyVisible, cardStartExit, cardEnd],
                    ["#f3f4f6", "#3b82f6", "#3b82f6", isLastCard ? "#3b82f6" : "#e5e7eb"]
                  ),
                  borderColor: useTransform(
                    scrollYProgress,
                    [cardStart, cardFullyVisible, cardStartExit, cardEnd],
                    ["#d1d5db", "#3b82f6", "#3b82f6", isLastCard ? "#3b82f6" : "#d1d5db"]
                  ),
                  scale: useTransform(
                    scrollYProgress,
                    [cardStart, cardFullyVisible, cardStartExit, cardEnd],
                    [1, 1.3, 1.3, isLastCard ? 1.3 : 1]
                  )
                }}
              />
              {/* Card number label */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600 whitespace-nowrap">
                {index + 1}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default StackedCardsSection