export type PlanTier = "free" | "basic" | "pro";

export type PlanDefinition = {
  id: PlanTier;
  name: string;
  monthlyPrice: number;
  expiryDays: number | null;
  features: string[];
  popular?: boolean;
};

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    expiryDays: null,
    features: ["Basic profile", "Up to 3 bookings / month", "Standard support"],
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 199,
    expiryDays: 30,
    features: ["Priority listing", "Unlimited bookings", "Live location insights", "Email support"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 499,
    expiryDays: 30,
    popular: true,
    features: [
      "Top discovery boost",
      "Advanced analytics",
      "Unlimited bookings",
      "Premium priority support",
    ],
  },
];
