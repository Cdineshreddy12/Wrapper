import React from "react"
import { Container } from "@/components/common/Page"
import { Section } from "@/components/common/Page/Section"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Code, 
  Palette, 
  Layout, 
  Zap,
  ArrowRight,
  Sparkles,
  Component,
  FileText
} from "lucide-react"
import { Link } from "react-router-dom"
import { Typography } from "@/components/common/Typography"

const demos = [
  {
    id: "skeleton-demo",
    title: "Skeleton Loader",
    description: "Highly reusable and configurable skeleton loader component with 20+ years of UI/UX experience",
    icon: Component,
    features: ["5 Animation Variants", "Pre-configured Components", "TypeScript Support", "Accessibility First"],
    color: "bg-blue-500",
    href: "/skeleton-demo"
  },
  {
    id: "section-examples",
    title: "Section Components",
    description: "Comprehensive section component examples and variations",
    icon: Layout,
    features: ["Multiple Variants", "Responsive Design", "Header Actions", "Loading States"],
    color: "bg-green-500",
    href: "/section-examples"
  }
]

export function DemoIndexPage() {
  return (
    <Container>
      <div className="space-y-8">
        {/* Header */}
        <Section
          title="Component Demos"
          description="Interactive demonstrations of our design system components and patterns"
          showDivider
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="bg-primary-blue text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              Interactive Demos
            </Badge>
            <Badge variant="outline">
              <Code className="w-3 h-3 mr-1" />
              Copy-Paste Ready
            </Badge>
            <Badge variant="outline">
              <Palette className="w-3 h-3 mr-1" />
              Design System
            </Badge>
            <Badge variant="outline">
              <Zap className="w-3 h-3 mr-1" />
              Production Ready
            </Badge>
          </div>
        </Section>

        {/* Demo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {demos.map((demo) => {
            const Icon = demo.icon
            return (
              <Card key={demo.id} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${demo.color} text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <Link to={demo.href}>
                      <Button variant="outline" size="sm" className="group-hover:bg-primary-blue group-hover:text-white group-hover:border-primary-blue">
                        View Demo
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                  <CardTitle className="text-xl">{demo.title}</CardTitle>
                  <CardDescription className="text-base">{demo.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {demo.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="pt-2">
                      <Link to={demo.href}>
                        <Button variant="ghost" className="w-full group-hover:bg-primary-blue/10 group-hover:text-primary-blue">
                          Explore Component
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Getting Started */}
        <Section
          title="Getting Started"
          description="Learn how to use these components in your projects"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="p-3 rounded-lg bg-purple-500 text-white w-fit">
                  <FileText className="w-6 h-6" />
                </div>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  Comprehensive documentation with examples and API references
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Read Docs
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 rounded-lg bg-orange-500 text-white w-fit">
                  <Code className="w-6 h-6" />
                </div>
                <CardTitle>Code Examples</CardTitle>
                <CardDescription>
                  Copy-paste ready code examples for every component
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  View Examples
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 rounded-lg bg-teal-500 text-white w-fit">
                  <Palette className="w-6 h-6" />
                </div>
                <CardTitle>Design System</CardTitle>
                <CardDescription>
                  Consistent design tokens and styling patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Explore Design
                </Button>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* Footer */}
        <Section variant="minimal">
          <div className="text-center py-8">
            <Typography variant="h4" className="mb-2">
              Built with 20+ Years of Experience
            </Typography>
            <Typography variant="body" className="text-muted-foreground max-w-2xl mx-auto">
              These components represent decades of UI/UX expertise, designed to be highly reusable, 
              configurable, and accessible. Each component is production-ready and follows modern 
              best practices.
            </Typography>
          </div>
        </Section>
      </div>
    </Container>
  )
}
