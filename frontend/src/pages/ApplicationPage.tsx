import { Container } from "@/components/common/Page";
import { Section } from "@/components/common/Page/Section";
import { useApplications } from "@/hooks/useApplications";
import { ApplicationGrid } from "@/components/application/ApplicationGrid";
import { ApplicationDetailsModal } from "@/components/application/ApplicationDetailsModal";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingState } from "@/components/application/LoadingState";
import { Package, RefreshCw } from "lucide-react";

/**
 * Applications Tab Component
 * Displays and manages organization applications using Section components
 */
export function ApplicationPage() {
  const {
    applications,
    isLoading,
    selectedApp,
    showAppDetails,
    handleRefresh,
    handleViewApp,
    handleCloseAppDetails,
  } = useApplications();

  return (
    <Container>
      {/* Applications Overview Section */}
      <Section
        title="Applications"
        description={`${applications.length} application${
          applications.length !== 1 ? "s" : ""
        } available`}
        headerActions={[
          {
            label: "Refresh",
            onClick: handleRefresh,
            icon: RefreshCw,
            variant: "outline",
            loading: isLoading,
          },
        ]}
        showDivider
      >
        {isLoading ? (
          <LoadingState />
        ) : applications.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Applications Available"
            description="Contact your administrator to enable applications for your organization."
            action={{
              label: "Check Again",
              onClick: handleRefresh,
              variant: "outline",
            }}
            isLoading={isLoading}
            showCard={false}
            variant="minimal"
          />
        ) : (
          <ApplicationGrid
            applications={applications}
            onViewApplication={handleViewApp}
          />
        )}
      </Section>

      {/* Application Details Modal */}
      <ApplicationDetailsModal
        application={selectedApp}
        isOpen={showAppDetails}
        onClose={handleCloseAppDetails}
      />
    </Container>
  );
}
