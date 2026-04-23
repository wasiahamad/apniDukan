import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlanDefinition } from "@/types/plan";
import { CheckCircle2, Crown } from "lucide-react";

type PlanCardProps = {
  plan: PlanDefinition;
  isCurrent?: boolean;
  onSelect?: () => void;
  ctaLabel?: string;
};

export default function PlanCard({ plan, isCurrent, onSelect, ctaLabel = "Select Plan" }: PlanCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        isCurrent && "border-primary ring-2 ring-primary/20",
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl text-foreground">{plan.name}</CardTitle>
          {isCurrent ? (
            <Badge className="bg-primary text-primary-foreground">Current</Badge>
          ) : null}
          {plan.popular ? (
            <Badge className="bg-secondary text-secondary-foreground">
              <Crown className="h-3.5 w-3.5 mr-1" /> Popular
            </Badge>
          ) : null}
        </div>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-black text-foreground">{plan.monthlyPrice === 0 ? "Free" : `INR ${plan.monthlyPrice}`}</span>
          {plan.monthlyPrice > 0 ? <span className="text-sm text-muted-foreground">/month</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>
        <Button
          onClick={onSelect}
          disabled={isCurrent}
          className={cn(
            "w-full transition-all duration-200",
            isCurrent
              ? "bg-muted text-muted-foreground hover:bg-muted"
              : "bg-secondary hover:bg-secondary/90 text-secondary-foreground active:scale-[0.98]",
          )}
        >
          {isCurrent ? "Current Plan" : ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
