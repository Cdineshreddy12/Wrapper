import React from 'react';
import { OnboardingFormExample, CustomStyledOnboardingForm, CustomFieldComponentsExample } from '@/components/forms';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

/**
 * Demo page showcasing the MultiStepForm component
 */
export const MultiStepFormDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Multi-Step Form Wizard Demo
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              A comprehensive, config-driven multi-step form built with React, TypeScript, and shadcn/ui
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">React 18</Badge>
              <Badge variant="secondary">TypeScript</Badge>
              <Badge variant="secondary">Zod Validation</Badge>
              <Badge variant="secondary">Zustand State</Badge>
              <Badge variant="secondary">shadcn/ui</Badge>
              <Badge variant="secondary">Tailwind CSS</Badge>
            </div>
          </div>

          {/* Features Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                Built with modern React patterns and best practices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Config-Driven</h4>
                  <p className="text-sm text-muted-foreground">
                    Define forms using JSON configuration objects
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Type-Safe</h4>
                  <p className="text-sm text-muted-foreground">
                    Full TypeScript support with Zod validation
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Reusable</h4>
                  <p className="text-sm text-muted-foreground">
                    Modular field components for all input types
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Accessible</h4>
                  <p className="text-sm text-muted-foreground">
                    ARIA labels, keyboard navigation, screen reader support
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Responsive</h4>
                  <p className="text-sm text-muted-foreground">
                    Mobile-friendly design with Tailwind CSS
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Customizable</h4>
                  <p className="text-sm text-muted-foreground">
                    Replace components via dependency injection
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Demo Tabs */}
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Form</TabsTrigger>
              <TabsTrigger value="styled">Styled Form</TabsTrigger>
              <TabsTrigger value="custom">Custom Components</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Onboarding Form</CardTitle>
                  <CardDescription>
                    A simple 3-step onboarding form with personal info, address, and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OnboardingFormExample />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="styled" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Styled Form</CardTitle>
                  <CardDescription>
                    The same form with custom styling and gradient background
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomStyledOnboardingForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Custom Field Components</CardTitle>
                  <CardDescription>
                    Form with custom field components and debug information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomFieldComponentsExample />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Code Examples */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Usage Examples</CardTitle>
              <CardDescription>
                How to use the MultiStepForm component in your projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Basic Usage</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { MultiStepForm, onboardingFormConfig } from '@/components/forms';

function MyForm() {
  const handleSubmit = async (values) => {
    console.log('Form submitted:', values);
  };

  return (
    <MultiStepForm
      config={onboardingFormConfig}
      onSubmit={handleSubmit}
    />
  );
}`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Custom Configuration</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`const customConfig: FormConfig = {
  title: 'My Custom Form',
  steps: [
    {
      id: 'step1',
      title: 'Step 1',
      fields: [
        {
          id: 'name',
          label: 'Name',
          type: 'text',
          required: true,
          validation: z.string().min(2)
        }
      ]
    }
  ]
};`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Custom Field Components</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`<MultiStepForm
  config={formConfig}
  onSubmit={handleSubmit}
  fieldComponents={{
    text: CustomTextField,
    email: CustomEmailField
  }}
  ProgressIndicator={CustomProgressIndicator}
  StepNavigation={CustomStepNavigation}
/>`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
