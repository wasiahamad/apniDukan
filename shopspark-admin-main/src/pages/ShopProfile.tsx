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

  const [isEditingWhyChooseUs, setIsEditingWhyChooseUs] = useState(false);
  const [whyChooseDraft, setWhyChooseDraft] = useState<Array<{ title: string; desc: string; iconName?: string }>>([]);

  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [businessDraft, setBusinessDraft] = useState<any>(null);
  const [ownerDraft, setOwnerDraft] = useState<any>(null);

  const whyChooseCards = useMemo(() => {
    const icons = [Truck, BadgeIndianRupee, Leaf, Award] as const;
    const items = (Array.isArray(b?.whyChooseUs) && b?.whyChooseUs?.length)
      ? b?.whyChooseUs
      : ((b?.businessType as any)?.whyChooseUsTemplates || []);
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
  }, [b?.businessType, b?.whyChooseUs]);

  useEffect(() => {
    if (!b) return;
    if (isEditingWhyChooseUs) return;

    const source = (Array.isArray(b.whyChooseUs) && b.whyChooseUs.length)
      ? b.whyChooseUs
      : ((b.businessType as any)?.whyChooseUsTemplates || []);

    const cleaned = Array.isArray(source)
      ? source
        .map((x: any) => ({
          title: String(x?.title || '').trim(),
          desc: String(x?.desc || '').trim(),
          iconName: String(x?.iconName || '').trim() || undefined,
        }))
        .filter((x) => x.title || x.desc || x.iconName)
      : [];

    const padded = [...cleaned.slice(0, 4)];
    while (padded.length < 4) padded.push({ title: '', desc: '', iconName: undefined });
    setWhyChooseDraft(padded);
  }, [b?._id, b?.businessType, b?.whyChooseUs, isEditingWhyChooseUs]);

  useEffect(() => {
    if (!b) return;
    setAssignPlanId(b.plan?._id || "");
    setAssignComped(Boolean((b as any).planComped));
    setAssignReason(String((b as any).planCompReason || ""));
  }, [b?._id]);

  useEffect(() => {
    if (!b) return;
    if (isEditingDetails) return;

    setBusinessDraft({
      name: b.name || '',
      slug: b.slug || '',
      phone: b.phone || '',
      whatsapp: b.whatsapp || '',
      email: b.email || '',
      description: b.description || '',
      logo: (b as any).logo || '',
      coverImage: (b as any).coverImage || '',
      coverImagesText: Array.isArray((b as any).coverImages) ? (b as any).coverImages.join('\n') : '',
      openStatusMode: (b as any).openStatusMode || 'auto',
      branding: {
        themeColor: (b as any).branding?.themeColor || '',
        backgroundColor: (b as any).branding?.backgroundColor || '',
        fontColor: (b as any).branding?.fontColor || '',
        fontFamily: (b as any).branding?.fontFamily || '',
      },
      socialMedia: {
        facebook: (b as any).socialMedia?.facebook || '',
        instagram: (b as any).socialMedia?.instagram || '',
        twitter: (b as any).socialMedia?.twitter || '',
        youtube: (b as any).socialMedia?.youtube || '',
      },
      whatsappOrderMessageTemplate: (b as any).whatsappOrderMessageTemplate || '',
      whatsappAutoGreetingEnabled: Boolean((b as any).whatsappAutoGreetingEnabled),
      whatsappAutoGreetingMessage: (b as any).whatsappAutoGreetingMessage || '',
      address: {
        street: b.address?.street || '',
        city: b.address?.city || '',
        state: b.address?.state || '',
        pincode: b.address?.pincode || '',
        landmark: b.address?.landmark || '',
      },
      workingHours: (b as any).workingHours || {
        monday: { isOpen: true, open: '', close: '' },
        tuesday: { isOpen: true, open: '', close: '' },
        wednesday: { isOpen: true, open: '', close: '' },
        thursday: { isOpen: true, open: '', close: '' },
        friday: { isOpen: true, open: '', close: '' },
        saturday: { isOpen: true, open: '', close: '' },
        sunday: { isOpen: false, open: '', close: '' },
      },
      featureOverrides: (b as any).featureOverrides || {},
    });

    const owner = (b as any).owner || {};
    setOwnerDraft({
      name: owner?.name || '',
      email: owner?.email || '',
      phone: owner?.phone || '',
      profileImage: owner?.profileImage || '',
      isActive: owner?.isActive !== false,
      role: owner?.role || 'business_owner',
    });
  }, [b?._id, isEditingDetails]);

  const status = useMemo(() => {
    if (!b) return 'inactive';
    if (!b.isActive) return 'suspended';
    const backendStatus = b.effectiveEntitlements?.storefrontStatus;
    if (backendStatus === 'active') return 'active';
    if (backendStatus === 'inactive') return 'inactive';
    // Fallback (older payloads)
    return b.isVerified ? 'active' : 'inactive';
  }, [b?.isActive, b?.isVerified, b?.effectiveEntitlements?.storefrontStatus]);

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

  const updateWhyChooseUsMutation = useMutation({
    mutationFn: async (items: Array<{ title: string; desc: string; iconName?: string }>) => {
      if (!id) throw new Error('Missing business id');
      return businessAdminApi.updateWhyChooseUs(String(id), items);
    },
    onSuccess: async (res) => {
      if (!res.success) throw new Error(res.message || 'Failed to update Why Choose Us');
      toast.success('Why Choose Us updated');
      setIsEditingWhyChooseUs(false);
      await qc.invalidateQueries({ queryKey: ["admin", "business", "byId", id] });
      await qc.invalidateQueries({ queryKey: ["admin", "business", "list"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update Why Choose Us'),
  });

  const updateBookingTimingsOverrideMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!id) throw new Error('Missing business id');
      const res = await businessAdminApi.updateBookingTimingsOverride(String(id), enabled);
      if (!res.success) throw new Error(res.message || 'Failed to update booking timings permission');
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Booking timings permission updated');
      await qc.invalidateQueries({ queryKey: ['admin', 'business', 'byId', id] });
      await qc.invalidateQueries({ queryKey: ['admin', 'business', 'list'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update booking timings permission'),
  });

  const patchBusinessMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing business id');
      if (!businessDraft) throw new Error('Missing business draft');

      const coverImages = String(businessDraft.coverImagesText || '')
        .split(/\r?\n/)
        .map((x: string) => x.trim())
        .filter(Boolean);

      // Send only editable fields (backend also whitelists).
      const patch = {
        name: String(businessDraft.name || '').trim(),
        slug: String(businessDraft.slug || '').trim(),
        phone: String(businessDraft.phone || '').trim(),
        whatsapp: String(businessDraft.whatsapp || '').trim() || undefined,
        email: String(businessDraft.email || '').trim() || undefined,
        description: String(businessDraft.description || '').trim() || undefined,
        logo: String(businessDraft.logo || '').trim() || undefined,
        coverImage: String(businessDraft.coverImage || '').trim() || undefined,
        coverImages,
        openStatusMode: String(businessDraft.openStatusMode || 'auto'),
        branding: {
          themeColor: String(businessDraft.branding?.themeColor || '').trim() || undefined,
          backgroundColor: String(businessDraft.branding?.backgroundColor || '').trim() || undefined,
          fontColor: String(businessDraft.branding?.fontColor || '').trim() || undefined,
          fontFamily: String(businessDraft.branding?.fontFamily || '').trim() || undefined,
        },
        socialMedia: {
          facebook: String(businessDraft.socialMedia?.facebook || '').trim() || undefined,
          instagram: String(businessDraft.socialMedia?.instagram || '').trim() || undefined,
          twitter: String(businessDraft.socialMedia?.twitter || '').trim() || undefined,
          youtube: String(businessDraft.socialMedia?.youtube || '').trim() || undefined,
        },
        whatsappOrderMessageTemplate: String(businessDraft.whatsappOrderMessageTemplate || '').trim() || undefined,
        whatsappAutoGreetingEnabled: Boolean(businessDraft.whatsappAutoGreetingEnabled),
        whatsappAutoGreetingMessage: String(businessDraft.whatsappAutoGreetingMessage || '').trim() || undefined,
        address: {
          street: String(businessDraft.address?.street || '').trim() || undefined,
          city: String(businessDraft.address?.city || '').trim(),
          state: String(businessDraft.address?.state || '').trim(),
          pincode: String(businessDraft.address?.pincode || '').trim() || undefined,
          landmark: String(businessDraft.address?.landmark || '').trim() || undefined,
        },
        workingHours: businessDraft.workingHours || undefined,
        featureOverrides: businessDraft.featureOverrides || undefined,
      };

      const res = await businessAdminApi.patchBusiness(String(id), patch as any);
      if (!res.success) throw new Error(res.message || 'Failed to update business');
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Business updated');
      setIsEditingDetails(false);
      await qc.invalidateQueries({ queryKey: ["admin", "business", "byId", id] });
      await qc.invalidateQueries({ queryKey: ["admin", "business", "list"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update business'),
  });

  const patchOwnerMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing business id');
      if (!ownerDraft) throw new Error('Missing owner draft');

      const patch = {
        name: String(ownerDraft.name || '').trim(),
        email: String(ownerDraft.email || '').trim(),
        phone: String(ownerDraft.phone || '').trim(),
        profileImage: String(ownerDraft.profileImage || '').trim() || undefined,
        isActive: Boolean(ownerDraft.isActive),
        role: String(ownerDraft.role || 'business_owner'),
      };

      const res = await businessAdminApi.patchOwner(String(id), patch as any);
      if (!res.success) throw new Error(res.message || 'Failed to update owner');
      return res.data;
    },
    onSuccess: async () => {
      toast.success('Owner updated');
      setIsEditingDetails(false);
      await qc.invalidateQueries({ queryKey: ["admin", "business", "byId", id] });
      await qc.invalidateQueries({ queryKey: ["admin", "business", "list"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update owner'),
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

  const addressText = `${b.address?.street || ''} ${b.address?.city || ''} ${b.address?.state || ''} ${b.address?.pincode || ''}`.trim();
  const coords = Array.isArray(b.address?.location?.coordinates) ? b.address?.location?.coordinates : null;
  const lat = coords && coords.length === 2 ? Number(coords[1]) : null;
  const lng = coords && coords.length === 2 ? Number(coords[0]) : null;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
  const mapUrl = hasCoords
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    : (addressText ? `https://maps.google.com/maps?q=${encodeURIComponent(addressText)}&z=15&output=embed` : null);

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
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address" value={addressText || '—'} />
              <InfoRow icon={<Award className="h-4 w-4" />} label="Business Type" value={b.businessType?.name || '—'} />
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
      <CardHeader><CardTitle className="text-base">Shop Location Map</CardTitle></CardHeader>
      <CardContent>
        {mapUrl ? (
          <div className="space-y-2">
            <div className="aspect-[16/9] w-full overflow-hidden rounded-lg border">
              <iframe title="Shop location" src={mapUrl} className="h-full w-full" loading="lazy" />
            </div>
            <p className="text-xs text-muted-foreground">
              {hasCoords
                ? `Coordinates: ${lat}, ${lng}`
                : 'Map is shown using address (no coordinates saved).'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No address/location available to show on map.</p>
        )}
      </CardContent>
    </Card>

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

      <Card>
        <CardHeader><CardTitle className="text-base">Booking Timings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Allow custom booking timings</p>
              <p className="text-xs text-muted-foreground">If off, this shop uses business type default timings only.</p>
            </div>
            <Switch
              checked={b.bookingTimingsOverrideEnabled === true}
              disabled={updateBookingTimingsOverrideMutation.isPending}
              onCheckedChange={(v) => updateBookingTimingsOverrideMutation.mutate(v)}
            />
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
          <CardTitle className="text-base">Admin Edit</CardTitle>
          <div className="flex items-center gap-2">
            {!isEditingDetails ? (
              <Button size="sm" variant="outline" onClick={() => setIsEditingDetails(true)}>
                Edit
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingDetails(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={patchBusinessMutation.isPending}
                  onClick={() => patchBusinessMutation.mutate()}
                >
                  Save Business
                </Button>
                <Button
                  size="sm"
                  disabled={patchOwnerMutation.isPending}
                  onClick={() => patchOwnerMutation.mutate()}
                >
                  Save Owner
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Super admin yahin se dukandar ki details view + update kar sakta hai (structured UI). Complex fields: Working Hours + Feature Overrides.
          </p>

          {/* Owner */}
          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Owner</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Name</p>
                <Input
                  disabled={!isEditingDetails}
                  value={ownerDraft?.name || ''}
                  onChange={(e) => setOwnerDraft((p: any) => ({ ...(p || {}), name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <Input
                  disabled={!isEditingDetails}
                  value={ownerDraft?.email || ''}
                  onChange={(e) => setOwnerDraft((p: any) => ({ ...(p || {}), email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Phone</p>
                <Input
                  disabled={!isEditingDetails}
                  value={ownerDraft?.phone || ''}
                  onChange={(e) => setOwnerDraft((p: any) => ({ ...(p || {}), phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Profile Image URL</p>
                <Input
                  disabled={!isEditingDetails}
                  value={ownerDraft?.profileImage || ''}
                  onChange={(e) => setOwnerDraft((p: any) => ({ ...(p || {}), profileImage: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3 mt-4">
              <div>
                <p className="text-sm font-medium">Owner Active</p>
                <p className="text-xs text-muted-foreground">Login/Access control ke liye</p>
              </div>
              <Switch
                checked={Boolean(ownerDraft?.isActive)}
                disabled={!isEditingDetails}
                onCheckedChange={(v) => setOwnerDraft((p: any) => ({ ...(p || {}), isActive: v }))}
              />
            </div>

            <div className="space-y-1 mt-4">
              <p className="text-xs text-muted-foreground">Role</p>
              <Select
                value={String(ownerDraft?.role || 'business_owner')}
                onValueChange={(v) => setOwnerDraft((p: any) => ({ ...(p || {}), role: v }))}
                disabled={!isEditingDetails}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business_owner">business_owner</SelectItem>
                  <SelectItem value="staff">staff</SelectItem>
                  <SelectItem value="customer">customer</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business */}
          <div className="rounded-md border p-4">
            <p className="text-sm font-medium">Business</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Name</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.name || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Slug</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.slug || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), slug: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Phone</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.phone || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.whatsapp || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), whatsapp: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Business Email</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.email || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Open Status Mode</p>
                <Select
                  value={String(businessDraft?.openStatusMode || 'auto')}
                  onValueChange={(v) => setBusinessDraft((p: any) => ({ ...(p || {}), openStatusMode: v }))}
                  disabled={!isEditingDetails}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">auto</SelectItem>
                    <SelectItem value="open">open</SelectItem>
                    <SelectItem value="closed">closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1 mt-4">
              <p className="text-xs text-muted-foreground">Description</p>
              <Textarea
                disabled={!isEditingDetails}
                value={businessDraft?.description || ''}
                onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), description: e.target.value }))}
                rows={4}
              />
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Logo URL</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.logo || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), logo: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Cover Image URL</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.coverImage || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), coverImage: e.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs text-muted-foreground">Cover Images (one per line)</p>
                <Textarea
                  disabled={!isEditingDetails}
                  value={businessDraft?.coverImagesText || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), coverImagesText: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <p className="text-sm font-medium">Address</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Street</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.address?.street || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), address: { ...(p?.address || {}), street: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Landmark</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.address?.landmark || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), address: { ...(p?.address || {}), landmark: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">City</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.address?.city || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), address: { ...(p?.address || {}), city: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">State</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.address?.state || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), address: { ...(p?.address || {}), state: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pincode</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.address?.pincode || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), address: { ...(p?.address || {}), pincode: e.target.value } }))}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <p className="text-sm font-medium">Branding</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Theme Color (hex)</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.branding?.themeColor || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), branding: { ...(p?.branding || {}), themeColor: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Background Color (hex)</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.branding?.backgroundColor || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), branding: { ...(p?.branding || {}), backgroundColor: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Font Color (hex)</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.branding?.fontColor || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), branding: { ...(p?.branding || {}), fontColor: e.target.value } }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Font Family</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.branding?.fontFamily || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), branding: { ...(p?.branding || {}), fontFamily: e.target.value } }))}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <p className="text-sm font-medium">Social Links</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {(['facebook', 'instagram', 'twitter', 'youtube'] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <Input
                    disabled={!isEditingDetails}
                    value={businessDraft?.socialMedia?.[key] || ''}
                    onChange={(e) => setBusinessDraft((p: any) => ({
                      ...(p || {}),
                      socialMedia: { ...(p?.socialMedia || {}), [key]: e.target.value },
                    }))}
                  />
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <p className="text-sm font-medium">WhatsApp Settings</p>
            <div className="space-y-3 mt-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Order Message Template</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.whatsappOrderMessageTemplate || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), whatsappOrderMessageTemplate: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Auto Greeting Enabled</p>
                  <p className="text-xs text-muted-foreground">Customer chat start par auto message</p>
                </div>
                <Switch
                  checked={Boolean(businessDraft?.whatsappAutoGreetingEnabled)}
                  disabled={!isEditingDetails}
                  onCheckedChange={(v) => setBusinessDraft((p: any) => ({ ...(p || {}), whatsappAutoGreetingEnabled: v }))}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Auto Greeting Message</p>
                <Input
                  disabled={!isEditingDetails}
                  value={businessDraft?.whatsappAutoGreetingMessage || ''}
                  onChange={(e) => setBusinessDraft((p: any) => ({ ...(p || {}), whatsappAutoGreetingMessage: e.target.value }))}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <p className="text-sm font-medium">Working Hours</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              {Object.entries(businessDraft?.workingHours || {}).map(([day, v]: any) => (
                <div key={day} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium capitalize">{day}</p>
                    <Switch
                      checked={v?.isOpen !== false}
                      disabled={!isEditingDetails}
                      onCheckedChange={(checked) => {
                        setBusinessDraft((p: any) => ({
                          ...(p || {}),
                          workingHours: {
                            ...(p?.workingHours || {}),
                            [day]: { ...(p?.workingHours?.[day] || {}), isOpen: checked },
                          },
                        }));
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Open</p>
                      <Input
                        disabled={!isEditingDetails}
                        value={v?.open || ''}
                        placeholder="09:00"
                        onChange={(e) => {
                          const value = e.target.value;
                          setBusinessDraft((p: any) => ({
                            ...(p || {}),
                            workingHours: {
                              ...(p?.workingHours || {}),
                              [day]: { ...(p?.workingHours?.[day] || {}), open: value },
                            },
                          }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Close</p>
                      <Input
                        disabled={!isEditingDetails}
                        value={v?.close || ''}
                        placeholder="20:00"
                        onChange={(e) => {
                          const value = e.target.value;
                          setBusinessDraft((p: any) => ({
                            ...(p || {}),
                            workingHours: {
                              ...(p?.workingHours || {}),
                              [day]: { ...(p?.workingHours?.[day] || {}), close: value },
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <p className="text-sm font-medium">Feature Overrides</p>
            <p className="text-xs text-muted-foreground mt-1">Blank / unset = plan se inherit</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
              {(
                [
                  { key: 'maxListings', type: 'number' },
                  { key: 'maxFeaturedListings', type: 'number' },
                  { key: 'publicShopEnabled', type: 'bool' },
                  { key: 'bookingEnabled', type: 'bool' },
                  { key: 'featuredEnabled', type: 'bool' },
                  { key: 'customDomain', type: 'bool' },
                  { key: 'analyticsEnabled', type: 'bool' },
                  { key: 'prioritySupport', type: 'bool' },
                  { key: 'whatsappIntegration', type: 'bool' },
                  { key: 'removeWatermark', type: 'bool' },
                  { key: 'seoTools', type: 'bool' },
                  { key: 'apiAccess', type: 'bool' },
                  { key: 'supportTicketsEnabled', type: 'bool' },
                  { key: 'referralsEnabled', type: 'bool' },
                  { key: 'invoicesEnabled', type: 'bool' },
                  { key: 'brandingEnabled', type: 'bool' },
                  { key: 'whatsappSettingsEnabled', type: 'bool' },
                  { key: 'ordersEnabled', type: 'bool' },
                  { key: 'inquiriesEnabled', type: 'bool' },
                ] as Array<{ key: string; type: 'bool' | 'number' }>
              ).map((item) => (
                <div key={item.key} className="rounded-md border p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.key}</p>
                    <p className="text-xs text-muted-foreground">Override</p>
                  </div>
                  {item.type === 'bool' ? (
                    <Switch
                      checked={Boolean((businessDraft?.featureOverrides || {})[item.key])}
                      disabled={!isEditingDetails}
                      onCheckedChange={(v) => {
                        setBusinessDraft((p: any) => ({
                          ...(p || {}),
                          featureOverrides: { ...(p?.featureOverrides || {}), [item.key]: v },
                        }));
                      }}
                    />
                  ) : (
                    <Input
                      className="w-32"
                      disabled={!isEditingDetails}
                      value={(() => {
                        const val = (businessDraft?.featureOverrides || {})[item.key];
                        return (val === null || val === undefined) ? '' : String(val);
                      })()}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setBusinessDraft((p: any) => ({
                          ...(p || {}),
                          featureOverrides: {
                            ...(p?.featureOverrides || {}),
                            [item.key]: raw.trim() === '' ? undefined : Number(raw),
                          },
                        }));
                      }}
                      placeholder="(inherit)"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Why Choose Us</CardTitle>
          <div className="flex items-center gap-2">
            {!isEditingWhyChooseUs ? (
              <Button size="sm" variant="outline" onClick={() => setIsEditingWhyChooseUs(true)}>
                Edit
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingWhyChooseUs(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={updateWhyChooseUsMutation.isPending}
                  onClick={() => {
                    const cleaned = (whyChooseDraft || [])
                      .map((x) => ({
                        title: String(x?.title || '').trim(),
                        desc: String(x?.desc || '').trim(),
                        iconName: String(x?.iconName || '').trim() || undefined,
                      }))
                      .filter((x) => x.title || x.desc || x.iconName);
                    updateWhyChooseUsMutation.mutate(cleaned);
                  }}
                >
                  Save
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Defaults come from Business Type; admin can edit for this shop.</p>

          {isEditingWhyChooseUs ? (
            <div className="space-y-3 mb-6">
              {(whyChooseDraft.length ? whyChooseDraft : Array.from({ length: 4 }, () => ({ title: '', desc: '', iconName: '' }))).map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-md border p-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Title</p>
                    <Input
                      value={item.title}
                      onChange={(e) => {
                        const next = [...whyChooseDraft];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setWhyChooseDraft(next);
                      }}
                      placeholder="e.g. Fast delivery"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <Textarea
                      value={item.desc}
                      onChange={(e) => {
                        const next = [...whyChooseDraft];
                        next[idx] = { ...next[idx], desc: e.target.value };
                        setWhyChooseDraft(next);
                      }}
                      placeholder="Short description"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Icon (optional)</p>
                    <Input
                      value={item.iconName || ''}
                      onChange={(e) => {
                        const next = [...whyChooseDraft];
                        next[idx] = { ...next[idx], iconName: e.target.value };
                        setWhyChooseDraft(next);
                      }}
                      placeholder="Lucide icon name (e.g. Truck)"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

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
