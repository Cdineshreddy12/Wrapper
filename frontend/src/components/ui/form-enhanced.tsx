import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

// Enhanced Input with better styling
interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  error?: string
  success?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  loading?: boolean
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    label, 
    description, 
    error, 
    success,
    leftIcon,
    rightIcon,
    loading = false,
    ...props 
  }, ref) => {
    const hasError = !!error
    const hasSuccess = !!success && !hasError

    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-sm font-medium text-foreground">
            {label}
          </Label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <Input
            ref={ref}
            className={cn(
              "transition-all duration-200",
              leftIcon && "pl-10",
              (rightIcon || loading) && "pr-10",
              hasError && "border-destructive focus:ring-destructive/20",
              hasSuccess && "border-success focus:ring-success/20",
              className
            )}
            {...props}
          />
          
          {(rightIcon || loading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>
        
        {description && !hasError && !hasSuccess && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        
        {hasError && (
          <div className="flex items-center space-x-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{error}</span>
          </div>
        )}
        
        {hasSuccess && (
          <div className="flex items-center space-x-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            <span>{success}</span>
          </div>
        )}
      </div>
    )
  }
)
EnhancedInput.displayName = "EnhancedInput"

// Enhanced Textarea
interface EnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  description?: string
  error?: string
  success?: string
  maxLength?: number
  showCount?: boolean
}

const EnhancedTextarea = React.forwardRef<HTMLTextAreaElement, EnhancedTextareaProps>(
  ({ 
    className, 
    label, 
    description, 
    error, 
    success,
    maxLength,
    showCount = false,
    ...props 
  }, ref) => {
    const hasError = !!error
    const hasSuccess = !!success && !hasError
    const currentLength = (props.value as string)?.length || 0

    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-sm font-medium text-foreground">
            {label}
          </Label>
        )}
        
        <div className="relative">
          <Textarea
            ref={ref}
            className={cn(
              "transition-all duration-200 resize-none",
              hasError && "border-destructive focus:ring-destructive/20",
              hasSuccess && "border-success focus:ring-success/20",
              className
            )}
            maxLength={maxLength}
            {...props}
          />
          
          {showCount && maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
              {currentLength}/{maxLength}
            </div>
          )}
        </div>
        
        {description && !hasError && !hasSuccess && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        
        {hasError && (
          <div className="flex items-center space-x-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{error}</span>
          </div>
        )}
        
        {hasSuccess && (
          <div className="flex items-center space-x-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            <span>{success}</span>
          </div>
        )}
      </div>
    )
  }
)
EnhancedTextarea.displayName = "EnhancedTextarea"

// Enhanced Select
interface EnhancedSelectProps {
  label?: string
  description?: string
  error?: string
  success?: string
  placeholder?: string
  options: { value: string; label: string; disabled?: boolean }[]
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  loading?: boolean
}

const EnhancedSelect = React.forwardRef<HTMLButtonElement, EnhancedSelectProps>(
  ({ 
    label, 
    description, 
    error, 
    success,
    placeholder = "Select an option",
    options,
    value,
    onValueChange,
    disabled = false,
    loading = false,
    ...props 
  }, ref) => {
    const hasError = !!error
    const hasSuccess = !!success && !hasError

    return (
      <div className="space-y-2">
        {label && (
          <Label className="text-sm font-medium text-foreground">
            {label}
          </Label>
        )}
        
        <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
          <SelectTrigger
            ref={ref}
            className={cn(
              "transition-all duration-200",
              hasError && "border-destructive focus:ring-destructive/20",
              hasSuccess && "border-success focus:ring-success/20"
            )}
            {...props}
          >
            <SelectValue placeholder={loading ? "Loading..." : placeholder} />
          </SelectTrigger>
          
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {description && !hasError && !hasSuccess && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
        
        {hasError && (
          <div className="flex items-center space-x-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            <span>{error}</span>
          </div>
        )}
        
        {hasSuccess && (
          <div className="flex items-center space-x-1 text-xs text-success">
            <CheckCircle2 className="h-3 w-3" />
            <span>{success}</span>
          </div>
        )}
      </div>
    )
  }
)
EnhancedSelect.displayName = "EnhancedSelect"

// Form Actions Component
interface FormActionsProps {
  onSubmit: () => void
  onCancel?: () => void
  onReset?: () => void
  submitLabel?: string
  cancelLabel?: string
  resetLabel?: string
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ 
    onSubmit,
    onCancel,
    onReset,
    submitLabel = "Submit",
    cancelLabel = "Cancel",
    resetLabel = "Reset",
    isLoading = false,
    disabled = false,
    className
  }, ref) => {
    return (
      <div ref={ref} className={cn("flex items-center space-x-3 pt-6", className)}>
        <Button
          type="submit"
          onClick={onSubmit}
          disabled={disabled || isLoading}
          className="min-w-[100px]"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
        )}
        
        {onReset && (
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={isLoading}
          >
            {resetLabel}
          </Button>
        )}
      </div>
    )
  }
)
FormActions.displayName = "FormActions"

// Form Section Component
interface FormSectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ title, description, children, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-semibold text-foreground">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        
        <div className="space-y-4">
          {children}
        </div>
      </div>
    )
  }
)
FormSection.displayName = "FormSection"

export {
  EnhancedInput,
  EnhancedTextarea,
  EnhancedSelect,
  FormActions,
  FormSection
}
