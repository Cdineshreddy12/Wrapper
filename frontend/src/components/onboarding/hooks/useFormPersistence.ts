import React, { useEffect, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';

const STORAGE_KEY = 'onboarding-form-data';
const STORAGE_VERSION = '1.0.0';

interface PersistedData {
  version: string;
  flow: 'newBusiness' | 'existingBusiness';
  data: newBusinessData | existingBusinessData;
  timestamp: number;
  currentStep: number;
}

export const useFormPersistence = (
  form: UseFormReturn<newBusinessData | existingBusinessData>,
  flow: 'newBusiness' | 'existingBusiness',
  currentStep: number
) => {
  const [isLoading, setIsLoading] = React.useState(false);
  // Save form data to localStorage
  const saveFormData = useCallback(() => {
    try {
      const formData = form.getValues();
      const persistedData: PersistedData = {
        version: STORAGE_VERSION,
        flow,
        data: formData,
        timestamp: Date.now(),
        currentStep
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedData));
    } catch (error) {
      console.warn('Failed to save form data to localStorage:', error);
      // Could emit an event or show a toast notification here
    }
  }, [form, flow, currentStep]);

  // Load form data from localStorage
  const loadFormData = useCallback((): PersistedData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const persistedData: PersistedData = JSON.parse(stored);
      
      // Check if the stored data is for the same flow and version
      if (persistedData.flow !== flow || persistedData.version !== STORAGE_VERSION) {
        return null;
      }

      // Check if data is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - persistedData.timestamp > maxAge) {
        return null;
      }

      return persistedData;
    } catch (error) {
      console.warn('Failed to load form data from localStorage:', error);
      return null;
    }
  }, [flow]);

  // Clear saved form data
  const clearFormData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear form data from localStorage:', error);
      // Could emit an event or show a toast notification here
    }
  }, []);

  // Auto-save form data when it changes with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const subscription = form.watch(() => {
      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Debounce the save operation
      timeoutId = setTimeout(() => {
        saveFormData();
      }, 1000);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [form, saveFormData]);

  // Load form data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const persistedData = loadFormData();
        if (persistedData) {
          // Restore form data
          Object.keys(persistedData.data).forEach(key => {
            const value = (persistedData.data as any)[key];
            if (value !== undefined && value !== null) {
              form.setValue(key as any, value, { shouldValidate: false });
            }
          });
        }
      } catch (error) {
        console.warn('Failed to load persisted form data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [form, loadFormData]);

  return {
    saveFormData,
    loadFormData,
    clearFormData,
    isLoading,
    hasPersistedData: loadFormData() !== null
  };
};
