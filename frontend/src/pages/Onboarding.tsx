import React from 'react';
import { MultiStepForm, CustomProgressIndicator } from '@/components/forms';
import { FormConfig, StepNavigationProps } from '@/components/forms/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Demo page showcasing different progress indicators using context
 */
const OnboardingPage: React.FC = () => {

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



    return (
        <div className="min-h-screen bg-gray-50">
            <Card>

                <CardContent className="p-0">
                    <MultiStepForm
                        config={demoConfig}
                        onSubmit={handleSubmit}
                        ProgressIndicator={CustomProgressIndicator}
                        // StepNavigation={CustomStepNavigation}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default OnboardingPage;
