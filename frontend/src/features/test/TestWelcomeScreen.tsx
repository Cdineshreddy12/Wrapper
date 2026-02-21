/**
 * TEST PAGE - Welcome Screen
 * Route: /test/welcome
 * 
 * This is a test page for the OnboardingWelcomeSuccess component.
 * Once testing is complete, this route should be removed and the component
 * integrated into the normal onboarding flow.
 */

import React from 'react';
import { OnboardingWelcomeSuccess } from '@/features/onboarding/components/OnboardingWelcomeSuccess';

const TestWelcomeScreen: React.FC = () => {
  return (
    <div className="min-h-screen">
      <OnboardingWelcomeSuccess 
        redirectUrl="/test/loading"
        companyName="Acme Corporation"
      />
    </div>
  );
};

export default TestWelcomeScreen;
