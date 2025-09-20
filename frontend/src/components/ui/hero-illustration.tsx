import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface HeroIllustrationProps {
  className?: string
}

const HeroIllustration = React.forwardRef<HTMLDivElement, HeroIllustrationProps>(
  ({ className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative w-full h-96 md:h-[500px] lg:h-[600px]", className)}
      >
        {/* Main Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute inset-0 bg-gradient-to-br from-card to-card/50 rounded-3xl border border-border/50 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <span className="text-lg font-semibold text-foreground">Dashboard</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-6 space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Revenue", value: "$2.4M", change: "+12%", color: "success" },
                { label: "Users", value: "1,247", change: "+8%", color: "success" },
                { label: "Orders", value: "3,891", change: "+15%", color: "success" },
                { label: "Growth", value: "23.5%", change: "+5%", color: "success" }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="bg-background/50 rounded-lg p-4 border border-border/30"
                >
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="text-xs text-success mt-1">{stat.change}</div>
                </motion.div>
              ))}
            </div>

            {/* Chart Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-background/50 rounded-lg p-6 border border-border/30"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Performance</h3>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                </div>
              </div>
              
              {/* Mock Chart */}
              <div className="h-32 flex items-end space-x-2">
                {[65, 78, 82, 75, 88, 92, 85, 90, 95, 88, 92, 96].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.8, delay: 1 + index * 0.05 }}
                    className="bg-gradient-to-t from-primary to-primary/60 rounded-t-sm flex-1"
                  />
                ))}
              </div>
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="grid md:grid-cols-2 gap-4"
            >
              <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                <h4 className="font-semibold text-foreground mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  {[
                    "New user registered",
                    "Payment processed",
                    "Report generated",
                    "Integration updated"
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-muted-foreground">{activity}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-background/50 rounded-lg p-4 border border-border/30">
                <h4 className="font-semibold text-foreground mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: "📊", label: "Analytics" },
                    { icon: "👥", label: "Users" },
                    { icon: "⚙️", label: "Settings" },
                    { icon: "📈", label: "Reports" }
                  ].map((action, index) => (
                    <div key={index} className="flex flex-col items-center p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <span className="text-lg mb-1">{action.icon}</span>
                      <span className="text-xs text-muted-foreground">{action.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.5 }}
          className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.7 }}
          className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-primary/20 rounded-full blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.9 }}
          className="absolute top-1/2 -right-8 w-8 h-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full blur-sm"
        />
      </div>
    )
  }
)
HeroIllustration.displayName = "HeroIllustration"

export { HeroIllustration }
