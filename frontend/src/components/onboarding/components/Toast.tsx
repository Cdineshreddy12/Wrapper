import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a fallback implementation when used outside ToastProvider
    return {
      addToast: (toast: Omit<Toast, 'id'>) => {
        console.warn('Toast not available - addToast called:', toast);
      },
      removeToast: (id: string) => {
        console.warn('Toast not available - removeToast called:', id);
      },
      clearToasts: () => {
        console.warn('Toast not available - clearToasts called');
      }
    };
  }
  return context;
};

const ToastIcon = ({ type }: { type: ToastType }) => {
  const iconClasses = "w-4 h-4";
  
  switch (type) {
    case 'success':
      return <CheckCircle className={cn(iconClasses, "text-green-600")} />;
    case 'error':
      return <XCircle className={cn(iconClasses, "text-red-600")} />;
    case 'warning':
      return <AlertTriangle className={cn(iconClasses, "text-yellow-600")} />;
    case 'info':
      return <Info className={cn(iconClasses, "text-blue-600")} />;
  }
};

const ToastComponent: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ 
  toast, 
  onRemove 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove(toast.id), 300); // Allow fade out animation
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onRemove]);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getAlertClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getTitleClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
    }
  };

  const getDescriptionClasses = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'warning':
        return 'text-yellow-700';
      case 'info':
        return 'text-blue-700';
    }
  };

  return (
    <div
      className={cn(
        "transform transition-all duration-300 ease-in-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      <Alert className={cn("relative pr-8", getAlertClasses())}>
        <ToastIcon type={toast.type} />
        <AlertTitle className={getTitleClasses()}>{toast.title}</AlertTitle>
        {toast.description && (
          <AlertDescription className={cn("mt-1", getDescriptionClasses())}>
            {toast.description}
          </AlertDescription>
        )}
        {toast.action && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toast.action.onClick}
              className="text-xs"
            >
              {toast.action.label}
            </Button>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="w-3 h-3" />
        </Button>
      </Alert>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(toast => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
