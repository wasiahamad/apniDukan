import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cities as fallbackCities, categories as fallbackCategories } from "@/data/mockData";
import { getCityFallbackImage, groupCitiesFromShops } from "@/lib/cityGroups";
import { fetchBusinessTypes, fetchPublicShops } from "@/lib/publicShopsApi";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const DEFAULT_CITY_IMAGE = "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=400&h=300&fit=crop";

export default function CategoriesPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const businessTypesQuery = useQuery({
    queryKey: ["business-types", i18n.language],
    queryFn: fetchBusinessTypes,
  });

  const shopsQuery = useQuery({
    queryKey: ["public-shops", i18n.language],
    queryFn: () => fetchPublicShops(),
  });

  const renderBusinessTypeIcon = (icon: string | undefined) => {
    if (!icon) return <span className="text-2xl">🏪</span>;
    if (/^https?:\/\//i.test(icon)) {
      return <img src={icon} alt="" className="w-8 h-8 object-cover rounded-md" loading="lazy" />;
    }
    return <span className="text-4xl">{icon}</span>;
  };

  const categories = (businessTypesQuery.data && businessTypesQuery.data.length > 0)
    ? businessTypesQuery.data
    : fallbackCategories;

  const cities = useMemo(() => groupCitiesFromShops(shopsQuery.data || [], fallbackCities), [shopsQuery.data]);

  return (
    <PageTransition>
      <section className="bg-gradient-to-r from-primary/10 to-accent/10 py-12">
        <div className="container">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <Link to="/" className="hover:text-primary">{t("nav.home")}</Link> / <span>{t("nav.categories")}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">{t("nav.categories")}</h1>
          <p className="text-muted-foreground mt-2">{t("categoriesPage.subtitle")}</p>
        </div>
      </section>

      <div className="container py-8">
        {/* Categories */}
        <section className="mb-12">
          <ScrollReveal>
            <h2 className="text-xl md:text-2xl font-bold text-center mb-6">{t("categoriesPage.browseByCategory")}</h2>
          </ScrollReveal>

          {businessTypesQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : (
            <StaggerChildren className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <StaggerItem key={cat.slug}>
                  <button type="button" onClick={() => navigate(`/shops/${cat.slug}`)} className="w-full">
                    <Card className="text-center py-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
                      <CardContent className="p-0">
                        <div className="flex items-center justify-center mb-2">{renderBusinessTypeIcon((cat as any).icon)}</div>
                        <h3 className="font-medium text-sm">{cat.name}</h3>
                      </CardContent>
                    </Card>
                  </button>
                </StaggerItem>
              ))}
            </StaggerChildren>
          )}
        </section>

        {/* Cities */}
        <section>
          <ScrollReveal>
            <h2 className="text-xl md:text-2xl font-bold text-center mb-6">{t("categoriesPage.browseByCity")}</h2>
          </ScrollReveal>

          {shopsQuery.isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <StaggerChildren className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {cities.map((city) => (
                <StaggerItem key={city.slug}>
                  <button type="button" onClick={() => navigate(`/${city.slug}`)} className="w-full">
                    <Card className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="aspect-[4/2.2] overflow-hidden rounded-lg bg-muted">
                            <img
                              src={city.image || DEFAULT_CITY_IMAGE}
                              alt={city.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(event) => {
                                const target = event.currentTarget;
                                if (!target.dataset.fallbackApplied) {
                                  target.dataset.fallbackApplied = "true";
                                  target.src = getCityFallbackImage(city.name);
                                }
                              }}
                            />
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{city.name}</p>
                              <p className="text-xs text-muted-foreground">{t("search.cityShopCount", { count: city.totalShops })}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                </StaggerItem>
              ))}
            </StaggerChildren>
          )}
        </section>
      </div>
    </PageTransition>
  );
}
