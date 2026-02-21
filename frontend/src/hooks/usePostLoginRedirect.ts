import { useState } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { onboardingAPI } from '@/lib/api';

interface OnboardingStatus {
  isOnboarded: boolean;
  organization?: {
    id: string;
    name: string;
    domain: string;
    subdomain: string;
  };
  needsOnboarding: boolean;
  onboardingStep?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    kindeUserId: string;
  };
}

export const usePostLoginRedirect = () => {
  // This hook is now passive - it doesn't perform any automatic redirects
  // Redirects are handled manually in Login and Landing components
  const [isRedirecting] = useState(false);
  const [onboardingStatus] = useState<OnboardingStatus | null>(null);

  return {
    isRedirecting,
    onboardingStatus
  };
};

// Helper function to mark user as onboarded (calls backend API)
export const markUserAsOnboarded = async (organizationId: string) => {
  try {
    await onboardingAPI.markComplete(organizationId);
  } catch (error) {
    console.error('❌ Error marking user as onboarded:', error);
    throw error;
  }
};

// Helper function to update onboarding step
export const updateOnboardingStep = async (step: string, data?: any, userEmail?: string, formData?: any) => {
  try {
    await onboardingAPI.updateStep(step, data, userEmail, formData);
  } catch (error) {
    console.error('❌ Error updating onboarding step:', error);
    throw error;
  }
};

// Helper function to reset onboarding status (for testing)
export const resetOnboardingStatus = async (targetUserId?: string) => {
  try {
    await onboardingAPI.reset(targetUserId);
  } catch (error) {
    console.error('❌ Error resetting onboarding status:', error);
    throw error;
  }
};

// Helper function to check onboarding status (calls backend API)
export const checkOnboardingStatus = async (user: any): Promise<OnboardingStatus | null> => {
  if (!user) return null;
  
  try {
    const response = await onboardingAPI.checkStatus();
    return response.data;
  } catch (error) {
    console.error('❌ Error checking onboarding status:', error);
    return null;
  }
};

// Helper function to get saved onboarding data by email
export const getSavedOnboardingData = async (email: string) => {
  try {
    const response = await onboardingAPI.getDataByEmail(email);
    return response.data;
  } catch (error) {
    console.error('❌ Error getting saved onboarding data:', error);
    return null;
  }
}; 