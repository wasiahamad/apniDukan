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
import { autoHindiCity, autoHindiText, fetchBusinessTypes, fetchNearbyPublicShops, fetchPublicShops } from "@/lib/publicShopsApi";
import { groupCitiesFromShops } from "@/lib/cityGroups";
import { useUserLocation } from "@/hooks/useUserLocation";
import { useTranslation } from "react-i18next";

type GlobalSearchMode = "header" | "hero";

export default function GlobalSearch({ mode = "header" }: { mode?: GlobalSearchMode }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { userLocation, requestLocation } = useUserLocation();

  useEffect(() => {
    if (open) return;
    setQuery("");
  }, [open]);

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
    queryKey: [
      "public-shops-nearby-search",
      i18n.language,
      userLocation?.latitude ?? null,
      userLocation?.longitude ?? null,
    ],
    enabled: open && !!userLocation,
    queryFn: () =>
      fetchNearbyPublicShops({
        lat: userLocation!.latitude,
        lng: userLocation!.longitude,
        radiusKm: 25,
        limit: 1000,
      }),
  });

  const trimmedQuery = query.trim();
  const searchShopsQuery = useQuery({
    queryKey: [
      "public-shops-search",
      i18n.language,
      trimmedQuery,
      userLocation?.latitude ?? null,
      userLocation?.longitude ?? null,
    ],
    enabled: open && trimmedQuery.length > 0,
    queryFn: () =>
      fetchPublicShops({
        search: trimmedQuery,
        ...(userLocation
          ? {
              lat: userLocation.latitude,
              lng: userLocation.longitude,
            }
          : {}),
      }),
  });

  // Separate query: used only to build the Cities list (show all cities).
  const allShopsQuery = useQuery({
    queryKey: ["public-shops-all-search", i18n.language],
    enabled: open,
    queryFn: () => fetchPublicShops(),
  });

  const businessTypesQuery = useQuery({
    queryKey: ["business-types", i18n.language],
    queryFn: fetchBusinessTypes,
  });

  const nearbyShops = nearbyShopsQuery.data || [];
  const allShops = allShopsQuery.data || [];

  const cities = useMemo(() => groupCitiesFromShops(allShops), [allShops]);

  const categories = businessTypesQuery.data || [];

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
      {mode === "header" ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground w-56 justify-start"
            onClick={() => setOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">{t("search.open")}</span>
            <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              {t("search.kbdHint")}
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
        </>
      ) : (
        <Button
          variant="outline"
          size="lg"
          className="md:hidden w-full h-12 justify-start gap-3 rounded-2xl border-border bg-card/80 backdrop-blur text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Search className="h-5 w-5" />
          <span className="text-sm">{t("search.open")}</span>
        </Button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t("search.inputPlaceholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>{t("search.noResults")}</CommandEmpty>
          <CommandGroup heading={t("search.headings.shops")}>
            {!userLocation && open && trimmedQuery.length === 0 ? (
              <CommandItem disabled className="py-2 text-muted-foreground">
                {t("search.locationRequired")}
              </CommandItem>
            ) : (trimmedQuery.length > 0 ? searchShopsQuery.isLoading : nearbyShopsQuery.isLoading) ? (
              Array.from({ length: 6 }).map((_, i) => (
                <CommandItem key={i} disabled className="py-2">
                  <div className="flex items-center gap-2 w-full">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </CommandItem>
              ))
            ) : (trimmedQuery.length > 0 ? (searchShopsQuery.data || []) : nearbyShops)
                .slice(0, 12)
                .map((shop) => (
                  <CommandItem
                    key={shop.id}
                    value={`${shop.name} ${shop.category} ${shop.city} ${shop.area} ${shop.slug} ${shop.categorySlug} ${shop.citySlug} ${autoHindiText(shop.name)} ${autoHindiText(shop.category)} ${autoHindiCity(shop.city)}`}
                    onSelect={() => handleSelect(`/${shop.slug}`)}
                  >
                    <span className="mr-2">{categories.find((c) => c.slug === shop.categorySlug)?.icon || "🏪"}</span>
                    <span>{shop.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{shop.city}</span>
                  </CommandItem>
                ))}
          </CommandGroup>
          <CommandGroup heading={t("search.headings.cities")}>
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
                    value={`${city.name} ${city.slug} ${autoHindiCity(city.name)}`}
                    onSelect={() => handleSelect(`/${city.slug}`)}
                  >
                    📍 {city.name}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {t("search.cityShopCount", { count: city.totalShops })}
                    </span>
                  </CommandItem>
                ))}
          </CommandGroup>
                  <CommandGroup heading={t("search.headings.categories")}>
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
                    value={`${cat.name} ${cat.slug} ${autoHindiText(cat.name)} ${autoHindiText(cat.slug)}`}
                    onSelect={() => handleSelect(`/shops/${cat.slug}`)}
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
