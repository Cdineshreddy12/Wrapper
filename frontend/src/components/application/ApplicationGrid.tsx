import { Grid } from "@/components/common/Page";
import { ApplicationCard } from "./ApplicationCard";
import { Application } from "@/types/application";
import { memo } from "react";

interface ApplicationGridProps {
  applications: Application[];
  onViewApplication: (app: Application) => void;
}

export const ApplicationGrid = memo(function ApplicationGrid({ applications, onViewApplication }: ApplicationGridProps) {
  return (
    <Grid columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap={6}>
      {applications.map((app) => (
        <ApplicationCard
          key={app.appId}
          application={app}
          onView={onViewApplication}
        />
      ))}
    </Grid>
  );
});
