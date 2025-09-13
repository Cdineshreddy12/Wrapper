import { UseFormReturn } from 'react-hook-form';
import { newBusinessData, existingBusinessData, TeamMember } from '../schemas';

export const useTeamManagement = (form: UseFormReturn<newBusinessData | existingBusinessData>) => {
  const addTeamMember = () => {
    const newMember: TeamMember = { id: Date.now(), name: '', role: '', email: '' };
    const currentTeam = form.getValues('team');
    form.setValue('team', [...currentTeam, newMember]);
  };

  const updateTeamMember = (id: number, field: keyof TeamMember, value: string) => {
    const currentTeam = form.getValues('team');
    const updatedTeam = currentTeam.map(member => 
      member.id === id ? { ...member, [field]: value } : member
    );
    form.setValue('team', updatedTeam);
  };

  const removeTeamMember = (id: number) => {
    const currentTeam = form.getValues('team');
    const updatedTeam = currentTeam.filter(member => member.id !== id);
    form.setValue('team', updatedTeam);
  };

  return {
    addTeamMember,
    updateTeamMember,
    removeTeamMember
  };
};
