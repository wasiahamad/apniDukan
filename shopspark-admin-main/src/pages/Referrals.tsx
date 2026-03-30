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

import { referralAdminApi, type ReferralOffer, type ReferralDashboardStats, type AdminReferralRow, type ReferralTreeNode } from "@/lib/api";

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
    </div>
  );
}
