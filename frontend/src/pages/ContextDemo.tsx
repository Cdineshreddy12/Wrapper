import React, { useState } from 'react';
import { MultiStepForm, AdvancedProgressIndicator, CustomProgressIndicator } from '@/components/forms';
import { FormConfig } from '@/components/forms/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Demo page showcasing different progress indicators using context
 */
const ContextDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('default');

  const demoConfig: FormConfig = {
    title: 'Context Demo',
    description: 'Showcasing different progress indicators with context access',
    steps: [
      {
        id: 'personal-info',
        title: 'Personal Information',
        description: 'Tell us about yourself',
        showProgress: true,
        fields: [
          {
            id: 'firstName',
            label: 'First Name',
            type: 'text',
            placeholder: 'Enter your first name',
            required: true,
            className: 'col-span-1'
          },
          {
            id: 'lastName',
            label: 'Last Name',
            type: 'text',
            placeholder: 'Enter your last name',
            required: true,
            className: 'col-span-1'
          },
          {
            id: 'email',
            label: 'Email Address',
            type: 'email',
            placeholder: 'Enter your email',
            required: true,
            className: 'col-span-2'
          }
        ]
      },
      {
        id: 'preferences',
        title: 'Preferences',
        description: 'Configure your preferences',
        showProgress: true,
        fields: [
          {
            id: 'country',
            label: 'Country',
            type: 'select',
            placeholder: 'Choose your country',
            required: true,
            options: [
              { value: 'US', label: 'United States' },
              { value: 'CA', label: 'Canada' },
              { value: 'GB', label: 'United Kingdom' },
              { value: 'AU', label: 'Australia' },
            ],
            className: 'col-span-1'
          },
          {
            id: 'timezone',
            label: 'Timezone',
            type: 'select',
            placeholder: 'Select your timezone',
            required: true,
            options: [
              { value: 'PST', label: 'Pacific Standard Time (PST)' },
              { value: 'EST', label: 'Eastern Standard Time (EST)' },
              { value: 'GMT', label: 'Greenwich Mean Time (GMT)' },
            ],
            className: 'col-span-1'
          },
          {
            id: 'newsletter',
            label: 'Newsletter',
            type: 'switch',
            switchLabel: 'Subscribe to newsletter',
            required: false,
            className: 'col-span-2'
          }
        ]
      },
      {
        id: 'final-step',
        title: 'Confirmation',
        description: 'Review and confirm your information',
        showProgress: true,
        fields: [
          {
            id: 'terms',
            label: 'Terms and Conditions',
            type: 'switch',
            switchLabel: 'I agree to the terms and conditions',
            required: true,
            className: 'col-span-2'
          }
        ]
      }
    ]
  };

  const handleSubmit = (values: Record<string, any>) => {
    console.log('Form submitted with values:', values);
    alert('Form submitted successfully! Check the console for values.');
  };

  const renderForm = (ProgressIndicator?: React.ComponentType<any>) => (
    <MultiStepForm
      config={demoConfig}
      onSubmit={handleSubmit}
      ProgressIndicator={ProgressIndicator}
      debug={true}
    />
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Context Demo</h1>
          <p className="text-muted-foreground mt-2">
            Different progress indicators using form context
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="default">Default Progress</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Progress</TabsTrigger>
            <TabsTrigger value="custom">Custom Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="default" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Progress Indicator</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Basic progress indicator using context (no props needed)
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {renderForm()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Progress Indicator</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enhanced progress indicator with detailed metrics and error handling
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {renderForm(AdvancedProgressIndicator)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Progress Indicator</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fully customized progress indicator with gradients and animations
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {renderForm(CustomProgressIndicator)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Context Benefits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">✅ No Props Drilling</h4>
                  <p className="text-sm text-muted-foreground">
                    Progress indicators automatically access form state through context, 
                    eliminating the need to pass multiple props.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">✅ Advanced Features</h4>
                  <p className="text-sm text-muted-foreground">
                    Access to form values, errors, validation state, and navigation functions 
                    enables rich, interactive progress indicators.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">✅ Easy Customization</h4>
                  <p className="text-sm text-muted-foreground">
                    Create custom progress indicators by simply using the useFormContext hook 
                    without modifying the main form component.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">✅ Children Components</h4>
                  <p className="text-sm text-muted-foreground">
                    Any child component can access form state, enabling custom UI elements 
                    like statistics, field-level progress, and more.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContextDemo;
