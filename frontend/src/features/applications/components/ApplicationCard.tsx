import { Card, CardContent, Badge } from "@/components/ui";
import { Typography } from "@/components/common/Typography";
import { IconButton } from "@/components/common/LoadingButton";
import { Application } from "@/types/application";
import { Eye } from "lucide-react";
import { memo } from "react";
import { Flex } from "@/components/common/Page";
import { getApplicationIcon, getStatusColor } from "./applicationUtils";

interface ApplicationCardProps {
  application: Application;
  onView: (app: Application) => void;
}

export const ApplicationCard = memo(function ApplicationCard({ application, onView }: ApplicationCardProps) {
  const { appId, appName, appCode, description, isEnabled, subscriptionTier, modules, enabledModules } = application;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onView(application)}
    >
      <CardContent className="p-6">
        <Flex align="center" justify="between" gap={4}>
          <Flex align="center" gap={3}>
            <span className="w-10 h-10 flex items-center justify-center bg-muted rounded-md">
              {getApplicationIcon(appCode)}
            </span>
            <Flex direction="col">
              <Typography variant="h4">{appName || "Unknown App"}</Typography>
              <Typography variant="muted">{appCode || "N/A"}</Typography>
            </Flex>
          </Flex>
          <Badge className={getStatusColor(isEnabled ? "active" : "inactive")}>
            {isEnabled ? "Active" : "Inactive"}
          </Badge>
        </Flex>

        <Typography variant="muted">
          {description || "No description available"}
        </Typography>

        <div className="space-y-3">
          <Flex align="center" justify="between" gap={4}>
            <Typography variant="muted">Subscription Tier:</Typography>
            <Badge variant="outline" className="capitalize">
              {typeof subscriptionTier === "object" ? "Basic" : subscriptionTier || "Basic"}
            </Badge>
          </Flex>

          {modules && modules.length > 0 && (
            <Flex align="center" justify="between" gap={4}>
              <Typography variant="muted">Modules:</Typography>
              <Typography variant="muted">
                {enabledModules?.length || 0} enabled / {modules.length} available
              </Typography>
            </Flex>
          )}
        </div>

        <IconButton
          variant="ghost"
          size="sm"
          className="w-full"
          startIcon={Eye}
        >
          View Details
        </IconButton>
      </CardContent>
    </Card>
  );
});
