import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Filter, Search } from "lucide-react";
import ShopCard from "@/components/ShopCard";
import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fetchBusinessTypes, fetchNearbyPublicShops, fetchPublicShops } from "@/lib/publicShopsApi";
import { useUserLocation } from "@/hooks/useUserLocation";

export default function AllShopsPage() {
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);
  const { userLocation } = useUserLocation();

  const location = useMemo(() => {
    if (!userLocation) return null;
    return { lat: userLocation.latitude, lng: userLocation.longitude };
  }, [userLocation]);

  const allShopsQuery = useQuery({
    queryKey: ["public-shops-all"],
    queryFn: () => fetchPublicShops(),
  });

  const businessTypesQuery = useQuery({
    queryKey: ["business-types"],
    queryFn: fetchBusinessTypes,
  });

  const shopsQuery = useQuery({
    queryKey: [
      "public-shops",
      selectedCity,
      selectedType,
      location?.lat ?? null,
      location?.lng ?? null,
    ],
    queryFn: () => {
      const hasManualFilters = selectedCity !== "all" || selectedType !== "all";

      // If user applied filters, respect those first.
      if (hasManualFilters) {
        return fetchPublicShops({
          city: selectedCity !== "all" ? selectedCity : undefined,
          category: selectedType !== "all" ? selectedType : undefined,
          lat: location?.lat ?? undefined,
          lng: location?.lng ?? undefined,
        });
      }

      // Default behavior: show nearest shops first (nearby), fallback to same-city.
      if (location?.lat != null && location?.lng != null) {
        return (async () => {
          const nearby = await fetchNearbyPublicShops({ lat: location.lat, lng: location.lng, radiusKm: 25 });
          if (nearby.length > 0) return nearby;

          // Fallback: resolve user's city and show all shops in that city.
          const key = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim();
          if (!key) return fetchPublicShops();

          try {
            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(
              `${location.lat},${location.lng}`
            )}&key=${encodeURIComponent(key)}`;
            const res = await fetch(url);
            const json = await res.json();
            const first = json?.results?.[0];
            const comps: any[] = Array.isArray(first?.address_components) ? first.address_components : [];
            const findLong = (type: string) =>
              comps.find((c) => Array.isArray(c?.types) && c.types.includes(type))?.long_name as string | undefined;
            const city =
              findLong("locality") ||
              findLong("administrative_area_level_2") ||
              findLong("postal_town") ||
              findLong("sublocality");

            if (city) {
              const cityShops = await fetchPublicShops({ city });
              return cityShops;
            }
          } catch {
            // ignore
          }

          return fetchPublicShops();
        })();
      }

      return fetchPublicShops();
    },
  });

  const cities = useMemo(() => {
    const all = allShopsQuery.data || [];
    const unique = [...new Set(all.map((s) => s.city).filter(Boolean))];
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [allShopsQuery.data]);

  const availableTypeSlugs = useMemo(() => {
    const all = allShopsQuery.data || [];
    return new Set(all.map((s) => s.categorySlug).filter(Boolean));
  }, [allShopsQuery.data]);

  const businessTypes = useMemo(() => {
    const types = businessTypesQuery.data || [];
    return types.filter((t) => availableTypeSlugs.has(t.slug));
  }, [businessTypesQuery.data, availableTypeSlugs]);

  const filtered = useMemo(() => {
    const all = shopsQuery.data || [];
    const q = query.trim().toLowerCase();

    let result = [...all];
    if (openOnly) result = result.filter((shop) => shop.isOpen);

    if (!q) return result;

    return result.filter((shop) => {
      return (
        shop.name.toLowerCase().includes(q) ||
        shop.category.toLowerCase().includes(q) ||
        shop.city.toLowerCase().includes(q) ||
        shop.area.toLowerCase().includes(q)
      );
    });
  }, [shopsQuery.data, query, openOnly]);

  const clearFilters = () => {
    setQuery("");
    setSelectedCity("all");
    setSelectedType("all");
    setOpenOnly(false);
  };

  return (
    <PageTransition>
      <section className="bg-gradient-to-r from-primary/10 to-accent/10 py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Link to="/" className="hover:text-primary">Home</Link> / <span>All Dukaan</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">All Dukaan</h1>
          <p className="text-muted-foreground mt-2">Backend se real verified dukandar list</p>
        </div>
      </section>

      <div className="container py-8">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 mb-8 p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filters</span>
            </div>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Shop, category, city ya area search karein"
                className="pl-9"
              />
            </div>

            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Business Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Types</SelectItem>
                {businessTypes.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>
                    {t.icon || "🏪"} {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch id="open-all" checked={openOnly} onCheckedChange={setOpenOnly} />
              <Label htmlFor="open-all" className="text-sm">
                Open Now
              </Label>
            </div>

            <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </ScrollReveal>

        {shopsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <Skeleton className="h-[360px] w-full rounded-xl" />
            <Skeleton className="h-[360px] w-full rounded-xl" />
            <Skeleton className="h-[360px] w-full rounded-xl" />
            <Skeleton className="h-[360px] w-full rounded-xl" />
          </div>
        ) : shopsQuery.isError ? (
          <div className="text-center py-12">
            <p className="text-destructive font-medium">{shopsQuery.error instanceof Error ? shopsQuery.error.message : "Failed to load shops"}</p>
            <p className="text-muted-foreground text-sm mt-1">Backend server chal raha ho aur public shops API accessible ho, fir retry karein.</p>
            <Button className="mt-4" onClick={() => shopsQuery.refetch()}>Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Koi dukaan nahi mili. Search change karke try karein.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{filtered.length} dukaan mil gayi</p>
            <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((shop) => (
                <StaggerItem key={shop.id}>
                  <ShopCard shop={shop} />
                </StaggerItem>
              ))}
            </StaggerChildren>
          </>
        )}
      </div>
    </PageTransition>
  );
}
