import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Star, Image as ImageIcon } from "lucide-react";
import { listingApi, type Business, type Listing } from "@/lib/api/index";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

type RouteParams = {
  listingId?: string;
  productId?: string;
};

type LocationState = {
  listing?: Listing;
  business?: Business;
};

const formatPriceType = (priceType: Listing["priceType"]) => {
  if (priceType === "fixed") return "";
  if (priceType === "starting_from") return "(starting from)";
  if (priceType === "per_hour") return "(per hour)";
  if (priceType === "per_day") return "(per day)";
  if (priceType === "per_month") return "(per month)";
  if (priceType === "inquiry") return "";
  return "";
};

const ListingDetail = () => {
  const navigate = useNavigate();
  const { listingId, productId } = useParams<RouteParams>();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const effectiveListingId = listingId || productId;

  const [listing, setListing] = useState<Listing | null>(state.listing || null);
  const [loading, setLoading] = useState(!state.listing);
  const [error, setError] = useState<string>("");
  const [activeImage, setActiveImage] = useState(0);

  const business = useMemo(() => {
    if (state.business) return state.business;
    if (listing && typeof listing.business !== "string") return listing.business;
    return null;
  }, [listing, state.business]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!effectiveListingId) {
      setError("Listing id is missing");
      setLoading(false);
      return;
    }

    if (state.listing?._id === effectiveListingId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listingApi.getMyListingById(effectiveListingId);
        if (!res.success || !res.data) throw new Error(res.message || "Listing not found");
        if (cancelled) return;
        setListing(res.data);
        setActiveImage(0);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || "Failed to load listing");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, effectiveListingId, isAuthenticated, navigate, state.listing]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-3">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing || error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-foreground">Listing not found</p>
          <p className="text-sm text-muted-foreground">{error || "This listing may have been deleted."}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border hover:bg-muted text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>
    );
  }

  const images = listing.images || [];
  const mainImageUrl = images[activeImage]?.url || images[0]?.url;
  const hasImage = Boolean(mainImageUrl);

  const categoryLabel = (() => {
    const listingCategory = listing.category;
    const businessCategory = business?.category as any;

    const pick = (cat: any) => {
      if (!cat) return null;
      if (typeof cat === "string") return null;
      return cat.name || cat.slug || null;
    };

    return pick(listingCategory) || pick(businessCategory) || "—";
  })();

  const createdAt = listing.createdAt ? new Date(listing.createdAt) : null;
  const updatedAt = listing.updatedAt ? new Date(listing.updatedAt) : null;
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{listing.title}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {business?.name ? `${business.name} · ` : ""}
            {listing.listingType.toUpperCase()}
            {!listing.isActive ? " · Inactive" : ""}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:h-[calc(100dvh-11rem)] lg:overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl overflow-hidden lg:sticky lg:top-6 lg:self-start"
        >
          <div className="relative bg-muted lg:h-[calc(100dvh-15rem)]">
            {listing.isFeatured && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-bold px-3 py-1">
                <Star className="w-3.5 h-3.5 fill-primary text-primary" /> Featured
              </span>
            )}

            {!listing.isActive && (
              <span className="absolute top-3 right-3 rounded-full bg-destructive/10 text-destructive text-xs font-bold px-3 py-1">
                Inactive
              </span>
            )}

            {hasImage ? (
              <img
                src={mainImageUrl}
                alt={images[activeImage]?.alt || listing.title}
                className="h-full w-full object-contain p-3"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageIcon className="w-6 h-6" />
                <p className="text-sm font-medium">No image</p>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="p-3 flex gap-2 overflow-x-auto border-t border-border">
              {images.map((img, idx) => (
                <button
                  key={`${img.url}-${idx}`}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={`h-14 w-14 rounded-xl overflow-hidden border ${idx === activeImage ? "border-primary" : "border-border"} bg-muted shrink-0`}
                  aria-label={`Image ${idx + 1}`}
                >
                  {img.url ? (
                    <img src={img.url} alt={img.alt || listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 lg:overflow-y-auto lg:pr-1"
        >
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                {listing.priceType === "inquiry" ? (
                  <p className="text-xl font-extrabold text-primary">Inquiry / Call</p>
                ) : (
                  <p className="text-2xl font-extrabold text-foreground">
                    ₹{listing.price} <span className="text-xs font-semibold text-muted-foreground">{formatPriceType(listing.priceType)}</span>
                  </p>
                )}
                {listing.stock !== undefined && listing.listingType === "product" && (
                  <p className="text-xs text-muted-foreground mt-1">Stock: {listing.stock}</p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>👁️ {listing.stats?.views ?? 0}</span>
                <span>💬 {listing.stats?.inquiries ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[11px] font-semibold text-muted-foreground">Status</p>
                <p className="text-sm font-semibold text-foreground">{listing.isActive ? "Active" : "Inactive"}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[11px] font-semibold text-muted-foreground">Featured</p>
                <p className="text-sm font-semibold text-foreground">{listing.isFeatured ? "Yes" : "No"}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[11px] font-semibold text-muted-foreground">Category</p>
                <p className="text-sm font-semibold text-foreground truncate" title={categoryLabel}>{categoryLabel}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[11px] font-semibold text-muted-foreground">Price Type</p>
                <p className="text-sm font-semibold text-foreground">{String(listing.priceType).split('_').join(' ')}</p>
              </div>
              {listing.sku && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-[11px] font-semibold text-muted-foreground">SKU</p>
                  <p className="text-sm font-semibold text-foreground truncate" title={listing.sku}>{listing.sku}</p>
                </div>
              )}
              {listing.listingType === 'product' && listing.stock !== undefined && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border">
                  <p className="text-[11px] font-semibold text-muted-foreground">Stock</p>
                  <p className="text-sm font-semibold text-foreground">{listing.stock}</p>
                </div>
              )}
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[11px] font-semibold text-muted-foreground">Created</p>
                <p className="text-sm font-semibold text-foreground">{createdAt ? dateFormatter.format(createdAt) : "—"}</p>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <p className="text-[11px] font-semibold text-muted-foreground">Updated</p>
                <p className="text-sm font-semibold text-foreground">{updatedAt ? dateFormatter.format(updatedAt) : "—"}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {(listing.attributes || []).length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-foreground">Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(listing.attributes || []).map((a, idx) => (
                  <div key={`${a.name}-${idx}`} className="p-3 bg-muted/40 rounded-xl border border-border">
                    <p className="text-[11px] font-semibold text-muted-foreground truncate">{a.name}</p>
                    <p className="text-sm font-semibold text-foreground truncate">{a.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ListingDetail;
