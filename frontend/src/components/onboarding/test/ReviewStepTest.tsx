import React from 'react';
import { OnboardingForm } from '../OnboardingForm';

export const ReviewStepTest = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Review Step Test</h1>
          <p className="text-gray-600">
            Test the review step functionality for both flows. 
            Fill out the forms and reach the review step to see all collected data.
          </p>
        </div>
        
        <OnboardingForm />
        
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Test Instructions:</h3>
          <ul className="text-blue-700 space-y-1 text-sm">
            <li>• Select either "New Business" or "Existing Business" flow</li>
            <li>• Fill out all the required information in each step</li>
            <li>• Reach the final "Review" step to see all collected data</li>
            <li>• Use the "Edit" buttons to navigate back to specific steps</li>
            <li>• Submit the form from the review step</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
