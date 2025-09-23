import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps } from '../types';
import { cn } from '@/lib/utils';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Textarea field component using shadcn Form components
 */
export const TextareaField: React.FC<FieldComponentProps> = ({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  className
}) => {
  return (
    <FormField
      name={field.id}
      render={({ field: formField }) => (
        <FormItem className={cn(className)}>
          <FormLabel className={cn(
            field.required && "after:content-['*'] after:ml-0.5 after:text-destructive"
          )}>
            {field.label}
          </FormLabel>
          
          <FormControl>
            <Textarea
              {...formField}
              value={value || ''}
              onChange={(e) => {
                formField.onChange(e);
                onChange(e.target.value);
              }}
              onBlur={(e) => {
                formField.onBlur(e);
                onBlur?.();
              }}
              placeholder={field.placeholder}
              disabled={disabled || field.disabled}
              rows={field.rows || 3}
              minLength={field.minLength}
              maxLength={field.maxLength}
              required={field.required}
            />
          </FormControl>
          
          {field.helpText && (
            <FormDescription>
              {field.helpText}
            </FormDescription>
          )}
          
          <ConditionalErrorMessage fieldName={field.id} />
        </FormItem>
      )}
    />
  );
};
