import { useState } from "react";
import { TabNavigation, TabItem } from "@/components/common/TabNavigation";
import { Section } from "@/components/common/Page/Section";
import { Typography } from "@/components/common/Typography";
import { EmptyState } from "@/components/common/EmptyState";
import {
  OrganizationUserManagement,
  OrganizationTreeManagement,
} from "./organization";
import { Building, Users } from "lucide-react";
import { Employee } from "@/types/organization";
import { Application } from "@/hooks/useDashboardData";
import { Container } from "./common/Page";

interface OrganizationManagementProps {
  employees: Employee[];
  applications: Application[];
  isAdmin: boolean;
  makeRequest: (endpoint: string, options?: RequestInit) => Promise<any>;
  loadDashboardData: () => void;
  inviteEmployee: () => void;
  tenantId?: string;
}

// Main OrganizationManagement component that combines all sub-components
export function OrganizationManagement({
  employees,
  isAdmin,
  makeRequest,
  loadDashboardData,
  inviteEmployee,
  tenantId,
}: Omit<OrganizationManagementProps, "applications">) {
  const [activeTab, setActiveTab] = useState("hierarchy");

  const tabs: TabItem[] = [
    {
      id: "hierarchy",
      label: "Hierarchy",
      icon: Building,
      content: tenantId ? (
              <OrganizationTreeManagement
                tenantId={tenantId}
                isAdmin={isAdmin}
                makeRequest={makeRequest}
              />
            ) : (
        <EmptyState
          icon={Building}
          title="Unable to Load Organization Hierarchy"
          description="Tenant information is not available. Please refresh the page or contact support."
                variant="minimal"
          showCard={false}
        />
      ),
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      content: (
            <OrganizationUserManagement
              employees={employees}
              isAdmin={isAdmin}
              makeRequest={makeRequest}
              loadDashboardData={loadDashboardData}
              inviteEmployee={inviteEmployee}
            />
      ),
    },
  ];

  return (
    <Container>
      <Section
        title="Organization Management"
        description="Manage your organization's structure and users"
        showDivider
      >
        <Typography variant="lead">
          Comprehensive management of your organization's hierarchy and team
          members
        </Typography>
        <TabNavigation
          tabs={tabs}
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
          variant="underline"
          size="md"
        />
      </Section>
    </Container>
  );
}

export default OrganizationManagement;
