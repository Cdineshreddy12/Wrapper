import { Container, Flex, Grid } from "@/components/common/Page";
import { Typography } from "@/components/common/Typography";
import { Skeleton } from "@/components/ui";
import { RefreshCw } from "lucide-react";

export function LoadingState() {
  return (
    <Container>
      <Flex align="center" justify="between" gap={6}>
        <Flex direction="col">
          <Typography variant="h3">Applications</Typography>
          <Typography variant="muted">
            Manage your organization's applications and modules
          </Typography>
        </Flex>
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
      </Flex>
      <Grid columns={{ xs: 1, sm: 2, md: 3 }} gap={6}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-6">
            <Skeleton className="w-12 h-12 mb-4" />
            <Skeleton className="h-4 mb-2" />
            <Skeleton className="h-3 mb-4" />
            <Skeleton className="h-8" />
          </div>
        ))}
      </Grid>
    </Container>
  );
}
