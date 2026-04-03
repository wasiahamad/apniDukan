import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlan } from "@/context/PlanContext";
import { useToast } from "@/hooks/use-toast";
import type { PlanTier } from "@/types/plan";

type PlanModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PlanModal({ open, onOpenChange }: PlanModalProps) {
  const { plans, currentPlanId, selectPlan } = usePlan();
  const { toast } = useToast();

  const onUpgrade = (planId: PlanTier) => {
    selectPlan(planId);
    const selected = plans.find((p) => p.id === planId);
    toast({
      title: "Plan updated",
      description: `${selected?.name || "Selected"} plan is now active.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-900">Upgrade Your Plan</DialogTitle>
          <DialogDescription>Compare plans and pick what fits your growth goals.</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-700">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.id} className="text-left p-3 font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>{plan.name}</span>
                      {currentPlanId === plan.id ? <Badge className="bg-[rgb(30,190,118)] text-white">Current</Badge> : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["Priority listing", "Unlimited bookings", "Analytics", "Premium support"].map((feature) => (
                <tr key={feature} className="border-t border-slate-200">
                  <td className="p-3 text-slate-700">{feature}</td>
                  {plans.map((plan) => {
                    const enabled = plan.features.some((f) => f.toLowerCase().includes(feature.toLowerCase().split(" ")[0]));
                    return (
                      <td key={`${plan.id}-${feature}`} className="p-3 text-slate-600">
                        {enabled ? "Yes" : "No"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {plans.map((plan) => (
            <Button
              key={plan.id}
              disabled={plan.id === currentPlanId}
              onClick={() => onUpgrade(plan.id)}
              className={plan.id === currentPlanId ? "bg-slate-200 text-slate-600" : "bg-[rgb(255,136,0)] hover:bg-[rgb(235,121,0)] text-white"}
            >
              {plan.id === currentPlanId ? "Current Plan" : `Upgrade Now - ${plan.name}`}
            </Button>
          ))}
        </div>

        <Button variant="outline" className="w-full border-[rgb(30,190,118)] text-[rgb(30,190,118)] hover:bg-[rgb(30,190,118)]/10">
          Contact Sales
        </Button>
      </DialogContent>
    </Dialog>
  );
}
