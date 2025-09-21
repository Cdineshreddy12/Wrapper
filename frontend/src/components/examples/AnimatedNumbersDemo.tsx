import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AnimatedCounter, 
  AnimatedPercentage, 
  AnimatedCurrency,
  AnimatedUserCount,
  AnimatedProjectCount,
  AnimatedSatisfactionRate,
  AnimatedRevenue
} from '@/components/ui/animated-number'
import { AnimatedStat } from '@/components/ui/animated-stat'
import { Users, BarChart, Star, DollarSign, TrendingUp, Zap } from 'lucide-react'

export function AnimatedNumbersDemo() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-4">Animated Numbers Demo</h2>
        <p className="text-muted-foreground">
          Scroll down to see the numbers animate when they come into view
        </p>
      </div>

      {/* Basic Animated Numbers */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Animated Numbers</CardTitle>
          <CardDescription>
            Simple animated counters with different configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                <AnimatedCounter 
                  value={12500} 
                  suffix="+"
                  duration={2000}
                  easing="easeOut"
                />
              </div>
              <p className="text-muted-foreground">Users</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-accent mb-2">
                <AnimatedPercentage 
                  value={98.5} 
                  duration={2000}
                  delay={200}
                  easing="easeOut"
                />
              </div>
              <p className="text-muted-foreground">Satisfaction</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-destructive mb-2">
                <AnimatedCurrency 
                  value={2500000} 
                  duration={2000}
                  delay={400}
                  easing="easeOut"
                />
              </div>
              <p className="text-muted-foreground">Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preset Components */}
      <Card>
        <CardHeader>
          <CardTitle>Preset Components</CardTitle>
          <CardDescription>
            Pre-configured components for common use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AnimatedUserCount
              value={50000}
              duration={2000}
              easing="easeOut"
            />
            
            <AnimatedProjectCount
              value={1200}
              duration={2000}
              delay={200}
              easing="easeOut"
            />
            
            <AnimatedSatisfactionRate
              value={99.2}
              duration={2000}
              delay={400}
              easing="easeOut"
            />
            
            <AnimatedRevenue
              value={5000000}
              currency="$"
              duration={2000}
              delay={600}
              easing="easeOut"
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Animated Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Animated Stats</CardTitle>
          <CardDescription>
            Stats with icons, different sizes, and layouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatedStat
              value={75000}
              label="Active Users"
              icon={<Users className="w-6 h-6 text-primary" />}
              type="counter"
              suffix="+"
              size="lg"
              duration={2000}
              easing="easeOut"
            />
            
            <AnimatedStat
              value={2500}
              label="Projects Completed"
              icon={<BarChart className="w-6 h-6 text-accent" />}
              type="counter"
              suffix="+"
              size="lg"
              duration={2000}
              delay={200}
              easing="easeOut"
            />
            
            <AnimatedStat
              value={97.8}
              label="Customer Satisfaction"
              icon={<Star className="w-6 h-6 text-destructive" />}
              type="percentage"
              size="lg"
              duration={2000}
              delay={400}
              easing="easeOut"
            />
          </div>
        </CardContent>
      </Card>

      {/* Different Easing Functions */}
      <Card>
        <CardHeader>
          <CardTitle>Easing Functions</CardTitle>
          <CardDescription>
            Different animation easing functions for various effects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                <AnimatedCounter 
                  value={1000} 
                  suffix="+"
                  duration={2000}
                  easing="linear"
                />
              </div>
              <p className="text-sm text-muted-foreground">Linear</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">
                <AnimatedCounter 
                  value={1000} 
                  suffix="+"
                  duration={2000}
                  easing="easeOut"
                />
              </div>
              <p className="text-sm text-muted-foreground">Ease Out</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive mb-2">
                <AnimatedCounter 
                  value={1000} 
                  suffix="+"
                  duration={2000}
                  easing="easeInOut"
                />
              </div>
              <p className="text-sm text-muted-foreground">Ease In Out</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                <AnimatedCounter 
                  value={1000} 
                  suffix="+"
                  duration={2000}
                  easing="bounce"
                />
              </div>
              <p className="text-sm text-muted-foreground">Bounce</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Different Sizes */}
      <Card>
        <CardHeader>
          <CardTitle>Different Sizes</CardTitle>
          <CardDescription>
            Various sizes for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <AnimatedStat
              value={1000000}
              label="Extra Large"
              icon={<Zap className="w-8 h-8 text-primary" />}
              type="counter"
              suffix="+"
              size="xl"
              duration={2000}
              easing="easeOut"
            />
            
            <AnimatedStat
              value={50000}
              label="Large"
              icon={<TrendingUp className="w-6 h-6 text-accent" />}
              type="counter"
              suffix="+"
              size="lg"
              duration={2000}
              delay={200}
              easing="easeOut"
            />
            
            <AnimatedStat
              value={5000}
              label="Medium"
              icon={<BarChart className="w-5 h-5 text-destructive" />}
              type="counter"
              suffix="+"
              size="md"
              duration={2000}
              delay={400}
              easing="easeOut"
            />
            
            <AnimatedStat
              value={500}
              label="Small"
              icon={<Users className="w-4 h-4 text-primary" />}
              type="counter"
              suffix="+"
              size="sm"
              duration={2000}
              delay={600}
              easing="easeOut"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
