import { Card, CardContent } from "@/components/ui";
import { Typography } from "@/components/common/Typography";
import { LoadingButton } from "@/components/common/LoadingButton";
import { Package } from "lucide-react";

interface EmptyStateProps {
    isLoading: boolean;
    onRefresh: () => void;
}

export function EmptyState({ isLoading, onRefresh }: EmptyStateProps) {
    return (
        <Card>
            <CardContent className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <Typography variant="h4">No Applications Available</Typography>
                <Typography variant="muted">
                    Contact your administrator to enable applications for your organization.
                </Typography>
                <LoadingButton
                    className="mt-4"
                    isLoading={isLoading}
                    variant="outline"
                    onClick={onRefresh}
                >
                    Check Again
                </LoadingButton>
            </CardContent>
        </Card>
    );
}
