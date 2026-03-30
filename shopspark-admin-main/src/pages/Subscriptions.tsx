import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoiceAdminApi, plansApi, type AdminInvoice, type Plan, type PlanFeatures } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Download, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type BillingCycle = "monthly" | "quarterly" | "yearly";
type PlanForm = {
  name: string;
  slug: string;
  price: number;
  billingCycle: BillingCycle;
  isPublic: boolean;
  features: PlanFeatures;
};

const defaultFeatures: PlanFeatures = {
  maxListings: 10,
  publicShopEnabled: true,
  bookingEnabled: false,
  featuredEnabled: false,
  maxFeaturedListings: 0,
  customDomain: false,
  analyticsEnabled: false,
  prioritySupport: false,
  whatsappIntegration: true,
  removeWatermark: false,
  seoTools: false,
  apiAccess: false,

  supportTicketsEnabled: true,
  referralsEnabled: true,
  invoicesEnabled: true,
  brandingEnabled: true,
  whatsappSettingsEnabled: true,

  ordersEnabled: true,
  inquiriesEnabled: true,
};

const emptyPlan: PlanForm = {
  name: "",
  slug: "",
  price: 0,
  billingCycle: "monthly",
  isPublic: true,
  features: defaultFeatures,
};

const cycleToDays: Record<BillingCycle, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

function daysToCycle(days?: number): BillingCycle {
  if (!days) return "monthly";
  if (days >= 365) return "yearly";
  if (days >= 90) return "quarterly";
  return "monthly";
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeFeatures(input: unknown): PlanFeatures {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return { ...defaultFeatures, ...(input as Partial<PlanFeatures>) };
  }
  return defaultFeatures;
}

function featureSummary(input: unknown): string[] {
  const f = normalizeFeatures(input);
  const items: string[] = [];

  items.push(`Max listings: ${f.maxListings}`);

  if (f.publicShopEnabled) items.push("Public shop");

  if (f.bookingEnabled) items.push("Bookings enabled");
  if (f.featuredEnabled) {
    items.push(`Featured listings: ${f.maxFeaturedListings || 0}`);
  }
  if (f.customDomain) items.push("Custom domain");
  if (f.analyticsEnabled) items.push("Analytics");
  if (f.prioritySupport) items.push("Priority support");
  if (f.whatsappIntegration) items.push("WhatsApp integration");
  if (f.removeWatermark) items.push("Remove watermark");
  if (f.seoTools) items.push("SEO tools");
  if (f.apiAccess) items.push("API access");

  if (f.supportTicketsEnabled) items.push("Support tickets");
  if (f.referralsEnabled) items.push("Referrals");
  if (f.invoicesEnabled) items.push("Invoices");
  if (f.brandingEnabled) items.push("Branding");
  if (f.whatsappSettingsEnabled) items.push("WhatsApp settings");

  if (f.ordersEnabled) items.push("Orders");
  if (f.inquiriesEnabled) items.push("Inquiries");

  return items;
}

