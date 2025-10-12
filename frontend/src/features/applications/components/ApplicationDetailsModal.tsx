import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge,
  Button,
} from "@/components/ui";
import { Typography } from "@/components/common/Typography";
import { ThemeBadge } from "@/components/common/ThemeBadge";
import { IconButton } from "@/components/common/LoadingButton";
import { Application } from "@/types/application";
import { Shield, ExternalLink } from "lucide-react";
import { getApplicationIcon, getStatusColor } from "./applicationUtils";
import { Flex, Grid } from "@/components/common/Page";
import { IconBox } from "@/components/common/IconBox";
import { GridItem } from "@/components/common/Page/Grid";

interface ApplicationDetailsModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ApplicationDetailsModal({ application, isOpen, onClose }: ApplicationDetailsModalProps) {
  if (!application) return null;

  const {
    appName,
    appCode,
    description,
    status,
    subscriptionTier,
    isEnabled,
    modules,
    enabledModules,
    enabledModulesPermissions,
    customPermissions,
    baseUrl,
  } = application;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] min-h-[400px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <Flex align="center" gap={3}>
            <IconBox icon={getApplicationIcon(appCode)}  shape="square" shadow="none" />
            <Flex direction="col">
              <DialogTitle>{appName || "Unknown Application"}</DialogTitle>
              <DialogDescription>{description || "No description available"}</DialogDescription>
            </Flex>
          </Flex>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* Application Info */}
          <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
            <GridItem className="space-y-3">
              <div>
                <Typography variant="label">Application Code</Typography>
                <Typography variant="overline">{appCode}</Typography>
              </div>
              <div>
                <Typography variant="label">Status</Typography>
                <Badge
                  className={getStatusColor(
                    typeof status === "object" ? "active" : status || "active"
                  )}
                >
                  {typeof status === "object" ? "Active" : status || "Active"}
                </Badge>
              </div>
            </GridItem>
            <div className="space-y-3">
              <div>
                <Typography variant="label">Subscription Tier</Typography>
                <Typography variant="overline">
                  {typeof subscriptionTier === "object" ? "Basic" : subscriptionTier || "Basic"}
                </Typography>
              </div>
              <div>
                <Typography variant="label">Access</Typography>
                <Typography variant="overline">{isEnabled ? "Enabled" : "Disabled"}</Typography>
              </div>
            </div>
          </Grid>

          {/* Modules Section */}
          {modules && modules.length > 0 && (
            <div>
              <Typography variant="h4">Available Modules</Typography>
              <div className="space-y-4">
                {modules.map((module) => (
                  <ModuleCard
                    key={module.moduleId}
                    module={module}
                    isEnabled={enabledModules?.includes(module.moduleCode) || false}
                    modulePermissions={enabledModulesPermissions?.[module.moduleCode] || []}
                    customPermissions={customPermissions?.[module.moduleCode] || []}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Enabled Modules */}
          {enabledModules && Array.isArray(enabledModules) && enabledModules.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Enabled Modules</h4>
              <div className="flex flex-wrap gap-2">
                {enabledModules.map((moduleCode) => (
                  <ThemeBadge key={moduleCode} variant="success">
                    {moduleCode}
                  </ThemeBadge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {baseUrl && (
            <IconButton
              onClick={() => window.open(baseUrl, "_blank")}
              startIcon={ExternalLink}
            >
              Open Application
            </IconButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ModuleCardProps {
  module: any;
  isEnabled: boolean;
  modulePermissions: string[];
  customPermissions: string[];
}

function ModuleCard({ module, isEnabled, modulePermissions, customPermissions }: ModuleCardProps) {
  const { moduleName, description, isCore, permissions } = module;

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <Flex align="center" justify="between" gap={3}>
        <Flex align="center" gap={2}>
          <Typography variant="large">{moduleName || "Unknown Module"}</Typography>
          {isEnabled && <ThemeBadge variant="success">Enabled</ThemeBadge>}
        </Flex>
        <Badge variant={isCore ? "default" : "outline"}>
          {isCore ? "Core" : "Optional"}
        </Badge>
      </Flex>

      <Typography variant="muted">{description || "No description available"}</Typography>

      {/* Module Permissions */}
      {permissions && permissions.length > 0 && (
        <div className="space-y-2">
          <Flex align="center" justify="between" gap={3}>
            <Typography variant="large">Available Permissions</Typography>
            <Typography variant="muted">{permissions.length} total</Typography>
          </Flex>
          <Flex align="center" gap={1}>
            {permissions.map((permission: any, index: number) => {
              const permissionText =
                typeof permission === "string"
                  ? permission
                  : permission.code || permission.name || "Unknown";
              const isPermissionEnabled =
                isEnabled &&
                (modulePermissions.includes(permissionText) || customPermissions.includes(permissionText));

              return (
                <ThemeBadge
                  key={index}
                  variant={isPermissionEnabled ? "success" : "inactive"}
                >
                  {permissionText}
                </ThemeBadge>
              );
            })}
          </Flex>
        </div>
      )}

      {/* Custom Permissions for this module */}
      {customPermissions && customPermissions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Flex align="center" gap={2}>
            <Shield className="w-4 h-4 text-blue-600" />
            <Typography variant="large">Custom Permissions</Typography>
          </Flex>
          <Flex align="center" gap={1}>
            {customPermissions.map((permission: any, index: number) => {
              const permissionText =
                typeof permission === "string"
                  ? permission
                  : permission.code || permission.name || "Unknown";

              return (
                <ThemeBadge key={index} variant="info">
                  {permissionText}
                </ThemeBadge>
              );
            })}
          </Flex>
        </div>
      )}
    </div>
  );
}
