import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { FieldComponentProps, SelectField as SelectFieldType, SelectOption } from '../types';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import { ConditionalErrorMessage } from '../components/ConditionalErrorMessage';

/**
 * Select field component using shadcn Form components
 */
export const SelectField: React.FC<FieldComponentProps> = ({
  field,
  value,
  onChange,
  onBlur,
  disabled,
  className
}) => {
  const selectField = field as SelectFieldType;
  const selectedOption = selectField.options?.find(option => String(option.value) === String(value));

  return (
    <FormField
      name={field.id}
      render={({ field: formField }) => (
        <FormItem className={cn('space-y-2', className)}>
          <FormLabel className={cn(
            'text-sm font-medium text-gray-700 mb-2 block',
            field.required && "after:content-['*'] after:ml-0.5 after:text-red-500"
          )}>
            {field.label}
            <button
              type="button"
              className="ml-2 w-4 h-4 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center text-xs"
              title="More information"
            >
              ?
            </button>
          </FormLabel>
          
          <Select
            value={value || ''}
            onValueChange={(newValue) => {
              formField.onChange(newValue);
              onChange(newValue);
            }}
            disabled={disabled || field.disabled}
            required={field.required}
          >
            <FormControl>
              <SelectTrigger className={cn(
                'w-full h-12 px-4 py-3 text-sm',
                'border border-gray-300 bg-white rounded-lg',
                'hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
                'data-[placeholder]:text-gray-400'
              )}>
                <div className="flex items-center gap-3">
                  {selectedOption && (
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-blue-600" />
                      <span className="truncate text-gray-900">{selectedOption.label}</span>
                    </div>
                  )}
                  {!selectedOption && (
                    <span className="text-gray-400">
                      {field.placeholder || 'Select an option'}
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </SelectTrigger>
            </FormControl>
            
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {selectField.options?.map((option: SelectOption) => (
                <SelectItem
                  key={option.value}
                  value={String(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2.5 pl-8 pr-2 text-sm',
                    'outline-none focus:bg-accent focus:text-accent-foreground',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="truncate">{option.label}</span>
                  </div>
                  <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-3 w-3" />
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {field.helpText && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">ℹ</div>
              <p className="text-sm text-blue-800 leading-relaxed">
                {field.helpText}
              </p>
            </div>
          )}
          
          <ConditionalErrorMessage fieldName={field.id} />
        </FormItem>
      )}
    />
  );
};
