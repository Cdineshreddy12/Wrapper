import React from 'react';
import { OnboardingForm } from '../OnboardingForm';

export const OnboardingTest = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Onboarding System Test</h1>
        <OnboardingForm />
      </div>
    </div>
  );
};
