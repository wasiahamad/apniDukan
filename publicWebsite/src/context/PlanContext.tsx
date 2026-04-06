import { PLAN_DEFINITIONS, type PlanDefinition, type PlanTier } from "@/types/plan";
import { createContext, useContext, useMemo, useState } from "react";

type PlanContextValue = {
  plans: PlanDefinition[];
  currentPlanId: PlanTier;
  currentPlan: PlanDefinition;
  planExpiry: string | null;
  selectPlan: (planId: PlanTier) => void;
};

const STORAGE_PLAN_KEY = "dukaandirect-plan";
const STORAGE_EXPIRY_KEY = "dukaandirect-plan-expiry";

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

function getStoredPlan(): PlanTier {
  const raw = localStorage.getItem(STORAGE_PLAN_KEY) as PlanTier | null;
  if (raw === "free" || raw === "basic" || raw === "pro") {
    return raw;
  }
  return "free";
}

function calculateExpiry(plan: PlanDefinition): string | null {
  if (!plan.expiryDays) return null;
  const dt = new Date();
  dt.setDate(dt.getDate() + plan.expiryDays);
  return dt.toISOString();
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [currentPlanId, setCurrentPlanId] = useState<PlanTier>(() => getStoredPlan());
  const [planExpiry, setPlanExpiry] = useState<string | null>(() => localStorage.getItem(STORAGE_EXPIRY_KEY));

  const currentPlan = useMemo(
    () => PLAN_DEFINITIONS.find((p) => p.id === currentPlanId) || PLAN_DEFINITIONS[0],
    [currentPlanId],
  );

  const selectPlan = (planId: PlanTier) => {
    const plan = PLAN_DEFINITIONS.find((p) => p.id === planId);
    if (!plan) return;

    setCurrentPlanId(planId);
    localStorage.setItem(STORAGE_PLAN_KEY, planId);

    const nextExpiry = calculateExpiry(plan);
    setPlanExpiry(nextExpiry);

    if (nextExpiry) {
      localStorage.setItem(STORAGE_EXPIRY_KEY, nextExpiry);
    } else {
      localStorage.removeItem(STORAGE_EXPIRY_KEY);
    }
  };

  const value = useMemo<PlanContextValue>(
    () => ({
      plans: PLAN_DEFINITIONS,
      currentPlanId,
      currentPlan,
      planExpiry,
      selectPlan,
    }),
    [currentPlan, currentPlanId, planExpiry],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("usePlan must be used inside PlanProvider");
  }
  return context;
}
