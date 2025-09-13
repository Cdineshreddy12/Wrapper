import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData, TeamMember } from '../schemas';

interface TeamStepProps {
  form: UseFormReturn<newBusinessData | existingBusinessData>;
  onAddMember: () => void;
  onUpdateMember: (id: number, field: keyof TeamMember, value: string) => void;
  onRemoveMember: (id: number) => void;
}

export const TeamStep = ({ form, onAddMember, onUpdateMember, onRemoveMember }: TeamStepProps) => {
  const team = form.watch('team');

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">Team members</h1>
      <p className="text-gray-600 text-lg mb-12">
        Add team members who will be part of your company.
      </p>
      <div className="max-w-3xl">
        {team.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-4">No team members added yet</p>
            <Button
              type="button"
              onClick={onAddMember}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {team.map((member, index) => (
              <div key={member.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-900">Team Member {index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveMember(member.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    type="text"
                    value={member.name}
                    onChange={(e) => onUpdateMember(member.id, 'name', e.target.value)}
                    placeholder="Full Name"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Input
                    type="text"
                    value={member.role}
                    onChange={(e) => onUpdateMember(member.id, 'role', e.target.value)}
                    placeholder="Role"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Input
                    type="email"
                    value={member.email}
                    onChange={(e) => onUpdateMember(member.id, 'email', e.target.value)}
                    placeholder="Email"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              onClick={onAddMember}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Member</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
