import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge } from "@/components/ui";
import { Application } from "@/types/application";
import { getApplicationIcon } from "@/features/applications/components/applicationUtils";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  Crown,
  CheckCircle,
  XCircle,
  ExternalLink
} from "lucide-react";
import { Container } from '@/components/common/Page';
import { Button } from '@/components/ui/button';
import { useApplications } from '@/hooks/useApplications';
import AnimatedLoader from '@/components/common/AnimatedLoader';
import { AlertCircle } from 'lucide-react';
import { useBreadcrumbLabel } from '@/contexts/BreadcrumbLabelContext';
import { useEffect } from 'react';

export function ApplicationDetailsPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { glassmorphismEnabled } = useTheme();
  const { applications, isLoading } = useApplications();
  const { setLastSegmentLabel } = useBreadcrumbLabel();

  // Find application by appId
  const application = applications.find((app: Application) => app.appId === appId) || null;

  // Set breadcrumb label when application is loaded, clear on unmount
  useEffect(() => {
    if (application?.appName) {
      setLastSegmentLabel(application.appName);
    } else if (application?.appCode) {
      setLastSegmentLabel(application.appCode);
    }
    
    return () => {
      setLastSegmentLabel(null);
    };
  }, [application?.appName, application?.appCode, setLastSegmentLabel]);

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <AnimatedLoader size="md" />
        </div>
      </Container>
    );
  }

  if (!application) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-gray-400" />
          <h2 className="text-xl font-semibold">Application Not Found</h2>
          <p className="text-gray-600">The application you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/dashboard/applications')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </div>
      </Container>
    );
  }

  const {
    appName,
    appCode,
    description,
    subscriptionTier,
    isEnabled,
    modules,
    enabledModules,
    enabledModulesPermissions,
    customPermissions,
    baseUrl,
  } = application;

  const getMetricCardClasses = () => {
    return glassmorphismEnabled
      ? "relative group"
      : "bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm";
  };

  const getMetricCardBackgroundClasses = () => {
    return glassmorphismEnabled
      ? "absolute inset-0 backdrop-blur-3xl bg-gradient-to-br from-purple-200/8 via-violet-200/5 to-indigo-200/6 dark:from-purple-500/6 dark:via-violet-500/3 dark:to-indigo-500/4 rounded-2xl"
      : "";
  };

  const getMetricCardContentClasses = () => {
    return glassmorphismEnabled
      ? "relative p-8 rounded-2xl"
      : "";
  };

  const getIconContainerClasses = (type: string) => {
    if (!glassmorphismEnabled) {
      return "p-3 bg-slate-100 dark:bg-slate-700 rounded-lg";
    }

    switch (type) {
      case 'code':
        return "p-4 bg-gradient-to-br from-white/60 to-white/40 dark:from-white/30 dark:to-white/20 backdrop-blur-md rounded-xl border border-white/30 dark:border-white/20 shadow-lg";
      case 'crown':
        return "p-4 bg-gradient-to-br from-purple-500/15 to-pink-500/15 backdrop-blur-md rounded-xl border border-purple-300/20 shadow-lg";
      case 'link':
        return "p-4 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 backdrop-blur-md rounded-xl border border-cyan-300/20 shadow-lg";
      default:
        return "p-4 bg-gradient-to-br from-white/60 to-white/40 dark:from-white/30 dark:to-white/20 backdrop-blur-md rounded-xl border border-white/30 dark:border-white/20 shadow-lg";
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/applications')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Button>
        </div>

        {/* Header Section */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl",
          glassmorphismEnabled
            ? "bg-gradient-to-br from-violet-100/30 via-purple-100/15 to-indigo-100/10 dark:from-slate-950/40 dark:via-slate-900/25 dark:to-slate-950/40 backdrop-blur-3xl p-8"
            : "bg-slate-50 dark:bg-slate-800 px-8 py-6 border border-slate-200 dark:border-slate-700"
        )}>
          {glassmorphismEnabled && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-200/12 via-violet-200/8 to-indigo-200/10 dark:from-purple-500/10 dark:via-violet-500/6 dark:to-indigo-500/8 backdrop-blur-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-100/8 to-indigo-100/12 dark:via-slate-900/15 dark:to-slate-950/20"></div>
            </>
          )}

          <div className="relative flex items-center gap-4">
            <div className="relative">
              <div className={cn(
                "p-4 rounded-xl",
                glassmorphismEnabled
                  ? "bg-gradient-to-br from-white/80 to-white/60 dark:from-white/30 dark:to-white/20 backdrop-blur-md shadow-xl border border-white/40 dark:border-white/30"
                  : "bg-slate-100 dark:bg-slate-700"
              )}>
                <div className={cn("text-2xl", glassmorphismEnabled ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400")}>
                  {getApplicationIcon(appCode)}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white drop-shadow-sm">
                  {appName || "Unknown Application"}
                </h1>
                <div className={cn(
                  "relative px-3 py-1 rounded-full text-xs font-semibold",
                  glassmorphismEnabled
                    ? `backdrop-blur-sm border shadow-lg ${
                        isEnabled
                          ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                          : 'bg-red-500/20 text-red-200 border-red-400/30'
                      }`
                    : `border ${
                        isEnabled
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
                      }`
                )}>
                  <span className="relative">{isEnabled ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl text-sm">
                {description || "No description available for this application."}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className={cn(
          "relative space-y-10",
          glassmorphismEnabled ? "p-10" : "p-8"
        )}>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Application Code Card */}
            <div className={getMetricCardClasses()}>
              {glassmorphismEnabled && (
                <>
                  <div className={getMetricCardBackgroundClasses()}></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/6 via-transparent to-purple-500/6 rounded-2xl"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/15 to-white/25 dark:via-white/10 dark:to-white/20 rounded-2xl"></div>
                </>
              )}
              <div className={getMetricCardContentClasses()}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Application Code</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{appCode}</p>
                  </div>
                  <div className="relative">
                    <div className={getIconContainerClasses('code')}>
                      <span className="text-slate-800 dark:text-slate-200 font-mono text-sm">{appCode.substring(0, 3)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Plan Card */}
            <div className={getMetricCardClasses()}>
              {glassmorphismEnabled && (
                <>
                  <div className={getMetricCardBackgroundClasses()}></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/6 via-transparent to-pink-500/6 rounded-2xl"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/15 to-white/25 dark:via-white/10 dark:to-white/20 rounded-2xl"></div>
                </>
              )}
              <div className={getMetricCardContentClasses()}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Subscription Plan</p>
                    <p className="text-xl font-semibold text-slate-900 dark:text-white mt-2">
                      {typeof subscriptionTier === "object" ? "Enterprise" : subscriptionTier || "Basic"}
                    </p>
                  </div>
                  <div className="relative">
                    <div className={getIconContainerClasses('crown')}>
                      <Crown className="text-purple-700 dark:text-purple-300 w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Access URL Card */}
            {baseUrl && (
              <div className={getMetricCardClasses()}>
                {glassmorphismEnabled && (
                  <>
                    <div className={getMetricCardBackgroundClasses()}></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/6 via-transparent to-blue-500/6 rounded-2xl"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/15 to-white/25 dark:via-white/10 dark:to-white/20 rounded-2xl"></div>
                  </>
                )}
                <div className={getMetricCardContentClasses()}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Access URL</p>
                      <a
                        href={baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 truncate block mt-2 transition-colors"
                        title={baseUrl}
                      >
                        {new URL(baseUrl).hostname}
                      </a>
                    </div>
                    <div className="relative ml-4">
                      <div className={getIconContainerClasses('link')}>
                        <ExternalLink className="text-cyan-700 dark:text-cyan-300 w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Application Modules */}
          {(() => {
            const moduleList = Array.isArray(modules) ? modules : [];
            return moduleList.length > 0 && (
              <div className="relative">
                <div className="pt-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Application Modules</h2>
                      <p className="text-slate-600 dark:text-slate-400 mt-2">
                        Feature capabilities and system integrations
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Enabled</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <XCircle className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Disabled</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {moduleList.map((module, index) => (
                      <ModuleCard
                        key={`${module.moduleId ?? module.moduleCode}-${index}`}
                        module={module}
                        isEnabled={Array.isArray(enabledModules) && enabledModules.includes(module.moduleCode)}
                        modulePermissions={enabledModulesPermissions?.[module.moduleCode] || []}
                        customPermissions={customPermissions?.[module.moduleCode] || []}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </Container>
  );
}

// Module Card Component
interface ModuleCardProps {
  module: any;
  isEnabled: boolean;
  modulePermissions: string[];
  customPermissions: string[];
}

function ModuleCard({ module, isEnabled, modulePermissions, customPermissions }: ModuleCardProps) {
  const { glassmorphismEnabled } = useTheme();
  const { moduleName, description, isCore, permissions } = module;

  return (
    <div className={cn(
      glassmorphismEnabled
        ? "relative group overflow-hidden"
        : "bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
    )}>
      {glassmorphismEnabled && (
        <>
          <div className="absolute inset-0 backdrop-blur-3xl bg-gradient-to-br from-purple-200/10 via-violet-200/6 to-indigo-200/8 dark:from-purple-500/8 dark:via-violet-500/4 dark:to-indigo-500/6 rounded-2xl"></div>
          <div className={`absolute inset-0 rounded-2xl ${
            isEnabled
              ? 'bg-gradient-to-br from-emerald-500/8 via-transparent to-teal-500/8'
              : 'bg-gradient-to-br from-slate-500/8 via-transparent to-gray-500/8'
          }`}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-purple-100/8 to-indigo-100/12 dark:via-slate-900/15 dark:to-slate-950/20 rounded-2xl"></div>
        </>
      )}

      <div className={glassmorphismEnabled ? "relative p-8 rounded-2xl" : "p-6"}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className={`w-4 h-4 rounded-full shadow-lg ${isEnabled ? 'bg-emerald-400' : 'bg-slate-400'}`}></div>
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-lg">
                {moduleName || "Unknown Module"}
              </h4>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Badge
                variant={isCore ? "default" : "outline"}
                className={`text-xs backdrop-blur-sm ${
                  isCore
                    ? 'bg-slate-900/20 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300 border-slate-400/50'
                    : 'border-slate-400/50 text-slate-700 dark:text-slate-400 bg-white/20 dark:bg-slate-800/20'
                }`}
              >
                {isCore ? "Core Module" : "Optional Module"}
              </Badge>
              {isEnabled && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 backdrop-blur-sm px-3 py-1 rounded-full border border-emerald-400/30">
                  Active
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-6">
          {description || "No description available for this module."}
        </p>

        {/* Module Permissions */}
        {permissions && permissions.length > 0 && (
          <div className="relative">
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium text-slate-900 dark:text-white text-sm">
                  Permissions
                </h5>
                <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/60 dark:bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/40 dark:border-white/30 shadow-sm">
                  {permissions.length} total
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {permissions.map((permission: any, index: number) => {
                  const permissionText =
                    typeof permission === "string"
                      ? permission
                      : permission.code || permission.name || "Unknown";
                  // Normalize modulePermissions to string array (defensive - should already be normalized from hook)
                  const permissionCodes = Array.isArray(modulePermissions) 
                    ? modulePermissions.map((p: any) => typeof p === 'string' ? p : (p?.code || p?.name || '')).filter(Boolean)
                    : [];
                  const isPermissionEnabled =
                    isEnabled &&
                    (permissionCodes.includes(permissionText) || (Array.isArray(customPermissions) && customPermissions.includes(permissionText)));

                  return (
                    <div
                      key={index}
                      className={`relative px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        isPermissionEnabled
                          ? glassmorphismEnabled
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-400/20 backdrop-blur-md shadow-sm'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : glassmorphismEnabled
                            ? 'bg-white/50 dark:bg-white/20 text-slate-700 dark:text-slate-400 border border-white/30 dark:border-white/20 backdrop-blur-md'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {permissionText}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
