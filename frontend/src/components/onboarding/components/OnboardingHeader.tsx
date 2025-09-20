import React from 'react';

export const OnboardingHeader = () => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-medium text-gray-900">StartGlobal</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Having troubles?</span>
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            Get Help
          </button>
        </div>
      </div>
    </div>
  );
};
