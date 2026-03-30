import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { businessApi, type Business } from "@/lib/api/business";
import { listingApi, type Listing } from "@/lib/api/listing";
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { shopData, mockProducts } from "@/data/mockData";
import { apiClient } from "@/lib/api";
import { orderApi } from "@/lib/api/orders";

const DEMO_SHOP_SLUG = "ram-kirana-store";

const buildDemoBusiness = (): Business => ({
  _id: "demo-business-id",
  owner: "demo-owner-id",
  name: shopData.shop_name,
  slug: shopData.slug,
  businessType: {
    _id: "demo-business-type",
    name: shopData.category,
    slug: "grocery",
    description: "Demo business type",
    isActive: true,
    displayOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  phone: shopData.call_number,
  whatsapp: shopData.whatsapp_number,
  email: shopData.email,
  address: {
    street: shopData.address,
    city: shopData.city,
    state: "Rajasthan",
    pincode: shopData.pincode,
  },
  description: shopData.description,
  isActive: true,
  isVerified: true,
  stats: { totalListings: mockProducts.length, totalInquiries: 0, totalViews: shopData.total_views },
});

const buildDemoListingById = (listingId: string): Listing | null => {
  const product = mockProducts.find((p) => `demo-${p.product_id}` === listingId);
  if (!product) return null;

  return {
    _id: listingId,
    business: { _id: "demo-business-id", slug: shopData.slug, name: shopData.shop_name } as any,
    title: product.product_name,
    slug: listingId,
    description: product.description || product.product_name,
    listingType: "product",
    price: product.price,
    priceType: "fixed",
    category: {
      _id: `demo-cat-${product.category.toLowerCase().replace(/\s+/g, "-")}`,
      name: product.category,
      slug: product.category.toLowerCase().replace(/\s+/g, "-"),
    } as any,
    images: [],
    attributes: product.unit ? [{ name: "Unit", value: product.unit }] : [],
    stock: product.availability_status ? 100 : 0,
    sku: `DEMO-${product.product_id}`,
    isActive: product.availability_status,
    isFeatured: product.badge === "Bestseller" || product.badge === "Popular",
    stats: { views: 0, inquiries: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const formatWhatsAppNumber = (input?: string) => (input || "").replace(/[^0-9]/g, "");

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const normalizeHex = (hex: string) => {
  const h = (hex || "").trim();
  if (!h) return null;
  const m = h.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  let v = m[1];
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  return `#${v.toLowerCase()}`;
};

const hexToRgb = (hex: string) => {
  const n = normalizeHex(hex);
  if (!n) return null;
  const v = n.slice(1);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return { r, g, b };
};

const rgbToHsl = (r: number, g: number, b: number) => {
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rr:
        h = (gg - bb) / d + (gg < bb ? 6 : 0);
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      default:
        h = (rr - gg) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hexToHslVar = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return `${Math.round(h)} ${clamp(Math.round(s), 0, 100)}% ${clamp(Math.round(l), 0, 100)}%`;
};

const pickReadableHex = (bgHex: string) => {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#ffffff";
  const srgb = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return lum > 0.55 ? "#111827" : "#ffffff";
};

const listingTypeLabel = (t?: Listing["listingType"]) => {
  switch (t) {
    case "service":
      return "Service";
    case "food":
      return "Item";
    case "course":
      return "Course";
    case "rental":
      return "Rental";
    default:
      return "Product";
  }
};

const priceLabel = (listing: Listing) => {
  if (listing.priceType === "inquiry") return "Price on inquiry";
  if (listing.priceType === "starting_from") return `Starting from ₹${listing.price}`;
  if (listing.priceType === "per_hour") return `₹${listing.price}/hour`;
  if (listing.priceType === "per_day") return `₹${listing.price}/day`;
  if (listing.priceType === "per_month") return `₹${listing.price}/month`;
  return `₹${listing.price}`;
};

const parseMaybePrice = (value: string) => {
  // Accept values like "400", "₹400", "400.00".
  const raw = String(value || "").trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return null;
  return n;
};

const priceLabelWithPrice = (listing: Listing, price: number) => {
  if (listing.priceType === "inquiry") return "Price on inquiry";
  if (listing.priceType === "starting_from") return `Starting from ₹${price}`;
  if (listing.priceType === "per_hour") return `₹${price}/hour`;
  if (listing.priceType === "per_day") return `₹${price}/day`;
  if (listing.priceType === "per_month") return `₹${price}/month`;
  return `₹${price}`;
};

const PublicListingDetail = () => {
  const { slug, listingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<Listing | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [selectedPriceOptionName, setSelectedPriceOptionName] = useState<string>("");

  const [leadOpen, setLeadOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");

  const trackAction = async (action: "whatsapp" | "call" | "map") => {
    try {
      const shopSlug = String(slug || "").trim();
      if (!shopSlug) return;
      await apiClient.post(`/business/slug/${encodeURIComponent(shopSlug)}/track`, { action }, false);
    } catch {
      // best-effort only
    }
  };

  const normalizePhone = (value: string) => String(value || "").replace(/[^0-9]/g, "");
  const isValidLeadPhone = (value: string) => {
    const digits = normalizePhone(value);
    // Keep it simple: accept 10-13 digits (India 10 digits, incl country code variants)
    return digits.length >= 10 && digits.length <= 13;
  };

  const buildWhatsAppUrl = () => {
    const wa = formatWhatsAppNumber(business?.whatsapp);
    if (!wa || !listing) return null;

    const msg =
      `Hi, I'm interested in: ${listing.title}` +
      (selectedPriceOption ? `\nOption: ${selectedPriceOption.name}` : "") +
      (listing.priceType !== "inquiry" ? `\nPrice: ₹${effectivePrice}` : "") +
      (leadName.trim() || leadPhone.trim() ? `\n\nMy details:` : "") +
      (leadName.trim() ? `\nName: ${leadName.trim()}` : "") +
      (leadPhone.trim() ? `\nPhone: ${normalizePhone(leadPhone)}` : "");

    return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  };

  const onWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setLeadOpen(true);
  };

  const submitLeadAndOpenWhatsApp = async () => {
    if (!leadName.trim()) {
      toast({ title: "Required", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    if (!isValidLeadPhone(leadPhone)) {
      toast({ title: "Invalid number", description: "Please enter a valid phone number.", variant: "destructive" });
      return;
    }

    const url = buildWhatsAppUrl();
    if (!url) {
      setLeadOpen(false);
      return;
    }

    // Save into Orders (best-effort) so dukandar can see it in Orders.
    // This creates a single-item order for this listing with the selected option.
    try {
      const businessId = business?._id;
      const listingId = listing?._id;
      if (businessId && listingId) {
        await orderApi.createPublicOrder({
          businessId,
          source: "whatsapp",
          customer: {
            name: leadName.trim(),
            phone: normalizePhone(leadPhone),
          },
          items: [
            {
              listingId,
              quantity: 1,
              pricingOptionLabel: selectedPriceOption?.name || undefined,
            },
          ],
        });
      }
    } catch {
      // ignore - best effort
    }

    setLeadOpen(false);
    await trackAction("whatsapp");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!slug || !listingId) return;

    if (slug.toLowerCase() === DEMO_SHOP_SLUG) {
      const demoListing = buildDemoListingById(listingId);
      if (!demoListing) {
        toast({ title: "Error", description: "Listing not found", variant: "destructive" });
        navigate(`/shop/${slug}`);
        setLoading(false);
        return;
      }

      setBusiness(buildDemoBusiness());
      setListing(demoListing);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);

        // Fetch shop + listing and verify listing belongs to this shop
        const [bizRes, listingRes] = await Promise.all([
          businessApi.getBusinessBySlug(slug),
          listingApi.getListingById(listingId),
        ]);

        if (!bizRes.success || !bizRes.data) throw new Error(bizRes.message || "Shop not found");
        if (!listingRes.success || !listingRes.data) throw new Error(listingRes.message || "Listing not found");

        const biz = bizRes.data;
        const l = listingRes.data;

        const listingBusiness = typeof l.business === "string" ? null : l.business;
        const listingSlug = listingBusiness && "slug" in listingBusiness ? (listingBusiness as any).slug : null;

        if (listingSlug && listingSlug !== slug) {
          throw new Error("Listing not found for this shop");
        }

        if (cancelled) return;

        setListing(l);
        setBusiness(biz);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load listing",
          variant: "destructive",
        });
        navigate(`/shop/${slug}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, navigate, slug, toast]);

  const brandingStyle = useMemo(() => {
    const themeHex = business?.branding?.themeColor || "#1DBF73";
    const bgHex = business?.branding?.backgroundColor || "#F3F4F6";
    const fgHex = business?.branding?.fontColor || "#111827";
    const font = business?.branding?.fontFamily || "Plus Jakarta Sans";

    const primary = hexToHslVar(themeHex);
    const background = hexToHslVar(bgHex);
    const foreground = hexToHslVar(fgHex);
    const primaryFg = hexToHslVar(pickReadableHex(themeHex));

    return {
      ...(primary ? { "--primary": primary, "--ring": primary, "--sidebar-primary": primary } : {}),
      ...(primaryFg ? { "--primary-foreground": primaryFg } : {}),
      ...(background ? { "--background": background } : {}),
      ...(foreground ? { "--foreground": foreground } : {}),
      fontFamily: `${font}, sans-serif`,
    } as any;
  }, [
    business?.branding?.backgroundColor,
    business?.branding?.fontColor,
    business?.branding?.fontFamily,
    business?.branding?.themeColor,
  ]);

  const images = useMemo(() => {
    return (listing?.images || []).filter((i) => i?.url);
  }, [listing?.images]);

  const hasMultipleImages = images.length > 1;
  const [carouselApi, setCarouselApi] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [listing?._id]);

  useEffect(() => {
    if (!carouselApi) return;

    const syncSelected = () => {
      try {
        const idx = carouselApi.selectedScrollSnap?.();
        if (typeof idx === "number") setSelectedImageIndex(idx);
      } catch {
        // ignore
      }
    };

    syncSelected();
    carouselApi.on?.("select", syncSelected);
    carouselApi.on?.("reInit", syncSelected);

    return () => {
      carouselApi.off?.("select", syncSelected);
      carouselApi.off?.("reInit", syncSelected);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi || !hasMultipleImages) return;
    const intervalId = setInterval(() => {
      carouselApi.scrollNext();
    }, 2500);
    return () => clearInterval(intervalId);
  }, [carouselApi, hasMultipleImages]);

  const priceOptions = useMemo(() => {
    if (!listing) return [] as { name: string; price: number }[];

    const direct = Array.isArray(listing.pricingOptions) ? listing.pricingOptions : [];
    const directOptions = direct
      .map((o) => ({
        name: String(o?.label || "").trim(),
        price: Number(o?.price),
      }))
      .filter((x) => x.name && Number.isFinite(x.price) && x.price >= 0) as { name: string; price: number }[];
    if (directOptions.length > 0) return directOptions;

    // Backward-compat: older food listings stored price variants in attributes.
    if (listing.listingType !== "food") return [] as { name: string; price: number }[];
    const attrs = Array.isArray(listing.attributes) ? listing.attributes : [];
    return attrs
      .map((a) => ({
        name: String(a?.name || "").trim(),
        price: parseMaybePrice(String(a?.value || "")),
      }))
      .filter((x) => x.name && x.price !== null) as { name: string; price: number }[];
  }, [listing]);

  const detailsAttributes = useMemo(() => {
    if (!listing) return [] as NonNullable<Listing["attributes"]>;
    const attrs = Array.isArray(listing.attributes) ? listing.attributes : [];

    const hasDirectPricingOptions = Array.isArray(listing.pricingOptions) && listing.pricingOptions.length > 0;
    if (hasDirectPricingOptions) return attrs;

    // If priceOptions came from attributes (legacy food flow), hide them from Details.
    const priceNames = new Set(priceOptions.map((o) => o.name));
    return attrs.filter((a) => !priceNames.has(String(a?.name || "").trim()));
  }, [listing, priceOptions]);

  useEffect(() => {
    if (!listing) return;
    if (priceOptions.length === 0) {
      setSelectedPriceOptionName("");
      return;
    }
    setSelectedPriceOptionName((prev) => prev || priceOptions[0].name);
  }, [listing, priceOptions]);

  const selectedPriceOption = useMemo(() => {
    if (!selectedPriceOptionName) return null;
    return priceOptions.find((o) => o.name === selectedPriceOptionName) || null;
  }, [priceOptions, selectedPriceOptionName]);

  const effectivePrice = listing ? (selectedPriceOption?.price ?? listing.price) : 0;
  const effectivePriceLabel = listing ? priceLabelWithPrice(listing, effectivePrice) : "";

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-6 w-24" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-3">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const wa = formatWhatsAppNumber(business?.whatsapp);
  const typeLabel = listingTypeLabel(listing.listingType);

  return (
    <div className="min-h-screen bg-background text-foreground" style={brandingStyle}>
      <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tell us your name and number</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Name</div>
              <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Phone</div>
              <Input
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value)}
                placeholder="Your phone number"
                inputMode="numeric"
              />
              <div className="text-xs text-muted-foreground">We’ll use this to help the shop contact you.</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitLeadAndOpenWhatsApp}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="aspect-square bg-muted flex items-center justify-center">
              {images.length > 0 ? (
                <Carousel opts={{ align: "start", loop: true }} setApi={setCarouselApi} className="w-full h-full">
                  <CarouselContent className="ml-0 h-full">
                    {images.map((img, idx) => (
                      <CarouselItem key={`${img.url}-${idx}`} className="pl-0 h-full">
                        <img
                          src={img.url}
                          alt={img.alt || listing.title}
                          className="h-full w-full object-contain p-6"
                          loading={idx === 0 ? "eager" : "lazy"}
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : (
                <div className="text-muted-foreground text-sm">No image</div>
              )}
            </div>

            {images.length > 1 && (
              <div className="p-3 flex gap-2 overflow-x-auto">
                {images.map((img, idx) => {
                  const active = idx === selectedImageIndex;
                  return (
                    <button
                      key={`thumb-${img.url}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        if (carouselApi?.scrollTo) carouselApi.scrollTo(idx);
                      }}
                      className={`shrink-0 h-12 w-12 rounded-lg overflow-hidden border ${
                        active ? "border-primary" : "border-border"
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img src={img.url} alt={img.alt || listing.title} className="h-full w-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground">{typeLabel}</div>
              <h1 className="text-2xl md:text-3xl font-extrabold">{listing.title}</h1>
              <div className="mt-2 text-lg font-bold text-primary">{effectivePriceLabel}</div>
              <div className="mt-1 text-sm text-muted-foreground">Sold by {business?.name || ""}</div>
            </div>

            {listing.description && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <h2 className="text-sm font-bold mb-2">Description</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{listing.description}</p>
              </div>
            )}

            {priceOptions.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <h2 className="text-sm font-bold mb-3">Choose option</h2>
                <div className="space-y-2">
                  {priceOptions.map((opt) => {
                    const active = opt.name === selectedPriceOptionName;
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => setSelectedPriceOptionName(opt.name)}
                        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                          active ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <span className="text-sm font-semibold text-foreground">{opt.name}</span>
                        <span className="text-sm font-bold text-foreground">₹{opt.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {Array.isArray(detailsAttributes) && detailsAttributes.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <h2 className="text-sm font-bold mb-2">Details</h2>
                <div className="space-y-2">
                  {detailsAttributes.map((a, idx) => (
                    <div key={`${a.name}-${idx}`} className="flex items-start justify-between gap-3">
                      <div className="text-sm text-muted-foreground">{a.name}</div>
                      <div className="text-sm font-semibold text-right">{a.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {wa && (
                <a
                  href={buildWhatsAppUrl() || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onWhatsAppClick}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-xl font-semibold"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
              {business?.phone && (
                <a
                  href={`tel:${business.phone}`}
                  onClick={() => trackAction("call")}
                  className="inline-flex items-center justify-center gap-2 bg-card border border-border px-4 py-3 rounded-xl font-semibold"
                >
                  <Phone className="w-4 h-4" /> Call
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicListingDetail;
