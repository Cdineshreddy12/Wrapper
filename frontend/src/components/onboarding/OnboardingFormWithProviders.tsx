import React from 'react';
import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OnboardingForm } from './OnboardingForm';

export const OnboardingFormWithProviders: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <OnboardingForm />
      </ToastProvider>
    </ErrorBoundary>
  );
};
