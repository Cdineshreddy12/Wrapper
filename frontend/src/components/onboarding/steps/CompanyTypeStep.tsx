import { Button } from '@/components/ui/button';
import { COMPANY_TYPES } from '../schemas';

interface CompanyTypeStepProps {
  selectedType: string;
  onSelect: (typeId: string) => void;
}

export const CompanyTypeStep = ({ selectedType, onSelect }: CompanyTypeStepProps) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Choose company type
      </h1>
      <p className="text-gray-600 text-lg mb-12">
        Select the type of company you want to incorporate.
      </p>
      <div className="space-y-4 max-w-lg">
        {COMPANY_TYPES.map((type) => (
          <Button
            key={type.id}
            type="button"
            variant="outline"
            onClick={() => onSelect(type.id)}
            className={`w-full p-6 h-auto border-2 rounded-xl text-left transition-colors duration-200 ease-out justify-start ${
              selectedType === type.id 
                ? 'border-blue-500 bg-blue-50 shadow-sm' 
                : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
            }`}
          >
            <div className="text-left">
              <h3 className={`font-semibold text-lg transition-colors duration-150 ${
                selectedType === type.id ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {type.name}
              </h3>
              <p className={`mt-1 transition-colors duration-150 ${
                selectedType === type.id ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {type.description}
              </p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
