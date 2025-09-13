import { memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData } from '../schemas';
import { StepConfig } from '../config/flowConfigs';
import { CompanyTypeStep } from '../steps/CompanyTypeStep';
import { StateStep } from '../steps/StateStep';
import { BusinessDetailsStep } from '../steps/BusinessDetailsStep';
import { TeamStep } from '../steps/TeamStep';
import { PersonalDetailsStep } from '../steps/PersonalDetailsStep';
import { TaxDetailsStep } from '../steps/TaxDetailsStep';
import { AdminDetailsStep } from '../steps/AdminDetailsStep';
import { ReviewStep } from '../steps/ReviewStep';

interface StepRendererProps {
  currentStep: number;
  stepsConfig: StepConfig[];
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  onCompanyTypeSelect: (typeId: string) => void;
  onStateSelect: (stateId: string) => void;
  onAddTeamMember: () => void;
  onUpdateTeamMember: (id: number, field: keyof import('../schemas').TeamMember, value: string) => void;
  onRemoveTeamMember: (id: number) => void;
  onEditStep?: (stepNumber: number) => void;
}

export const StepRenderer = memo(({
  currentStep,
  stepsConfig,
  form,
  onCompanyTypeSelect,
  onStateSelect,
  onAddTeamMember,
  onUpdateTeamMember,
  onRemoveTeamMember,
  onEditStep
}: StepRendererProps) => {
  const currentStepConfig = stepsConfig.find(step => step.number === currentStep);
  
  
  if (!currentStepConfig) {
    return <div>Step not found</div>;
  }

  // Render step based on step ID instead of hardcoded numbers
  switch (currentStepConfig.id) {
    case 'companyType':
      return (
        <CompanyTypeStep
          selectedType={form.watch('companyType')}
          onSelect={onCompanyTypeSelect}
        />
      );
    case 'state':
      return (
        <StateStep
          selectedState={form.watch('state')}
          onSelect={onStateSelect}
        />
      );
    case 'businessDetails':
      return <BusinessDetailsStep form={form} />;
    case 'team':
      return (
        <TeamStep
          form={form}
          onAddMember={onAddTeamMember}
          onUpdateMember={onUpdateTeamMember}
          onRemoveMember={onRemoveTeamMember}
        />
      );
    case 'personalDetails':
      return <PersonalDetailsStep form={form} />;
    case 'taxDetails':
      return <TaxDetailsStep form={form} />;
    case 'adminDetails':
      return <AdminDetailsStep form={form} />;
    case 'review':
      return <ReviewStep form={form} onEditStep={onEditStep} />;
    default:
      return <div>Unknown step: {currentStepConfig.id}</div>;
  }
});
