import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  MessageCircle, Phone, MapPin, Clock, Star, Search, ShoppingBag,
  Share2, Heart, X, Plus, Minus, Truck, BadgeIndianRupee, Leaf, Award,
  Menu, ShoppingCart, Home, Package, Info, MessageSquare, ChevronRight,
  Facebook, Instagram, Twitter, Youtube, ArrowUp, ChevronLeft
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { shopData, mockProducts } from "@/data/mockData";
import { businessApi, type Business } from "@/lib/api/business";
import { listingApi, type Listing } from "@/lib/api/listing";
import { categoryApi, type Category } from "@/lib/api/category";
import { reviewApi, type PublicReview, type ReviewSummary } from "@/lib/api/reviews";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api";
import heroImage from "@/assets/hero-grocery.jpg";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { orderApi } from "@/lib/api/orders";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DEMO_SHOP_SLUG = "ram-kirana-store";

const LEGACY_CATEGORY_ICONS: Record<string, string> = {
  Grocery: "🛒",
  Dairy: "🥛",
  Snacks: "🍪",
  Household: "🏠",
  "Personal Care": "💆",
  Beverages: "☕",
};

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
  stats: {
    totalListings: mockProducts.length,
    totalInquiries: 0,
    totalViews: shopData.total_views,
  },
});