export default function Subscriptions() {
  const qc = useQueryClient();

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<"all" | "paid" | "pending" | "failed">("all");
  const [invoiceFrom, setInvoiceFrom] = useState<string>("");
  const [invoiceTo, setInvoiceTo] = useState<string>("");

  const plansQuery = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: async () => {
      const res = await plansApi.list({ includeInactive: true, includeHidden: true });
      if (!res.success) throw new Error(res.message || 'Failed to load plans');
      return res.data || [];
    },
  });

  const invoicesQuery = useQuery({
    queryKey: ["admin", "invoices", { invoiceSearch, invoiceStatus, invoiceFrom, invoiceTo }],
    queryFn: async () => {
      const res = await invoiceAdminApi.list({
        limit: 100,
        search: invoiceSearch.trim() || undefined,
        status: invoiceStatus === "all" ? undefined : invoiceStatus,
        from: invoiceFrom ? `${invoiceFrom}T00:00:00.000Z` : undefined,
        to: invoiceTo ? `${invoiceTo}T23:59:59.999Z` : undefined,
      });
      if (!res.success) throw new Error(res.message || "Failed to load invoices");
      return res.data;
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyPlan);

  const plans = plansQuery.data || [];
  const invoices: AdminInvoice[] = invoicesQuery.data?.items || [];

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onDownloadInvoice = async (inv: AdminInvoice) => {
    try {
      const blob = await invoiceAdminApi.downloadPdf(inv._id);
      downloadBlob(blob, `${inv.invoiceNumber}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download invoice");
    }
  };

  const openAdd = () => {
    setEditingPlan(null);
    setForm({ ...emptyPlan, isPublic: true, features: defaultFeatures });
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug || "",
      price: plan.price,
      billingCycle: daysToCycle(plan.durationInDays),
      isPublic: plan.isPublic ?? true,
      features: normalizeFeatures(plan.features),
    });
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug.trim() || slugify(form.name);
      if (!slug) throw new Error("Slug is required");

      const res = await plansApi.create({
        name: form.name,
        slug,
        price: form.price,
        durationInDays: cycleToDays[form.billingCycle],
        isPublic: form.isPublic,
        features: form.features,
      });
      if (!res.success) throw new Error(res.message || 'Failed to create plan');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Plan created successfully');
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create plan'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingPlan?._id) throw new Error('No plan selected');
      const res = await plansApi.update(editingPlan._id, {
        name: form.name,
        price: form.price,
        durationInDays: cycleToDays[form.billingCycle],
        isPublic: form.isPublic,
        features: form.features,
      });
      if (!res.success) throw new Error(res.message || 'Failed to update plan');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Plan updated successfully');
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await plansApi.remove(id);
      if (!res.success) throw new Error(res.message || 'Failed to delete plan');
      return res;
    },
    onSuccess: () => {
      toast.success('Plan deleted');
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete plan'),
  });

  const handleSave = () => {
    if (!form.name || form.price < 0 || !Number.isFinite(form.price) || !Number.isFinite(form.features.maxListings)) {
      toast.error("Please fill all fields");
      return;
    }
    if (editingPlan) updateMutation.mutate();
    else createMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const setFeature = <K extends keyof PlanFeatures>(key: K, value: PlanFeatures[K]) =>
    setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscriptions & Payments</h1>
        <p className="text-sm text-muted-foreground">Manage plans and invoices</p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add Plan</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plansQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-28" />
                    <div className="flex items-baseline gap-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-11/12" />
                      <Skeleton className="h-4 w-10/12" />
                      <Skeleton className="h-4 w-9/12" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : plans.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-10 text-center text-muted-foreground">No plans found</CardContent>
              </Card>
            ) : plans.map(plan => (
              <Card key={plan._id} className="relative group">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(plan._id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">₹{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/{daysToCycle(plan.durationInDays)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {featureSummary(plan.features).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">Invoices</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search invoice / shop / Razorpay ID"
                    className="sm:w-72"
                  />
                  <Input
                    type="date"
                    value={invoiceFrom}
                    onChange={(e) => setInvoiceFrom(e.target.value)}
                    className="sm:w-40"
                  />
                  <Input
                    type="date"
                    value={invoiceTo}
                    onChange={(e) => setInvoiceTo(e.target.value)}
                    className="sm:w-40"
                  />
                  <Select value={invoiceStatus} onValueChange={(v: any) => setInvoiceStatus(v)}>
                    <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />Export</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Shop</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesQuery.isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No invoices found</TableCell>
                    </TableRow>
                  ) : invoices.map(inv => (
                    <TableRow key={inv._id}>
                      <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{inv.business?.name || "-"}</TableCell>
                      <TableCell className="text-sm font-medium">₹{inv.amount}</TableCell>
                      <TableCell className="text-sm">{inv.payment?.method || "-"}</TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(inv.issuedAt).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => onDownloadInvoice(inv)}>Download</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Add New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Growth"
              />
            </div>

            {!editingPlan && (
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="e.g. growth"
                />
                <p className="text-xs text-muted-foreground">If empty, it will be generated from the name.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select value={form.billingCycle} onValueChange={(v: BillingCycle) => setForm(f => ({ ...f, billingCycle: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Publicly available</Label>
                <p className="text-xs text-muted-foreground">If off, only admin can assign this plan</p>
              </div>
              <Switch checked={form.isPublic} onCheckedChange={(v) => setForm(f => ({ ...f, isPublic: v }))} />
            </div>

            <div className="space-y-2">
              <Label>Features</Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Max Listings</Label>
                  <Input
                    type="number"
                    value={form.features.maxListings}
                    onChange={(e) => setFeature("maxListings", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Max Featured Listings</Label>
                  <Input
                    type="number"
                    value={form.features.maxFeaturedListings}
                    onChange={(e) => setFeature("maxFeaturedListings", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Public Shop</Label>
                  <Switch checked={form.features.publicShopEnabled} onCheckedChange={(v) => setFeature("publicShopEnabled", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Bookings</Label>
                  <Switch checked={form.features.bookingEnabled} onCheckedChange={(v) => setFeature("bookingEnabled", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Featured</Label>
                  <Switch checked={form.features.featuredEnabled} onCheckedChange={(v) => setFeature("featuredEnabled", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Custom Domain</Label>
                  <Switch checked={form.features.customDomain} onCheckedChange={(v) => setFeature("customDomain", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Analytics</Label>
                  <Switch checked={form.features.analyticsEnabled} onCheckedChange={(v) => setFeature("analyticsEnabled", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Priority Support</Label>
                  <Switch checked={form.features.prioritySupport} onCheckedChange={(v) => setFeature("prioritySupport", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">WhatsApp</Label>
                  <Switch checked={form.features.whatsappIntegration} onCheckedChange={(v) => setFeature("whatsappIntegration", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Remove Watermark</Label>
                  <Switch checked={form.features.removeWatermark} onCheckedChange={(v) => setFeature("removeWatermark", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">SEO Tools</Label>
                  <Switch checked={form.features.seoTools} onCheckedChange={(v) => setFeature("seoTools", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">API Access</Label>
                  <Switch checked={form.features.apiAccess} onCheckedChange={(v) => setFeature("apiAccess", v)} />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Support Tickets</Label>
                  <Switch checked={form.features.supportTicketsEnabled} onCheckedChange={(v) => setFeature("supportTicketsEnabled", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Referrals</Label>
                  <Switch checked={form.features.referralsEnabled} onCheckedChange={(v) => setFeature("referralsEnabled", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Invoices</Label>
                  <Switch checked={form.features.invoicesEnabled} onCheckedChange={(v) => setFeature("invoicesEnabled", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Branding</Label>
                  <Switch checked={form.features.brandingEnabled} onCheckedChange={(v) => setFeature("brandingEnabled", v)} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">WhatsApp Settings</Label>
                  <Switch checked={form.features.whatsappSettingsEnabled} onCheckedChange={(v) => setFeature("whatsappSettingsEnabled", v)} />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Orders</Label>
                  <Switch checked={form.features.ordersEnabled} onCheckedChange={(v) => setFeature("ordersEnabled", v)} />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label className="text-sm">Inquiries</Label>
                  <Switch checked={form.features.inquiriesEnabled} onCheckedChange={(v) => setFeature("inquiriesEnabled", v)} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingPlan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
