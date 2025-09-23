import React from 'react';
import { MultiStepForm, ProgressIndicator } from '@/components/forms';
import { FormConfig } from '@/components/forms/types';

/**
 * Simple test page to verify form layout is working
 */
const FormLayoutTest: React.FC = () => {
  const testConfig: FormConfig = {
    title: 'Layout Test',
    description: 'Testing form layout and structure',
    steps: [
      {
        id: 'step1',
        title: 'Basic Information',
        description: 'Enter your basic details',
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
            label: 'Email',
            type: 'email',
            placeholder: 'Enter your email',
            required: true,
            className: 'col-span-2'
          }
        ]
      },
      {
        id: 'step2',
        title: 'Preferences',
        description: 'Configure your preferences',
        showProgress: true,
        fields: [
          {
            id: 'newsletter',
            label: 'Newsletter',
            type: 'switch',
            switchLabel: 'Subscribe to newsletter',
            required: false,
            className: 'col-span-2'
          }
        ]
      }
    ]
  };

  const handleSubmit = (values: Record<string, any>) => {
    console.log('Form submitted:', values);
    alert('Form submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Form Layout Test</h1>
        
        <div className="max-w-6xl mx-auto">
          <MultiStepForm
            config={testConfig}
            onSubmit={handleSubmit}
            debug={true}
            animations={true}
            accessibility={true}
            persistence={{
              type: 'localStorage',
              key: 'layout-test',
              persistOnChange: true
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default FormLayoutTest;
