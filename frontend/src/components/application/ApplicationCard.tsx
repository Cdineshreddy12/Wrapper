import { Badge } from "@/components/ui";
import { GlareCard } from "@/components/ui/glare-card";
import { getApplicationIcon, getThemeColors, getStatusColors } from "@/components/application/applicationUtils";
import { Application } from "@/types/application";
import { Eye } from "lucide-react";
import { memo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

interface ApplicationCardProps {
  application: Application;
  onView: (app: Application) => void;
}

export const ApplicationCard = memo(function ApplicationCard({ application, onView }: ApplicationCardProps) {
  const { actualTheme } = useTheme();
  const { appName, appCode, description, isEnabled, subscriptionTier } = application;

  // Get consistent theme colors
  const themeColors = getThemeColors(actualTheme);
  const statusColors = getStatusColors(isEnabled, actualTheme);

  return (
    <GlareCard
      className={`flex flex-col items-center justify-center cursor-pointer p-8 text-center h-full ${themeColors.cardBg} ${themeColors.cardBorder} ${themeColors.cardHover}`}
      onClick={() => onView(application)}
    >
      {/* Header with icon and status */}
      <div className="flex items-center justify-between w-full mb-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full backdrop-blur-sm ${themeColors.iconBg}`}>
            <div className={`text-2xl ${themeColors.iconColor}`}>
              {getApplicationIcon(appCode)}
            </div>
          </div>
          <div className="text-left">
            <h3 className={`font-bold text-xl mb-1 ${themeColors.titleColor}`}>
              {appName || "Unknown App"}
            </h3>
            <p className={`${themeColors.subtitleColor} text-sm`}>
              {appCode || "N/A"}
            </p>
          </div>
        </div>
        <Badge
          className={`border-0 ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
        >
          {isEnabled ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Description */}
      <p className={`${themeColors.descriptionColor} text-sm mb-6 line-clamp-2`}>
        {description || "No description available"}
      </p>

      {/* Subscription Tier */}
      <div className="w-full mb-6">
        <div className={`rounded-lg p-3 backdrop-blur-sm ${themeColors.iconBg}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${themeColors.subtitleColor}`}>
              Subscription Tier
            </span>
            <Badge
              variant="outline"
              className={`capitalize ${themeColors.badgeBg} ${themeColors.badgeText} ${themeColors.badgeBorder}`}
            >
              {typeof subscriptionTier === "object" ? "Basic" : subscriptionTier || "Basic"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="w-full">
        <div className={`rounded-lg p-3 backdrop-blur-sm transition-all duration-200 hover:scale-105 ${themeColors.buttonBg}`}>
          <div className="flex items-center justify-center gap-2">
            <Eye className={`h-4 w-4 hover:scale-110 transition-transform ${themeColors.buttonIcon}`} />
            <span className={`font-medium ${themeColors.buttonText}`}>
              View Details
            </span>
          </div>
        </div>
      </div>
    </GlareCard>
  );
});
