import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  UltraSmoothCounter, 
  UltraSmoothPercentage, 
  UltraSmoothCurrency,
  SpringAnimatedNumber
} from '@/components/ui/ultra-smooth-animated-number'
import { 
  Users, 
  BarChart, 
  Star, 
  DollarSign, 
  TrendingUp, 
  Zap,
  Target,
  Award,
  Activity
} from 'lucide-react'

export function UltraSmoothDemo() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-4">Ultra-Smooth Animated Numbers</h2>
        <p className="text-muted-foreground text-lg">
          Experience buttery-smooth number animations with advanced easing functions and spring physics
        </p>
      </div>

      {/* Ultra-Smooth Easing Functions */}
      <Card>
        <CardHeader>
          <CardTitle>Ultra-Smooth Easing Functions</CardTitle>
          <CardDescription>
            Advanced easing functions for the smoothest possible transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                <UltraSmoothCounter 
                  value={10000} 
                  suffix="+"
                  duration={3000}
                  easing="ultraSmooth"
                  precision={1000000}
                />
              </div>
              <p className="text-sm text-muted-foreground">Ultra Smooth</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">
                <UltraSmoothCounter 
                  value={10000} 
                  suffix="+"
                  duration={3000}
                  easing="easeOutExpo"
                  precision={1000000}
                />
              </div>
              <p className="text-sm text-muted-foreground">Exponential</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive mb-2">
                <UltraSmoothCounter 
                  value={10000} 
                  suffix="+"
                  duration={3000}
                  easing="easeOutElastic"
                  precision={1000000}
                />
              </div>
              <p className="text-sm text-muted-foreground">Elastic</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                <UltraSmoothCounter 
                  value={10000} 
                  suffix="+"
                  duration={3000}
                  easing="easeOutBack"
                  precision={1000000}
                />
              </div>
              <p className="text-sm text-muted-foreground">Back Ease</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spring Physics */}
      <Card>
        <CardHeader>
          <CardTitle>Spring Physics Animation</CardTitle>
          <CardDescription>
            Realistic spring physics for natural, organic movement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">
                <SpringAnimatedNumber
                  value={50000}
                  suffix="+"
                  duration={4000}
                  springTension={0.3}
                  springFriction={0.8}
                />
              </div>
              <p className="text-muted-foreground">Soft Spring</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-accent mb-2">
                <SpringAnimatedNumber
                  value={50000}
                  suffix="+"
                  duration={4000}
                  springTension={0.6}
                  springFriction={0.5}
                />
              </div>
              <p className="text-muted-foreground">Bouncy Spring</p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-destructive mb-2">
                <SpringAnimatedNumber
                  value={50000}
                  suffix="+"
                  duration={4000}
                  springTension={0.8}
                  springFriction={0.3}
                />
              </div>
              <p className="text-muted-foreground">Snappy Spring</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High Precision Numbers */}
      <Card>
        <CardHeader>
          <CardTitle>High Precision Animation</CardTitle>
          <CardDescription>
            Ultra-high precision for the smoothest possible number transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                <UltraSmoothCounter 
                  value={1234567} 
                  suffix="+"
                  duration={4000}
                  easing="ultraSmooth"
                  precision={10000000}
                />
              </div>
              <p className="text-sm text-muted-foreground">High Precision</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">
                <UltraSmoothPercentage 
                  value={99.99} 
                  duration={4000}
                  easing="ultraSmooth"
                  precision={10000000}
                />
              </div>
              <p className="text-sm text-muted-foreground">Precise %</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-destructive mb-2">
                <UltraSmoothCurrency 
                  value={9999999} 
                  currency="$"
                  duration={4000}
                  easing="ultraSmooth"
                  precision={10000000}
                />
              </div>
              <p className="text-sm text-muted-foreground">Precise $</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                <UltraSmoothCounter 
                  value={1000000} 
                  suffix="+"
                  duration={4000}
                  easing="ultraSmooth"
                  precision={10000000}
                />
              </div>
              <p className="text-sm text-muted-foreground">Million+</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staggered Ultra-Smooth Animation */}
      <Card>
        <CardHeader>
          <CardTitle>Staggered Ultra-Smooth Animation</CardTitle>
          <CardDescription>
            Perfectly timed staggered animations with ultra-smooth transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-2">
                <UltraSmoothCounter 
                  value={75000} 
                  suffix="+"
                  duration={3500}
                  delay={0}
                  easing="ultraSmooth"
                  precision={1000000}
                />
              </div>
              <p className="text-muted-foreground">Users</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart className="w-8 h-8 text-accent" />
              </div>
              <div className="text-3xl font-bold text-accent mb-2">
                <UltraSmoothCounter 
                  value={2500} 
                  suffix="+"
                  duration={3500}
                  delay={200}
                  easing="ultraSmooth"
                  precision={1000000}
                />
              </div>
              <p className="text-muted-foreground">Projects</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-destructive" />
              </div>
              <div className="text-3xl font-bold text-destructive mb-2">
                <UltraSmoothPercentage 
                  value={98.5} 
                  duration={3500}
                  delay={400}
                  easing="ultraSmooth"
                  precision={1000000}
                />
              </div>
              <p className="text-muted-foreground">Satisfaction</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-2">
                <UltraSmoothCurrency 
                  value={5000000} 
                  currency="$"
                  duration={3500}
                  delay={600}
                  easing="ultraSmooth"
                  precision={1000000}
                />
              </div>
              <p className="text-muted-foreground">Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Features</CardTitle>
          <CardDescription>
            Optimized for 120 FPS with hardware acceleration and precision control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Ultra-Smooth Features</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  120 FPS animation loop
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Hardware acceleration
                </li>
                <li className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Ultra-high precision
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Spring physics simulation
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Advanced Easing</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Ultra-smooth interpolation</li>
                <li>• Exponential easing</li>
                <li>• Elastic animations</li>
                <li>• Back ease effects</li>
                <li>• Custom bezier curves</li>
                <li>• Spring physics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
