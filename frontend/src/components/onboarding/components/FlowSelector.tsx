import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { flowConfigs } from '../config/flowConfigs';
import { cn } from '@/lib/utils';

interface FlowSelectorProps {
  onFlowSelect: (flowId: 'newBusiness' | 'existingBusiness') => void;
  selectedFlow?: 'newBusiness' | 'existingBusiness';
  className?: string;
}

export const FlowSelector: React.FC<FlowSelectorProps> = ({
  onFlowSelect,
  selectedFlow,
  className
}) => {
  return (
    <div className={cn('min-h-screen bg-gray-50 flex items-center justify-center p-8', className)}>
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Company Onboarding
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your onboarding flow to get started with setting up your company
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {flowConfigs.map((flow) => {
            const IconComponent = flow.icon;
            const isSelected = selectedFlow === flow.id;
            
            return (
              <Card
                key={flow.id}
                className={cn(
                  'cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105',
                  isSelected 
                    ? `border-${flow.color}-500 shadow-lg ring-2 ring-${flow.color}-200` 
                    : 'hover:border-gray-300'
                )}
                onClick={() => onFlowSelect(flow.id)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={cn(
                    'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
                    flow.color === 'green' ? 'bg-green-100' : 'bg-blue-100'
                  )}>
                    <IconComponent className={cn('w-8 h-8', flow.color === 'green' ? 'text-green-600' : 'text-blue-600')} />
                  </div>
                  <CardTitle className={cn(
                    'text-2xl font-bold',
                    isSelected ? (flow.color === 'green' ? 'text-green-700' : 'text-blue-700') : 'text-gray-900'
                  )}>
                    {flow.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base leading-relaxed">
                    {flow.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Steps:</span>
                      <span className="font-medium">{flow.steps.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Estimated time:</span>
                      <span className="font-medium">
                        {flow.id === 'newBusiness' ? '10-15 min' : '15-20 min'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Type:</span>
                      <span className="font-medium">
                        {flow.id === 'newBusiness' ? 'New Company' : 'Existing Company'}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    className={cn(
                      'w-full mt-6',
                      flow.color === 'green' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-blue-600 hover:bg-blue-700',
                      isSelected && 'ring-2 ring-white'
                    )}
                    variant={isSelected ? 'default' : 'outline'}
                  >
                    {isSelected ? 'Selected' : 'Select This Flow'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectedFlow && (
          <div className="mt-8 text-center">
            <Button
              onClick={() => onFlowSelect(selectedFlow)}
              className="px-8 py-3 text-lg"
              size="lg"
            >
              Continue with {flowConfigs.find(f => f.id === selectedFlow)?.title}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
