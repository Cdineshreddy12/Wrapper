import { Container } from "@/components/common/Page";
import { useApplications } from "@/hooks/useApplications";
import { ApplicationHeader } from "@/components/application/ApplicationHeader";
import { ApplicationGrid } from "@/components/application/ApplicationGrid";
import { ApplicationDetailsModal } from "@/components/application/ApplicationDetailsModal";
import { EmptyState } from "@/components/application/EmptyState";
import { LoadingState } from "@/components/application/LoadingState";

/**
 * Applications Tab Component
 * Displays and manages organization applications
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

    if (isLoading) {
        return <LoadingState />;
    }

    return (
        <Container>
            <ApplicationHeader
                applicationCount={applications.length}
                isLoading={isLoading}
                onRefresh={handleRefresh}
            />

            {applications.length === 0 ? (
                <EmptyState isLoading={isLoading} onRefresh={handleRefresh} />
            ) : (
                <>
                    <ApplicationGrid
                        applications={applications}
                        onViewApplication={handleViewApp}
                    />

                    <ApplicationDetailsModal
                        application={selectedApp}
                        isOpen={showAppDetails}
                        onClose={handleCloseAppDetails}
                    />
                </>
            )}
        </Container>
    );
} 