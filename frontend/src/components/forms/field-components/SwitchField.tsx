import React from 'react';
import { Switch } from '@/components/ui/switch';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps, SwitchField as SwitchFieldType } from '../types';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Switch field component using shadcn Form components
 */
export const SwitchField: React.FC<FieldComponentProps> = ({
  field,
  value,
  onChange,
  disabled,
  className
}) => {
  const switchField = field as SwitchFieldType;
  const isChecked = Boolean(value);

  return (
    <FormField
      name={field.id}
      render={({ field: formField }) => (
        <FormItem className={cn('space-y-3', className)}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <FormLabel className={cn(
                'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                field.required && "after:content-['*'] after:ml-0.5 after:text-destructive"
              )}>
                {switchField.switchLabel || field.label}
              </FormLabel>
              
              {field.helpText && (
                <FormDescription className="text-xs text-muted-foreground">
                  {field.helpText}
                </FormDescription>
              )}
            </div>
            
            <FormControl>
              <div className="relative">
                <Switch
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    formField.onChange(checked);
                    onChange(checked);
                  }}
                  disabled={disabled || field.disabled}
                  required={field.required}
                  className={cn(
                    'data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
                    'transition-all duration-200 ease-in-out',
                    'hover:scale-105 active:scale-95'
                  )}
                />
                {isChecked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </FormControl>
          </div>
          
          <ConditionalErrorMessage fieldName={field.id} />
        </FormItem>
      )}
    />
  );
};
