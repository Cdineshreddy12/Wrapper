import React from 'react';
import { MultiStepForm } from '@/components/forms';
import { FormConfig } from '@/components/forms/types';

/**
 * Test page to verify form doesn't show errors on load
 */
const FormErrorTest: React.FC = () => {
  const testConfig: FormConfig = {
    title: 'Error Test',
    description: 'Testing that form doesn\'t show errors on load',
    steps: [
      {
        id: 'step1',
        title: 'Required Fields Test',
        description: 'These fields are required but should not show errors until touched',
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
            id: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'Enter your email',
            required: true,
            className: 'col-span-1'
          },
          {
            id: 'country',
            label: 'Country',
            type: 'select',
            placeholder: 'Choose your country',
            required: true,
            options: [
              { value: 'us', label: 'United States' },
              { value: 'ca', label: 'Canada' },
              { value: 'uk', label: 'United Kingdom' }
            ],
            className: 'col-span-2'
          }
        ]
      },
      {
        id: 'step2',
        title: 'Optional Fields Test',
        description: 'These fields are optional',
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
        <h1 className="text-3xl font-bold text-center mb-8">Form Error Test</h1>
        <p className="text-center text-gray-600 mb-8">
          This form should NOT show any errors when it first loads, even for required fields.
          Errors should only appear after you interact with the fields.
        </p>
        
        <div className="max-w-4xl mx-auto">
          <MultiStepForm
            config={testConfig}
            onSubmit={handleSubmit}
            debug={true}
            animations={true}
            accessibility={true}
          />
        </div>
      </div>
    </div>
  );
};

export default FormErrorTest;
