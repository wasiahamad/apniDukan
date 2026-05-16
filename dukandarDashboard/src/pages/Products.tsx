import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Eye, EyeOff, Search, Package, X, Loader2, AlertCircle, Star, Tag, FolderPlus, Camera, Film } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { aiApi, businessApi, listingApi, uploadApi, categoryApi, storiesApi, type Business, type Listing, type Category } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const Products = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { entitlements, loading: entitlementsLoading } = useEntitlements();

  const editFromQuery = useRef<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams(location.search || "");
    const id = (qs.get("edit") || "").trim();
    editFromQuery.current = id || null;
  }, [location.search]);

  const offersEnabled = entitlements?.features?.offersEnabled === true;
  const aiToolsEnabled = entitlements?.features?.aiDukandarAgentEnabled === true;

  const handleAiError = (err: any, fallbackMsg: string) => {
    const status = err?.status;
    if (status === 403) {
      toast({
        title: t('products.errorTitle'),
        description: err?.message || t('subscription.aiNotAvailable', { defaultValue: 'AI tools are not available for your current plan.' }),
        variant: 'destructive',
      });
      return;
    }
    if (status === 429) {
      toast({
        title: t('products.errorTitle'),
        description: err?.message || t('subscription.aiDailyLimit', { defaultValue: 'Daily AI limit reached. Try tomorrow.' }),
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: t('products.errorTitle'),
      description: err?.message || fallbackMsg,
      variant: 'destructive',
    });
  };

  const generateListingDescriptionAi = async () => {
    if (!aiToolsEnabled) {
      toast({
        title: t('products.errorTitle'),
        description: t('subscription.aiNotAvailable', { defaultValue: 'AI tools are not available for your current plan.' }),
        variant: 'destructive',
      });
      return;
    }
    const title = String(form.title || '').trim();
    if (!title) {
      toast({
        title: t('products.validationErrorTitle'),
        description: t('products.titleRequired', { defaultValue: 'Title is required' }),
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      const businessType = (business?.businessType as any)?.name;
      const res = await aiApi.generate({ mode: 'listing', title, businessType });
      if (!res.success || !res.data) throw new Error(res.message || 'AI generate failed');

      const draft: any = res.data;
      const draftTitle = String(draft?.title || '').trim();
      const short = String(draft?.shortDescription || '').trim();
      const desc = String(draft?.description || '').trim();
      const features = Array.isArray(draft?.features) ? draft.features.map((x: any) => String(x || '').trim()).filter(Boolean) : [];

      const featuresText = features.length
        ? `\n\nHighlights:\n${features.slice(0, 8).map((f: string) => `- ${f}`).join('\n')}`
        : '';

      const mergedDescription = [short, desc].filter(Boolean).join('\n\n') + featuresText;

      // If backend provided structured attributes, prefer them.
      const attrsRaw = Array.isArray(draft?.attributes) ? draft.attributes : [];
      const attrsFromAi = attrsRaw
        .map((a: any) => ({ name: String(a?.name || '').trim(), value: String(a?.value || '').trim() }))
        .filter((a: any) => a.name && a.value)
        .slice(0, 12);

      // If no attributes, derive some from features.
      const attrsFallback = features
        .slice(0, 6)
        .map((f: string, idx: number) => ({ name: `Point ${idx + 1}`, value: f }))
        .filter((a) => a.value);

      const poRaw = Array.isArray(draft?.pricingOptions) ? draft.pricingOptions : [];
      const pricingOptionsFromAi = poRaw
        .map((p: any) => ({
          label: String(p?.label || '').trim(),
          price: String(Number(p?.price) || '').trim(),
        }))
        .filter((p: any) => p.label && p.price)
        .slice(0, 12);

      setForm((prev) => ({
        ...prev,
        title: draftTitle || prev.title,
        description: mergedDescription.trim() || prev.description,
        attributes: attrsFromAi.length ? attrsFromAi : (prev.attributes?.length ? prev.attributes : attrsFallback),
        pricingOptions: pricingOptionsFromAi.length ? pricingOptionsFromAi : prev.pricingOptions,
      }));

      toast({
        title: t('products.successTitle'),
        description: t('products.aiGenerated', { defaultValue: 'AI listing draft generated.' }),
      });
    } catch (err: any) {
      handleAiError(err, t('products.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const [business, setBusiness] = useState<Business | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Category management state
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: ""
  });
  const [savingCategory, setSavingCategory] = useState(false);

  const [postingListingId, setPostingListingId] = useState<string | null>(null);
  const [pendingReel, setPendingReel] = useState<{ listingId: string; caption?: string } | null>(null);
  const reelInputRef = useRef<HTMLInputElement | null>(null);
  
  const [form, setForm] = useState({ 
    title: "", 
    price: "", 
    oldPrice: "",
    description: "",
    listingType: undefined as undefined | Listing['listingType'],
    priceType: "fixed" as "fixed" | "per_day" | "per_month" | "per_hour" | "starting_from" | "inquiry",
    category: "", // Category ID for the listing
    isActive: true,
    isFeatured: false,
    stock: "",
    sku: "",
    pricingOptions: [] as { label: string; price: string; oldPrice?: string }[],
    attributes: [] as { name: string; value: string }[],
    images: [] as { url: string; alt?: string }[],
  });

  const getSuggestedListingType = (biz: Business | null): Listing['listingType'] => {
    const t = (biz?.businessType as any)?.suggestedListingType;
    if (t === 'product' || t === 'service' || t === 'food' || t === 'course' || t === 'rental') return t;
    return 'product';
  };

  const getAllowedListingTypes = (biz: Business | null): Listing['listingType'][] => {
    const allowed = (biz as any)?.offerings;
    const supported = new Set<Listing['listingType']>(['product', 'service', 'food', 'course', 'rental']);

    const normalized = Array.isArray(allowed)
      ? (allowed
          .map((v: any) => String(v || '').trim().toLowerCase())
          .filter((v: any) => supported.has(v)) as Listing['listingType'][])
      : [];

    if (normalized.length > 0) return Array.from(new Set(normalized));
    return [getSuggestedListingType(biz)];
  };

  // Get appropriate field labels based on listing type
  const getFieldLabels = (type: Listing['listingType']) => {
    const labels: Record<Listing['listingType'], { title: string; price: string }> = {
      product: { title: t('products.fieldLabels.product.title'), price: t('products.fieldLabels.product.price') },
      service: { title: t('products.fieldLabels.service.title'), price: t('products.fieldLabels.service.price') },
      food: { title: t('products.fieldLabels.food.title'), price: t('products.fieldLabels.food.price') },
      course: { title: t('products.fieldLabels.course.title'), price: t('products.fieldLabels.course.price') },
      rental: { title: t('products.fieldLabels.rental.title'), price: t('products.fieldLabels.rental.price') },
    };

    return labels[type] || labels.product;
  };

  // Fetch business, listings, and categories
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch business first
        const businessResponse = await businessApi.getMyBusinesses();
        if (businessResponse.success && businessResponse.data && businessResponse.data.length > 0) {
          const myBusiness = businessResponse.data[0];
          setBusiness(myBusiness);
          
          // Fetch listings for this business
          const listingsResponse = await listingApi.getListingsByBusiness(myBusiness._id);
          if (listingsResponse.success && listingsResponse.data) {
            setListings(listingsResponse.data.listings || []);
          }

          // Fetch categories for this business
          const categoriesResponse = await categoryApi.getMyCategories(myBusiness._id);
          if (categoriesResponse.success && categoriesResponse.data) {
            setCategories(categoriesResponse.data);
          }
        } else {
          navigate("/onboarding");
        }
      } catch (err: any) {
        setError(err.message || t('products.fetchFailed'));
        toast({
          title: t('products.errorTitle'),
          description: err.message || t('products.fetchFailed'),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, navigate, toast]);

  const startEdit = (listing: Listing) => {
    const derivedListingType = listing.listingType || getSuggestedListingType(business);
    const categoryId = typeof listing.category === 'string' ? listing.category : (listing.category as any)?._id || "";
    setForm({
      title: listing.title,
      price: String(listing.price),
      oldPrice: listing.oldPrice !== undefined && listing.oldPrice !== null ? String(listing.oldPrice) : "",
      description: listing.description || "",
      listingType: derivedListingType,
      priceType: listing.priceType,
      category: categoryId,
      isActive: listing.isActive,
      isFeatured: listing.isFeatured,
      stock: listing.stock ? String(listing.stock) : "",
      sku: listing.sku || "",
      pricingOptions: (listing.pricingOptions || []).map((o: any) => ({
        label: o.label,
        price: String(o.price),
        oldPrice: o.oldPrice !== undefined && o.oldPrice !== null ? String(o.oldPrice) : "",
      })),
      attributes: (listing.attributes || []).map(a => ({ name: a.name, value: a.value })),
      images: (listing.images || []).map(img => ({ url: img.url || "", alt: img.alt })),
    });
    setEditId(listing._id);
    setShowAdd(true);
  };

  // Auto-open edit modal when coming from detail page with `?edit=<listingId>`.
  // Must be defined before early returns to keep hook order stable.
  useEffect(() => {
    const pending = editFromQuery.current;
    if (!pending) return;
    if (loading) return;
    if (showAdd) return;
    const l = listings.find((x) => x._id === pending);
    if (!l) return;
    startEdit(l);
    editFromQuery.current = null;
    // Clean the URL so refresh/back doesn't re-open edit.
    navigate('/dashboard/listings', { replace: true });
  }, [loading, listings, navigate, showAdd]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !business) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">{error || t('products.businessNotFound')}</p>
        </div>
      </div>
    );
  }

  const filtered = listings.filter(l => 
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  const activeListings = listings.filter(l => l.isActive).length;

  const features = entitlements?.features;
  const listingStoriesEnabled = features?.storiesEnabled === true && features?.listingStoriesEnabled === true;
  const maxListings = features?.maxListings;
  const maxListingsReached =
    !entitlementsLoading &&
    typeof maxListings === "number" &&
    maxListings >= 0 &&
    listings.length >= maxListings;

  const featuredCount = listings.filter(l => l.isFeatured).length;
  const featuredEnabled = features?.featuredEnabled === true;
  const maxFeaturedListings = typeof features?.maxFeaturedListings === "number" ? features.maxFeaturedListings : 0;
  const maxFeaturedReached =
    !entitlementsLoading &&
    featuredEnabled &&
    maxFeaturedListings >= 0 &&
    featuredCount >= maxFeaturedListings;

  const editingListing = editId ? listings.find(l => l._id === editId) : null;
  const canEnableFeaturedOnThisListing =
    featuredEnabled && (maxFeaturedListings < 0 || !maxFeaturedReached || editingListing?.isFeatured === true);

  const disableFeaturedCheckbox = !!features && !form.isFeatured && !canEnableFeaturedOnThisListing;

  const toggleAvailability = async (id: string) => {
    try {
      const listing = listings.find(l => l._id === id);
      if (!listing) return;

      const response = await listingApi.updateListing(id, { isActive: !listing.isActive });
      if (response.success && response.data) {
        setListings(prev => prev.map(l => l._id === id ? response.data! : l));
        toast({
          title: t('products.successTitle'),
          description: response.data.isActive ? t('products.listingActivated') : t('products.listingDeactivated'),
        });
      }
    } catch (err: any) {
      toast({
        title: t('products.errorTitle'),
        description: err.message || t('products.listingUpdateFailed'),
        variant: "destructive"
      });
    }
  };

  const toggleFeatured = async (id: string) => {
    try {
      const listing = listings.find(l => l._id === id);
      if (!listing) return;

      const nextIsFeatured = !listing.isFeatured;
      if (nextIsFeatured && features) {
        if (features.featuredEnabled !== true) {
          toast({
            title: t('products.upgradeRequired'),
            description: t('products.featuredNotEnabled'),
            variant: "destructive",
          });
          return;
        }

        const limit = typeof features.maxFeaturedListings === "number" ? features.maxFeaturedListings : 0;
        if (limit >= 0) {
          const currentFeaturedCount = listings.filter(l => l.isFeatured).length;
          if (currentFeaturedCount >= limit) {
            toast({
              title: t('products.limitReachedTitle'),
              description: t('products.planMaxFeatured', { limit }),
              variant: "destructive",
            });
            return;
          }
        }
      }

      const response = await listingApi.updateListing(id, { isFeatured: !listing.isFeatured });
      if (response.success && response.data) {
        setListings(prev => prev.map(l => l._id === id ? response.data! : l));
        toast({
          title: t('products.successTitle'),
          description: response.data.isFeatured ? t('products.markedFeatured') : t('products.removedFeatured'),
        });
      }
    } catch (err: any) {
      toast({
        title: t('products.errorTitle'),
        description: err.message || t('products.listingUpdateFailed'),
        variant: "destructive",
      });
    }
  };

  const postListingAsStory = async (listing: Listing) => {
    if (!listingStoriesEnabled) {
      toast({
        title: t('products.notAvailableTitle'),
        description: t('products.storiesNotAllowed'),
        variant: "destructive",
      });
      return;
    }

    try {
      setPostingListingId(listing._id);
      const res = await storiesApi.createFromListing({
        listingId: listing._id,
        kind: "story",
        caption: listing.title,
      });
      if (!res.success) throw new Error(res.message || t('products.postStoryFailed'));
      toast({ title: t('products.postedTitle'), description: t('products.storyCreated') });
    } catch (err: any) {
      toast({
        title: t('products.errorTitle'),
        description: err?.message || t('products.postStoryFailed'),
        variant: "destructive",
      });
    } finally {
      setPostingListingId(null);
    }
  };

  const startPostListingAsReel = (listing: Listing) => {
    if (!listingStoriesEnabled) {
      toast({
        title: t('products.notAvailableTitle'),
        description: t('products.storiesNotAllowed'),
        variant: "destructive",
      });
      return;
    }
    setPendingReel({ listingId: listing._id, caption: listing.title });
    reelInputRef.current?.click();
  };

  const handleReelFilePicked = async (files: FileList | null) => {
    const file = files?.[0];
    const pending = pendingReel;
    if (!file || !pending?.listingId) return;

    try {
      setPostingListingId(pending.listingId);
      const res = await storiesApi.createFromListing({
        listingId: pending.listingId,
        kind: "reel",
        caption: pending.caption,
        file,
      });
      if (!res.success) throw new Error(res.message || t('products.postReelFailed'));
      toast({ title: t('products.postedTitle'), description: t('products.reelCreated') });
    } catch (err: any) {
      toast({
        title: t('products.errorTitle'),
        description: err?.message || t('products.postReelFailed'),
        variant: "destructive",
      });
    } finally {
      setPostingListingId(null);
      setPendingReel(null);
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm(t('products.confirmDeleteListing'))) return;
    
    try {
      const response = await listingApi.deleteListing(id);
      if (response.success) {
        setListings(prev => prev.filter(l => l._id !== id));
        toast({
          title: t('products.successTitle'),
          description: t('products.listingDeleted'),
        });
      }
    } catch (err: any) {
      toast({
        title: t('products.errorTitle'),
        description: err.message || t('products.listingDeleteFailed'),
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.price || !form.description) {
      toast({
        title: t('products.validationErrorTitle'),
        description: t('products.validationRequiredFields'),
        variant: "destructive"
      });
      return;
    }

    if ((form.images || []).length === 0) {
      toast({
        title: t('products.validationErrorTitle'),
        description: t('products.validationMinImage'),
        variant: "destructive",
      });
      return;
    }

    if (uploadingImages) {
      toast({
        title: t('products.pleaseWaitTitle'),
        description: t('products.imagesStillUploading'),
        variant: "destructive",
      });
      return;
    }

    if (!entitlementsLoading && features) {
      if (!editId) {
        const limit = features.maxListings;
        if (typeof limit === "number" && limit >= 0) {
          if (listings.length >= limit) {
            toast({
              title: t('products.limitReachedTitle'),
              description: t('products.planMaxListings', { limit }),
              variant: "destructive",
            });
            return;
          }
        }
      }

      if (form.isFeatured) {
        if (features.featuredEnabled !== true) {
          toast({
            title: t('products.upgradeRequired'),
            description: t('products.featuredNotEnabled'),
            variant: "destructive",
          });
          return;
        }

        const limit = typeof features.maxFeaturedListings === "number" ? features.maxFeaturedListings : 0;
        if (limit >= 0) {
          const current = editId ? listings.find(l => l._id === editId) : null;
          const wasFeatured = current?.isFeatured === true;
          if (!wasFeatured) {
            const currentFeaturedCount = listings.filter(l => l.isFeatured).length;
            if (currentFeaturedCount >= limit) {
              toast({
                title: t('products.limitReachedTitle'),
                description: t('products.planMaxFeatured', { limit }),
                variant: "destructive",
              });
              return;
            }
          }
        }
      }
    }

    setSaving(true);
    try {
      const allowedTypes = getAllowedListingTypes(business);
      const chosen = form.listingType || allowedTypes[0] || getSuggestedListingType(business);
      const listingType = allowedTypes.includes(chosen)
        ? chosen
        : (allowedTypes[0] || getSuggestedListingType(business));

      const attributes = (form.attributes || [])
        .map(a => ({ name: a.name.trim(), value: a.value.trim() }))
        .filter(a => a.name && a.value);

      const pricingOptions = (form.pricingOptions || [])
        .map(o => ({
          label: String(o.label || '').trim(),
          price: Number(o.price),
          ...(offersEnabled && o.oldPrice !== undefined && o.oldPrice !== null && o.oldPrice !== '' ? { oldPrice: Number(o.oldPrice) } : {}),
        }))
        .filter(o => o.label && Number.isFinite(o.price) && o.price >= 0);

      const images = (form.images || [])
        .map(img => ({ url: String(img.url || '').trim(), alt: img.alt ? String(img.alt).trim() : undefined }))
        .filter(img => img.url);
      
      if (editId) {
        // Update existing listing
        const updateData: any = {
          title: form.title,
          description: form.description,
          listingType,
          price: Number(form.price),
          ...(offersEnabled && form.oldPrice !== '' ? { oldPrice: Number(form.oldPrice) } : {}),
          priceType: form.priceType,
          pricingOptions,
          attributes,
          images,
          isActive: form.isActive,
          isFeatured: form.isFeatured,
        };

        if (form.category) updateData.category = form.category;
        
        if (form.stock) updateData.stock = Number(form.stock);
        if (form.sku) updateData.sku = form.sku;

        const response = await listingApi.updateListing(editId, updateData);
        if (response.success && response.data) {
          setListings(prev => prev.map(l => l._id === editId ? response.data! : l));
          toast({
            title: t('products.successTitle'),
            description: t('products.listingUpdated'),
          });
        }
      } else {
        // Create new listing
        const createData: any = {
          business: business._id,
          title: form.title,
          description: form.description,
          listingType,
          price: Number(form.price),
          ...(offersEnabled && form.oldPrice !== '' ? { oldPrice: Number(form.oldPrice) } : {}),
          priceType: form.priceType,
          pricingOptions,
          attributes,
          images,
          isActive: form.isActive,
          isFeatured: form.isFeatured,
        };

        if (form.category) createData.category = form.category;
        
        if (form.stock) createData.stock = Number(form.stock);
        if (form.sku) createData.sku = form.sku;

        const response = await listingApi.createListing(createData);
        if (response.success && response.data) {
          setListings(prev => [response.data!, ...prev]);
          toast({
            title: t('products.successTitle'),
            description: t('products.listingCreated'),
          });
        }
      }
      closeForm();
    } catch (err: any) {
      toast({
        title: t('products.errorTitle'),
        description: err.message || t('products.saveFailed'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Category management functions
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({
        title: t('products.validationErrorTitle'),
        description: t('products.categories.validationNameRequired'),
        variant: "destructive"
      });
      return;
    }

    setSavingCategory(true);
    try {
      if (editCategoryId) {
        // Update existing category
        const response = await categoryApi.updateCategory(editCategoryId, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim()
        });
        if (response.success && response.data) {
          setCategories(prev => prev.map(c => c._id === editCategoryId ? response.data! : c));
          toast({
            title: t('products.successTitle'),
            description: t('products.categories.updated'),
          });
          closeCategoryForm();
        }
      } else {
        // Create new category
        const response = await categoryApi.createCategory({
          businessId: business!._id,
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim()
        });
        if (response.success && response.data) {
          setCategories(prev => [...prev, response.data!]);
          toast({
            title: t('products.successTitle'),
            description: t('products.categories.created'),
          });
          closeCategoryForm();
        }
      }
    } catch (err: any) {
      toast({
        title: t('products.errorTitle'),
        description: err.message || t('products.categories.saveFailed'),
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm(t('products.categories.deleteConfirm'))) return;
    
    try {
      const response = await categoryApi.deleteCategory(id);
      if (response.success) {
        setCategories(prev => prev.filter(c => c._id !== id));
        toast({
          title: t('products.successTitle'),
          description: t('products.categories.deleted'),
        });
      }
    } catch (err: any) {
      toast({
        title: t('products.errorTitle'),
        description: err.message || t('products.categories.deleteFailed'),
        variant: "destructive"
      });
    }
  };

  const startEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description || ""
    });
    setEditCategoryId(category._id);
    setShowAddCategory(true);
  };

  const closeCategoryForm = () => {
    setShowAddCategory(false);
    setEditCategoryId(null);
    setCategoryForm({ name: "", description: "" });
  };

  const closeForm = () => {
    setShowAdd(false);
    setEditId(null);
    setForm({ 
      title: "", 
      price: "", 
      oldPrice: "",
      description: "",
      listingType: undefined,
      priceType: "fixed",
      category: "",
      isActive: true,
      isFeatured: false,
      stock: "",
      sku: "",
      pricingOptions: [],
      attributes: [],
      images: [],
    });
  };

  const allowedListingTypes = getAllowedListingTypes(business);
  const listingType = allowedListingTypes[0] || getSuggestedListingType(business);

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const fileArray = Array.from(files);
      const results = await Promise.allSettled(
        fileArray.map(async (file) => {
          const res = await uploadApi.uploadImage(file, 'apnidukan/listings');
          if (!res.success || !res.data?.url) {
            throw new Error(res.message || t('products.failedToUploadImages'));
          }
          return { url: res.data.url, alt: res.data.alt || file.name };
        })
      );

      const uploaded: { url: string; alt?: string }[] = [];
      let failed = 0;
      const errorMessages: string[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') {
          uploaded.push(r.value);
        } else {
          failed += 1;
          const msg = (r.reason && (r.reason.message || String(r.reason))) || t('products.failedToUploadImages');
          errorMessages.push(msg);
        }
      }

      if (uploaded.length > 0) {
        setForm((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...uploaded],
        }));
      }

      if (failed > 0) {
        toast({
          title: t('products.uploadErrorTitle'),
          description: errorMessages[0]
            ? t('products.imageUploadFailed', { count: failed, message: errorMessages[0] })
            : t('products.imageUploadFailedGeneric', { count: failed }),
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: t('products.uploadErrorTitle'),
        description: err.message || t('products.failedToUploadImages'),
        variant: 'destructive',
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index),
    }));
  };

  const updateImageAlt = (index: number, alt: string) => {
    setForm((prev) => ({
      ...prev,
      images: (prev.images || []).map((img, i) => (i === index ? { ...img, alt } : img)),
    }));
  };

  const addAttribute = () => {
    setForm(prev => ({
      ...prev,
      attributes: [...(prev.attributes || []), { name: "", value: "" }]
    }));
  };

  const updateAttribute = (index: number, key: "name" | "value", value: string) => {
    setForm(prev => ({
      ...prev,
      attributes: (prev.attributes || []).map((a, i) => (i === index ? { ...a, [key]: value } : a))
    }));
  };

  const removeAttribute = (index: number) => {
    setForm(prev => ({
      ...prev,
      attributes: (prev.attributes || []).filter((_, i) => i !== index)
    }));
  };

  const addPricingOption = () => {
    setForm(prev => ({
      ...prev,
      pricingOptions: [...(prev.pricingOptions || []), { label: "", price: "", oldPrice: "" }]
    }));
  };

  const updatePricingOption = (index: number, key: "label" | "price" | "oldPrice", value: string) => {
    setForm(prev => ({
      ...prev,
      pricingOptions: (prev.pricingOptions || []).map((o, i) => (i === index ? { ...o, [key]: value } : o))
    }));
  };

  const removePricingOption = (index: number) => {
    setForm(prev => ({
      ...prev,
      pricingOptions: (prev.pricingOptions || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <input
        ref={reelInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          void handleReelFilePicked(e.target.files);
          // reset to allow picking same file again
          e.currentTarget.value = "";
        }}
      />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t(`products.listingType.${listingType}`)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {typeof maxListings === 'number' ? (
              maxListings < 0 ? (
                <>
                  {t('products.summary.listings', { count: listings.length })} · {t('products.summary.unlimited')} · {t('products.summary.active', { count: activeListings })}
                  {!entitlementsLoading && featuredEnabled && (
                    <>
                      {maxFeaturedListings < 0
                        ? ` · ${t('products.summary.featuredUnlimited', { count: featuredCount })}`
                        : ` · ${t('products.summary.featuredLimited', { count: featuredCount, limit: maxFeaturedListings })}`}
                    </>
                  )}
                </>
              ) : (
                <>
                  {t('products.summary.listings', { count: `${listings.length}/${maxListings}` })}
                  {maxListingsReached && <span className="text-destructive"> · {t('products.summary.limitReached')}</span>}
                  {` · ${t('products.summary.active', { count: activeListings })}`}
                  {!entitlementsLoading && featuredEnabled && (
                    <>
                      {maxFeaturedListings < 0
                        ? ` · ${t('products.summary.featuredUnlimited', { count: featuredCount })}`
                        : ` · ${t('products.summary.featuredLimited', { count: featuredCount, limit: maxFeaturedListings })}`}
                    </>
                  )}
                </>
              )
            ) : (
              <>
                {t('products.summary.listings', { count: listings.length })} · {t('products.summary.active', { count: activeListings })}
                {!entitlementsLoading && featuredEnabled && (
                  <>
                    {maxFeaturedListings < 0
                      ? ` · ${t('products.summary.featuredUnlimited', { count: featuredCount })}`
                      : ` · ${t('products.summary.featuredLimited', { count: featuredCount, limit: maxFeaturedListings })}`}
                  </>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={() => setShowCategoryManagement(!showCategoryManagement)}
            className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
            <Tag className="w-4 h-4" /> {t('products.buttons.categories', { count: categories.length })}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={() => { 
              if (maxListingsReached) {
                toast({
                  title: t('products.limitReachedTitle'),
                  description: t('products.planMaxListings', { limit: maxListings }),
                  variant: "destructive",
                });
                return;
              }
              setShowAdd(true); 
              setEditId(null); 
              const defaultListingType = getAllowedListingTypes(business)[0] || getSuggestedListingType(business);
              setForm({ 
                title: "", 
                price: "", 
                oldPrice: "",
                description: "",
                listingType: defaultListingType,
                priceType: "fixed",
                category: "",
                isActive: true,
                isFeatured: false,
                stock: "",
                sku: "",
                pricingOptions: [],
                attributes: [],
                images: [],
              }); 
            }}
            disabled={maxListingsReached}
            className={`flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 ${maxListingsReached ? "opacity-60 cursor-not-allowed" : ""}`}>
            <Plus className="w-4 h-4" /> {t('products.buttons.add', { item: t(`products.itemType.${listingType}`) })}
          </motion.button>
        </div>
      </div>

      {/* Category Management Panel */}
      <AnimatePresence>
        {showCategoryManagement && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{t('products.categories.manageTitle')}</h3>
                  <p className="text-sm text-muted-foreground">{t('products.categories.manageDesc')}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    closeCategoryForm();
                    setShowAddCategory(true);
                  }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  <FolderPlus className="w-4 h-4" /> {t('products.categories.newCategory')}
                </motion.button>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">{t('products.categories.noneYet')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map(category => (
                    <motion.div
                      key={category._id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-muted border border-border rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{category.name}</h4>
                          {category.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditCategory(category)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCategory(category._id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Category Modal */}
      <AnimatePresence>
        {showAddCategory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={closeCategoryForm}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 w-full max-w-md shadow-2xl pointer-events-auto">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">
                    {t('products.categories.modalTitle', {
                      mode: editCategoryId ? t('products.categories.modeEdit') : t('products.categories.modeAdd'),
                    })}
                  </h3>
                  <button onClick={closeCategoryForm}>
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Example Categories Suggestions */}
                {!editCategoryId && business.businessType?.exampleCategories && business.businessType.exampleCategories.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('products.categories.suggestedFor', { businessType: business.businessType.name })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {business.businessType.exampleCategories.map((example, idx) => (
                        <motion.button
                          key={idx}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCategoryForm({ ...categoryForm, name: example })}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors border border-primary/20"
                        >
                          {example}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <input
                  placeholder={t('products.categories.namePlaceholder')}
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                <textarea
                  placeholder={t('products.categories.descPlaceholder')}
                  value={categoryForm.description}
                  onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveCategory}
                    disabled={savingCategory}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {savingCategory && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editCategoryId ? t('products.categories.update') : t('products.categories.create')}
                  </button>
                  <button
                    onClick={closeCategoryForm}
                    className="px-6 py-3 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
                  >
                    {t('products.categories.cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input 
          placeholder={t('products.searchPlaceholder')}
          value={search} 
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
        />
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40" onClick={closeForm} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-card border border-border sm:rounded-2xl p-4 sm:p-6 space-y-4 w-full max-w-none sm:max-w-lg shadow-2xl pointer-events-auto h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-none">

                {/* Top image upload + preview (full width) */}
                <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-2 border-b border-border">
                  <div className="relative h-52 sm:h-44 bg-muted/40 overflow-hidden">
                    {(form.images || []).length > 0 ? (
                      <img
                        src={(form.images || [])[0]?.url}
                        alt={(form.images || [])[0]?.alt || form.title || t('products.listingImageAlt')}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                        {t('products.uploadAtLeastOne')}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{t('products.imagesLabel')}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {t('products.uploadedCount', { count: (form.images || []).length })}
                        </p>
                      </div>
                      <label className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border border-border bg-card ${uploadingImages ? 'text-muted-foreground' : 'text-foreground hover:bg-muted'} cursor-pointer`}>
                        {uploadingImages && <Loader2 className="w-4 h-4 animate-spin" />}
                        {uploadingImages ? t('products.uploading') : t('products.uploadImages')}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingImages}
                          onChange={(e) => {
                            void handleImageFiles(e.target.files);
                            e.currentTarget.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {uploadingImages && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Loader2 className="w-5 h-5 animate-spin" /> {t('products.uploading')}
                        </div>
                      </div>
                    )}
                  </div>

                  {(form.images || []).length > 0 && (
                    <div className="p-3 flex gap-2 overflow-x-auto">
                      {(form.images || []).map((img, idx) => (
                        <div key={`${img.url}-${idx}`} className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground">
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setForm(prev => {
                                const images = [...(prev.images || [])];
                                const chosen = images.splice(idx, 1)[0];
                                images.unshift(chosen);
                                return { ...prev, images };
                              });
                            }}
                            className={`h-12 w-12 rounded-lg overflow-hidden border ${idx === 0 ? 'border-primary' : 'border-border'} bg-muted`}
                            title={idx === 0 ? t('products.mainImage') : t('products.setAsMain')}>
                            <img src={img.url} alt={img.alt || t('products.listingImageAlt')} className="h-full w-full object-cover" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">
                    {editId ? t('products.update') : t('products.add')} {getFieldLabels(form.listingType || listingType).title}
                  </h3>
                  <button onClick={closeForm}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>

                {allowedListingTypes.length > 1 ? (
                  <select
                    value={form.listingType || allowedListingTypes[0]}
                    onChange={(e) => setForm({ ...form, listingType: e.target.value as any })}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {allowedListingTypes.map((tVal) => (
                      <option key={tVal} value={tVal}>
                        {String(tVal).toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={(form.listingType || listingType).toUpperCase()}
                    disabled
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-muted-foreground focus:outline-none"
                  />
                )}

                {/* Category Selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">{t('products.categoryOptional')}</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">{t('products.noCategory')}</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('products.noCategoriesHint')}
                    </p>
                  )}
                </div>
                
                <input 
                  placeholder={t('products.titlePlaceholder', { title: getFieldLabels(form.listingType || listingType).title })}
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
                />
                
                <textarea 
                  placeholder={t('products.descriptionPlaceholder')}
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30" 
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void generateListingDescriptionAi()}
                    disabled={saving || !aiToolsEnabled}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {t('products.aiGenerate', { defaultValue: 'Generate with AI' })}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    placeholder={t('products.pricePlaceholder', { price: getFieldLabels(form.listingType || listingType).price })}
                    type="number" 
                    value={form.price} 
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
                  />
                  <select 
                    value={form.priceType} 
                    onChange={e => setForm({ ...form, priceType: e.target.value as any })}
                    className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="fixed">{t('products.priceType.fixed')}</option>
                    <option value="starting_from">{t('products.priceType.starting_from')}</option>
                    <option value="per_hour">{t('products.priceType.per_hour')}</option>
                    <option value="per_day">{t('products.priceType.per_day')}</option>
                    <option value="per_month">{t('products.priceType.per_month')}</option>
                    <option value="inquiry">{t('products.priceType.inquiry')}</option>
                  </select>
                </div>

                {offersEnabled && (
                  <div className="space-y-1">
                    <input
                      placeholder={t('products.oldPricePlaceholder')}
                      type="number"
                      value={form.oldPrice}
                      onChange={e => setForm({ ...form, oldPrice: e.target.value })}
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {(() => {
                      const price = Number(form.price);
                      const oldPrice = Number(form.oldPrice);
                      if (!Number.isFinite(price) || !Number.isFinite(oldPrice)) return null;
                      if (oldPrice <= price || oldPrice <= 0) return null;
                      const percent = Math.round(((oldPrice - price) / oldPrice) * 100);
                      if (percent <= 0) return null;
                      return (
                        <p className="text-xs text-muted-foreground">
                          {t('products.discountPreview', { percent })}
                        </p>
                      );
                    })()}
                  </div>
                )}
                
                {(form.listingType || listingType) === 'product' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder={t('products.stockPlaceholder')}
                      type="number" 
                      value={form.stock} 
                      onChange={e => setForm({ ...form, stock: e.target.value })}
                      className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
                    />
                    <input 
                      placeholder={t('products.skuPlaceholder')}
                      value={form.sku} 
                      onChange={e => setForm({ ...form, sku: e.target.value })}
                      className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 px-4 py-3 bg-muted border border-border rounded-xl text-sm">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm({ ...form, isActive: e.target.checked })}
                      className="h-4 w-4"
                    />
                    {t('products.active')}
                  </label>
                  <label className="flex items-center gap-2 px-4 py-3 bg-muted border border-border rounded-xl text-sm">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={e => {
                        if (!form.isFeatured && disableFeaturedCheckbox) {
                          toast({
                            title: t('products.notAvailableTitle'),
                            description: !featuredEnabled
                              ? t('products.featuredNotEnabled')
                              : t('products.planMaxFeatured', { limit: maxFeaturedListings }),
                            variant: "destructive",
                          });
                          return;
                        }
                        setForm({ ...form, isFeatured: e.target.checked });
                      }}
                      disabled={disableFeaturedCheckbox}
                      className="h-4 w-4"
                    />
                    {t('products.featured')}
                  </label>
                </div>

                {/* Pricing Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{t('products.pricingOptionsTitle')}</p>
                    <button
                      type="button"
                      onClick={addPricingOption}
                      className="text-xs font-semibold text-primary hover:underline">
                      {t('products.addOption')}
                    </button>
                  </div>

                  {(form.pricingOptions || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('products.pricingOptionsHint')}</p>
                  ) : (
                    <div className="space-y-2">
                      {(form.pricingOptions || []).map((opt, idx) => (
                        <div
                          key={idx}
                          className={offersEnabled ? "grid grid-cols-[1fr_140px_140px_auto] gap-2" : "grid grid-cols-[1fr_140px_auto] gap-2"}
                        >
                          <input
                            placeholder={t('products.optionLabelPlaceholder')}
                            value={opt.label}
                            onChange={e => updatePricingOption(idx, "label", e.target.value)}
                            className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <input
                            placeholder={t('products.optionPricePlaceholder')}
                            inputMode="decimal"
                            value={opt.price}
                            onChange={e => updatePricingOption(idx, "price", e.target.value)}
                            className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          {offersEnabled && (
                            <input
                              placeholder={t('products.optionOldPricePlaceholder')}
                              inputMode="decimal"
                              value={opt.oldPrice || ''}
                              onChange={e => updatePricingOption(idx, "oldPrice", e.target.value)}
                              className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removePricingOption(idx)}
                            className="px-3 rounded-xl border border-border text-muted-foreground hover:bg-muted">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic Attributes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{t('products.attributesTitle')}</p>
                    <button
                      type="button"
                      onClick={addAttribute}
                      className="text-xs font-semibold text-primary hover:underline">
                      {t('products.addAttribute')}
                    </button>
                  </div>

                  {(form.attributes || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('products.attributesHint')}</p>
                  ) : (
                    <div className="space-y-2">
                      {(form.attributes || []).map((attr, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <input
                            placeholder={t('products.attrNamePlaceholder')}
                            value={attr.name}
                            onChange={e => updateAttribute(idx, "name", e.target.value)}
                            className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <input
                            placeholder={t('products.attrValuePlaceholder')}
                            value={attr.value}
                            onChange={e => updateAttribute(idx, "value", e.target.value)}
                            className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            type="button"
                            onClick={() => removeAttribute(idx)}
                            className="px-3 rounded-xl border border-border text-muted-foreground hover:bg-muted">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleSave} 
                    disabled={saving || uploadingImages}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {(editId ? t('products.update') : t('products.add'))}{" "}
                    {t(`products.itemType.${(form.listingType || listingType) as any}`)}
                  </button>
                  <button onClick={closeForm} className="px-6 py-3 border border-border rounded-xl text-sm hover:bg-muted transition-colors">{t('products.cancel')}</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Listing Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.map((listing, i) => {
            return (
              <motion.div key={listing._id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/dashboard/listings/${listing._id}`, { state: { listing, business } })}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/dashboard/listings/${listing._id}`, { state: { listing, business } });
                  }
                }}
                className={`bg-card border border-border rounded-2xl overflow-hidden group hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 ${!listing.isActive ? "opacity-70" : ""}`}>
                
                {/* Image Area */}
                <div className="relative bg-muted/50 aspect-[4/3] flex items-center justify-center">
                  {listing.isFeatured && (
                    <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                      {t('products.featuredBadge')}
                    </span>
                  )}
                  {listing.images?.[0]?.url ? (
                    <img
                      src={listing.images[0].url}
                      alt={listing.images[0].alt || listing.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl select-none">
                      {listing.listingType === 'product' ? '📦' : 
                       listing.listingType === 'service' ? '🔧' : 
                       listing.listingType === 'food' ? '🍽️' : 
                       listing.listingType === 'course' ? '📚' : 
                       '🏠'}
                    </span>
                  )}
                  {!listing.isActive && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <span className="text-xs font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">{t('products.inactive')}</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">{listing.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {t(`products.itemType.${listing.listingType}`)}
                        {listing.stock !== undefined && ` · ${t('products.stockLabel', { count: listing.stock })}`}
                      </p>
                    </div>
                  </div>
                  
                  {listing.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                  )}
                  
                  <div className="flex items-end gap-2">
                    {listing.priceType === 'inquiry' ? (
                      <span className="text-sm font-bold text-primary">{t('products.inquiryCall')}</span>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-primary">₹{listing.price}</span>
                        {(() => {
                          const price = Number(listing.price);
                          const oldPrice = Number((listing as any)?.oldPrice);
                          if (!Number.isFinite(price) || !Number.isFinite(oldPrice)) return null;
                          if (oldPrice <= price || oldPrice <= 0) return null;
                          const rawPercent = Number((listing as any)?.discountPercent);
                          const percent = Number.isFinite(rawPercent) && rawPercent > 0
                            ? Math.round(rawPercent)
                            : Math.round(((oldPrice - price) / oldPrice) * 100);
                          if (!Number.isFinite(percent) || percent <= 0) return null;
                          return (
                            <>
                              <span className="text-xs text-muted-foreground line-through">₹{oldPrice}</span>
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">-{percent}%</span>
                            </>
                          );
                        })()}
                        {listing.priceType !== 'fixed' && (
                          <span className="text-[10px] text-muted-foreground">({t(`products.priceType.${listing.priceType}`)})</span>
                        )}
                      </>
                    )}
                  </div>

                  {(listing.attributes || []).length > 0 && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {(listing.attributes || []).slice(0, 2).map(a => `${a.name}: ${a.value}`).join(" · ")}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span>👁️ {listing.stats.views}</span>
                    <span>💬 {listing.stats.inquiries}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleAvailability(listing._id);
                        }}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          listing.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {listing.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {listing.isActive ? t('products.active') : t('products.hidden')}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!listing.isFeatured && !!features && (!featuredEnabled || maxFeaturedReached)) {
                            toast({
                              title: t('products.notAvailableTitle'),
                              description: !featuredEnabled
                                ? t('products.featuredNotEnabled')
                                : t('products.planMaxFeatured', { limit: maxFeaturedListings }),
                              variant: "destructive",
                            });
                            return;
                          }
                          void toggleFeatured(listing._id);
                        }}
                        disabled={!listing.isFeatured && !!features && (!featuredEnabled || maxFeaturedReached)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          listing.isFeatured ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        } ${!listing.isFeatured && !!features && (!featuredEnabled || maxFeaturedReached) ? "opacity-60 cursor-not-allowed" : ""}`}
                        title={listing.isFeatured ? t('products.unfeature') : t('products.feature')}
                      >
                        <Star className={`w-3.5 h-3.5 ${listing.isFeatured ? 'fill-primary text-primary' : ''}`} />
                        {t('products.featured')}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void postListingAsStory(listing);
                        }}
                        disabled={postingListingId === listing._id}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-muted text-muted-foreground hover:bg-muted/80 ${postingListingId === listing._id ? "opacity-60 cursor-not-allowed" : ""}`}
                        title={t('products.postAsStory')}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        {t('products.story')}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startPostListingAsReel(listing);
                        }}
                        disabled={postingListingId === listing._id}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors bg-muted text-muted-foreground hover:bg-muted/80 ${postingListingId === listing._id ? "opacity-60 cursor-not-allowed" : ""}`}
                        title={t('products.postAsReel')}
                      >
                        <Film className="w-3.5 h-3.5" />
                        {t('products.reel')}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(listing);
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteListing(listing._id);
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">{t('products.empty')}</p>
        </div>
      )}
    </div>
  );
};

export default Products;
