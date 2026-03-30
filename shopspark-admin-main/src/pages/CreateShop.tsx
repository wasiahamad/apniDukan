import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  businessAdminApi,
  businessTypesApi,
  plansApi,
  type BusinessType,
  type Plan,
} from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

type StepId = 0 | 1 | 2 | 3 | 4;

const steps = [
  { title: "Owner Details", desc: "Create dukandar account" },
  { title: "Shop Details", desc: "Business information" },
  { title: "Location", desc: "City and address" },
  { title: "Offerings", desc: "What they sell / do" },
  { title: "Choose Plan", desc: "Assign a plan" },
] as const;

const EMPTY_BUSINESS_TYPES: BusinessType[] = [];
const EMPTY_PLANS: Plan[] = [];

function isEmail(value: string) {
  return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/.test(value);
}

export default function CreateShop() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>(0);

  const [owner, setOwner] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [shop, setShop] = useState({
    name: "",
    businessType: "",
    phone: "",
    whatsapp: "",
    email: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    description: "",
    isActive: true,
    isVerified: false,
  });

  const businessTypesQuery = useQuery({
    queryKey: ["admin", "business-types"],
    queryFn: async () => {
      const res = await businessTypesApi.list();
      if (!res.success) throw new Error(res.message || "Failed to load business types");
      return res.data || [];
    },
  });

  const plansQuery = useQuery({
    queryKey: ["admin", "plans", "active"],
    queryFn: async () => {
      const res = await plansApi.list({ includeInactive: false, includeHidden: true });
      if (!res.success) throw new Error(res.message || "Failed to load plans");
      return (res.data || []).filter((p) => p.isActive);
    },
  });

  const businessTypes = businessTypesQuery.data ?? EMPTY_BUSINESS_TYPES;
  const plans = plansQuery.data ?? EMPTY_PLANS;

  const [planId, setPlanId] = useState<string>("");

  // pick defaults once lists are loaded
  useEffect(() => {
    if (!shop.businessType && businessTypes.length > 0) {
      setShop((s) => ({ ...s, businessType: businessTypes[0]._id }));
    }
    if (!planId && plans.length > 0) {
      setPlanId(plans[0]._id);
    }
  }, [businessTypes, plans, planId, shop.businessType]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        owner: {
          name: owner.name.trim(),
          email: owner.email.trim().toLowerCase(),
          phone: owner.phone.trim(),
          password: owner.password,
        },
        business: {
          name: shop.name.trim(),
          businessType: shop.businessType,
          phone: shop.phone.trim(),
          whatsapp: (shop.whatsapp || shop.phone).trim(),
          email: (shop.email || owner.email).trim().toLowerCase(),
          isActive: shop.isActive,
          isVerified: shop.isVerified,
          address: {
            street: shop.street.trim() || undefined,
            city: shop.city.trim(),
            state: shop.state.trim(),
            pincode: shop.pincode.trim() || undefined,
          },
          description: shop.description.trim() || undefined,
        },
        planId: planId || undefined,
      };

      const res = await businessAdminApi.createWithOwner(payload);
      if (!res.success || !res.data) throw new Error(res.message || "Failed to create shop");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Shop created successfully");
      navigate(`/shops/${data.business._id}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create shop"),
  });

  const canNext = () => {
    if (step === 0) {
      return (
        owner.name.trim().length > 1 &&
        isEmail(owner.email.trim()) &&
        owner.phone.trim().length === 10 &&
        owner.password.length >= 6
      );
    }
    if (step === 1) {
      return shop.name.trim().length > 1 && !!shop.businessType && shop.phone.trim().length === 10;
    }
    if (step === 2) {
      return shop.city.trim().length > 0 && shop.state.trim().length > 0;
    }
    if (step === 3) {
      return shop.description.trim().length > 0;
    }
    if (step === 4) {
      return !!planId;
    }
    return true;
  };

  const next = () => {
    if (step < 4) setStep((s) => (s + 1) as StepId);
    else createMutation.mutate();
  };

  const back = () => {
    if (step > 0) setStep((s) => (s - 1) as StepId);
  };

  const loading = businessTypesQuery.isLoading || plansQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create New Shop</h1>
        <p className="text-sm text-muted-foreground">Admin onboarding for dukandar</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{steps[step].title}</CardTitle>
          <p className="text-sm text-muted-foreground">{steps[step].desc}</p>
          <div className="flex gap-1 pt-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          ) : step === 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Owner Name</Label>
                <Input value={owner.name} onChange={(e) => setOwner((o) => ({ ...o, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Owner Email</Label>
                <Input type="email" value={owner.email} onChange={(e) => setOwner((o) => ({ ...o, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Owner Phone</Label>
                <Input
                  inputMode="numeric"
                  value={owner.phone}
                  maxLength={10}
                  onChange={(e) => setOwner((o) => ({ ...o, phone: e.target.value.replace(/\D/g, "") }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={owner.password} onChange={(e) => setOwner((o) => ({ ...o, password: e.target.value }))} />
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shop Name</Label>
                <Input value={shop.name} onChange={(e) => setShop((s) => ({ ...s, name: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select value={shop.businessType} onValueChange={(v) => setShop((s) => ({ ...s, businessType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((bt: BusinessType) => (
                      <SelectItem key={bt._id} value={bt._id}>
                        {bt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Phone</Label>
                  <Input
                    inputMode="numeric"
                    value={shop.phone}
                    maxLength={10}
                    onChange={(e) => setShop((s) => ({ ...s, phone: e.target.value.replace(/\D/g, "") }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    inputMode="numeric"
                    value={shop.whatsapp}
                    maxLength={10}
                    onChange={(e) => setShop((s) => ({ ...s, whatsapp: e.target.value.replace(/\D/g, "") }))}
                    placeholder="(optional)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Business Email</Label>
                <Input type="email" value={shop.email} onChange={(e) => setShop((s) => ({ ...s, email: e.target.value }))} placeholder="(optional)" />
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Area / Street</Label>
                <Input value={shop.street} onChange={(e) => setShop((s) => ({ ...s, street: e.target.value }))} placeholder="(optional)" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={shop.city} onChange={(e) => setShop((s) => ({ ...s, city: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={shop.state} onChange={(e) => setShop((s) => ({ ...s, state: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  inputMode="numeric"
                  value={shop.pincode}
                  maxLength={6}
                  onChange={(e) => setShop((s) => ({ ...s, pincode: e.target.value.replace(/\D/g, "") }))}
                  placeholder="(optional)"
                />
              </div>
            </div>
          ) : step === 3 ? (
            <div className="space-y-2">
              <Label>Offerings / Description</Label>
              <Input
                value={shop.description}
                onChange={(e) => setShop((s) => ({ ...s, description: e.target.value }))}
                placeholder="e.g. Grocery, dairy, snacks…"
              />
              <p className="text-xs text-muted-foreground">This appears as the shop description.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p: Plan) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} — ₹{p.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Plan gets assigned immediately (no payment flow here).</p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Active</Label>
                  <Switch checked={shop.isActive} onCheckedChange={(v) => setShop((s) => ({ ...s, isActive: v }))} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Verified</Label>
                  <Switch checked={shop.isVerified} onCheckedChange={(v) => setShop((s) => ({ ...s, isVerified: v }))} />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => navigate("/shops")}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={back} disabled={step === 0 || createMutation.isPending}>
                Back
              </Button>
              <Button onClick={next} disabled={!canNext() || createMutation.isPending || loading}>
                {step === 4 ? (createMutation.isPending ? "Creating…" : "Create Shop") : "Continue"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
