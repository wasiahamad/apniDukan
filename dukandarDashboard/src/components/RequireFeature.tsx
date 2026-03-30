import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntitlements, type EntitlementFeatures } from "@/contexts/EntitlementsContext";

type Props = {
  feature: keyof EntitlementFeatures;
  title?: string;
  children: ReactNode;
};

export default function RequireFeature({ feature, title, children }: Props) {
  const { entitlements, loading, suspended } = useEntitlements();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

  if (feature === "supportTicketsEnabled" && suspended === true) {
    return <>{children}</>;
  }

  const enabled = entitlements?.features?.[feature] === true;
  if (!enabled) {
    return (
      <Card className="border">
        <CardHeader>
          <CardTitle>{title || "Upgrade required"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This feature is not enabled in your current plan.
          </p>
          <Button asChild>
            <Link to="/dashboard/subscription">View plans</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
