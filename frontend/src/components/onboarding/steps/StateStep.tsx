import { Button } from '@/components/ui/button';
import { STATES } from '../schemas';

interface StateStepProps {
  selectedState: string;
  onSelect: (stateId: string) => void;
}

export const StateStep = ({ selectedState, onSelect }: StateStepProps) => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Choose the state
      </h1>
      <p className="text-gray-600 text-lg mb-12">
        Select the state in which you want to incorporate<br />
        your new company.
      </p>
      <div className="flex space-x-8">
        {STATES.map((state) => (
          <Button
            key={state.id}
            type="button"
            variant="outline"
            onClick={() => onSelect(state.id)}
            className={`w-40 h-40 border-2 rounded-xl text-center transition-colors duration-200 ease-out flex flex-col items-center justify-center space-y-4 ${
              selectedState === state.id 
                ? 'border-blue-500 bg-blue-50 shadow-sm' 
                : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
            }`}
          >
            <div className="w-12 h-12 flex items-center justify-center">
              {state.id === 'delaware' ? (
                <div className="relative">
                  <div className="w-8 h-10 bg-blue-500 rounded-t"></div>
                  <div className="absolute top-1 left-1 w-2 h-2 bg-white"></div>
                  <div className="absolute top-1 right-1 w-2 h-2 bg-white"></div>
                  <div className="absolute top-4 left-1 w-2 h-2 bg-white"></div>
                  <div className="absolute top-4 right-1 w-2 h-2 bg-white"></div>
                  <div className="absolute top-7 left-1 w-6 h-2 bg-white"></div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-0 h-0 border-l-6 border-r-6 border-b-8 border-l-transparent border-r-transparent border-b-blue-500"></div>
                  <div className="absolute -top-4 left-2 w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-blue-400"></div>
                  <div className="absolute -top-2 -left-2 w-0 h-0 border-l-4 border-r-4 border-b-6 border-l-transparent border-r-transparent border-b-blue-300"></div>
                </div>
              )}
            </div>
            <span className={`text-sm font-medium tracking-wide transition-colors duration-150 ${
              selectedState === state.id ? 'text-blue-700' : 'text-gray-900'
            }`}>
              {state.name}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};
