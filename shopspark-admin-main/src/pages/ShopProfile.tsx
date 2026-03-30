import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi, businessAdminApi, plansApi, type Business, type Plan } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Globe, MapPin, Phone, Mail, CreditCard, Truck, BadgeIndianRupee, Leaf, Award } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShopProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const businessQuery = useQuery({
    queryKey: ["admin", "business", "byId", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await businessAdminApi.getById(String(id));
      if (!res.success) throw new Error(res.message || 'Failed to load business');
      return res.data as Business;
    },
  });

  const b = businessQuery.data;

  const plansQuery = useQuery({
    queryKey: ["admin", "plans", "for-assign"],
    queryFn: async () => {
      const res = await plansApi.list({ includeInactive: false, includeHidden: true });
      if (!res.success) throw new Error(res.message || 'Failed to load plans');
      return (res.data || []).filter((p) => p.isActive);
    },
  });

  const plans = plansQuery.data || [];

  const [assignPlanId, setAssignPlanId] = useState<string>("");
  const [assignDurationDays, setAssignDurationDays] = useState<string>("");
  const [assignComped, setAssignComped] = useState<boolean>(false);
  const [assignReason, setAssignReason] = useState<string>("");

  const whyChooseCards = useMemo(() => {
    const icons = [Truck, BadgeIndianRupee, Leaf, Award] as const;
    const items = (b?.businessType as any)?.whyChooseUsTemplates || [];
    const cleaned = Array.isArray(items)
      ? items.filter((x: any) => (String(x?.title || '').trim() || String(x?.desc || '').trim()))
      : [];
    return cleaned.map((x: any, idx: number) => ({
      icon: (() => {
        const name = String((x as any)?.iconName || '').trim();
        const IconComp = name ? (LucideIcons as any)[name] : null;
        if (typeof IconComp === 'function') return IconComp;
        return icons[idx % icons.length];
      })(),
      title: String(x?.title || '').trim(),
      desc: String(x?.desc || '').trim(),
    }));
  }, [b?.businessType]);

  useEffect(() => {
    if (!b) return;
    setAssignPlanId(b.plan?._id || "");
    setAssignComped(Boolean((b as any).planComped));
    setAssignReason(String((b as any).planCompReason || ""));
  }, [b?._id]);

  const status = b ? (!b.isActive ? 'suspended' : !b.isVerified ? 'inactive' : 'active') : 'inactive';

  const updateStatus = useMutation({
    mutationFn: async (input: { isActive?: boolean; isVerified?: boolean }) => {
      if (!id) throw new Error('Missing business id');
      return businessAdminApi.updateStatus(String(id), input);
    },
    onSuccess: async (res) => {
      if (!res.success) throw new Error(res.message || 'Failed to update status');
      toast.success('Status updated');
      await qc.invalidateQueries({ queryKey: ["admin", "business", "byId", id] });
      await qc.invalidateQueries({ queryKey: ["admin", "business", "list"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update status'),
  });

  const loginAsDukandar = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing business id');
      return authApi.impersonateBusiness(String(id));
    },
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        toast.error(res.message || 'Failed to impersonate');
        return;
      }

      const dukandarBaseUrl = import.meta.env.VITE_DUKANDAR_URL || 'http://localhost:8080';
      const url = new URL('/admin-login', dukandarBaseUrl);
      url.searchParams.set('token', res.data.accessToken);
      url.searchParams.set('refreshToken', res.data.refreshToken);
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to impersonate'),
  });


  const assignPlanMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing business id');
      if (!assignPlanId) throw new Error('Select a plan');

      const durationInDays = assignDurationDays.trim() ? Number(assignDurationDays) : undefined;
      if (durationInDays !== undefined && (!Number.isFinite(durationInDays) || durationInDays <= 0)) {
        throw new Error('Duration must be a positive number');
      }

      const res = await businessAdminApi.updatePlan(String(id), {
        planId: assignPlanId,
        ...(durationInDays ? { durationInDays } : {}),
        isComped: assignComped,
        compReason: assignReason.trim() || undefined,
      });
      if (!res.success) throw new Error(res.message || 'Failed to assign plan');
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Plan updated');
      await qc.invalidateQueries({ queryKey: ["admin", "business", "byId", id] });
      await qc.invalidateQueries({ queryKey: ["admin", "business", "list"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update plan'),
  });

  if (businessQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Plan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (!b) return <div className="p-8 text-center text-muted-foreground">Shop not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/shops")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{b.name}</h1>
          <p className="text-sm text-muted-foreground">{b._id} · {b.businessType?.name || '—'}</p>
        </div>
        <StatusBadge status={status} />
        <Button
          variant="outline"
          size="sm"
          disabled={loginAsDukandar.isPending}
          onClick={() => loginAsDukandar.mutate()}
        >
          Login as Dukandar
        </Button>
        <Button
          variant={b.isActive ? "destructive" : "default"}
          size="sm"
          disabled={updateStatus.isPending}
          onClick={() => updateStatus.mutate({ isActive: !b.isActive })}
        >
          {b.isActive ? "Suspend" : "Activate"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={updateStatus.isPending}
          onClick={() => updateStatus.mutate({ isVerified: !b.isVerified })}
        >
          {b.isVerified ? "Unverify" : "Verify"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Business Email" value={b.email || '—'} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Business Phone" value={b.phone} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="WhatsApp" value={b.whatsapp || '—'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={`${b.address?.street || ''} ${b.address?.city || ''} ${b.address?.state || ''} ${b.address?.pincode || ''}`.trim() || '—'} />
              <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Plan" value={b.plan?.name || '—'} />
              <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Plan Expiry" value={b.planExpiresAt ? new Date(b.planExpiresAt).toLocaleDateString() : '—'} />
            </div>

            {b.description ? (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{b.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Website & Domain</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={<Globe className="h-4 w-4" />} label="Slug" value={b.slug} />
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Subscription</p>
              <Badge variant="outline">{b.plan?.name || '—'}</Badge>
              <p className="text-xs text-muted-foreground mt-1">Verified: {b.isVerified ? 'Yes' : 'No'}</p>
              <p className="text-xs text-muted-foreground mt-1">Active: {b.isActive ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Plan Assignment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs text-muted-foreground">Plan</p>
              <Select value={assignPlanId} onValueChange={setAssignPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder={plansQuery.isLoading ? 'Loading plans…' : 'Select plan'} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p: Plan) => (
                    <SelectItem key={p._id} value={p._id}>{p.name} (₹{p.price})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Duration (days)</p>
              <Input
                value={assignDurationDays}
                onChange={(e) => setAssignDurationDays(e.target.value)}
                placeholder="Leave empty for default"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Comp / Free</p>
              <p className="text-xs text-muted-foreground">Assign without payment</p>
            </div>
            <Switch checked={assignComped} onCheckedChange={setAssignComped} />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Reason (optional)</p>
            <Input value={assignReason} onChange={(e) => setAssignReason(e.target.value)} placeholder="e.g. Promo / Support / Trial" />
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={assignPlanMutation.isPending || plansQuery.isLoading}
              onClick={() => assignPlanMutation.mutate()}
            >
              Save Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Owner Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Owner Email" value={b.owner?.email || '—'} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Owner Phone" value={b.owner?.phone || '—'} />
            <InfoRow icon={<Phone className="h-4 w-4" />} label="Owner Name" value={b.owner?.name || '—'} />
            <InfoRow icon={<CreditCard className="h-4 w-4" />} label="Referral Code" value={b.owner?.referralCode || '—'} />
            <Separator />
            <p className="text-xs text-muted-foreground">Owner Active: {b.owner?.isActive ? 'Yes' : 'No'}</p>
            <p className="text-xs text-muted-foreground">Last Login: {b.owner?.lastLogin ? new Date(b.owner.lastLogin).toLocaleString() : '—'}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Operational Details</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Landmark" value={b.address?.landmark || '—'} />
              <InfoRow
                icon={<MapPin className="h-4 w-4" />}
                label="Coordinates"
                value={Array.isArray(b.address?.location?.coordinates) && b.address?.location?.coordinates?.length === 2
                  ? `${b.address.location.coordinates[1]}, ${b.address.location.coordinates[0]}`
                  : '—'}
              />
            </div>

            {b.workingHours ? (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Working Hours</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(b.workingHours).map(([day, v]) => (
                    <div key={day} className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-muted-foreground capitalize">{day}</span>
                      <span className="text-foreground">
                        {v?.isOpen === false ? 'Closed' : `${v?.open || '—'} - ${v?.close || '—'}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Why Choose Us</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Managed by Business Type defaults.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(whyChooseCards.length ? whyChooseCards : [
              { icon: Truck, title: '—', desc: '—' },
              { icon: BadgeIndianRupee, title: '—', desc: '—' },
              { icon: Leaf, title: '—', desc: '—' },
              { icon: Award, title: '—', desc: '—' },
            ]).map((item, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{item.title || '—'}</h3>
                <p className="text-xs text-muted-foreground">{item.desc || '—'}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-foreground">{value}</p>
      </div>
    </div>
  );
}
