import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Plus, Edit, Power, TreePine, Users, Award, CheckCircle2, XCircle, Clock3 } from "lucide-react";
import { toast } from "sonner";

import {
  referralAdminApi,
  customerReferralAdminApi,
  walletAdminApi,
  type ReferralOffer,
  type ReferralDashboardStats,
  type AdminReferralRow,
  type ReferralTreeNode,
  type AdminCustomerReferralRow,
  type CustomerReferralStatus,
  type CustomerReferralOffer,
  type AdminWithdrawalRequest,
  type WithdrawalStatus,
} from "@/lib/api";

export default function Referrals() {
  const [offerDialog, setOfferDialog] = useState(false);
  const [editingOffer, setEditingOffer] = useState<ReferralOffer | null>(null);
  const [form, setForm] = useState({
    offerName: "",
    description: "",
    referralThreshold: 3,
    rewardPlan: "starter",
    rewardDuration: 1,
    firstTimeOnly: false,
    requiresFirstPaidPlan: true,
    autoApprove: false,
  });

  const qc = useQueryClient();

  const [customerOfferDialog, setCustomerOfferDialog] = useState(false);
  const [editingCustomerOffer, setEditingCustomerOffer] = useState<CustomerReferralOffer | null>(null);
  const [customerOfferForm, setCustomerOfferForm] = useState({
    offerName: "",
    description: "",
    commissionPercent: 5,
  });

  const [customerReferralStatus, setCustomerReferralStatus] = useState<CustomerReferralStatus | "all">("all");
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatus | "all">("pending");

  const statsQuery = useQuery({
    queryKey: ["admin", "referrals", "stats"],
    queryFn: async () => {
      const res = await referralAdminApi.getStats();
      if (!res.success) throw new Error(res.message || "Failed to load stats");
      return res.data as ReferralDashboardStats;
    },
  });

  const offersQuery = useQuery({
    queryKey: ["admin", "referrals", "offers"],
    queryFn: async () => {
      const res = await referralAdminApi.listOffers({ limit: 50 });
      if (!res.success) throw new Error(res.message || "Failed to load offers");
      return res.data?.offers || [];
    },
  });

  const referralsQuery = useQuery({
    queryKey: ["admin", "referrals", "all"],
    queryFn: async () => {
      const res = await referralAdminApi.listReferrals({ limit: 50 });
      if (!res.success) throw new Error(res.message || "Failed to load referrals");
      return (res.data?.referrals || []) as AdminReferralRow[];
    },
  });

  const treeQuery = useQuery({
    queryKey: ["admin", "referrals", "tree"],
    queryFn: async () => {
      const res = await referralAdminApi.getReferralTree({ depth: 4 });
      if (!res.success) throw new Error(res.message || "Failed to load referral tree");
      return (res.data?.roots || []) as ReferralTreeNode[];
    },
  });

  const rewardRequestsQuery = useQuery({
    queryKey: ["admin", "referrals", "reward-requests"],
    queryFn: async () => {
      const res = await referralAdminApi.listRequests({ limit: 50 });
      if (!res.success) throw new Error(res.message || "Failed to load reward requests");
      return res.data?.requests || [];
    },
  });

  const customerReferralMetricsQuery = useQuery({
    queryKey: ["admin", "customer-referrals", "metrics"],
    queryFn: async () => {
      const res = await customerReferralAdminApi.getMetrics();
      if (!res.success) throw new Error(res.message || "Failed to load customer referral metrics");
      return res.data;
    },
  });

  const customerReferralsQuery = useQuery({
    queryKey: ["admin", "customer-referrals", "list", customerReferralStatus],
    queryFn: async () => {
      const res = await customerReferralAdminApi.list({
        status: customerReferralStatus === "all" ? undefined : customerReferralStatus,
      });
      if (!res.success) throw new Error(res.message || "Failed to load customer referrals");
      return (res.data || []) as AdminCustomerReferralRow[];
    },
  });

  const customerReferralOffersQuery = useQuery({
    queryKey: ["admin", "customer-referrals", "offers"],
    queryFn: async () => {
      const res = await customerReferralAdminApi.listOffers();
      if (!res.success) throw new Error(res.message || "Failed to load customer referral offers");
      return (res.data || []) as CustomerReferralOffer[];
    },
  });

  const createCustomerOfferMutation = useMutation({
    mutationFn: async () => {
      const res = await customerReferralAdminApi.createOffer({
        offerName: customerOfferForm.offerName,
        description: customerOfferForm.description || undefined,
        commissionPercent: Number(customerOfferForm.commissionPercent),
      });
      if (!res.success) throw new Error(res.message || "Failed to create offer");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Customer referral offer created");
      qc.invalidateQueries({ queryKey: ["admin", "customer-referrals", "offers"] });
      setCustomerOfferDialog(false);
    },
    onError: (e: any) => toast.error(e?.message || "Create failed"),
  });

  const updateCustomerOfferMutation = useMutation({
    mutationFn: async () => {
      if (!editingCustomerOffer?._id) throw new Error("No offer selected");
      const res = await customerReferralAdminApi.updateOffer(editingCustomerOffer._id, {
        offerName: customerOfferForm.offerName,
        description: customerOfferForm.description || undefined,
        commissionPercent: Number(customerOfferForm.commissionPercent),
      });
      if (!res.success) throw new Error(res.message || "Failed to update offer");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Customer referral offer updated");
      qc.invalidateQueries({ queryKey: ["admin", "customer-referrals", "offers"] });
      setCustomerOfferDialog(false);
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  const toggleCustomerOfferStatusMutation = useMutation({
    mutationFn: async (offer: CustomerReferralOffer) => {
      const res = offer.status === 'active'
        ? await customerReferralAdminApi.closeOffer(offer._id)
        : await customerReferralAdminApi.activateOffer(offer._id);
      if (!res.success) throw new Error(res.message || "Failed to update offer status");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Customer offer status updated");
      qc.invalidateQueries({ queryKey: ["admin", "customer-referrals", "offers"] });
    },
    onError: (e: any) => toast.error(e?.message || "Status update failed"),
  });

  const walletMetricsQuery = useQuery({
    queryKey: ["admin", "wallet", "metrics"],
    queryFn: async () => {
      const res = await walletAdminApi.getMetrics();
      if (!res.success) throw new Error(res.message || "Failed to load wallet metrics");
      return res.data;
    },
  });

  const withdrawalsQuery = useQuery({
    queryKey: ["admin", "wallet", "withdrawals", withdrawalStatus],
    queryFn: async () => {
      const res = await walletAdminApi.listWithdrawals({
        status: withdrawalStatus === "all" ? undefined : withdrawalStatus,
      });
      if (!res.success) throw new Error(res.message || "Failed to load withdrawals");
      return (res.data || []) as AdminWithdrawalRequest[];
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await walletAdminApi.approveWithdrawal(id);
      if (!res.success) throw new Error(res.message || "Approve failed");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Withdrawal approved");
      qc.invalidateQueries({ queryKey: ["admin", "wallet", "withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin", "wallet", "metrics"] });
    },
    onError: (e: any) => toast.error(e?.message || "Approve failed"),
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (payload: { id: string; reason?: string }) => {
      const res = await walletAdminApi.rejectWithdrawal(payload.id, payload.reason);
      if (!res.success) throw new Error(res.message || "Reject failed");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Withdrawal rejected (refunded)");
      qc.invalidateQueries({ queryKey: ["admin", "wallet", "withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin", "wallet", "metrics"] });
    },
    onError: (e: any) => toast.error(e?.message || "Reject failed"),
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const note = window.prompt("Approval note (optional)") || undefined;
      const res = await referralAdminApi.approveRequest(requestId, note);
      if (!res.success) throw new Error(res.message || "Failed to approve request");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Reward request approved");
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "reward-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "stats"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to approve request"),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const reason = window.prompt("Rejection reason");
      if (!reason?.trim()) throw new Error("Rejection reason is required");
      const res = await referralAdminApi.rejectRequest(requestId, reason.trim());
      if (!res.success) throw new Error(res.message || "Failed to reject request");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Reward request rejected");
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "reward-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "stats"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to reject request"),
  });

  const renderTree = (node: ReferralTreeNode, level: number) => {
    const label = node.businessName || node.name || node.email || node._id;
    return (
      <div key={node._id} className={level > 0 ? "pl-6" : ""}>
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{label}</div>
            <div className="text-xs text-muted-foreground truncate">{node.email}{node.phone ? ` • ${node.phone}` : ""}</div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {node.referrals?.length || 0}
          </Badge>
        </div>

        {(node.referrals || []).map((edge) => (
          <div key={edge.referralId} className="pl-4 border-l border-border">
            <div className="flex items-center gap-2 py-1">
              <Badge variant={edge.status === 'valid' ? 'default' : edge.status === 'pending' ? 'secondary' : 'outline'}>
                {edge.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {edge.offer?.offerName || '—'}
              </span>
            </div>
            {renderTree(edge.referredUser, level + 1)}
          </div>
        ))}
      </div>
    );
  };

  const createOfferMutation = useMutation({
    mutationFn: async () => {
      const res = await referralAdminApi.createOffer({
        offerName: form.offerName,
        description: form.description || undefined,
        referralThreshold: form.referralThreshold,
        rewardPlan: form.rewardPlan,
        rewardDuration: form.rewardDuration,
        firstTimeOnly: form.firstTimeOnly,
        requiresFirstPaidPlan: form.requiresFirstPaidPlan,
        autoApprove: form.autoApprove,
      });
      if (!res.success) throw new Error(res.message || "Failed to create offer");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Offer created");
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "offers"] });
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "stats"] });
      setOfferDialog(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to create offer"),
  });

  const updateOfferMutation = useMutation({
    mutationFn: async () => {
      if (!editingOffer?._id) throw new Error("No offer selected");
      const res = await referralAdminApi.updateOffer(editingOffer._id, {
        offerName: form.offerName,
        description: form.description || undefined,
        referralThreshold: form.referralThreshold,
        rewardPlan: form.rewardPlan,
        rewardDuration: form.rewardDuration,
        firstTimeOnly: form.firstTimeOnly,
        requiresFirstPaidPlan: form.requiresFirstPaidPlan,
        autoApprove: form.autoApprove,
      });
      if (!res.success) throw new Error(res.message || "Failed to update offer");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Offer updated");
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "offers"] });
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "stats"] });
      setOfferDialog(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update offer"),
  });

  const toggleOfferStatusMutation = useMutation({
    mutationFn: async (offer: ReferralOffer) => {
      const res = offer.status === 'active'
        ? await referralAdminApi.closeOffer(offer._id)
        : await referralAdminApi.activateOffer(offer._id);
      if (!res.success) throw new Error(res.message || "Failed to update offer status");
      return res.data;
    },
    onSuccess: () => {
      toast.success("Offer status updated");
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "offers"] });
      qc.invalidateQueries({ queryKey: ["admin", "referrals", "stats"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update status"),
  });

  const offers = offersQuery.data || [];
  const stats = statsQuery.data;

  const activeOffer = useMemo(() => offers.find((o) => o.status === 'active'), [offers]);

  const customerOffers = customerReferralOffersQuery.data || [];
  const activeCustomerOffer = useMemo(
    () => customerOffers.find((o) => o.status === 'active'),
    [customerOffers]
  );

  const openCreateCustomerOfferDialog = () => {
    setEditingCustomerOffer(null);
    setCustomerOfferForm({ offerName: "", description: "", commissionPercent: 5 });
    setCustomerOfferDialog(true);
  };

  const openEditCustomerOfferDialog = (offer: CustomerReferralOffer) => {
    setEditingCustomerOffer(offer);
    setCustomerOfferForm({
      offerName: offer.offerName || "",
      description: offer.description || "",
      commissionPercent: Number(offer.commissionPercent || 0),
    });
    setCustomerOfferDialog(true);
  };

  const handleSaveCustomerOffer = () => {
    if (!customerOfferForm.offerName.trim()) {
      toast.error("Offer name is required");
      return;
    }
    const percent = Number(customerOfferForm.commissionPercent);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      toast.error("Commission % must be between 0 and 100");
      return;
    }

    if (editingCustomerOffer) updateCustomerOfferMutation.mutate();
    else createCustomerOfferMutation.mutate();
  };

  const openCreateDialog = () => {
    setEditingOffer(null);
    setForm({
      offerName: "",
      description: "",
      referralThreshold: 3,
      rewardPlan: "starter",
      rewardDuration: 1,
      firstTimeOnly: false,
      requiresFirstPaidPlan: true,
      autoApprove: false,
    });
    setOfferDialog(true);
  };

  const openEditDialog = (offer: ReferralOffer) => {
    setEditingOffer(offer);
    setForm({
      offerName: offer.offerName,
      description: offer.description || "",
      referralThreshold: offer.referralThreshold,
      rewardPlan: offer.rewardPlan,
      rewardDuration: offer.rewardDuration,
      firstTimeOnly: offer.firstTimeOnly,
      requiresFirstPaidPlan: offer.requiresFirstPaidPlan,
      autoApprove: offer.autoApprove,
    });
    setOfferDialog(true);
  };

  const handleSaveOffer = () => {
    if (!form.offerName.trim()) {
      toast.error("Offer name is required");
      return;
    }
    if (!form.referralThreshold || form.referralThreshold <= 0) {
      toast.error("Referral threshold must be greater than 0");
      return;
    }
    if (!form.rewardDuration || form.rewardDuration <= 0) {
      toast.error("Reward duration must be greater than 0");
      return;
    }

    if (editingOffer) {
      updateOfferMutation.mutate();
    } else {
      createOfferMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Referral System</h1>
          <p className="text-muted-foreground">Manage referral offers, track rewards, and view referral trees</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReferrals ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Referrers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.topReferrers?.length ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOffers ?? "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Rewards Given</CardTitle>
            <TreePine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedRequests ?? "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="offers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="offers">Referral Offers</TabsTrigger>
          <TabsTrigger value="requests">Reward Requests</TabsTrigger>
          <TabsTrigger value="leaderboard">Referrer Leaderboard</TabsTrigger>
          <TabsTrigger value="tree">Referral Tree</TabsTrigger>
          <TabsTrigger value="history">Referral History</TabsTrigger>
          <TabsTrigger value="customer">Customer Referrals</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        {/* Offers Tab */}
        <TabsContent value="offers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateDialog}><Plus className="h-4 w-4 mr-2" /> Create Offer</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {offersQuery.isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-44" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-9 w-24 rounded-md" />
                      <Skeleton className="h-9 w-28 rounded-md" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : offers.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">No offers found</CardContent>
              </Card>
            ) : offers.map(offer => (
              <Card key={offer._id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">{offer.offerName}</CardTitle>
                    <CardDescription>Created {new Date(offer.createdAt).toLocaleDateString("en-IN")}</CardDescription>
                  </div>
                  <Badge variant={offer.status === "active" ? "default" : "secondary"}>
                    {offer.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <span className="text-sm font-medium">{offer.referralThreshold} Referrals</span>
                      <span className="text-sm text-muted-foreground">→</span>
                      <Badge variant="outline">{offer.rewardPlan} ({offer.rewardDuration}mo free)</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(offer)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant={offer.status === "active" ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleOfferStatusMutation.mutate(offer)}
                      disabled={toggleOfferStatusMutation.isPending}
                    >
                      <Power className="h-3.5 w-3.5 mr-1" />
                      {offer.status === "active" ? "Close" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Reward Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Reward Requests</CardTitle>
              <CardDescription>Approve or reject dukandar reward claims</CardDescription>
            </CardHeader>
            <CardContent>
              {rewardRequestsQuery.isLoading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-8 w-28 ml-auto rounded-md" />
                    </div>
                  ))}
                </div>
              ) : rewardRequestsQuery.isError ? (
                <div className="py-8 text-center text-muted-foreground">Failed to load reward requests</div>
              ) : (rewardRequestsQuery.data || []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No reward requests found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request</TableHead>
                      <TableHead>Dukandar</TableHead>
                      <TableHead>Offer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Starts</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Reviewed</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rewardRequestsQuery.data || []).map((r) => {
                      const statusLabel = r.isRewardFulfilled
                        ? "approved + applied"
                        : r.status;
                      const previousExpiry = r.appliedBusinesses?.find((b) => b.previousPlanExpiresAt)?.previousPlanExpiresAt;
                      const fallbackStart = r.appliedBusinesses?.find((b) => b.rewardStartsAt)?.rewardStartsAt;
                      const fallbackEnd = r.appliedBusinesses?.find((b) => b.rewardEndsAt)?.rewardEndsAt;
                      const startsAt = r.rewardStartsAt || fallbackStart;
                      const endsAt = r.rewardEndsAt || fallbackEnd;

                      return (
                        <TableRow key={r._id}>
                          <TableCell>
                            <div className="font-medium">{r.requestNumber || "—"}</div>
                            <div className="text-xs text-muted-foreground">{r.referralCountSnapshot} referrals used</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{r.user?.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{r.user?.email || "—"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{r.offer?.offerName || "—"}</div>
                            <div className="text-xs text-muted-foreground">{r.rewardPlan} for {r.rewardDuration} month(s)</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === "rejected" ? "destructive" : r.status === "pending" ? "secondary" : "default"} className="capitalize">
                              {statusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {startsAt ? (
                              <div>
                                <div>{new Date(startsAt).toLocaleDateString("en-IN")}</div>
                                {previousExpiry ? (
                                  <div className="text-xs">After current plan expiry ({new Date(previousExpiry).toLocaleDateString("en-IN")})</div>
                                ) : null}
                              </div>
                            ) : "After current plan expiry"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {endsAt
                              ? new Date(endsAt).toLocaleDateString("en-IN")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString("en-IN") : "—"}
                          </TableCell>
                          <TableCell>
                            {r.status === "pending" ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveRequestMutation.mutate(r._id)}
                                  disabled={approveRequestMutation.isPending || rejectRequestMutation.isPending}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectRequestMutation.mutate(r._id)}
                                  disabled={approveRequestMutation.isPending || rejectRequestMutation.isPending}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                {r.status === "pending" ? <Clock3 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {r.isRewardFulfilled ? "Applied" : "Completed"}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Referrer Leaderboard</CardTitle>
              <CardDescription>Shops ranked by number of referrals and their earned rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Shop Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Referrals</TableHead>
                    <TableHead>Selected Offer</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stats?.topReferrers || []).map((u, idx) => (
                      <TableRow key={`${u.email}-${idx}`}>
                        <TableCell>
                          <Badge variant={idx < 3 ? "default" : "secondary"}>#{idx + 1}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{u.businessName || u.name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}{u.phone ? ` • ${u.phone}` : ''}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.referralCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.selectedOffer ? "default" : "secondary"}>
                            {u.selectedOffer ? u.selectedOffer.offerName : "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.selectedOfferProgress ? "outline" : "secondary"}>
                            {u.selectedOfferProgress
                              ? `${u.selectedOfferProgress.valid}/${u.selectedOfferProgress.threshold}`
                              : "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tree Tab */}
        <TabsContent value="tree">
          <Card>
            <CardHeader>
              <CardTitle>Referral Tree</CardTitle>
              <CardDescription>Referrer → referred relationships from database</CardDescription>
            </CardHeader>
            <CardContent>
              {treeQuery.isLoading ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-5 w-52" />
                  <Skeleton className="h-4 w-72" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-60" />
                  <Skeleton className="h-4 w-56" />
                </div>
              ) : treeQuery.isError ? (
                <div className="py-8 text-center text-muted-foreground">Failed to load tree</div>
              ) : (treeQuery.data || []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No referral relationships found</div>
              ) : (
                <div className="space-y-4">
                  {(treeQuery.data || []).map((root) => (
                    <Card key={root._id} className="border">
                      <CardContent className="pt-4">
                        {renderTree(root, 0)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
              <CardDescription>All referrals recorded in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {referralsQuery.isLoading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ))}
                </div>
              ) : referralsQuery.isError ? (
                <div className="py-8 text-center text-muted-foreground">Failed to load referrals</div>
              ) : (referralsQuery.data || []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No referrals found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Referred</TableHead>
                      <TableHead>Offer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(referralsQuery.data || []).map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell className="font-medium">{r.referrer?.name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{r.referredUser?.email || r.referredUser?.name || '—'}</TableCell>
                        <TableCell>{r.offer?.offerName || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'valid' ? 'default' : r.status === 'pending' ? 'secondary' : 'outline'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.referralCode || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Referrals (earnings) */}
        <TabsContent value="customer" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Customer Referrals</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerReferralMetricsQuery.data?.totalReferrals ?? "—"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{Math.round((customerReferralMetricsQuery.data?.totalEarningsPaid || 0) * 100) / 100}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
                <Clock3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{walletMetricsQuery.data?.pendingWithdrawals ?? "—"}</div>
                <div className="text-xs text-muted-foreground">₹{Math.round((walletMetricsQuery.data?.pendingWithdrawalsAmount || 0) * 100) / 100}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Customer Referral Offers</CardTitle>
                <CardDescription>
                  Active commission: {activeCustomerOffer ? `${Number(activeCustomerOffer.commissionPercent || 0)}%` : "—"}
                </CardDescription>
              </div>
              <Button onClick={openCreateCustomerOfferDialog}>
                <Plus className="h-4 w-4 mr-2" /> Create Offer
              </Button>
            </CardHeader>
            <CardContent>
              {customerReferralOffersQuery.isLoading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-8 w-28" />
                    </div>
                  ))}
                </div>
              ) : customerReferralOffersQuery.isError ? (
                <div className="py-6 text-center text-muted-foreground">Failed to load offers</div>
              ) : (customerOffers || []).length === 0 ? (
                <div className="py-6 text-center text-muted-foreground">No offers yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Offer</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customerOffers || []).map((o) => (
                      <TableRow key={o._id}>
                        <TableCell>
                          <div className="font-medium">{o.offerName}</div>
                          {o.description ? <div className="text-xs text-muted-foreground">{o.description}</div> : null}
                        </TableCell>
                        <TableCell>{Number(o.commissionPercent || 0)}%</TableCell>
                        <TableCell>
                          <Badge variant={o.status === 'active' ? 'default' : o.status === 'draft' ? 'secondary' : 'outline'} className="capitalize">
                            {o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {o.validFrom ? new Date(o.validFrom).toLocaleDateString('en-IN') : '—'}
                          {o.validUntil ? ` → ${new Date(o.validUntil).toLocaleDateString('en-IN')}` : ''}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditCustomerOfferDialog(o)}>
                              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={o.status === 'active' ? 'secondary' : 'default'}
                              onClick={() => toggleCustomerOfferStatusMutation.mutate(o)}
                              disabled={toggleCustomerOfferStatusMutation.isPending}
                            >
                              <Power className="h-3.5 w-3.5 mr-1" /> {o.status === 'active' ? 'Close' : 'Activate'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Customer Referral Records</CardTitle>
                <CardDescription>
                  Customer earns {activeCustomerOffer ? `${Number(activeCustomerOffer.commissionPercent || 0)}%` : '—'} when referred dukandar buys a paid plan
                </CardDescription>
              </div>
              <Select value={customerReferralStatus} onValueChange={(v) => setCustomerReferralStatus(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="rewarded">Rewarded</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {customerReferralsQuery.isLoading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : customerReferralsQuery.isError ? (
                <div className="py-8 text-center text-muted-foreground">Failed to load customer referrals</div>
              ) : (customerReferralsQuery.data || []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No customer referrals found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Referred Dukandar</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Plan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(customerReferralsQuery.data || []).map((r) => (
                      <TableRow key={r._id}>
                        <TableCell className="text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                        <TableCell>
                          <div className="font-medium">{r.referrer?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.referrer?.email || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{r.referredUser?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{r.referredUser?.email || '—'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'rewarded' ? 'default' : r.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{Math.round((r.commissionEarned || 0) * 100) / 100}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {typeof r.planId === 'object' && r.planId ? (r.planId as any).name || (r.planId as any).slug || '—' : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Withdrawal Requests</CardTitle>
                <CardDescription>Approve or reject customer withdrawals (rejection auto-refunds wallet)</CardDescription>
              </div>
              <Select value={withdrawalStatus} onValueChange={(v) => setWithdrawalStatus(v as any)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {withdrawalsQuery.isLoading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                      <Skeleton className="h-8 w-28 ml-auto rounded-md" />
                    </div>
                  ))}
                </div>
              ) : withdrawalsQuery.isError ? (
                <div className="py-8 text-center text-muted-foreground">Failed to load withdrawals</div>
              ) : (withdrawalsQuery.data || []).length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No withdrawals found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(withdrawalsQuery.data || []).map((w) => (
                      <TableRow key={w._id}>
                        <TableCell className="text-muted-foreground">{w.createdAt ? new Date(w.createdAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                        <TableCell>
                          <div className="font-medium">{w.user?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{w.user?.email || '—'}</div>
                        </TableCell>
                        <TableCell className="font-medium">₹{Math.round((w.amount || 0) * 100) / 100}</TableCell>
                        <TableCell>
                          <Badge variant={w.status === 'rejected' ? 'destructive' : w.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                            {w.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="text-xs">{w.bankDetails?.bankName || '—'}</div>
                          <div className="text-xs">{w.bankDetails?.accountHolderName || '—'}</div>
                        </TableCell>
                        <TableCell>
                          {w.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveWithdrawalMutation.mutate(w._id)}
                                disabled={approveWithdrawalMutation.isPending || rejectWithdrawalMutation.isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectWithdrawalMutation.mutate({ id: w._id })}
                                disabled={approveWithdrawalMutation.isPending || rejectWithdrawalMutation.isPending}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {w.processedAt ? `Processed ${new Date(w.processedAt).toLocaleDateString('en-IN')}` : '—'}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Offer Dialog */}
      <Dialog open={offerDialog} onOpenChange={setOfferDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOffer ? "Edit Offer" : "Create Referral Offer"}</DialogTitle>
            <DialogDescription>Configure referral threshold and reward plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Offer Name</Label>
              <Input value={form.offerName} onChange={e => setForm(f => ({ ...f, offerName: e.target.value }))} placeholder="e.g. Mega Referral Program" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Referral Threshold</Label>
                <Input type="number" value={form.referralThreshold} onChange={e => setForm(f => ({ ...f, referralThreshold: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Reward Duration (months)</Label>
                <Input type="number" value={form.rewardDuration} onChange={e => setForm(f => ({ ...f, rewardDuration: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reward Plan</Label>
              <Select value={form.rewardPlan} onValueChange={v => setForm(f => ({ ...f, rewardPlan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="basic">Basic (legacy)</SelectItem>
                  <SelectItem value="standard">Standard (legacy)</SelectItem>
                  <SelectItem value="premium">Premium (legacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">First time only</p>
                  <p className="text-xs text-muted-foreground">Only first reward request</p>
                </div>
                <Switch checked={form.firstTimeOnly} onCheckedChange={(v) => setForm(f => ({ ...f, firstTimeOnly: v }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Requires paid plan</p>
                  <p className="text-xs text-muted-foreground">After first paid plan</p>
                </div>
                <Switch checked={form.requiresFirstPaidPlan} onCheckedChange={(v) => setForm(f => ({ ...f, requiresFirstPaidPlan: v }))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Auto approve</p>
                <p className="text-xs text-muted-foreground">Auto-approve reward requests</p>
              </div>
              <Switch checked={form.autoApprove} onCheckedChange={(v) => setForm(f => ({ ...f, autoApprove: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveOffer} disabled={createOfferMutation.isPending || updateOfferMutation.isPending}>
              {editingOffer ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Customer Referral Offer Dialog */}
      <Dialog open={customerOfferDialog} onOpenChange={setCustomerOfferDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCustomerOffer ? "Edit Customer Offer" : "Create Customer Offer"}</DialogTitle>
            <DialogDescription>Set commission percentage for customer referral earnings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Offer Name</Label>
              <Input
                value={customerOfferForm.offerName}
                onChange={(e) => setCustomerOfferForm((f) => ({ ...f, offerName: e.target.value }))}
                placeholder="e.g. Summer Commission"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={customerOfferForm.description}
                onChange={(e) => setCustomerOfferForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
              />
            </div>
            <div className="space-y-2">
              <Label>Commission %</Label>
              <Input
                type="number"
                value={customerOfferForm.commissionPercent}
                onChange={(e) => setCustomerOfferForm((f) => ({ ...f, commissionPercent: Number(e.target.value) }))}
                placeholder="5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerOfferDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomerOffer} disabled={createCustomerOfferMutation.isPending || updateCustomerOfferMutation.isPending}>
              {editingCustomerOffer ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
