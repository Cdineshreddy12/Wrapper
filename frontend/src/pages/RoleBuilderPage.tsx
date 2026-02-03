import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container } from '@/components/common/Page';
import { Button } from '@/components/ui/button';
import { ApplicationModuleRoleBuilder } from '@/features/roles/ApplicationModuleRoleBuilder';
import { useRoles } from '@/hooks/useSharedQueries';
import AnimatedLoader from '@/components/common/AnimatedLoader';
import { AlertCircle } from 'lucide-react';

export function RoleBuilderPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const isEditMode = !!roleId;
  
  // Fetch role if editing
  const { data: rolesData = [], isLoading } = useRoles({});
  const initialRole = React.useMemo(() => {
    if (!isEditMode || !roleId) return null;
    return rolesData.find((r: any) => r.roleId === roleId || r.id === roleId) || null;
  }, [rolesData, roleId, isEditMode]);

  const handleSave = async (_role?: any) => {
    // ApplicationModuleRoleBuilder already performs the create/update via
    // /api/custom-roles/create-from-builder or update-from-builder and only
    // calls onSave after success. So we just redirect to the roles dashboard.
    navigate('/dashboard/roles');
  };

  const handleCancel = () => {
    navigate('/dashboard/roles');
  };

  if (isEditMode && isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <AnimatedLoader size="md" />
        </div>
      </Container>
    );
  }

  if (isEditMode && !initialRole) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-gray-400" />
          <h2 className="text-xl font-semibold">Role Not Found</h2>
          <p className="text-gray-600">The role you're trying to edit doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard/roles')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roles
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Roles
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">
              {isEditMode ? 'Edit Role' : 'Create New Role'}
            </h1>
          </div>
        </div>

        {/* Role Builder */}
        <ApplicationModuleRoleBuilder
          onSave={handleSave}
          onCancel={handleCancel}
          initialRole={initialRole || undefined}
        />
      </div>
    </Container>
  );
}
