import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Store, ArrowRight, Star, MessageCircle, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import ShopCard from "@/components/ShopCard";
import PageTransition from "@/components/PageTransition";
import ScrollReveal from "@/components/ScrollReveal";
import StaggerChildren, { StaggerItem } from "@/components/StaggerChildren";
import StoriesTray from "@/components/StoriesTray";
import GlobalSearch from "@/components/GlobalSearch";
import { fetchActiveStories, fetchBusinessTypes, fetchNearbyPublicShops, fetchPublicShops, fetchCityImages, fetchPlatformFeedbackStats } from "@/lib/publicShopsApi";
import { getCityFallbackImage } from "@/lib/cityGroups";
import { motion } from "framer-motion";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getDukandarOnboardingUrl } from "@/lib/dukandarDashboard";
import { Trans, useTranslation } from "react-i18next";

function TransSpan({ className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  const { i18nIsDynamicList: _i18nIsDynamicList, ...safe } = rest as any;
  return (
    <span className={className} {...safe}>
      {children}
    </span>
  );
}

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { requestLocation, userLocation } = useUserLocation();
  const [featuredCity, setFeaturedCity] = useState(searchParams.get("city") || "all");
  const [featuredCategory, setFeaturedCategory] = useState(searchParams.get("type") || "all");
  const [featuredOpenOnly, setFeaturedOpenOnly] = useState(searchParams.get("open") === "1");
  const [cityImages, setCityImages] = useState<Record<string, string>>({});

  const shopsQuery = useQuery({
    queryKey: [
      "public-shops",
      i18n.language,
      userLocation?.latitude ?? null,
      userLocation?.longitude ?? null,
    ],
    queryFn: () =>
      fetchPublicShops(
        userLocation
          ? { lat: userLocation.latitude, lng: userLocation.longitude }
          : undefined
      ),
  });

  const nearbyShopsQuery = useQuery({
    queryKey: [
      "public-shops-nearby",
      i18n.language,
      userLocation?.latitude ?? null,
      userLocation?.longitude ?? null,
    ],
    enabled: !!userLocation,
    queryFn: () =>
      fetchNearbyPublicShops({
        lat: userLocation!.latitude,
        lng: userLocation!.longitude,
        radiusKm: 25,
        limit: 1000,
      }),
  });

  const businessTypesQuery = useQuery({
    queryKey: ["business-types", i18n.language],
    queryFn: fetchBusinessTypes,
  });

  const platformStatsQuery = useQuery({
    queryKey: ["platform-feedback-stats"],
    queryFn: fetchPlatformFeedbackStats,
  });

  const storiesQuery = useQuery({
    queryKey: ["public-stories", "story"],
    queryFn: () => fetchActiveStories("story"),
  });


  const allShops = shopsQuery.data || [];
  const businessTypes = businessTypesQuery.data || [];

  const cities = useMemo(() => {
    const cityMap = new Map<string, { name: string; slug: string; totalShops: number; image: string }>();
    allShops.forEach((shop) => {
      const prev = cityMap.get(shop.citySlug);
      if (prev) {
        prev.totalShops += 1;
      } else {
        cityMap.set(shop.citySlug, {
          name: shop.city,
          slug: shop.citySlug,
          totalShops: 1,
          image: shop.coverImage,
        });
      }
    });
    return Array.from(cityMap.values()).sort((a, b) => b.totalShops - a.totalShops || a.name.localeCompare(b.name));
  }, [allShops]);

  const defaultCitySlug = cities[0]?.slug || "delhi";
  const mostActiveCitySlug = cities[0]?.slug || null;

  // Fetch city images
  useEffect(() => {
    if (cities.length > 0) {
      const cityNames = cities.map((c) => c.name);
      fetchCityImages(cityNames)
        .then((images) => {
          setCityImages(images);
        })
        .catch((error) => {
          console.error("Failed to fetch city images:", error);
        });
    }
  }, [cities.length, cities.map((c) => c.name).join(",")]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);

    if (featuredCity !== "all") next.set("city", featuredCity);
    else next.delete("city");

    if (featuredCategory !== "all") next.set("type", featuredCategory);
    else next.delete("type");

    if (featuredOpenOnly) next.set("open", "1");
    else next.delete("open");

    // Prevent redundant navigations that can cause UI flicker.
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [featuredCategory, featuredCity, featuredOpenOnly, searchParams, setSearchParams]);

  const filteredAllShops = useMemo(() => {
    let items = [...allShops];
    if (featuredCity !== "all") items = items.filter((shop) => shop.citySlug === featuredCity);
    if (featuredCategory !== "all") items = items.filter((shop) => shop.categorySlug === featuredCategory);
    if (featuredOpenOnly) items = items.filter((shop) => shop.isOpen);
    return items;
  }, [allShops, featuredCategory, featuredCity, featuredOpenOnly]);

  const featuredPool = useMemo(() => {
    // Prefer nearby (25km) when available, but fall back to all shops
    // so filters never leave the section empty.
    const nearby = userLocation ? (nearbyShopsQuery.data || []) : [];
    let items = userLocation && nearby.length > 0 ? [...nearby] : [...filteredAllShops];
    if (featuredCity !== "all") items = items.filter((shop) => shop.citySlug === featuredCity);
    if (featuredCategory !== "all") items = items.filter((shop) => shop.categorySlug === featuredCategory);
    if (featuredOpenOnly) items = items.filter((shop) => shop.isOpen);
    return items;
  }, [filteredAllShops, nearbyShopsQuery.data, featuredCategory, featuredCity, featuredOpenOnly, userLocation]);

  const featuredShops = useMemo(() => {
    const byPlanAndRating = (a: any, b: any) => {
      const ap = Number(a?.activePlanPrice ?? 0);
      const bp = Number(b?.activePlanPrice ?? 0);
      if (bp !== ap) return bp - ap;

      const ar = Number(a?.rating ?? 0);
      const br = Number(b?.rating ?? 0);
      if (br !== ar) return br - ar;

      const arc = Number(a?.reviewCount ?? 0);
      const brc = Number(b?.reviewCount ?? 0);
      if (brc !== arc) return brc - arc;

      // Verified first
      const av = a?.verified ? 1 : 0;
      const bv = b?.verified ? 1 : 0;
      return bv - av;
    };

    let items = featuredPool.filter((shop) => shop.verified);
    if (items.length === 0) items = [...featuredPool];
    items.sort(byPlanAndRating);
    return items.slice(0, 8);
  }, [featuredPool]);

  const remainingShops = useMemo(() => {
    const featuredIds = new Set(featuredShops.map((s) => s.id));
    return filteredAllShops.filter((s) => !featuredIds.has(s.id));
  }, [filteredAllShops, featuredShops]);

  const heroStats = useMemo(() => {
    const totalShops = allShops.length;
    const totalCities = cities.length;
    const avgRating = Number(platformStatsQuery.data?.avgRating || 0);

    return {
      totalShops,
      totalCities,
      avgRating,
    };
  }, [allShops.length, cities.length, platformStatsQuery.data?.avgRating]);

  const renderBusinessTypeIcon = (icon: string | undefined) => {
    if (!icon) return <span className="text-2xl">🏪</span>;
    if (/^https?:\/\//i.test(icon)) {
      return <img src={icon} alt="" className="w-8 h-8 object-cover rounded-md mx-auto mb-2" loading="lazy" />;
    }
    return <span className="text-4xl mb-2">{icon}</span>;
  };

  const howItWorks = useMemo(
    () => [
      { icon: Search, title: t("home.howItWorks.steps.search.title"), desc: t("home.howItWorks.steps.search.desc") },
      { icon: Store, title: t("home.howItWorks.steps.view.title"), desc: t("home.howItWorks.steps.view.desc") },
      { icon: MessageCircle, title: t("home.howItWorks.steps.contact.title"), desc: t("home.howItWorks.steps.contact.desc") },
    ],
    [t],
  );

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
        <div className="container">
          <motion.div
            className="max-w-2xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">{t("home.hero.badge")}</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 text-foreground">
              <Trans
                i18nKey="home.hero.title"
                components={[
                  <TransSpan key="best" className="text-primary" />,
                  <TransSpan key="neighborhood" className="text-secondary" />,
                ]}
              />
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              {t("home.hero.description")}
            </p>

            <div className="mb-5 md:hidden max-w-lg mx-auto">
              <GlobalSearch mode="hero" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="gap-2 text-base"
                  onClick={() => {
                    try {
                      requestLocation();
                    } catch {
                      // ignore
                    }
                    navigate("/shops?nearby=1");
                  }}
                >
                  <Search className="h-5 w-5" /> {t("home.hero.exploreNearby")}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 text-base border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
                  onClick={() => window.open(getDukandarOnboardingUrl(), "_blank", "noopener,noreferrer")}
                >
                  <Store className="h-5 w-5" /> {t("home.hero.registerShop")}
                </Button>
              </motion.div>
            </div>
            <motion.div
              className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 text-primary" />
                {shopsQuery.isLoading ? (
                  <Skeleton className="h-4 w-16 rounded" />
                ) : (
                  t("home.hero.stats.shops", { count: heroStats.totalShops.toLocaleString("en-IN") })
                )}
              </span>
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 text-secondary" />
                {platformStatsQuery.isLoading ? (
                  <Skeleton className="h-4 w-14 rounded" />
                ) : (
                  t("home.hero.stats.rating", { rating: heroStats.avgRating > 0 ? heroStats.avgRating.toFixed(1) : "0.0" })
                )}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-accent" />
                {shopsQuery.isLoading ? (
                  <Skeleton className="h-4 w-12 rounded" />
                ) : (
                  t("home.hero.stats.cities", { count: heroStats.totalCities })
                )}
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      

      {/* How It Works */}
      <section className="container py-16">
        <ScrollReveal>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{t("home.howItWorks.title")}</h2>
        </ScrollReveal>
        <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {howItWorks.map((step, i) => (
            <StaggerItem key={i}>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm font-medium text-primary mb-1">{t("home.howItWorks.stepLabel", { step: i + 1 })}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </section>

      {/* Featured Shops */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <ScrollReveal>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">{t("home.featured.title")}</h2>
              <Button variant="ghost" asChild className="gap-1">
                <Link to="/shops">
                  {t("actions.viewAll")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl border bg-card">
              <Select value={featuredCity} onValueChange={setFeaturedCity}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder={t("home.featured.filters.city")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("home.featured.filters.allCities")}</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city.slug} value={city.slug}>{city.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={featuredCategory} onValueChange={setFeaturedCategory}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder={t("home.featured.filters.businessType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("home.featured.filters.allBusinessTypes")}</SelectItem>
                  {businessTypes.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Switch id="featured-open-only" checked={featuredOpenOnly} onCheckedChange={setFeaturedOpenOnly} />
                <Label htmlFor="featured-open-only" className="text-sm">{t("home.featured.filters.openNowOnly")}</Label>
              </div>
            </div>
          </ScrollReveal>

          {shopsQuery.isLoading || (userLocation ? (nearbyShopsQuery.isLoading && allShops.length === 0) : false) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-[360px] w-full rounded-xl" />
              <Skeleton className="h-[360px] w-full rounded-xl" />
              <Skeleton className="h-[360px] w-full rounded-xl" />
            </div>
          ) : featuredShops.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              {t("home.featured.noMatches")}
            </p>
          ) : (
          <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredShops.map(shop => (
              <StaggerItem key={shop.id}>
                <ShopCard shop={shop} />
              </StaggerItem>
            ))}
          </StaggerChildren>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <ScrollReveal>
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{t("home.categories.title")}</h2>
        </ScrollReveal>
        {businessTypesQuery.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : (
        <StaggerChildren className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {businessTypes.map(cat => (
            <StaggerItem key={cat.slug}>
              <Link to={`/shops/${cat.slug}`}>
                <motion.div whileHover={{ scale: 1.05, y: -4 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="hover:shadow-md transition-shadow hover:border-primary/30 text-center py-6 cursor-pointer">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-center mb-2">{renderBusinessTypeIcon(cat.icon)}</div>
                      <h3 className="font-medium text-sm">{cat.name}</h3>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerChildren>
        )}
      </section>

      {/* More Shops */}
      <section className="container py-16">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">{t("home.more.title")}</h2>
            <Button variant="ghost" asChild className="gap-1">
              <Link to="/shops">
                {t("actions.viewAll")} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </ScrollReveal>

        {shopsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[360px] w-full rounded-xl" />
            <Skeleton className="h-[360px] w-full rounded-xl" />
            <Skeleton className="h-[360px] w-full rounded-xl" />
          </div>
        ) : remainingShops.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">{t("home.more.none")}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">{t("home.more.count", { count: remainingShops.length })}</p>
            <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {remainingShops.map((shop) => (
                <StaggerItem key={shop.id}>
                  <ShopCard shop={shop} />
                </StaggerItem>
              ))}
            </StaggerChildren>
          </>
        )}
      </section>

      {/* Cities */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <ScrollReveal>
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">{t("home.cities.title")}</h2>
          </ScrollReveal>
          {shopsQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: Math.max(4, Math.min(cities.length || 5, 8)) }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <CardContent className="p-3 text-center space-y-2">
                    <Skeleton className="h-4 w-24 mx-auto" />
                    <Skeleton className="h-3 w-16 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cities.map((city) => (
                <StaggerItem key={city.slug}>
                  <Link to={`/${city.slug}`}>
                    <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300 }}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
                        <div className="h-32 overflow-hidden bg-muted animate-pulse">
                          <img
                            src={cityImages[city.name] || city.image}
                            alt={city.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(event) => {
                              const target = event.currentTarget;
                              if (!target.dataset.fallbackApplied) {
                                target.dataset.fallbackApplied = "true";
                                target.src = cityImages[city.name] || getCityFallbackImage(city.name);
                              }
                            }}
                            onLoad={(e) => {
                              (e.currentTarget as HTMLImageElement).classList.remove('animate-pulse');
                            }}
                          />
                        </div>
                        <CardContent className="p-3 text-center">
                          <h3 className="font-semibold inline-flex items-center gap-2">
                            {city.name}
                            {mostActiveCitySlug === city.slug ? (
                              <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5">{t("home.cities.mostActive")}</Badge>
                            ) : null}
                          </h3>
                          <p className="text-xs text-muted-foreground">{city.totalShops} shops</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerChildren>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <ScrollReveal>
        <section className="bg-primary py-16">
          <div className="container text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
              {t("home.cta.title")}
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
              {t("home.cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2"
                  onClick={() => window.open(getDukandarOnboardingUrl(), "_blank", "noopener,noreferrer")}
                >
                  <Store className="h-5 w-5" /> {t("home.cta.registerShop")}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link to="/signup">{t("home.cta.createCustomer")}</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>
      </ScrollReveal>
    </PageTransition>
  );
}
