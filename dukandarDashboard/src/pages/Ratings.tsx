import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { businessApi, reviewApi, type Business, type PublicReview } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const StarsRow = ({ rating }: { rating: number }) => {
  const safe = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, idx) => {
        const filled = idx + 1 <= safe;
        return (
          <Star
            key={idx}
            className={filled ? "h-4 w-4 fill-yellow-400 text-yellow-400" : "h-4 w-4 text-muted-foreground"}
          />
        );
      })}
    </div>
  );
};

const formatDate = (value?: string, locale: string = "en-IN") => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

export default function Ratings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const dateLocale = i18n.language === "hi" ? "hi-IN" : "en-IN";

  const [business, setBusiness] = useState<Business | null>(null);
  const [summary, setSummary] = useState<{ avgRating: number; reviewsCount: number } | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const businessRes = await businessApi.getMyBusinesses({ force: true });
      const b = businessRes.success && businessRes.data ? businessRes.data[0] : null;

      if (!b?.slug) {
        setBusiness(null);
        setSummary({ avgRating: 0, reviewsCount: 0 });
        setReviews([]);
        return;
      }

      setBusiness(b);

      const [summaryRes, listRes] = await Promise.all([
        reviewApi.getSummaryByBusinessSlug(b.slug),
        reviewApi.getReviewsByBusinessSlug(b.slug, 100),
      ]);

      setSummary(summaryRes.success && summaryRes.data ? summaryRes.data : { avgRating: 0, reviewsCount: 0 });
      setReviews(listRes.success && Array.isArray(listRes.data) ? listRes.data : []);
    } catch (err: any) {
      toast({
        title: t("ratings.toasts.loadFailedTitle"),
        description: err?.message || t("ratings.toasts.loadFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  const avg = useMemo(() => Number(summary?.avgRating || 0), [summary?.avgRating]);
  const count = useMemo(() => Number(summary?.reviewsCount || 0), [summary?.reviewsCount]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("ratings.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {business?.name
            ? t("ratings.subtitleWithBusiness", { name: business.name })
            : t("ratings.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("ratings.summary.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div>
            <div className="text-3xl font-bold">{avg.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">{t("ratings.summary.average")}</div>
          </div>
          <div>
            <StarsRow rating={avg} />
            <div className="text-xs text-muted-foreground mt-1">{t("ratings.summary.totalReviews", { count })}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("ratings.allReviews")}</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("ratings.empty")}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r._id} className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-sm">{r.customerName?.trim() ? r.customerName : t("ratings.customerFallback")}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(r.createdAt, dateLocale)}</div>
                  </div>
                  <div className="mt-1">
                    <StarsRow rating={r.rating} />
                  </div>
                  {r.comment ? <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
