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
        "rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        isCurrent && "border-[rgb(30,190,118)] ring-2 ring-[rgb(30,190,118)]/20 shadow-[0_12px_30px_rgba(30,190,118,0.18)]",
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-xl text-slate-900">{plan.name}</CardTitle>
          {isCurrent ? (
            <Badge className="bg-[rgb(30,190,118)] text-white">Current</Badge>
          ) : null}
          {plan.popular ? (
            <Badge className="bg-[rgb(255,136,0)] text-white">
              <Crown className="h-3.5 w-3.5 mr-1" /> Popular
            </Badge>
          ) : null}
        </div>
        <div className="flex items-end gap-1">
          <span className="text-3xl font-black text-slate-900">{plan.monthlyPrice === 0 ? "Free" : `INR ${plan.monthlyPrice}`}</span>
          {plan.monthlyPrice > 0 ? <span className="text-sm text-slate-500">/month</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-[rgb(30,190,118)] shrink-0 mt-0.5" />
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
              ? "bg-slate-100 text-slate-500 hover:bg-slate-100"
              : "bg-[rgb(255,136,0)] hover:bg-[rgb(235,121,0)] text-white active:scale-[0.98]",
          )}
        >
          {isCurrent ? "Current Plan" : ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
