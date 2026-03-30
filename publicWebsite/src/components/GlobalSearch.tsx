import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBusinessTypes, fetchNearbyPublicShops, fetchPublicShops } from "@/lib/publicShopsApi";
import { useUserLocation } from "@/hooks/useUserLocation";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { userLocation, requestLocation } = useUserLocation();

  useEffect(() => {
    if (!open) return;
    if (userLocation) return;
    try {
      requestLocation();
    } catch {
      // ignore
    }
  }, [open, requestLocation, userLocation]);

  const nearbyShopsQuery = useQuery({
    queryKey: ["public-shops-nearby-search", userLocation?.latitude ?? null, userLocation?.longitude ?? null],
    enabled: open && !!userLocation,
    queryFn: () =>
      fetchNearbyPublicShops({
        lat: userLocation!.latitude,
        lng: userLocation!.longitude,
        radiusKm: 25,
        limit: 1000,
      }),
  });

  // Separate query: used only to build the Cities list (show all cities).
  const allShopsQuery = useQuery({
    queryKey: ["public-shops-all-search"],
    enabled: open,
    queryFn: () => fetchPublicShops(),
  });

  const businessTypesQuery = useQuery({
    queryKey: ["business-types"],
    queryFn: fetchBusinessTypes,
  });

  const nearbyShops = nearbyShopsQuery.data || [];
  const allShops = allShopsQuery.data || [];

  const cities = useMemo(() => {
    const cityMap = new Map<string, { id: string; name: string; slug: string; totalShops: number }>();
    allShops.forEach((shop) => {
      const key = shop.citySlug;
      const prev = cityMap.get(key);
      if (prev) {
        prev.totalShops += 1;
      } else {
        cityMap.set(key, { id: key, name: shop.city, slug: key, totalShops: 1 });
      }
    });
    return Array.from(cityMap.values()).sort((a, b) => b.totalShops - a.totalShops || a.name.localeCompare(b.name));
  }, [allShops]);

  const categories = businessTypesQuery.data || [];

  const defaultCitySlug = cities[0]?.slug || "delhi";

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden md:flex items-center gap-2 text-muted-foreground w-56 justify-start"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search shops...</span>
        <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search shops, cities, categories..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Shops">
            {!userLocation && open ? (
              <CommandItem disabled className="py-2 text-muted-foreground">
                Location allow karo to nearby shops search ho sake.
              </CommandItem>
            ) : nearbyShopsQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <CommandItem key={i} disabled className="py-2">
                  <div className="flex items-center gap-2 w-full">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </CommandItem>
              ))
            ) : nearbyShops.slice(0, 12).map((shop) => (
              <CommandItem
                key={shop.id}
                value={`${shop.name} ${shop.category} ${shop.city} ${shop.area}`}
                onSelect={() => handleSelect(`/${shop.slug}`)}
              >
                <span className="mr-2">{categories.find(c => c.slug === shop.categorySlug)?.icon || "🏪"}</span>
                <span>{shop.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{shop.city}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Cities">
            {allShopsQuery.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <CommandItem key={i} disabled className="py-2">
                    <div className="flex items-center gap-2 w-full">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </CommandItem>
                ))
              : cities.map((city) => (
                  <CommandItem
                    key={city.id}
                    value={city.name}
                    onSelect={() => handleSelect(`/${city.slug}`)}
                  >
                    📍 {city.name}
                    <span className="ml-auto text-xs text-muted-foreground">{city.totalShops} shops</span>
                  </CommandItem>
                ))}
          </CommandGroup>
          <CommandGroup heading="Categories">
            {businessTypesQuery.isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <CommandItem key={i} disabled className="py-2">
                    <div className="flex items-center gap-2 w-full">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 flex-1" />
                    </div>
                  </CommandItem>
                ))
              : categories.map((cat) => (
                  <CommandItem
                    key={cat.id}
                    value={cat.name}
                    onSelect={() => handleSelect(`/${defaultCitySlug}/${cat.slug}`)}
                  >
                    {cat.icon} {cat.name}
                  </CommandItem>
                ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
