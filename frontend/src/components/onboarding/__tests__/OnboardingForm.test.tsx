import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingApp } from '../OnboardingApp';
import '@testing-library/jest-dom';

// Mock the hooks
jest.mock('../hooks/useOnboardingForm', () => ({
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

jest.mock('../hooks/useFormPersistence', () => ({
  useFormPersistence: () => ({
    clearFormData: jest.fn(),
    hasPersistedData: false
  })
}));

describe('OnboardingForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders flow selector initially', () => {
    render(<OnboardingApp />);
    expect(screen.getByText(/choose your business type/i)).toBeInTheDocument();
  });

  it('shows new business option', () => {
    render(<OnboardingApp />);
    expect(screen.getByText(/new business/i)).toBeInTheDocument();
  });

  it('shows existing business option', () => {
    render(<OnboardingApp />);
    expect(screen.getByText(/existing business/i)).toBeInTheDocument();
  });

  it('handles flow selection', async () => {
    render(<OnboardingApp />);
    
    const newBusinessButton = screen.getByText(/new business/i);
    fireEvent.click(newBusinessButton);
    
    await waitFor(() => {
      expect(screen.getByText(/company type/i)).toBeInTheDocument();
    });
  });
});
