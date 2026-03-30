import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Eye, EyeOff, Search, Package, X, Loader2, AlertCircle, Star, Tag, FolderPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlements } from "@/contexts/EntitlementsContext";
import { businessApi, listingApi, uploadApi, categoryApi, type Business, type Listing, type Category } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const Products = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { entitlements, loading: entitlementsLoading } = useEntitlements();

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
  
  const [form, setForm] = useState({ 
    title: "", 
    price: "", 
    description: "",
    listingType: undefined as undefined | Listing['listingType'],
    priceType: "fixed" as "fixed" | "per_day" | "per_month" | "per_hour" | "starting_from" | "inquiry",
    category: "", // Category ID for the listing
    isActive: true,
    isFeatured: false,
    stock: "",
    sku: "",
    pricingOptions: [] as { label: string; price: string }[],
    attributes: [] as { name: string; value: string }[],
    images: [] as { url: string; alt?: string }[],
  });

  const getSuggestedListingType = (biz: Business | null): Listing['listingType'] => {
    const t = (biz?.businessType as any)?.suggestedListingType;
    if (t === 'product' || t === 'service' || t === 'food' || t === 'course' || t === 'rental') return t;
    return 'product';
  };

  // Get appropriate field labels based on listing type
  const getFieldLabels = (type: Listing['listingType']) => {
    const labels = {
      product: { title: 'Product Name', price: 'Price' },
      service: { title: 'Service Name', price: 'Service Fee' },
      food: { title: 'Food Item Name', price: 'Price' },
      course: { title: 'Course Name', price: 'Course Fee' },
      rental: { title: 'Item Name', price: 'Rent (per day/month)' }
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
        setError(err.message || "Failed to fetch data");
        toast({
          title: "Error",
          description: err.message || "Failed to fetch data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, navigate, toast]);

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
          <p className="text-sm text-muted-foreground">{error || "Business not found"}</p>
        </div>
      </div>
    );
  }

  const filtered = listings.filter(l => 
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  const activeListings = listings.filter(l => l.isActive).length;

  const features = entitlements?.features;
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
          title: "Success",
          description: `Listing ${response.data.isActive ? 'activated' : 'deactivated'} successfully`
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update listing",
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
            title: "Upgrade required",
            description: "Featured listings are not enabled in your plan",
            variant: "destructive",
          });
          return;
        }

        const limit = typeof features.maxFeaturedListings === "number" ? features.maxFeaturedListings : 0;
        if (limit >= 0) {
          const currentFeaturedCount = listings.filter(l => l.isFeatured).length;
          if (currentFeaturedCount >= limit) {
            toast({
              title: "Limit reached",
              description: `Your plan allows maximum ${limit} featured listings`,
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
          title: "Success",
          description: response.data.isFeatured ? "Marked as featured" : "Removed from featured",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update featured",
        variant: "destructive",
      });
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    
    try {
      const response = await listingApi.deleteListing(id);
      if (response.success) {
        setListings(prev => prev.filter(l => l._id !== id));
        toast({
          title: "Success",
          description: "Listing deleted successfully"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete listing",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.price || !form.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if ((form.images || []).length === 0) {
      toast({
        title: "Validation Error",
        description: "Please upload at least 1 image",
        variant: "destructive",
      });
      return;
    }

    if (uploadingImages) {
      toast({
        title: "Please wait",
        description: "Images are still uploading",
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
              title: "Limit reached",
              description: `Your plan allows maximum ${limit} listings. Please upgrade.`,
              variant: "destructive",
            });
            return;
          }
        }
      }

      if (form.isFeatured) {
        if (features.featuredEnabled !== true) {
          toast({
            title: "Upgrade required",
            description: "Featured listings are not enabled in your plan",
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
                title: "Limit reached",
                description: `Your plan allows maximum ${limit} featured listings`,
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
      const listingType = getSuggestedListingType(business);

      const attributes = (form.attributes || [])
        .map(a => ({ name: a.name.trim(), value: a.value.trim() }))
        .filter(a => a.name && a.value);

      const pricingOptions = (form.pricingOptions || [])
        .map(o => ({ label: String(o.label || '').trim(), price: Number(o.price) }))
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
            title: "Success",
            description: "Listing updated successfully"
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
            title: "Success",
            description: "Listing created successfully"
          });
        }
      }
      closeForm();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save listing",
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
        title: "Validation Error",
        description: "Category name is required",
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
            title: "Success",
            description: "Category updated successfully"
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
            title: "Success",
            description: "Category created successfully"
          });
          closeCategoryForm();
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save category",
        variant: "destructive"
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? Listings using this category will need to be updated.")) return;
    
    try {
      const response = await categoryApi.deleteCategory(id);
      if (response.success) {
        setCategories(prev => prev.filter(c => c._id !== id));
        toast({
          title: "Success",
          description: "Category deleted successfully"
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete category",
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

  const startEdit = (listing: Listing) => {
    const derivedListingType = listing.listingType || getSuggestedListingType(business);
    const categoryId = typeof listing.category === 'string' ? listing.category : (listing.category as any)?._id || "";
    setForm({
      title: listing.title,
      price: String(listing.price),
      description: listing.description || "",
      listingType: derivedListingType,
      priceType: listing.priceType,
      category: categoryId,
      isActive: listing.isActive,
      isFeatured: listing.isFeatured,
      stock: listing.stock ? String(listing.stock) : "",
      sku: listing.sku || "",
      pricingOptions: (listing.pricingOptions || []).map((o) => ({ label: o.label, price: String(o.price) })),
      attributes: (listing.attributes || []).map(a => ({ name: a.name, value: a.value })),
      images: (listing.images || []).map(img => ({ url: img.url || "", alt: img.alt })),
    });
    setEditId(listing._id);
    setShowAdd(true);
  };

  const closeForm = () => {
    setShowAdd(false);
    setEditId(null);
    setForm({ 
      title: "", 
      price: "", 
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

  const listingType = getSuggestedListingType(business);

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const fileArray = Array.from(files);
      const results = await Promise.allSettled(
        fileArray.map(async (file) => {
          const res = await uploadApi.uploadImage(file, 'apnidukan/listings');
          if (!res.success || !res.data?.url) {
            throw new Error(res.message || 'Upload failed');
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
          const msg = (r.reason && (r.reason.message || String(r.reason))) || 'Upload failed';
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
          title: 'Upload Error',
          description: errorMessages[0] ? `${failed} image(s) failed: ${errorMessages[0]}` : `${failed} image(s) failed to upload`,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Upload Error',
        description: err.message || 'Failed to upload images',
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
      pricingOptions: [...(prev.pricingOptions || []), { label: "", price: "" }]
    }));
  };

  const updatePricingOption = (index: number, key: "label" | "price", value: string) => {
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {listingType === 'product' ? 'Products' : 
             listingType === 'service' ? 'Services' : 
             listingType === 'food' ? 'Menu Items' : 
             listingType === 'course' ? 'Courses' : 
             'Rental Items'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {typeof maxListings === 'number' ? (
              maxListings < 0 ? (
                <>
                  {listings.length} listings · Unlimited · {activeListings} active
                  {!entitlementsLoading && featuredEnabled && (
                    <>
                      {maxFeaturedListings < 0
                        ? ` · Featured: ${featuredCount}/Unlimited`
                        : ` · Featured: ${featuredCount}/${maxFeaturedListings}`}
                    </>
                  )}
                </>
              ) : (
                <>
                  {listings.length}/{maxListings} listings
                  {maxListingsReached && <span className="text-destructive"> · Limit reached</span>}
                  {` · ${activeListings} active`}
                  {!entitlementsLoading && featuredEnabled && (
                    <>
                      {maxFeaturedListings < 0
                        ? ` · Featured: ${featuredCount}/Unlimited`
                        : ` · Featured: ${featuredCount}/${maxFeaturedListings}`}
                    </>
                  )}
                </>
              )
            ) : (
              <>
                {listings.length} listings · {activeListings} active
                {!entitlementsLoading && featuredEnabled && (
                  <>
                    {maxFeaturedListings < 0
                      ? ` · Featured: ${featuredCount}/Unlimited`
                      : ` · Featured: ${featuredCount}/${maxFeaturedListings}`}
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
            <Tag className="w-4 h-4" /> Categories ({categories.length})
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }} 
            onClick={() => { 
              if (maxListingsReached) {
                toast({
                  title: "Limit reached",
                  description: `Your plan allows maximum ${maxListings} listings. Please upgrade.`,
                  variant: "destructive",
                });
                return;
              }
              setShowAdd(true); 
              setEditId(null); 
              const businessTypeSlug = (business.businessType as any)?.slug ?? '';
              const defaultListingType = getListingType(businessTypeSlug);
              setForm({ 
                title: "", 
                price: "", 
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
            <Plus className="w-4 h-4" /> Add {listingType === 'product' ? 'Product' : 
                                                listingType === 'service' ? 'Service' : 
                                                listingType === 'food' ? 'Item' : 
                                                listingType === 'course' ? 'Course' : 
                                                'Item'}
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
                  <h3 className="text-lg font-bold text-foreground">Manage Categories</h3>
                  <p className="text-sm text-muted-foreground">Create categories to organize your products/services</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    closeCategoryForm();
                    setShowAddCategory(true);
                  }}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  <FolderPlus className="w-4 h-4" /> New Category
                </motion.button>
              </div>

              {categories.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No categories yet. Create one to get started!</p>
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
                  <h3 className="font-bold text-lg">{editCategoryId ? "Edit" : "Add"} Category</h3>
                  <button onClick={closeCategoryForm}>
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Example Categories Suggestions */}
                {!editCategoryId && business.businessType?.exampleCategories && business.businessType.exampleCategories.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Suggested Categories for {business.businessType.name}:</p>
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
                  placeholder="Category Name *"
                  value={categoryForm.name}
                  onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />

                <textarea
                  placeholder="Description (optional)"
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
                    {editCategoryId ? "Update" : "Create"} Category
                  </button>
                  <button
                    onClick={closeCategoryForm}
                    className="px-6 py-3 border border-border rounded-xl text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
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
          placeholder="Search listings..." 
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
                        alt={(form.images || [])[0]?.alt || form.title || 'Listing image'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                        Upload at least 1 image
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">Images *</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {(form.images || []).length} uploaded
                        </p>
                      </div>
                      <label className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border border-border bg-card ${uploadingImages ? 'text-muted-foreground' : 'text-foreground hover:bg-muted'} cursor-pointer`}>
                        {uploadingImages && <Loader2 className="w-4 h-4 animate-spin" />}
                        {uploadingImages ? 'Uploading…' : 'Upload images'}
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
                          <Loader2 className="w-5 h-5 animate-spin" /> Uploading…
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
                            title={idx === 0 ? 'Main image' : 'Set as main'}>
                            <img src={img.url} alt={img.alt || 'Listing image'} className="h-full w-full object-cover" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{editId ? "Edit" : "Add"} {getFieldLabels(form.listingType || listingType).title}</h3>
                  <button onClick={closeForm}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>

                <input
                  value={(form.listingType || listingType).toUpperCase()}
                  disabled
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm text-muted-foreground focus:outline-none"
                />

                {/* Category Selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Category (optional)</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">No category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Create categories using the "Categories" button to organize your listings
                    </p>
                  )}
                </div>
                
                <input 
                  placeholder={`${getFieldLabels(form.listingType || listingType).title} *`} 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
                />
                
                <textarea 
                  placeholder="Description *" 
                  value={form.description} 
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/30" 
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    placeholder={`${getFieldLabels(form.listingType || listingType).price} (₹) *`} 
                    type="number" 
                    value={form.price} 
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
                  />
                  <select 
                    value={form.priceType} 
                    onChange={e => setForm({ ...form, priceType: e.target.value as any })}
                    className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="fixed">Fixed</option>
                    <option value="starting_from">Starting From</option>
                    <option value="per_hour">Per Hour</option>
                    <option value="per_day">Per Day</option>
                    <option value="per_month">Per Month</option>
                    <option value="inquiry">Inquiry / Call</option>
                  </select>
                </div>
                
                {(form.listingType || listingType) === 'product' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      placeholder="Stock/Quantity" 
                      type="number" 
                      value={form.stock} 
                      onChange={e => setForm({ ...form, stock: e.target.value })}
                      className="px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" 
                    />
                    <input 
                      placeholder="SKU" 
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
                    Active
                  </label>
                  <label className="flex items-center gap-2 px-4 py-3 bg-muted border border-border rounded-xl text-sm">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={e => {
                        if (!form.isFeatured && disableFeaturedCheckbox) {
                          const limitText = !featuredEnabled
                            ? "Featured listings are not enabled in your plan"
                            : `Your plan allows maximum ${maxFeaturedListings} featured listings`;
                          toast({
                            title: "Not available",
                            description: limitText,
                            variant: "destructive",
                          });
                          return;
                        }
                        setForm({ ...form, isFeatured: e.target.checked });
                      }}
                      disabled={disableFeaturedCheckbox}
                      className="h-4 w-4"
                    />
                    Featured
                  </label>
                </div>

                {/* Pricing Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Pricing options (optional)</p>
                    <button
                      type="button"
                      onClick={addPricingOption}
                      className="text-xs font-semibold text-primary hover:underline">
                      + Add option
                    </button>
                  </div>

                  {(form.pricingOptions || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Add selectable options like Half / Full, Basic / Premium, 1 hour / 2 hours, etc.</p>
                  ) : (
                    <div className="space-y-2">
                      {(form.pricingOptions || []).map((opt, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_140px_auto] gap-2">
                          <input
                            placeholder="label (e.g. Half plate)"
                            value={opt.label}
                            onChange={e => updatePricingOption(idx, "label", e.target.value)}
                            className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <input
                            placeholder="price"
                            inputMode="decimal"
                            value={opt.price}
                            onChange={e => updatePricingOption(idx, "price", e.target.value)}
                            className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
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
                    <p className="text-sm font-semibold text-foreground">Attributes</p>
                    <button
                      type="button"
                      onClick={addAttribute}
                      className="text-xs font-semibold text-primary hover:underline">
                      + Add attribute
                    </button>
                  </div>

                  {(form.attributes || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Add details like size, color, duration, brand, etc.</p>
                  ) : (
                    <div className="space-y-2">
                      {(form.attributes || []).map((attr, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <input
                            placeholder="name (e.g. size)"
                            value={attr.name}
                            onChange={e => updateAttribute(idx, "name", e.target.value)}
                            className="px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <input
                            placeholder="value (e.g. XL)"
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
                    {editId ? "Update" : "Add"} {(form.listingType || listingType) === 'product' ? 'Product' : 
                                                   (form.listingType || listingType) === 'service' ? 'Service' : 
                                                   (form.listingType || listingType) === 'food' ? 'Item' : 
                                                   (form.listingType || listingType) === 'course' ? 'Course' : 
                                                   'Item'}
                  </button>
                  <button onClick={closeForm} className="px-6 py-3 border border-border rounded-xl text-sm hover:bg-muted transition-colors">Cancel</button>
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
                      FEATURED
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
                      <span className="text-xs font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">Inactive</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">{listing.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {listing.listingType.charAt(0).toUpperCase() + listing.listingType.slice(1)}
                        {listing.stock !== undefined && ` · Stock: ${listing.stock}`}
                      </p>
                    </div>
                  </div>
                  
                  {listing.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                  )}
                  
                  <div className="flex items-end gap-2">
                    {listing.priceType === 'inquiry' ? (
                      <span className="text-sm font-bold text-primary">Inquiry / Call</span>
                    ) : (
                      <>
                        <span className="text-lg font-bold text-primary">₹{listing.price}</span>
                        {listing.priceType !== 'fixed' && (
                          <span className="text-[10px] text-muted-foreground">({String(listing.priceType).replace('_', ' ')})</span>
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
                        {listing.isActive ? "Active" : "Hidden"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!listing.isFeatured && !!features && (!featuredEnabled || maxFeaturedReached)) {
                            toast({
                              title: "Not available",
                              description: !featuredEnabled
                                ? "Featured listings are not enabled in your plan"
                                : `Your plan allows maximum ${maxFeaturedListings} featured listings`,
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
                        title={listing.isFeatured ? "Unfeature" : "Feature"}
                      >
                        <Star className={`w-3.5 h-3.5 ${listing.isFeatured ? 'fill-primary text-primary' : ''}`} />
                        Featured
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
          <p className="text-muted-foreground">No listings found</p>
        </div>
      )}
    </div>
  );
};

export default Products;
