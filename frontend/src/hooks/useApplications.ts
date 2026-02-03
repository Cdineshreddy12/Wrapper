import { useState, useCallback, useMemo } from "react";
import useOrganizationAuth from "./useOrganizationAuth";
import { useTenantApplications } from "./useSharedQueries";
import { Application } from "@/types/application";
import toast from "react-hot-toast";

export function useApplications() {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showAppDetails, setShowAppDetails] = useState(false);

  const { tenantId } = useOrganizationAuth();

  // Use shared hook to avoid duplicate API calls
  const { data: tenantApps = [], isLoading, isFetching, refetch } = useTenantApplications(tenantId);

  /**
   * Normalize applications data to match expected shape (with baseUrl)
   * Also normalize enabledModules to always be an array and enabledModulesPermissions to Record<string, string[]>
   */
  const applications = useMemo(() => {
    return (tenantApps || []).map((app: any) => {
      // Normalize enabledModules to always be an array
      const normalizedEnabledModules = Array.isArray(app.enabledModules) 
        ? app.enabledModules 
        : [];

      // Normalize enabledModulesPermissions to Record<string, string[]> by extracting permission codes
      const normalizedEnabledModulesPermissions: Record<string, string[]> = {};
      if (app.enabledModulesPermissions && typeof app.enabledModulesPermissions === 'object') {
        Object.keys(app.enabledModulesPermissions).forEach((moduleCode) => {
          const permissions = app.enabledModulesPermissions[moduleCode];
          if (Array.isArray(permissions)) {
            // Extract codes from permission objects or use strings directly
            normalizedEnabledModulesPermissions[moduleCode] = permissions.map((p: any) => 
              typeof p === 'string' ? p : (p?.code || p?.name || '')
            ).filter(Boolean);
          }
        });
      }

      return {
        ...app,
        baseUrl: app.baseUrl || app.base_url || app.baseurl || "",
        enabledModules: normalizedEnabledModules,
        enabledModulesPermissions: normalizedEnabledModulesPermissions,
      };
    });
  }, [tenantApps]);

  /**
   * Refresh applications data
   */
  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success("Applications refreshed successfully");
  }, [refetch]);

  /**
   * Handle viewing application details in modal
   */
  const handleViewApp = useCallback((app: Application) => {
    setSelectedApp(app);
    setShowAppDetails(true);
  }, []);

  /**
   * Close application details modal
   */
  const handleCloseAppDetails = useCallback(() => {
    setShowAppDetails(false);
    setSelectedApp(null);
  }, []);

  // Show loading when initially loading or when fetching and we still have no data (e.g. placeholderData)
  const isInitialLoading = isLoading || (isFetching && applications.length === 0);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    applications,
    isLoading: isInitialLoading,
    isFetching,
    selectedApp,
    showAppDetails,
    fetchApplications: handleRefresh, // Alias for compatibility
    handleRefresh,
    handleViewApp,
    handleCloseAppDetails,
  }), [
    applications,
    isInitialLoading,
    isFetching,
    selectedApp,
    showAppDetails,
    handleRefresh,
    handleViewApp,
    handleCloseAppDetails,
  ]);

  return returnValue;
}
