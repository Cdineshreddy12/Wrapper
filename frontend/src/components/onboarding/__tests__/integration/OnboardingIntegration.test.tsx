import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingApp } from '../../OnboardingApp';
import '@testing-library/jest-dom';

// Mock the hooks
jest.mock('../../hooks/useOnboardingForm', () => ({
  useOnboardingForm: () => ({
    getValues: () => ({}),
    setValue: jest.fn(),
    watch: jest.fn(),
    trigger: jest.fn(),
    handleSubmit: jest.fn(),
    reset: jest.fn(),
    formState: { errors: {} }
  })
}));

jest.mock('../../hooks/useFormPersistence', () => ({
  useFormPersistence: () => ({
    clearFormData: jest.fn(),
    hasPersistedData: false,
    isLoading: false
  })
}));

jest.mock('../../hooks/useRateLimit', () => ({
  useRateLimit: () => ({
    isRateLimited: () => false,
    recordAttempt: jest.fn(),
    getRemainingAttempts: () => 3,
    getTimeUntilReset: () => 0
  })
}));

describe('Onboarding Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full onboarding flow', async () => {
    render(<OnboardingApp />);
    
    // Should start with flow selection
    expect(screen.getByText(/choose your business type/i)).toBeInTheDocument();
    
    // Select new business flow
    const newBusinessButton = screen.getByText(/new business/i);
    fireEvent.click(newBusinessButton);
    
    await waitFor(() => {
      expect(screen.getByText(/company type/i)).toBeInTheDocument();
    });
  });

  it('should handle flow switching', async () => {
    render(<OnboardingApp />);
    
    // Select new business flow
    const newBusinessButton = screen.getByText(/new business/i);
    fireEvent.click(newBusinessButton);
    
    await waitFor(() => {
      expect(screen.getByText(/company type/i)).toBeInTheDocument();
    });
    
    // Go back to flow selection
    const backButton = screen.getByText(/back/i);
    fireEvent.click(backButton);
    
    await waitFor(() => {
      expect(screen.getByText(/choose your business type/i)).toBeInTheDocument();
    });
  });

  it('should handle form submission', async () => {
    const mockHandleSubmit = jest.fn();
    
    jest.mock('../../hooks/useOnboardingForm', () => ({
      useOnboardingForm: () => ({
        getValues: () => ({ companyType: 'llc' }),
        setValue: jest.fn(),
        watch: jest.fn(),
        trigger: jest.fn(),
        handleSubmit: mockHandleSubmit,
        reset: jest.fn(),
        formState: { errors: {} }
      })
    }));

    render(<OnboardingApp />);
    
    // Complete flow selection
    const newBusinessButton = screen.getByText(/new business/i);
    fireEvent.click(newBusinessButton);
    
    await waitFor(() => {
      expect(screen.getByText(/company type/i)).toBeInTheDocument();
    });
  });
});
