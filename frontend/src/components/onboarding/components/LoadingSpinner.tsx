import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  text 
}) => {
  return (
    <div 
      className={cn("flex items-center justify-center", className)}
      role="status"
      aria-live="polite"
      aria-label={text || "Loading"}
    >
      <div className="flex flex-col items-center space-y-2">
        <Loader2 
          className={cn("animate-spin text-blue-600", sizeClasses[size])}
          aria-hidden="true"
        />
        {text && (
          <p className="text-sm text-gray-600 animate-pulse">{text}</p>
        )}
      </div>
    </div>
  );
};
