import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import ShopCard from "@/components/ShopCard";
import PageTransition from "@/components/PageTransition";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import ScrollReveal from "@/components/ScrollReveal";
import { fetchBusinessTypes, fetchPublicShops } from "@/lib/publicShopsApi";

const slugToCityLabel = (slug: string) =>
  String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function CityPage() {
  const { city, shopSlug } = useParams<{ city?: string; shopSlug?: string }>();
  const slug = city || shopSlug || "";

  const shopsQuery = useQuery({
    queryKey: ["public-shops-city", slug],
    queryFn: () => fetchPublicShops({ city: slugToCityLabel(slug) }),
    enabled: !!slug,
  });

  const businessTypesQuery = useQuery({
    queryKey: ["business-types"],
    queryFn: fetchBusinessTypes,
  });

  const allShops = shopsQuery.data || [];
  const areas = useMemo(() => [...new Set(allShops.map((s) => s.area).filter(Boolean))], [allShops]);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);
  const [sortRating, setSortRating] = useState("desc");

  useEffect(() => {
    setSelectedCategory("all");
    setAreaFilter("all");
    setOpenOnly(false);
    setSortRating("desc");
  }, [slug]);

  const availableCategorySlugs = useMemo(() => {
    return new Set(allShops.map((shop) => shop.categorySlug));
  }, [allShops]);

  const cityBusinessTypes = useMemo(() => {
    return (businessTypesQuery.data || []).filter((type) => availableCategorySlugs.has(type.slug));
  }, [businessTypesQuery.data, availableCategorySlugs]);

  const filteredShops = useMemo(() => {
    let result = [...allShops];
    if (selectedCategory !== "all") result = result.filter(s => s.categorySlug === selectedCategory);
    if (areaFilter !== "all") {
      const target = areaFilter.trim().toLowerCase();
      result = result.filter((s) => String(s.area || "").trim().toLowerCase() === target);
    }
    if (openOnly) result = result.filter(s => s.isOpen);
    result.sort((a, b) => sortRating === "desc" ? b.rating - a.rating : a.rating - b.rating);
    return result;
  }, [allShops, selectedCategory, areaFilter, openOnly, sortRating]);

  if (shopsQuery.isLoading) {
    return (
      <div className="container py-10 space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Skeleton className="h-[360px] w-full rounded-xl" />
          <Skeleton className="h-[360px] w-full rounded-xl" />
          <Skeleton className="h-[360px] w-full rounded-xl" />
          <Skeleton className="h-[360px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (shopsQuery.isError) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">Shops load nahi ho paye</h1>
        <p className="text-muted-foreground mt-2">
          {shopsQuery.error instanceof Error ? shopsQuery.error.message : "Something went wrong"}
        </p>
        <button onClick={() => shopsQuery.refetch()} className="text-primary mt-4 inline-block">Retry</button>
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">City not found</h1>
        <Link to="/" className="text-primary mt-4 inline-block">← Back to Home</Link>
      </div>
    );
  }

  const cityName = slugToCityLabel(slug);

  return (
    <PageTransition>
      <section className="bg-gradient-to-r from-primary/10 to-accent/10 py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Link to="/" className="hover:text-primary">Home</Link> / <span>{cityName}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" /> Shops in {cityName}
          </h1>
          <p className="text-muted-foreground mt-2">{filteredShops.length} shops available</p>
        </div>
      </section>

      <div className="container py-8">
        {/* Category Chips */}
        <ScrollReveal>
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge
              variant="outline"
              className={`cursor-pointer transition-colors ${selectedCategory === "all" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary hover:text-primary-foreground"}`}
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Badge>
            {cityBusinessTypes.map(cat => (
              <Badge
                key={cat.slug}
                variant="outline"
                className={`cursor-pointer transition-colors ${selectedCategory === cat.slug ? "bg-primary text-primary-foreground border-primary" : "hover:bg-primary hover:text-primary-foreground"}`}
                onClick={() => setSelectedCategory(cat.slug)}
              >
                {cat.icon || "🏪"} {cat.name}
              </Badge>
            ))}
          </div>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 mb-8 p-4 rounded-xl border bg-card">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch id="open-city" checked={openOnly} onCheckedChange={setOpenOnly} />
              <Label htmlFor="open-city" className="text-sm">Open Now</Label>
            </div>

            <Select value={sortRating} onValueChange={setSortRating}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Rating: High → Low</SelectItem>
                <SelectItem value="asc">Rating: Low → High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ScrollReveal>

        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredShops.map(shop => (
            <StaggerItem key={shop.id}>
              <ShopCard shop={shop} />
            </StaggerItem>
          ))}
        </StaggerChildren>

        {filteredShops.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No shops found. Try adjusting filters.</p>
        )}
      </div>
    </PageTransition>
  );
}
