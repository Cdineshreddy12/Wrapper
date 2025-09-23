import React from 'react';
import { MultiStepForm } from '@/components/forms/MultiStepForm';
import { FormConfig } from '@/components/forms/types';

/**
 * Demo page showcasing improved Switch and Select field components
 */
const FormComponentsDemo: React.FC = () => {
  const demoConfig: FormConfig = {
    title: 'UI Components Demo',
    description: 'Showcasing improved Switch and Select field components',
    steps: [
      {
        id: 'switch-demo',
        title: 'Company Type',
        description: 'Choose your company structure and preferences',
        showProgress: true,
        fields: [
          {
            id: 'newsletter',
            label: 'Newsletter Subscription',
            type: 'switch',
            switchLabel: 'Subscribe to our newsletter',
            helpText: 'Get updates about new features and products',
            required: true,
            className: 'col-span-1'
          },
          {
            id: 'notifications',
            label: 'Push Notifications',
            type: 'switch',
            switchLabel: 'Enable push notifications',
            helpText: 'Receive real-time updates on your device',
            required: false,
            className: 'col-span-1'
          },
          {
            id: 'marketing',
            label: 'Marketing Communications',
            type: 'switch',
            switchLabel: 'Allow marketing emails',
            helpText: 'Receive promotional content and special offers',
            required: false,
            className: 'col-span-1'
          }
        ]
      },
      {
        id: 'select-demo',
        title: 'Business Details',
        description: 'Details about your business corporation and shares',
        showProgress: true,
        fields: [
          {
            id: 'country',
            label: 'Country',
            type: 'select',
            placeholder: 'Choose your country',
            required: true,
            helpText: 'Select your country of residence',
            options: [
              { value: 'US', label: 'United States' },
              { value: 'CA', label: 'Canada' },
              { value: 'GB', label: 'United Kingdom' },
              { value: 'DE', label: 'Germany' },
              { value: 'FR', label: 'France' },
              { value: 'AU', label: 'Australia' },
              { value: 'JP', label: 'Japan' },
              { value: 'IN', label: 'India' },
              { value: 'BR', label: 'Brazil' },
              { value: 'MX', label: 'Mexico' }
            ],
            className: 'col-span-2'
          },
          {
            id: 'timezone',
            label: 'Timezone',
            type: 'select',
            placeholder: 'Select your timezone',
            required: true,
            helpText: 'Choose your local timezone',
            options: [
              { value: 'UTC-12', label: 'UTC-12 (Baker Island)' },
              { value: 'UTC-11', label: 'UTC-11 (American Samoa)' },
              { value: 'UTC-10', label: 'UTC-10 (Hawaii)' },
              { value: 'UTC-9', label: 'UTC-9 (Alaska)' },
              { value: 'UTC-8', label: 'UTC-8 (Pacific Time)' },
              { value: 'UTC-7', label: 'UTC-7 (Mountain Time)' },
              { value: 'UTC-6', label: 'UTC-6 (Central Time)' },
              { value: 'UTC-5', label: 'UTC-5 (Eastern Time)' },
              { value: 'UTC-4', label: 'UTC-4 (Atlantic Time)' },
              { value: 'UTC-3', label: 'UTC-3 (Brasilia Time)' },
              { value: 'UTC-2', label: 'UTC-2 (Mid-Atlantic)' },
              { value: 'UTC-1', label: 'UTC-1 (Azores)' },
              { value: 'UTC+0', label: 'UTC+0 (Greenwich Mean Time)' },
              { value: 'UTC+1', label: 'UTC+1 (Central European Time)' },
              { value: 'UTC+2', label: 'UTC+2 (Eastern European Time)' },
              { value: 'UTC+3', label: 'UTC+3 (Moscow Time)' },
              { value: 'UTC+4', label: 'UTC+4 (Gulf Standard Time)' },
              { value: 'UTC+5', label: 'UTC+5 (Pakistan Standard Time)' },
              { value: 'UTC+6', label: 'UTC+6 (Bangladesh Standard Time)' },
              { value: 'UTC+7', label: 'UTC+7 (Indochina Time)' },
              { value: 'UTC+8', label: 'UTC+8 (China Standard Time)' },
              { value: 'UTC+9', label: 'UTC+9 (Japan Standard Time)' },
              { value: 'UTC+10', label: 'UTC+10 (Australian Eastern Time)' },
              { value: 'UTC+11', label: 'UTC+11 (Solomon Islands Time)' },
              { value: 'UTC+12', label: 'UTC+12 (New Zealand Time)' }
            ],
            className: 'col-span-2'
          },
          {
            id: 'language',
            label: 'Preferred Language',
            type: 'select',
            placeholder: 'Select your language',
            required: false,
            helpText: 'Choose your preferred interface language',
            options: [
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'it', label: 'Italiano' },
              { value: 'pt', label: 'Português' },
              { value: 'ru', label: 'Русский' },
              { value: 'ja', label: '日本語' },
              { value: 'ko', label: '한국어' },
              { value: 'zh', label: '中文' }
            ],
            className: 'col-span-2'
          }
        ]
      },
      {
        id: 'mixed-demo',
        title: 'Team Setup',
        description: 'Configure your team preferences and settings',
        showProgress: true,
        fields: [
          {
            id: 'theme',
            label: 'Theme Preference',
            type: 'select',
            placeholder: 'Choose your theme',
            required: true,
            helpText: 'Select your preferred color theme',
            options: [
              { value: 'light', label: 'Light Theme' },
              { value: 'dark', label: 'Dark Theme' },
              { value: 'system', label: 'System Default' }
            ],
            className: 'col-span-1'
          },
          {
            id: 'autoSave',
            label: 'Auto-save',
            type: 'switch',
            switchLabel: 'Enable auto-save',
            helpText: 'Automatically save your progress',
            required: false,
            className: 'col-span-1'
          },
          {
            id: 'privacy',
            label: 'Privacy Settings',
            type: 'select',
            placeholder: 'Select privacy level',
            required: true,
            helpText: 'Choose your privacy preferences',
            options: [
              { value: 'public', label: 'Public - Visible to everyone' },
              { value: 'friends', label: 'Friends - Visible to friends only' },
              { value: 'private', label: 'Private - Visible to you only' }
            ],
            className: 'col-span-2'
          }
        ]
      },
      {
        id: 'final-step',
        title: 'Personal Details',
        description: 'Complete your personal information',
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
      }
    ]
  };

  const handleSubmit = (values: Record<string, any>) => {
    console.log('Form submitted with values:', values);
    alert('Form submitted successfully! Check the console for values.');
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Form Components Demo</h1>
          <p className="text-muted-foreground mt-2">
            Showcasing improved Switch and Select field components with enhanced UI/UX
          </p>
        </div>
        
        <MultiStepForm
          config={demoConfig}
          onSubmit={handleSubmit}
          debug={false}
        />
      </div>
    </div>
  );
};

export default FormComponentsDemo;
