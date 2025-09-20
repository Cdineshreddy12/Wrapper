import React from 'react';
import { FlowConfig } from '../config/flowConfigs';

interface FlowHeaderProps {
  flowConfig: FlowConfig;
  onBackToFlowSelection: () => void;
  className?: string;
}

export const FlowHeader: React.FC<FlowHeaderProps> = ({
  flowConfig,
  onBackToFlowSelection,
  className = ''
}) => {
  return (
    <div className={`absolute top-4 right-4 z-20 ${className}`}>
      <div className="flex items-center space-x-3 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Change Flow Button */}
        <button
          onClick={onBackToFlowSelection}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Change Flow</span>
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-300"></div>

        {/* Selected Flow Display */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${flowConfig.color === 'green' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
          <span className="text-sm font-medium text-gray-700">{flowConfig.title}</span>
        </div>
      </div>
    </div>
  );
};
