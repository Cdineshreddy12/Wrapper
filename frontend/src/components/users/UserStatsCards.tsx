import { Users, Activity, Clock, Crown } from 'lucide-react';
import { StatsCard } from '@/components/ui/stats-card';

interface User {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
  isTenantAdmin: boolean;
  onboardingCompleted: boolean;
}

interface UserStatsCardsProps {
  users: User[];
  selectedEntityId: string | null;
}

export function UserStatsCards({ users, selectedEntityId }: UserStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatsCard
        title={`Total Users ${selectedEntityId ? '(Filtered)' : ''}`}
        value={users.length}
        description="All registered users" 
        icon={Users}
      />

      <StatsCard
        title="Active Users"
        value={users.filter(u => u.isActive && u.onboardingCompleted).length}
        description="Completed onboarding"
        icon={Activity}
      />

      <StatsCard
        title="Pending Invites"
        value={users.filter(u => !u.isActive).length}
        description="Awaiting activation"
        icon={Clock}
      />

      <StatsCard
        title="Admins"
        value={users.filter(u => u.isTenantAdmin).length}
        description="Administrative users"
        icon={Crown}
      />
    </div>
  );
}
