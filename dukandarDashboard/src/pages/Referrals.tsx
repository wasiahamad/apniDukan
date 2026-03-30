import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gift, Copy, Check, Users, Star, Crown, Zap, Share2, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { referralApi, type ReferralStats, type ReferralOffer } from "@/lib/api/index";
import { Skeleton } from "@/components/ui/skeleton";

const tiers = [
  { name: "Basic", referrals: 3, icon: Star, color: "text-blue-500", bg: "bg-blue-500/10", plan: "Basic Plan Free" },
  { name: "Pro", referrals: 6, icon: Crown, color: "text-amber-500", bg: "bg-amber-500/10", plan: "Pro Plan Free" },
  { name: "Premium", referrals: 10, icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10", plan: "Premium Plan Free" },
];

const Referrals = () => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    fetchReferralStats();
  }, [isAuthenticated, navigate]);

  const fetchReferralStats = async () => {
    try {
      setLoading(true);
      const response = await referralApi.getMyReferralStats();
      if (response.success && response.data) {
        setStats(response.data);

        const offers = response.data.offers ?? (response.data.activeOffer ? [response.data.activeOffer] : []);
        const isSelectable = (o: ReferralOffer) => (o.isCurrentlyValid ?? (o.status === "active" && o.isActive));

        // If server hasn't pinned an offer yet, prefer the offer where the user has the most valid referrals.
        const validCountsByOfferId = (response.data.referrals || []).reduce<Record<string, number>>((acc, r) => {
          const offerId = typeof r.offer === "string" ? r.offer : r.offer?._id;
          if (!offerId) return acc;
          if (r.status !== "valid") return acc;
          acc[offerId] = (acc[offerId] || 0) + 1;
          return acc;
        }, {});

        const bestOfferByProgress = offers
          .reduce<ReferralOffer | null>((best, o) => {
            const score = validCountsByOfferId[o._id] || 0;
            if (!best) return o;
            const bestScore = validCountsByOfferId[best._id] || 0;
            return score > bestScore ? o : best;
          }, null);

        const serverSelected = response.data.selectedOfferId || "";
        const fallbackSelected =
          bestOfferByProgress?._id ||
          (response.data.activeOffer && isSelectable(response.data.activeOffer) ? response.data.activeOffer._id : "") ||
          offers.find(isSelectable)?._id ||
          offers[0]?._id ||
          "";

        setSelectedOfferId(serverSelected || fallbackSelected);
      } else {
        setError(response.message || "Failed to fetch referral stats");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching referral stats");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReward = async () => {
    const offers = stats?.offers ?? (stats?.activeOffer ? [stats.activeOffer] : []);
    const selectedOffer = offers.find((o) => o._id === selectedOfferId) || stats?.activeOffer;

    if (!selectedOffer) {
      toast({
        title: "No Active Offer",
        description: "Please select an active referral offer",
        variant: "destructive"
      });
      return;
    }

    const validCountForOffer = stats?.selectedOfferProgress?.valid ?? stats?.stats.valid ?? 0;

    if (validCountForOffer < selectedOffer.referralThreshold) {
      toast({
        title: "Not Eligible",
        description: `You need ${selectedOffer.referralThreshold} unused valid referrals. You have ${validCountForOffer}.`,
        variant: "destructive"
      });
      return;
    }

    try {
      setRequesting(true);
      const response = await referralApi.requestReward({ offerId: selectedOffer._id });
      if (response.success) {
        toast({
          title: "Success!",
          description: response.message || "Reward request submitted successfully",
        });
        fetchReferralStats(); // Refresh data
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to request reward",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to request reward",
        variant: "destructive"
      });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error || "Failed to load referral data"}</p>
          <Button onClick={fetchReferralStats} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  const referralCode = stats.referralCode || "N/A";
  const referralLink = `${window.location.origin}/onboarding?ref=${referralCode}`;
  const activeOffer = stats.activeOffer;
  const offers = stats.offers ?? (activeOffer ? [activeOffer] : []);

  const isSelectableOffer = (o: ReferralOffer) => (o.isCurrentlyValid ?? (o.status === "active" && o.isActive));
  const selectedOffer = offers.find((o) => o._id === selectedOfferId) || (activeOffer && isSelectableOffer(activeOffer) ? activeOffer : null);
  const validReferralsForSelectedOffer = selectedOffer
    ? (stats.selectedOfferProgress?.valid ?? stats.stats.valid)
    : 0;

  const getReferralOfferName = (ref: (typeof stats.referrals)[number]) => {
    const offerId = typeof ref.offer === "string" ? ref.offer : ref.offer?._id;
    if (!offerId) return "";
    if (typeof ref.offer !== "string" && ref.offer?.offerName) return ref.offer.offerName;
    const offer = offers.find((o) => o._id === offerId);
    return offer?.offerName || "";
  };

  const canChangeSelectedOffer = stats.canChangeSelectedOffer ?? true;

  const currentTier = tiers.reduce((acc, tier) => (validReferralsForSelectedOffer >= tier.referrals ? tier : acc), null as typeof tiers[0] | null);
  const nextTier = tiers.find(t => validReferralsForSelectedOffer < t.referrals);
  const progress = nextTier ? (validReferralsForSelectedOffer / nextTier.referrals) * 100 : 100;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Link copied!", description: "Share it with other shop owners." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const message = `Join ApniDukan using my referral code ${referralCode}: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const getOfferStatusVariant = (status: ReferralOffer["status"]) => {
    switch (status) {
      case "active":
        return "default";
      case "draft":
        return "secondary";
      case "closed":
        return "outline";
      case "archived":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Referral Program</h1>
        <p className="text-muted-foreground text-sm mt-1">Refer shops & earn free plan upgrades</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Referrals", value: stats.stats.total, icon: Users, color: "text-primary" },
          { label: "Valid Referrals", value: stats.stats.valid, icon: Check, color: "text-emerald-500" },
          { label: "Pending", value: stats.stats.pending, icon: Star, color: "text-amber-500" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-muted flex items-center justify-center`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Share Link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Share2 className="w-4 h-4" /> Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
            <div className="w-full sm:flex-1 bg-muted rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-foreground font-mono overflow-x-auto whitespace-nowrap">
              {referralLink}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
              <Button size="sm" variant="outline" onClick={handleWhatsAppShare} className="gap-1.5 w-full sm:w-auto">
                <Share2 className="w-4 h-4" /> WhatsApp
              </Button>
              <Button size="sm" onClick={handleCopy} className="gap-1.5 w-full sm:w-auto">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Code: <span className="font-semibold text-foreground">{referralCode}</span></p>
        </CardContent>
      </Card>

      {/* All Offers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Referral Offers</CardTitle>
          <CardDescription>All offers created by admin</CardDescription>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No referral offers available right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div key={offer._id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{offer.offerName}</p>
                      {offer.description ? (
                        <p className="text-xs text-muted-foreground mt-1">{offer.description}</p>
                      ) : null}
                    </div>
                    <Badge variant={getOfferStatusVariant(offer.status)} className="text-xs capitalize shrink-0">
                      {offer.status}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="text-muted-foreground">
                      Threshold: <span className="text-foreground font-medium">{offer.referralThreshold} valid</span>
                    </div>
                    <div className="text-muted-foreground">
                      Reward: <span className="text-foreground font-medium">{offer.rewardPlan}</span>
                      <span className="text-muted-foreground"> / {offer.rewardDuration} month(s)</span>
                    </div>
                    <div className="text-muted-foreground">
                      Valid: <span className="text-foreground font-medium">{new Date(offer.validFrom).toLocaleDateString("en-IN")}</span>
                      {offer.validUntil ? (
                        <span className="text-muted-foreground"> - {new Date(offer.validUntil).toLocaleDateString("en-IN")}</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      {isSelectableOffer(offer) ? (
                        <span className="text-foreground">Eligible for selection</span>
                      ) : (
                        <span>Not selectable</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={selectedOfferId === offer._id ? "default" : "outline"}
                      disabled={!isSelectableOffer(offer) || (!canChangeSelectedOffer && selectedOfferId !== offer._id)}
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        if (selectedOfferId === offer._id) return;
                        if (!canChangeSelectedOffer) {
                          toast({
                            title: "Offer locked",
                            description: "Complete your current offer first, then you can switch.",
                            variant: "destructive",
                          });
                          return;
                        }
                        const res = await referralApi.setMyActiveReferralOffer({ offerId: offer._id });
                        if (!res.success) {
                          toast({
                            title: "Unable to change offer",
                            description: res.message || "Please complete the current offer first",
                            variant: "destructive",
                          });
                          return;
                        }
                        await fetchReferralStats();
                      }}
                    >
                      {selectedOfferId === offer._id ? "Selected" : "Select"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier Progress */}
      {selectedOffer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reward Progress</CardTitle>
            <CardDescription>
              {selectedOffer.offerName} - {selectedOffer.referralThreshold} referrals = {selectedOffer.rewardPlan} plan for {selectedOffer.rewardDuration} month(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{validReferralsForSelectedOffer} of {selectedOffer.referralThreshold} valid referrals</span>
                <span className="font-medium text-foreground">{Math.round((validReferralsForSelectedOffer / selectedOffer.referralThreshold) * 100)}%</span>
              </div>
              <Progress value={(validReferralsForSelectedOffer / selectedOffer.referralThreshold) * 100} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                Remaining: <span className="text-foreground font-medium">{Math.max(selectedOffer.referralThreshold - validReferralsForSelectedOffer, 0)}</span>
              </p>
            </div>

            {validReferralsForSelectedOffer >= selectedOffer.referralThreshold && (
              <Button 
                onClick={handleRequestReward}
                disabled={requesting || stats.pendingRequests.length > 0}
                className="w-full"
                size="lg"
              >
                {requesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : stats.pendingRequests.length > 0 ? (
                  "Request Pending"
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Claim Reward
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Referral List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No referrals yet. Share your code to get started!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {stats.referrals.map(ref => (
                <div key={ref._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {ref.metadata?.referredUserName || ref.referredUser.name}
                    </p>
                    {getReferralOfferName(ref) ? (
                      <p className="text-xs text-muted-foreground">
                        Offer: <span className="text-foreground">{getReferralOfferName(ref)}</span>
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {new Date(ref.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge 
                    variant={ref.status === "valid" ? "default" : ref.status === "pending" ? "secondary" : "destructive"} 
                    className="text-xs capitalize self-start sm:self-auto"
                  >
                    {ref.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {stats.pendingRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="w-4 h-4" /> Pending Reward Requests
            </CardTitle>
            <CardDescription>Admin approval ka wait ho raha hai</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {stats.pendingRequests.map((req) => (
                <div key={req._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
                  <div>
                    {(() => {
                      const fallbackStart = req.appliedBusinesses?.find((b) => b.rewardStartsAt)?.rewardStartsAt;
                      const fallbackEnd = req.appliedBusinesses?.find((b) => b.rewardEndsAt)?.rewardEndsAt;
                      const startsAt = req.rewardStartsAt || fallbackStart;
                      const endsAt = req.rewardEndsAt || fallbackEnd;
                      return (
                        <>
                          {startsAt ? (
                            <p className="text-xs text-muted-foreground">
                              Expected start: {new Date(startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          ) : null}
                          {endsAt ? (
                            <p className="text-xs text-muted-foreground">
                              Expected expiry: {new Date(endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          ) : null}
                        </>
                      );
                    })()}
                    <p className="text-sm font-medium text-foreground">{req.offer.offerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.rewardPlan} - {req.rewardDuration} month(s) | {req.requestNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Requested on {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs self-start sm:self-auto">Pending Admin Approval</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Rewards */}
      {stats.approvedRewards.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-4 h-4" /> Approved Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {stats.approvedRewards.map(reward => (
                <div key={reward._id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3">
                  <div>
                    {/** Show when current plan ends and reward plan begins */}
                    {(() => {
                      const previousExpiry = reward.appliedBusinesses?.find((b) => b.previousPlanExpiresAt)?.previousPlanExpiresAt;
                      return previousExpiry ? (
                        <p className="text-xs text-muted-foreground">
                          Previous plan expired on {new Date(previousExpiry).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      ) : null;
                    })()}
                    <p className="text-sm font-medium text-foreground">
                      {reward.offer.offerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reward.rewardPlan} - {reward.rewardDuration} month(s) | {reward.requestNumber}
                    </p>
                    {reward.reviewedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Admin approved on {new Date(reward.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    ) : null}
                    {reward.isRewardFulfilled && reward.fulfilledAt ? (
                      <p className="text-xs text-muted-foreground">
                        Reward applied on {new Date(reward.fulfilledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    ) : null}
                    {reward.rewardStartsAt ? (
                      <p className="text-xs text-muted-foreground">
                        Plan starts: {new Date(reward.rewardStartsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    ) : null}
                    {reward.rewardEndsAt ? (
                      <p className="text-xs text-muted-foreground">
                        Plan expires: {new Date(reward.rewardEndsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    ) : null}
                    {reward.appliedBusinesses?.length ? (
                      <p className="text-xs text-muted-foreground">
                        Applied to {reward.appliedBusinesses.length} business(es)
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="default" className="text-xs self-start sm:self-auto">
                    {reward.isRewardFulfilled ? "Approved + Applied" : "Approved"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Referrals;
