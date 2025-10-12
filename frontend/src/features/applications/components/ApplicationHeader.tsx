import { Typography } from "@/components/common/Typography";
import LoadingButton from "@/components/common/LoadingButton";
import { RefreshCw } from "lucide-react";
import { Flex } from "../common/Page";

interface ApplicationHeaderProps {
    applicationCount: number;
    isLoading: boolean;
    onRefresh: () => void;
}

export function ApplicationHeader({ applicationCount, isLoading, onRefresh }: ApplicationHeaderProps) {
    return (
        <Flex align="center" justify="between" gap={3}>
            <Flex direction="col">
                <Typography variant="h3">Applications</Typography>
                <Typography variant="muted">
                    Your organization has access to {applicationCount} applications
                </Typography>
            </Flex>
            <LoadingButton
                isLoading={isLoading}
                variant="outline"
                size="sm"
                onClick={onRefresh}
                startIcon={RefreshCw}
            >
                Refresh
            </LoadingButton>
        </Flex>
    );
}
