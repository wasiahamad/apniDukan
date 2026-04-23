import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
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
import { getDistanceKm, useUserLocation } from "@/hooks/useUserLocation";
import { useTranslation } from "react-i18next";

export default function CityCategoryPage() {
  const { t, i18n } = useTranslation();
  const { category } = useParams<{ category: string }>();
  const { userLocation } = useUserLocation();

  const businessTypesQuery = useQuery({
    queryKey: ["business-types", i18n.language],
    queryFn: fetchBusinessTypes,
  });

  const catData = (businessTypesQuery.data || []).find((item) => item.slug === (category || ""));

  const shopsQuery = useQuery({
    queryKey: ["public-shops-category", i18n.language, category],
    queryFn: () => fetchPublicShops({ category: category || "" }),
    enabled: !!category,
  });

  const allShops = shopsQuery.data || [];
  const areas = useMemo(() => [...new Set(allShops.map((s) => s.area).filter(Boolean))], [allShops]);

  const [areaFilter, setAreaFilter] = useState("all");
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    setAreaFilter("all");
    setOpenOnly(false);
  }, [category]);

  const getShopDistance = (shop: (typeof allShops)[number]) => {
    if (!userLocation) return Number.POSITIVE_INFINITY;
    if (!Number.isFinite(shop.latitude) || !Number.isFinite(shop.longitude)) return Number.POSITIVE_INFINITY;
    return getDistanceKm(userLocation.latitude, userLocation.longitude, shop.latitude, shop.longitude);
  };

  const filteredShops = useMemo(() => {
    let result = [...allShops];
    if (areaFilter !== "all") {
      const target = areaFilter.trim().toLowerCase();
      result = result.filter((s) => String(s.area || "").trim().toLowerCase() === target);
    }
    if (openOnly) result = result.filter(s => s.isOpen);
    result.sort((a, b) => {
      const aDistance = getShopDistance(a);
      const bDistance = getShopDistance(b);

      const aHasDistance = Number.isFinite(aDistance) && aDistance !== Number.POSITIVE_INFINITY;
      const bHasDistance = Number.isFinite(bDistance) && bDistance !== Number.POSITIVE_INFINITY;

      if (aHasDistance !== bHasDistance) return aHasDistance ? -1 : 1;
      if (aHasDistance && bHasDistance && aDistance !== bDistance) return aDistance - bDistance;

      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [allShops, areaFilter, openOnly, userLocation]);

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
        <h1 className="text-2xl font-bold">{t("categoryShopsPage.errors.loadTitle")}</h1>
        <p className="text-muted-foreground mt-2">
          {shopsQuery.error instanceof Error ? shopsQuery.error.message : t("categoryShopsPage.errors.generic")}
        </p>
        <button onClick={() => shopsQuery.refetch()} className="text-primary mt-4 inline-block">{t("shopsPage.actions.retry")}</button>
      </div>
    );
  }

  if (businessTypesQuery.isLoading) {
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

  if (!category || !catData) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold">{t("categoryShopsPage.notFound.title")}</h1>
        <Link to="/" className="text-primary mt-4 inline-block">{t("categoryShopsPage.notFound.backHome")}</Link>
      </div>
    );
  }

  return (
    <PageTransition>
      <section className="bg-gradient-to-r from-primary/10 to-secondary/10 py-10">
        <div className="container">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Link to="/" className="hover:text-primary">{t("nav.home")}</Link> /
            <Link to="/shops" className="hover:text-primary">{t("categoryShopsPage.breadcrumb.shops")}</Link> /
            <span>{catData.name}</span>
          </div>
          <h1 className="text-3xl font-bold">
            {catData.icon} {catData.name} {t("categoryShopsPage.titleSuffix")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("categoryShopsPage.subtitle", { count: filteredShops.length })}
          </p>
        </div>
      </section>

      <div className="container py-8">
        <ScrollReveal>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4 mb-8 p-4 rounded-xl border bg-card">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder={t("filters.area")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.allAreas")}</SelectItem>
                {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Switch id="open" checked={openOnly} onCheckedChange={setOpenOnly} />
              <Label htmlFor="open" className="text-sm">{t("shopsPage.filters.openNow")}</Label>
            </div>
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
          <p className="text-center text-muted-foreground py-12">
            {t("categoryShopsPage.empty", { category: catData.name })}
          </p>
        )}
      </div>
    </PageTransition>
  );
}