const buildDemoListings = (): Listing[] =>
  mockProducts.map((p, idx) => ({
    _id: `demo-${p.product_id}`,
    business: "demo-business-id",
    title: p.product_name,
    slug: `demo-${p.product_id}`,
    description: p.description || p.product_name,
    listingType: "product",
    price: p.price,
    priceType: "fixed",
    category: {
      _id: `demo-cat-${p.category.toLowerCase().replace(/\s+/g, "-")}`,
      name: p.category,
      slug: p.category.toLowerCase().replace(/\s+/g, "-"),
      business: "demo-business-id",
      isActive: true,
      order: idx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any,
    images: [],
    attributes: p.unit ? [{ name: "Unit", value: p.unit }] : [],
    stock: p.availability_status ? 100 : 0,
    sku: `DEMO-${p.product_id}`,
    isActive: p.availability_status,
    isFeatured: p.badge === "Bestseller" || p.badge === "Popular",
    stats: { views: 0, inquiries: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

const buildDemoCategories = (): Category[] => {
  const names = Array.from(new Set(mockProducts.map((p) => p.category)));
  return names.map((name, idx) => ({
    _id: `demo-cat-${name.toLowerCase().replace(/\s+/g, "-")}`,
    business: "demo-business-id",
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    isActive: true,
    order: idx,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Category));
};

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

const formatWhatsAppNumber = (input?: string) => (input || "").replace(/[^0-9]/g, "");

const normalizeUrl = (value?: string) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
};

const listingTypePlural = (t?: Listing["listingType"]) => {
  switch (t) {
    case "service":
      return "Services";
    case "food":
      return "Menu";
    case "course":
      return "Courses";
    case "rental":
      return "Rentals";
    default:
      return "Products";
  }
};

const listingTypeSingular = (t?: Listing["listingType"]) => {
  switch (t) {
    case "service":
      return "service";
    case "food":
      return "item";
    case "course":
      return "course";
    case "rental":
      return "rental";
    default:
      return "product";
  }
};

const listingCategoryName = (l: Listing) => {
  if (!l.category) return "Other";
  if (typeof l.category === "string") return "Other";
  return l.category.name || "Other";
};

const listingImageUrl = (l: Listing) => {
  const imgs = l.images || [];
  const first = imgs.find((i) => i?.url) || imgs[0];
  return first?.url || "";
};

const listingPriceText = (l: Listing) => {
  if (l.priceType === "inquiry") return "Price on inquiry";
  if (l.priceType === "starting_from") return `Starting from ₹${l.price}`;
  if (l.priceType === "per_hour") return `₹${l.price}/hour`;
  if (l.priceType === "per_day") return `₹${l.price}/day`;
  if (l.priceType === "per_month") return `₹${l.price}/month`;
  return `₹${l.price}`;
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const formatTime = (time: string) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getWorkingHoursText = (business?: Business | null) => {
  if (!business?.workingHours) return "9:00 AM – 8:00 PM";
  
  const hours = business.workingHours;
  const openDays = DAYS.filter((day) => hours[day as keyof typeof hours]?.isOpen !== false);
  const closedDays = DAYS.filter((day) => hours[day as keyof typeof hours]?.isOpen === false);
  
  if (openDays.length === 0) return "Closed";
  if (closedDays.length === 0) return "Open everyday";
  
  // Get typical hours from first open day
  const firstOpenDay = openDays[0];
  const dayHours = hours[firstOpenDay as keyof typeof hours];
  const timeText = dayHours ? `${formatTime(dayHours.open)} – ${formatTime(dayHours.close)}` : "";
  
  return timeText;
};

const getClosedDaysText = (business?: Business | null) => {
  if (!business?.workingHours) return "";
  
  const hours = business.workingHours;
  const closedDays = DAYS.filter((day) => hours[day as keyof typeof hours]?.isOpen === false);
  
  if (closedDays.length === 0) return "";
  if (closedDays.length === 7) return "Closed all days";
  
  return closedDays.map((day) => DAY_LABELS[day]).join(", ");
};

const mockReviews = [
  { name: "Priya Sharma", rating: 5, text: "Best kirana store in Malviya Nagar! Always fresh products and quick delivery.", date: "2 days ago" },
  { name: "Rahul Verma", rating: 4, text: "Great prices and good quality. WhatsApp ordering is very convenient.", date: "1 week ago" },
  { name: "Sneha Gupta", rating: 5, text: "Ram bhaiya always has everything I need. Highly recommended!", date: "2 weeks ago" },
  { name: "Amit Kumar", rating: 4, text: "Very reliable store. Been buying from here for 5 years.", date: "3 weeks ago" },
  { name: "Neha Singh", rating: 5, text: "Fast delivery and products are always fresh. Love ordering via WhatsApp!", date: "1 month ago" },
];

const getDemoReviewSummary = (): ReviewSummary => {
  const count = mockReviews.length;
  const avg = count > 0 ? mockReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / count : 0;
  return { avgRating: Math.round(avg * 10) / 10, reviewsCount: count };
};

const formatReviewDate = (isoDate?: string) => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const DEFAULT_WHY_CHOOSE_US = [
  { icon: Truck, title: "Fast Delivery", desc: "Get your groceries delivered within 30 minutes" },
  { icon: BadgeIndianRupee, title: "Best Prices", desc: "Competitive prices on all daily essentials" },
  { icon: Leaf, title: "Fresh Products", desc: "Quality checked fresh items every day" },
  { icon: Award, title: "15+ Years Trust", desc: "Serving the community since 2010" },
];

// Scroll reveal wrapper
const RevealSection = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const PublicShop = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const trackAction = async (action: "whatsapp" | "call" | "map") => {
    try {
      const shopSlug = String(slug || "").trim();
      if (!shopSlug) return;
      await apiClient.post(`/business/slug/${encodeURIComponent(shopSlug)}/track`, { action }, false);
    } catch {
      // best-effort only
    }
  };

  const [business, setBusiness] = useState<Business | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);

  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [optionPicker, setOptionPicker] = useState<{
    open: boolean;
    listingId: string | null;
    selectedLabel: string;
  }>({ open: false, listingId: null, selectedLabel: "" });
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [newRating, setNewRating] = useState(0);
  const [newReviewName, setNewReviewName] = useState("");
  const [newReviewComment, setNewReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  useEffect(() => {
    setShowAllReviews(false);
  }, [slug]);

  const whyChooseUsCards = useMemo(() => {
    const icons = [Truck, BadgeIndianRupee, Leaf, Award] as const;
    const fromType = business?.businessType?.whyChooseUsTemplates
      ?.filter((x) => (String(x?.title || "").trim() || String(x?.desc || "").trim()))
      .map((x, idx) => ({
        icon: (() => {
          const name = String((x as any)?.iconName || "").trim();
          const IconComp = name ? (LucideIcons as any)[name] : null;
          if (typeof IconComp === "function") return IconComp;
          return icons[idx % icons.length];
        })(),
        title: String(x?.title || "").trim(),
        desc: String(x?.desc || "").trim(),
      }))
      .filter((x) => x.title || x.desc);

    const fromBusiness = business?.whyChooseUs
      ?.filter((x) => (x?.title || "").trim() || (x?.desc || "").trim())
      .map((x, idx) => ({
        icon: (() => {
          const name = String((x as any)?.iconName || "").trim();
          const IconComp = name ? (LucideIcons as any)[name] : null;
          if (typeof IconComp === "function") return IconComp;
          return icons[idx % icons.length];
        })(),
        title: (x.title || "").trim(),
        desc: (x.desc || "").trim(),
      }))
      .filter((x) => x.title || x.desc);

    const preferred = (fromType && fromType.length > 0) ? fromType : fromBusiness;
    return (preferred && preferred.length > 0) ? preferred : DEFAULT_WHY_CHOOSE_US;
  }, [business?.businessType?.whyChooseUsTemplates, business?.whyChooseUs]);

  useEffect(() => {
    if (!slug) return;

    if (slug.toLowerCase() === DEMO_SHOP_SLUG) {
      setBusiness(buildDemoBusiness());
      setLoadingBusiness(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingBusiness(true);
        const res = await businessApi.getBusinessBySlug(slug);
        if (!res.success || !res.data) throw new Error(res.message || "Business not found");
        if (cancelled) return;
        setBusiness(res.data);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load shop",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoadingBusiness(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, toast]);

  useEffect(() => {
    if (!business?._id) return;

    if (slug?.toLowerCase() === DEMO_SHOP_SLUG) {
      setListings(buildDemoListings());
      setLoadingListings(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingListings(true);
        const res = await listingApi.getPublicListingsByBusiness(business._id, 1, 200);
        const data = res.success ? res.data?.listings || [] : [];
        if (cancelled) return;
        setListings(data);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load listings",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setLoadingListings(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [business?._id, slug, toast]);

  // Fetch categories for the business
  useEffect(() => {
    if (!business?._id) return;

    if (slug?.toLowerCase() === DEMO_SHOP_SLUG) {
      setCategories(buildDemoCategories());
      setLoadingCategories(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingCategories(true);
        const res = await categoryApi.getCategoriesByBusiness(business._id);
        if (cancelled) return;
        if (res.success && res.data) {
          setCategories(res.data);
        }
      } catch (err: any) {
        console.error("Failed to load categories:", err);
        // Categories are optional, so we don't show an error toast
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [business?._id, slug]);

  // Fetch reviews + rating summary
  useEffect(() => {
    if (!slug) return;

    const normalizedSlug = slug.toLowerCase();
    if (normalizedSlug === DEMO_SHOP_SLUG) {
      setReviewSummary(getDemoReviewSummary());
      setReviews([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingReviews(true);
        const [summaryRes, listRes] = await Promise.all([
          reviewApi.getSummaryByBusinessSlug(slug),
          reviewApi.getReviewsByBusinessSlug(slug, 50),
        ]);

        if (cancelled) return;

        setReviewSummary(summaryRes.success ? summaryRes.data || { avgRating: 0, reviewsCount: 0 } : { avgRating: 0, reviewsCount: 0 });
        setReviews(listRes.success ? listRes.data || [] : []);
      } catch (err: any) {
        if (cancelled) return;
        setReviewSummary({ avgRating: 0, reviewsCount: 0 });
        setReviews([]);
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const shopName = business?.name || shopData.shop_name;
  const shopLogo = business?.logo || "";
  const shopCover = business?.coverImage || heroImage;
  const shopWhatsApp = business?.whatsapp || shopData.whatsapp_number;
  const shopCall = business?.phone || shopData.call_number;
  const shopDescription = business?.description || shopData.description;
  const shopAddressText = business?.address
    ? `${business.address.street}, ${business.address.city}, ${business.address.state} - ${business.address.pincode}`
    : `${shopData.address}, ${shopData.area}, ${shopData.city} - ${shopData.pincode}`;

  const whatsappOrderMessageTemplate = business?.whatsappOrderMessageTemplate || "Hello {{business_name}}, I want to order {{product_name}}.";
  const whatsappAutoGreetingEnabled = business?.whatsappAutoGreetingEnabled ?? true;
  const whatsappAutoGreetingMessage = business?.whatsappAutoGreetingMessage || "Welcome! How can we help you?";

  const shopListingType = listings[0]?.listingType;
  const listingPluralLabel = listingTypePlural(shopListingType);
  const listingSingularLabel = listingTypeSingular(shopListingType);

  const shopPublicUrl = useMemo(() => {
    if (!slug) return "";
    if (typeof window === "undefined") return `/shop/${slug}`;
    return `${window.location.origin}/shop/${slug}`;
  }, [slug]);

  const displayAvgRating = reviewSummary?.avgRating ?? (slug?.toLowerCase() === DEMO_SHOP_SLUG ? shopData.rating : 0);
  const displayReviewsCount = reviewSummary?.reviewsCount ?? (slug?.toLowerCase() === DEMO_SHOP_SLUG ? shopData.reviews_count : 0);

  const displayReviews = useMemo(() => {
    if (slug?.toLowerCase() === DEMO_SHOP_SLUG) {
      return mockReviews.map((r, idx) => ({
        key: `demo-${idx}`,
        name: r.name,
        rating: r.rating,
        text: r.text,
        dateLabel: r.date,
        createdAtMs: 0,
      }));
    }

    return (reviews || []).map((r) => ({
      key: r._id,
      name: (r.customerName || "").trim() || "Anonymous",
      rating: r.rating,
      text: (r.comment || "").trim() || "Rated this shop.",
      dateLabel: formatReviewDate(r.createdAt) || "",
      createdAtMs: r.createdAt ? new Date(r.createdAt).getTime() : 0,
    }));
  }, [reviews, slug]);

  const sortedReviews = useMemo(() => {
    const copy = [...displayReviews];
    copy.sort((a, b) => (b.rating - a.rating) || (b.createdAtMs - a.createdAtMs));
    return copy;
  }, [displayReviews]);

  const reviewsToRender = useMemo(() => {
    if (showAllReviews) return sortedReviews;
    return sortedReviews.slice(0, 6);
  }, [showAllReviews, sortedReviews]);

  const categoryOptions = useMemo(() => {
    return ["All", ...categories.map(c => c.name)];
  }, [categories]);

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
  }, [business?.branding?.backgroundColor, business?.branding?.fontColor, business?.branding?.fontFamily, business?.branding?.themeColor]);
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter((l) => {
      const matchSearch = !q || l.title.toLowerCase().includes(q);
      const matchCat = activeCategory === "All" || listingCategoryName(l) === activeCategory;
      return matchSearch && matchCat && l.isActive;
    });
  }, [activeCategory, listings, search]);

  const makeCartKey = (listingId: string, pricingOptionLabel?: string) => {
    const enc = encodeURIComponent((pricingOptionLabel || "").trim());
    return `${listingId}::${enc}`;
  };

  const parseCartKey = (key: string) => {
    const sep = key.indexOf('::');
    const listingId = sep >= 0 ? key.slice(0, sep) : key;
    const enc = sep >= 0 ? key.slice(sep + 2) : '';
    let pricingOptionLabel = '';
    try {
      pricingOptionLabel = decodeURIComponent(enc || '');
    } catch {
      pricingOptionLabel = '';
    }
    return { listingId, pricingOptionLabel };
  };

  const parseMaybePrice = (value: string) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[^0-9.]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  };

  const getSelectableOptionsForListing = (l: Listing | null | undefined) => {
    if (!l) return [] as Array<{ label: string; price: number }>;

    const direct = Array.isArray(l.pricingOptions) ? l.pricingOptions : [];
    const directOptions = direct
      .map((o) => ({ label: String(o?.label || "").trim(), price: Number(o?.price) }))
      .filter((o) => o.label && Number.isFinite(o.price) && o.price >= 0);
    if (directOptions.length > 0) return directOptions;

    // Backward-compat: older food listings stored price variants in attributes.
    if (l.listingType !== 'food') return [];
    const attrs = Array.isArray(l.attributes) ? l.attributes : [];
    const legacyOptions = attrs
      .map((a) => ({ label: String((a as any)?.name || '').trim(), price: parseMaybePrice(String((a as any)?.value || '')) }))
      .filter((x) => x.label && x.price !== null)
      .map((x) => ({ label: x.label, price: x.price as number }));
    return legacyOptions;
  };

  const getUnitPriceForCartLine = (listing: Listing, pricingOptionLabel: string) => {
    const label = (pricingOptionLabel || '').trim();
    const options = getSelectableOptionsForListing(listing);
    if (label && options.length > 0) {
      const found = options.find((o) => o.label.toLowerCase() === label.toLowerCase());
      const p = Number(found?.price);
      if (Number.isFinite(p) && p >= 0) return p;
    }
    const base = Number(listing.price);
    return Number.isFinite(base) && base >= 0 ? base : 0;
  };

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([key, qty]) => {
        const parsed = parseCartKey(key);
        return { key, qty, listingId: parsed.listingId, pricingOptionLabel: parsed.pricingOptionLabel };
      });
  }, [cart]);

  const cartQtyByListing = useMemo(() => {
    const map = new Map<string, number>();
    cartLines.forEach((line) => {
      map.set(line.listingId, (map.get(line.listingId) || 0) + line.qty);
    });
    return map;
  }, [cartLines]);

  const cartCount = useMemo(() => cartLines.reduce((s, x) => s + x.qty, 0), [cartLines]);

  const cartTotal = useMemo(() => {
    return cartLines.reduce((sum, line) => {
      const l = listings.find((x) => x._id === line.listingId);
      if (!l) return sum;
      const unitPrice = getUnitPriceForCartLine(l, line.pricingOptionLabel);
      return sum + unitPrice * line.qty;
    }, 0);
  }, [cartLines, listings]);

  const optionPickerListing = useMemo(() => {
    if (!optionPicker.listingId) return null;
    return listings.find((l) => l._id === optionPicker.listingId) || null;
  }, [listings, optionPicker.listingId]);

  const optionPickerOptions = useMemo(() => {
    return getSelectableOptionsForListing(optionPickerListing);
  }, [optionPickerListing]);

  const closeOptionPicker = () => setOptionPicker({ open: false, listingId: null, selectedLabel: "" });

  const canPlaceCartOrder =
    cartLines.length > 0 &&
    !creatingOrder &&
    (!!customerName.trim() || !!customerPhone.trim());

  const addToCart = (key: string) =>
    setCart((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  const removeFromCart = (key: string) =>
    setCart((prev) => {
      const n = (prev[key] || 0) - 1;
      if (n <= 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: n };
    });

  const toggleLike = (id: string) => setLikedProducts(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const fillWhatsAppTemplate = (template: string, vars: Record<string, string>) => {
    let result = template;
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), value);
    });
    return result;
  };

  const buildWhatsAppMessage = (vars: { product_name?: string; order_items?: string; total?: string }) => {
    const orderVars = {
      business_name: shopName,
      product_name: vars.product_name || listingPluralLabel,
      order_items: vars.order_items || "",
      total: vars.total || "",
    };

    const templateRaw = whatsappOrderMessageTemplate?.trim() || "";
    let orderText = templateRaw ? fillWhatsAppTemplate(templateRaw, orderVars).trim() : "";

    if (vars.order_items && templateRaw && !templateRaw.includes("{{order_items}}")) {
      orderText = `${orderText}\n\n${vars.order_items}`.trim();
    }
    if (vars.total && templateRaw && !templateRaw.includes("{{total}}")) {
      orderText = `${orderText}\n\nTotal: ${vars.total}`.trim();
    }

    // Cleanup: remove empty "Total:" line and collapse extra blank lines
    orderText = orderText
      .split("\n")
      .filter((line) => !/^\s*Total:\s*$/i.test(line))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const fallbackOrder = vars.order_items
      ? `Hi, I'd like to order:\n\n${vars.order_items}\n\nTotal: ${vars.total || ""}`.trim()
      : `Hi, I'm interested in your ${listingPluralLabel.toLowerCase()}!`;

    const fullOrder = orderText || fallbackOrder;
    const greetingText = whatsappAutoGreetingEnabled && whatsappAutoGreetingMessage?.trim()
      ? whatsappAutoGreetingMessage.trim()
      : "";

    return greetingText ? `${greetingText}\n\n${fullOrder}` : fullOrder;
  };

  const getWhatsAppHref = (message: string) => {
    const wa = formatWhatsAppNumber(shopWhatsApp);
    if (!wa) return "#";
    return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
  };

  const orderOnWhatsApp = async () => {
    if (!customerName.trim() && !customerPhone.trim()) {
      toast({
        title: "Required",
        description: "Please enter your name or phone number to place the order.",
        variant: "destructive",
      });
      return;
    }

    const items = cartLines
      .map((line) => {
        const l = listings.find((x) => x._id === line.listingId);
        const name = l?.title || "";
        const opt = (line.pricingOptionLabel || '').trim();
        const unitPrice = l ? getUnitPriceForCartLine(l, opt) : 0;
        const labelSuffix = opt ? ` (${opt})` : "";
        return `${name}${labelSuffix} x${line.qty} - ₹${unitPrice * line.qty}`;
      })
      .join("\n");

    const msg = buildWhatsAppMessage({
      product_name: listingPluralLabel,
      order_items: items,
      total: `₹${cartTotal}`,
    });
    const wa = formatWhatsAppNumber(shopWhatsApp);
    if (!wa) {
      toast({
        title: "WhatsApp not available",
        description: "This shop has no WhatsApp number configured.",
        variant: "destructive",
      });
      return;
    }

    // Save order in backend before opening WhatsApp
    if (!business?._id || cartLines.length === 0) return;

    try {
      setCreatingOrder(true);
      const res = await orderApi.createPublicOrder({
        businessId: business._id,
        source: 'whatsapp',
        customer: {
          name: customerName.trim() || undefined,
          phone: customerPhone.trim() || undefined,
        },
        items: cartLines.map((line) => ({
          listingId: line.listingId,
          quantity: line.qty,
          pricingOptionLabel: (line.pricingOptionLabel || '').trim() || undefined,
        })),
      });

      if (!res.success) {
        throw new Error(res.message || 'Failed to create order');
      }
    } catch (err: any) {
      toast({
        title: "Could not place order",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      return;
    } finally {
      setCreatingOrder(false);
    }

    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenu(false);
  };

  const openListing = (listingId: string) => {
    if (!slug) return;
    navigate(`/shop/${slug}/listing/${listingId}`);
  };

  const copyShopLink = async () => {
    if (!shopPublicUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: shopName, url: shopPublicUrl });
        return;
      }

      await navigator.clipboard?.writeText(shopPublicUrl);
      toast({
        title: "Link copied",
        description: shopPublicUrl,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: shopPublicUrl,
        variant: "destructive",
      });
    }
  };

  const refreshReviews = async () => {
    if (!slug) return;
    if (slug.toLowerCase() === DEMO_SHOP_SLUG) {
      setReviewSummary(getDemoReviewSummary());
      setReviews([]);
      return;
    }

    try {
      const [summaryRes, listRes] = await Promise.all([
        reviewApi.getSummaryByBusinessSlug(slug),
        reviewApi.getReviewsByBusinessSlug(slug, 50),
      ]);

      setReviewSummary(summaryRes.success ? summaryRes.data || { avgRating: 0, reviewsCount: 0 } : { avgRating: 0, reviewsCount: 0 });
      setReviews(listRes.success ? listRes.data || [] : []);
    } catch {
      setReviewSummary({ avgRating: 0, reviewsCount: 0 });
      setReviews([]);
    }
  };

  const submitReview = async (): Promise<boolean> => {
    if (!slug || slug.toLowerCase() === DEMO_SHOP_SLUG) return false;
    if (submittingReview) return false;
    if (!newRating) {
      toast({
        title: "Select a rating",
        description: "Please choose 1 to 5 stars.",
        variant: "destructive",
      });
      return false;
    }

    try {
      setSubmittingReview(true);
      const res = await reviewApi.createReviewByBusinessSlug(slug, {
        rating: newRating,
        customerName: newReviewName.trim() || undefined,
        comment: newReviewComment.trim() || undefined,
      });

      if (!res.success) throw new Error(res.message || 'Failed to submit review');

      toast({
        title: "Thanks!",
        description: "Your review was submitted.",
      });
      setNewRating(0);
      setNewReviewName("");
      setNewReviewComment("");
      await refreshReviews();
      return true;
    } catch (err: any) {
      toast({
        title: "Could not submit review",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setSubmittingReview(false);
    }
  };

  const navLinks = [
    { label: "Home", id: "hero" },
    { label: listingPluralLabel, id: "products" },
    { label: "About", id: "about" },
    { label: "Reviews", id: "reviews" },
    { label: "Contact", id: "contact" },
  ];

  if (loadingBusiness || loadingListings) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-9 h-9 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={brandingStyle}>
      {/* ===== NAVBAR ===== */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-background/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden bg-primary">
              {shopLogo ? (
                <img src={shopLogo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <ShoppingBag className="w-5 h-5 text-primary-foreground" />
              )}
            </div>
            <span className="font-bold text-lg text-foreground">{shopName}</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <button key={link.id} onClick={() => scrollToSection(link.id)}
                className="text-sm font-medium text-foreground/70 hover:text-primary transition-colors">
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowCart(true)} className="relative p-2 hover:bg-muted rounded-lg transition-colors">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {cartCount > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </motion.span>
              )}
            </button>
            <a
              href={getWhatsAppHref(buildWhatsAppMessage({ product_name: listingPluralLabel }))}
              onClick={(e) => {
                if (!formatWhatsAppNumber(shopWhatsApp)) e.preventDefault();
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button onClick={() => setMobileMenu(true)} className="md:hidden p-2">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50" onClick={() => setMobileMenu(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-72 bg-background z-50 shadow-2xl p-6 border-l border-border">
              <div className="flex justify-between items-center mb-8">
                <span className="font-bold text-lg text-foreground">Menu</span>
                <button onClick={() => setMobileMenu(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-1">
                {navLinks.map(link => (
                  <button key={link.id} onClick={() => scrollToSection(link.id)}
                    className="w-full text-left px-4 py-3 rounded-lg text-foreground hover:bg-muted transition-colors font-medium">
                    {link.label}
                  </button>
                ))}
              </div>
              <div className="mt-8">
                <a
                  href={getWhatsAppHref(buildWhatsAppMessage({ product_name: listingPluralLabel }))}
                  onClick={(e) => {
                    if (!formatWhatsAppNumber(shopWhatsApp)) e.preventDefault();
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 rounded-lg font-semibold hover:opacity-90">
                  <MessageCircle className="w-5 h-5" /> Order on WhatsApp
                </a>
              </div>
              {shopPublicUrl && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={copyShopLink}
                    className="w-full flex items-center justify-center gap-2 bg-muted text-foreground px-4 py-3 rounded-lg font-semibold hover:bg-muted/80 transition-colors"
                  >
                    <Share2 className="w-5 h-5" /> Share
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== HERO SECTION ===== */}
      <section id="hero" className="relative h-[70vh] md:h-[85vh] overflow-hidden scroll-mt-16">
        {/* Background image */}
        <img
          src={shopCover}
          alt="Store"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 h-full flex items-center justify-center px-4 pt-16">
          <div className="max-w-3xl mx-auto text-start">
            <div className="flex items-center justify-start gap-2 mb-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 md:w-5 md:h-5 ${
                    i < Math.floor(displayAvgRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-white/40"
                  }`}
                />
              ))}
              <span className="text-white/80 text-xs md:text-sm ml-1">
                {displayAvgRating} ({displayReviewsCount} reviews)
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
              {shopName}
            </h1>
            <p className="mt-4 text-sm sm:text-base md:text-xl text-white/85 leading-relaxed line-clamp-2 md:line-clamp-none">
              {shopDescription}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-start gap-3 md:gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => scrollToSection("products")}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 md:px-8 md:py-4 rounded-xl font-bold text-sm md:text-base shadow-lg shadow-primary/30"
              >
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" /> Order Now
              </motion.button>
              <motion.a
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                href={`tel:${shopCall}`}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/25 px-7 py-3.5 md:px-8 md:py-4 rounded-xl font-bold text-sm md:text-base"
              >
                <Phone className="w-4 h-4 md:w-5 md:h-5" /> Call Now
              </motion.a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE US ===== */}
      <section className="py-16 md:py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <RevealSection>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground text-center mb-3">Why Choose Us</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-md mx-auto">Trusted by 500+ families in {shopData.city}</p>
          </RevealSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {whyChooseUsCards.map((item, i) => (
              <RevealSection key={i}>
                <motion.div whileHover={{ y: -8, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}
                  className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm transition-all group cursor-default">
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </motion.div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CATEGORIES ===== */}
      <section className="py-12 bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <RevealSection>
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground text-center mb-8">Shop by Category</h2>
          </RevealSection>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide justify-center flex-wrap">
            {categories
              .filter((c) => c.isActive)
              .map((c) => {
                const icon = (c.icon || "").trim() || LEGACY_CATEGORY_ICONS[c.name] || "📦";
                return (
                  <RevealSection key={c._id || c.name}>
                    <motion.button
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setActiveCategory(c.name);
                        scrollToSection("products");
                      }}
                      className="flex flex-col items-center gap-2 p-4 bg-card rounded-2xl shadow-sm border border-border hover:shadow-md hover:border-primary/30 transition-all min-w-[100px]"
                    >
                      <span className="text-3xl">{icon}</span>
                      <span className="text-xs font-semibold text-foreground">{c.name}</span>
                    </motion.button>
                  </RevealSection>
                );
              })}
          </div>
        </div>
      </section>

      {/* ===== PRODUCTS ===== */}
      <section id="products" className="py-16 md:py-20 bg-background scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <RevealSection>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">Featured {listingPluralLabel}</h2>
                <p className="text-muted-foreground mt-1">Browse our latest {listingPluralLabel.toLowerCase()}</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder={`Search ${listingPluralLabel.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
              </div>
            </div>
          </RevealSection>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide">
            {categoryOptions.map(cat => (
              <motion.button key={cat} whileTap={{ scale: 0.95 }} onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-foreground text-background shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:border-foreground/30"
                }`}>
                {cat}
              </motion.button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((listing, i) => (
                <ListingCard
                  key={listing._id}
                  listing={listing}
                  index={i}
                  cartQty={cartQtyByListing.get(listing._id) || 0}
                  requiresOption={getSelectableOptionsForListing(listing).length > 0}
                  liked={likedProducts.has(listing._id)}
                  onAdd={() => {
                    const opts = getSelectableOptionsForListing(listing);
                    if (opts.length > 0) {
                      setOptionPicker({ open: true, listingId: listing._id, selectedLabel: "" });
                      return;
                    }
                    addToCart(makeCartKey(listing._id));
                  }}
                  onRemove={() => removeFromCart(makeCartKey(listing._id))}
                  onLike={() => toggleLike(listing._id)}
                  onOpen={() => openListing(listing._id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-14">
              No {listingPluralLabel.toLowerCase()} found.
            </div>
          )}
        </div>
      </section>

      {/* ===== ABOUT SECTION ===== */}
      <section id="about" className="py-16 md:py-20 bg-background scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <RevealSection>
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <img src={shopCover} alt="Our Store" className="w-full h-80 md:h-[400px] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/40 to-transparent" />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(displayAvgRating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    ))}
                    <span className="text-sm font-semibold ml-1">{displayAvgRating}</span>
                  </div>
                </div>
              </div>
            </RevealSection>
            <RevealSection>
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-4">About Our Store</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">{shopDescription}</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-sm border border-border">
                    <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">Opening Hours</p>
                      <p className="text-sm text-muted-foreground">
                        {getWorkingHoursText(business)}
                        {getClosedDaysText(business) && (
                          <span className="text-destructive font-medium ml-2">
                            · Closed: {getClosedDaysText(business)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <a
                    href={
                      business?.address?.coordinates?.latitude && business?.address?.coordinates?.longitude
                        ? `https://www.google.com/maps?q=${business.address.coordinates.latitude},${business.address.coordinates.longitude}`
                        : undefined
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackAction("map")}
                    className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-sm border border-border"
                  >
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Our Location</p>
                      <p className="text-sm text-muted-foreground">{shopAddressText}</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3 p-4 bg-card rounded-xl shadow-sm border border-border">
                    <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">Contact Us</p>
                      <p className="text-sm text-muted-foreground">{shopCall} · {(business?.email || shopData.email)}</p>
                    </div>
                  </div>
                  
                  {/* Weekly Schedule */}
                  {business?.workingHours && (
                    <div className="p-4 bg-card rounded-xl shadow-sm border border-border">
                      <p className="font-semibold text-sm text-foreground mb-3">Weekly Schedule</p>
                      <div className="space-y-2">
                        {DAYS.map((day) => {
                          const dayHours = business.workingHours?.[day as keyof typeof business.workingHours];
                          const isOpen = dayHours?.isOpen !== false;
                          return (
                            <div key={day} className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground capitalize font-medium">
                                {day.slice(0, 3)}
                              </span>
                              {isOpen ? (
                                <span className="text-foreground">
                                  {formatTime(dayHours?.open || "09:00")} - {formatTime(dayHours?.close || "20:00")}
                                </span>
                              ) : (
                                <span className="text-destructive font-medium">Closed</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      <section id="reviews" className="py-16 md:py-20 bg-background scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <RevealSection>
            <div className="relative mb-12">
              {!showAllReviews && sortedReviews.length > 6 && (
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={() => setShowAllReviews(true)}
                    className="text-xs md:text-sm font-semibold text-primary hover:opacity-90"
                  >
                    View all reviews
                  </button>
                </div>
              )}
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground text-center mb-3">What Our Customers Say</h2>
              <p className="text-muted-foreground text-center">Real reviews from our valued customers</p>
            </div>
          </RevealSection>

          {slug?.toLowerCase() !== DEMO_SHOP_SLUG && (
            <div className="max-w-2xl mx-auto mb-10">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setReviewDialogOpen(true)}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm"
                >
                  Add your review
                </button>
              </div>

              <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rate this shop</DialogTitle>
                  </DialogHeader>

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs text-muted-foreground">Your feedback helps others.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }, (_, i) => {
                        const value = i + 1;
                        const active = value <= newRating;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setNewRating(value)}
                            className="p-1"
                            aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                          >
                            <Star className={`w-5 h-5 ${active ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Your name (optional)</label>
                      <input
                        value={newReviewName}
                        onChange={(e) => setNewReviewName(e.target.value)}
                        placeholder="e.g. Priya"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-foreground mb-1">Comment (optional)</label>
                      <textarea
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        placeholder="Write a short review..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                    <p className="text-xs text-muted-foreground">
                      Current rating: <span className="font-semibold text-foreground">{displayAvgRating}</span> ({displayReviewsCount} reviews)
                    </p>
                    <button
                      type="button"
                      disabled={submittingReview}
                      onClick={async () => {
                        const ok = await submitReview();
                        if (ok) setReviewDialogOpen(false);
                      }}
                      className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-60"
                    >
                      {submittingReview ? "Submitting..." : "Submit review"}
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <div className="relative">
            <div className="grid md:grid-cols-3 gap-6">
              {(reviewsToRender.length > 0 ? reviewsToRender : []).map((review) => (
                <RevealSection key={review.key}>
                  <motion.div whileHover={{ y: -5 }}
                    className="bg-card rounded-2xl p-6 border border-border">
                    <div className="flex items-center gap-1 mb-3">
                      {Array.from({ length: 5 }, (_, j) => (
                        <Star key={j} className={`w-4 h-4 ${j < review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <p className="text-sm text-foreground mb-4 leading-relaxed">"{review.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{review.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{review.name}</p>
                        <p className="text-xs text-muted-foreground">{review.dateLabel}</p>
                      </div>
                    </div>
                  </motion.div>
                </RevealSection>
              ))}
            </div>

            {!loadingReviews && sortedReviews.length === 0 && (
              <div className="text-center text-muted-foreground py-10">
                No reviews yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== CONTACT / CTA ===== */}
      <section id="contact" className="py-16 md:py-20 bg-primary scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <RevealSection>
            <h2 className="text-2xl md:text-3xl font-extrabold text-primary-foreground mb-4">Ready to Order?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-md mx-auto">
              Message us on WhatsApp for {listingPluralLabel.toLowerCase()} and quick help.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                href={getWhatsAppHref(buildWhatsAppMessage({ product_name: listingPluralLabel }))}
                onClick={(e) => {
                  if (!formatWhatsAppNumber(shopWhatsApp)) e.preventDefault();
                }}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-primary-foreground text-primary px-8 py-4 rounded-xl font-bold shadow-lg">
                <MessageCircle className="w-5 h-5" /> Order on WhatsApp
              </motion.a>
              <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                href={`tel:${shopCall}`}
                className="flex items-center gap-2 bg-background text-foreground px-8 py-4 rounded-xl font-bold shadow-lg border border-border">
                <Phone className="w-5 h-5" /> Call Us
              </motion.a>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-foreground text-background pt-16 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
                  {shopLogo ? (
                    <img src={shopLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                  )}
                </div>
                <span className="font-bold text-lg">{shopName}</span>
              </div>
              <p className="text-sm text-background/60 leading-relaxed">{shopDescription}</p>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-background/80">Quick Links</h4>
              <ul className="space-y-2">
                {navLinks.map(link => (
                  <li key={link.id}>
                    <button onClick={() => scrollToSection(link.id)} className="text-sm text-background/60 hover:text-primary transition-colors">
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-background/80">Contact Info</h4>
              <ul className="space-y-3 text-sm text-background/60">
                <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />{shopData.address}, {shopData.city}</li>
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 flex-shrink-0" />{shopCall}</li>
                <li className="flex items-center gap-2"><Clock className="w-4 h-4 flex-shrink-0" />{shopData.opening_time} – {shopData.closing_time}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-background/80">Follow Us</h4>
              <div className="flex flex-wrap gap-3">
                {normalizeUrl(business?.socialMedia?.facebook) ? (
                  <a
                    href={normalizeUrl(business?.socialMedia?.facebook)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                ) : null}
                {normalizeUrl(business?.socialMedia?.instagram) ? (
                  <a
                    href={normalizeUrl(business?.socialMedia?.instagram)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                ) : null}
                {normalizeUrl(business?.socialMedia?.twitter) ? (
                  <a
                    href={normalizeUrl(business?.socialMedia?.twitter)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
                    aria-label="Twitter / X"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                ) : null}
                {normalizeUrl(business?.socialMedia?.youtube) ? (
                  <a
                    href={normalizeUrl(business?.socialMedia?.youtube)}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-background/40">© 2026 {shopName}. All rights reserved.</p>
            <p className="text-xs text-background/40">Powered by <span className="text-primary font-semibold">DukaanSetu</span></p>
          </div>
        </div>
      </footer>

      {/* ===== FLOATING CART BUTTON (MOBILE) ===== */}
      <AnimatePresence>
        {cartLines.length > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 md:hidden">
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between bg-primary text-primary-foreground px-5 py-4 rounded-2xl shadow-2xl shadow-primary/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <span className="font-semibold">View Cart</span>
              </div>
              <span className="font-bold text-lg">₹{cartTotal}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky WhatsApp (mobile, no cart) */}
      {cartLines.length === 0 && (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 md:hidden">
          <motion.a whileTap={{ scale: 0.97 }}
            href={getWhatsAppHref(buildWhatsAppMessage({ product_name: listingPluralLabel }))}
            onClick={(e) => {
              if (!formatWhatsAppNumber(shopWhatsApp)) e.preventDefault();
            }}
            target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-2xl shadow-primary/30">
            <MessageCircle className="w-5 h-5" /> Order on WhatsApp
          </motion.a>
        </div>
      )}

      {/* Scroll to top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-40 w-12 h-12 bg-foreground text-background rounded-full shadow-lg flex items-center justify-center hover:bg-primary transition-colors">
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ===== CART SHEET ===== */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCart(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed right-0 top-0 bottom-0 z-50 bg-background w-full max-w-md shadow-2xl flex flex-col border-l border-border">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Your Cart ({cartCount})</h3>
                <button onClick={() => setShowCart(false)} className="p-1"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-auto p-5">
                {cartLines.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cartLines.map((line) => {
                      const l = listings.find((x) => x._id === line.listingId);
                      if (!l) return null;
                      const img = listingImageUrl(l);
                      const opt = (line.pricingOptionLabel || '').trim();
                      const unitPrice = getUnitPriceForCartLine(l, opt);
                      const lineTotal = unitPrice * line.qty;
                      return (
                        <div key={line.key} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                          <div className="w-12 h-12 rounded-lg bg-background border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                            {img ? (
                              <img src={img} alt={l.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate text-foreground">{l.title}</p>
                            <p className="text-xs text-muted-foreground">{listingCategoryName(l)}</p>
                            {opt && <p className="text-xs text-muted-foreground">Option: {opt}</p>}
                            <p className="font-bold text-primary text-sm">₹{lineTotal}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-background rounded-lg border border-border px-1">
                            <button onClick={() => removeFromCart(line.key)} className="p-1"><Minus className="w-4 h-4" /></button>
                            <span className="text-sm font-bold w-5 text-center">{line.qty}</span>
                            <button onClick={() => addToCart(line.key)} className="p-1"><Plus className="w-4 h-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {cartLines.length > 0 && (
                <div className="p-5 border-t border-border">
                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Your name</label>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Rahul"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">Phone (WhatsApp)</label>
                      <input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        inputMode="tel"
                        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">₹{cartTotal}</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={orderOnWhatsApp}
                    disabled={!canPlaceCartOrder}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-base shadow-lg disabled:opacity-60 disabled:pointer-events-none"
                  >
                    <MessageCircle className="w-5 h-5" /> {creatingOrder ? "Saving..." : "Order on WhatsApp"}
                  </motion.button>
                  {!customerName.trim() && !customerPhone.trim() && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Enter your name or phone to place the order.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== OPTION PICKER ===== */}
      <AnimatePresence>
        {optionPicker.open && optionPickerListing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={closeOptionPicker}
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-2xl shadow-2xl p-5"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">{optionPickerListing.title}</h3>
                  <p className="text-xs text-muted-foreground">Select an option to add to cart</p>
                </div>
                <button onClick={closeOptionPicker} className="p-1"><X className="w-5 h-5" /></button>
              </div>

              {optionPickerOptions.length === 0 ? (
                <div className="mt-4 text-sm text-muted-foreground">No options available.</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {optionPickerOptions.map((opt) => {
                    const active = opt.label === optionPicker.selectedLabel;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setOptionPicker((prev) => ({ ...prev, selectedLabel: opt.label }))}
                        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                          active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted'
                        }`}
                      >
                        <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                        <span className="text-sm font-bold text-foreground">₹{opt.price}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const label = optionPicker.selectedLabel.trim();
                  if (!label) {
                    toast({
                      title: 'Select an option',
                      description: 'Please choose an option to add this item to cart.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  addToCart(makeCartKey(optionPickerListing._id, label));
                  closeOptionPicker();
                }}
                disabled={optionPickerOptions.length > 0 && !optionPicker.selectedLabel.trim()}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-2xl font-bold text-base shadow-lg disabled:opacity-60 disabled:pointer-events-none"
              >
                Add to Cart
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ===== LISTING CARD =====
const ListingCard = ({ listing, index, cartQty, requiresOption, liked, onAdd, onRemove, onLike, onOpen }: {
  listing: Listing; index: number; cartQty: number; liked: boolean;
  requiresOption: boolean;
  onAdd: () => void; onRemove: () => void; onLike: () => void; onOpen: () => void;
}) => {
  const images = (listing.images || []).filter((i) => i?.url);
  const hasMultipleImages = images.length > 1;
  const [carouselApi, setCarouselApi] = useState<any>(null);

  useEffect(() => {
    if (!carouselApi || !hasMultipleImages) return;
    const intervalId = setInterval(() => {
      carouselApi.scrollNext();
    }, 2500);
    return () => clearInterval(intervalId);
  }, [carouselApi, hasMultipleImages]);

  return (
    <motion.div layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.04, type: "spring", damping: 20 }}
      onClick={onOpen}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300 cursor-pointer">
      {/* Image */}
      <div className="relative bg-background p-5 pb-4 flex items-center justify-center overflow-hidden border-b border-border">
        {images.length > 0 ? (
          <Carousel
            opts={{ align: "start", loop: true }}
            setApi={setCarouselApi}
            className="w-full"
          >
            <CarouselContent className="ml-0">
              {images.map((img, idx) => (
                <CarouselItem key={`${img.url}-${idx}`} className="pl-0">
                  <img
                    src={img.url}
                    alt={img.alt || listing.title}
                    className="w-full h-36 object-cover"
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <div className="w-full h-36 flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <motion.button whileTap={{ scale: 1.3 }} onClick={(e) => { e.stopPropagation(); onLike(); }}
          className="absolute top-3 right-3 p-2 rounded-full bg-background shadow-md border border-border opacity-0 group-hover:opacity-100 transition-opacity">
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
        </motion.button>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[11px] text-muted-foreground mb-1">{listingCategoryName(listing)}</p>
        <h3 className="font-semibold text-sm text-foreground leading-tight mb-2 line-clamp-1">{listing.title}</h3>
        {listing.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{listing.description}</p>}

        <div className="flex items-end gap-2 mb-3">
          <span className="text-lg font-bold text-foreground">{listingPriceText(listing)}</span>
        </div>

        {requiresOption ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="w-full py-2.5 bg-primary/10 text-primary font-semibold text-sm rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
          >
            {cartQty > 0 ? "Add more (choose option)" : "Choose option"}
          </motion.button>
        ) : cartQty === 0 ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            className="w-full py-2.5 bg-primary/10 text-primary font-semibold text-sm rounded-xl hover:bg-primary hover:text-primary-foreground transition-all"
          >
            Add to Cart
          </motion.button>
        ) : (
          <div className="flex items-center justify-between bg-primary rounded-xl overflow-hidden">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="px-4 py-2.5 text-primary-foreground"
            >
              <Minus className="w-4 h-4" />
            </motion.button>
            <motion.span key={cartQty} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-sm font-bold text-primary-foreground">
              {cartQty}
            </motion.span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className="px-4 py-2.5 text-primary-foreground"
            >
              <Plus className="w-4 h-4" />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PublicShop;
