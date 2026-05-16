import React, { useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, FlatList } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SvgXml } from "react-native-svg";
import { Image } from "expo-image";

import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { BusinessCard, BusinessCardSkeleton } from "@/components/BusinessCard";
import { apiRequest } from "@/utils/apiClient";
import { FEATURED_CATEGORIES, FEATURED_CITIES, FEATURE_STORIES, PUBLIC_FEATURES, getCityArtwork } from "@/utils/publicCatalog";
import { fetchCityImages, groupCategoriesFromShops, groupCitiesFromShops } from "@/utils/publicDynamic";

type PublicShop = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  isVerified?: boolean;
  logo?: string;
  coverImage?: string;
  businessType?: { name: string; slug: string } | null;
  address?: { street?: string; city?: string; state?: string; pincode?: string };
  rating?: number;
  reviewCount?: number;
};

type PublicShopList = {
  shops: PublicShop[];
  pagination: { total: number; page: number; pages: number; limit: number };
};

function mapShopToCard(shop: PublicShop) {
  const typeSlug = shop.businessType?.slug || "other";
  const street = shop.address?.street ? String(shop.address.street) : "";
  const city = shop.address?.city ? String(shop.address.city) : "";
  const state = shop.address?.state ? String(shop.address.state) : "";
  const addressLine = [street, state].filter(Boolean).join(", ");

  return {
    id: String(shop._id),
    name: shop.name,
    businessType: typeSlug,
    category: typeSlug,
    city: city || null,
    address: addressLine || null,
    logo: shop.logo || null,
    coverImage: shop.coverImage || null,
    rating: typeof shop.rating === "number" ? shop.rating : null,
    reviewCount: typeof shop.reviewCount === "number" ? shop.reviewCount : 0,
    isVerified: !!shop.isVerified,
  };
}

async function fetchBusinesses(category?: string, search?: string) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (search && search.trim()) params.set("search", search.trim());
  params.set("limit", "16");

  try {
    const data = await apiRequest<PublicShopList>(`/business/public/shops?${params.toString()}`);
    return { data: data.shops.map(mapShopToCard) };
  } catch {
    return { data: [] };
  }
}

function QuickAction({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <View style={[styles.quickIcon, { backgroundColor: `${color}18` }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ title, subtitle, onPress, actionLabel }: { title: string; subtitle?: string; onPress?: () => void; actionLabel?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {onPress && actionLabel ? (
        <Pressable onPress={onPress}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CityCard({ city }: { city: { name: string; slug: string; shops: number; accent: string; landmark: string; imageUrl?: string | null } }) {
  const xml = getCityArtwork(city.name);
  return (
    <Pressable onPress={() => router.push({ pathname: "/cities" as any, params: { city: city.slug } } as any)} style={styles.cityCard}>
      {city.imageUrl ? (
        <Image source={{ uri: city.imageUrl }} style={StyleSheet.absoluteFillObject as any} contentFit="cover" />
      ) : (
        <SvgXml xml={xml} width="100%" height="100%" style={StyleSheet.absoluteFillObject as any} />
      )}
      <View style={styles.cityOverlay} />
      <View style={styles.cityMeta}>
        <Text style={styles.cityName}>{city.name}</Text>
        <Text style={styles.cityText}>{city.shops} shops</Text>
      </View>
      <View style={[styles.cityPill, { backgroundColor: `${city.accent}22` }]}>
        <Text style={[styles.cityPillText, { color: city.accent }]}>{city.landmark}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["businesses", "home"],
    queryFn: () => fetchBusinesses("all"),
    staleTime: 30000,
  });

  const { data: metaShops = [] } = useQuery({
    queryKey: ["public-shops-meta"],
    queryFn: async () => {
      const out = await apiRequest<PublicShopList>("/business/public/shops?limit=100");
      return out?.shops || [];
    },
    staleTime: 60_000,
  });

  const dynamicCities = groupCitiesFromShops(metaShops, FEATURED_CITIES);
  const dynamicCategories = groupCategoriesFromShops(metaShops, FEATURED_CATEGORIES);

  const { data: cityImages = [] } = useQuery({
    queryKey: ["city-images", dynamicCities.map((c) => c.name).join("|")],
    queryFn: () => fetchCityImages(dynamicCities.map((c) => c.name)),
    enabled: dynamicCities.length > 0,
    staleTime: 300_000,
  });

  const cityImageMap = new Map(
    cityImages.map((row: any) => [String(row?.cityName || ""), String(row?.imageUrl || "")])
  );
  const citiesWithImages = dynamicCities.map((c) => ({
    ...c,
    imageUrl: cityImageMap.get(c.name) || null,
  }));

  const featured = data?.data || [];

  const renderItem = useCallback(({ item }: any) => (
    <BusinessCard
      business={item}
      onPress={() => router.push({ pathname: "/(customer)/business/[id]", params: { id: item.id } })}
    />
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={[styles.hero, { paddingTop: topPad + 10 }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.kicker}>PublicDukan</Text>
              <Text style={styles.heroTitle}>Discover local shops, bookings and offers</Text>
              <Text style={styles.heroSubtitle}>Namaste, {user?.name?.split(" ")[0] || "Guest"}. Explore everything publicWebsite has, inside the app.</Text>
            </View>
            <Pressable onPress={() => router.push("/(customer)/profile")} style={styles.avatarBtn}>
              <Feather name="user" size={20} color={Colors.primary} />
            </Pressable>
          </View>

          <View style={styles.searchBarWrap}>
            <Pressable onPress={() => router.push("/(customer)/search")} style={styles.searchBar}>
              <Feather name="search" size={18} color={Colors.light.textSecondary} />
              <Text style={styles.searchText}>Search shops, categories or cities</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.quickGrid}>
            <QuickAction icon="map-pin" label="Cities" color={Colors.primary} onPress={() => router.push("/cities" as any)} />
            <QuickAction icon="play-circle" label="Stories" color="#7C3AED" onPress={() => router.push("/stories" as any)} />
            <QuickAction icon="gift" label="Referrals" color="#059669" onPress={() => router.push("/referrals" as any)} />
            <QuickAction icon="dollar-sign" label="Pricing" color="#0284C7" onPress={() => router.push("/pricing" as any)} />
          </View>

          <SectionTitle title="Browse by City" subtitle="Landmark images, verified shops and nearby services." actionLabel="View all" onPress={() => router.push("/cities" as any)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
            {citiesWithImages.map((city) => (
              <CityCard key={city.slug} city={city} />
            ))}
          </ScrollView>

          <SectionTitle title="Browse by Category" subtitle="The same categories you see on publicWebsite." />
          <View style={styles.categoryGrid}>
            {dynamicCategories.map((category) => (
              <Pressable key={category.slug} onPress={() => router.push({ pathname: "/(customer)/search", params: { q: category.slug } })} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: `${category.accent}18` }]}>
                  <Feather name={category.icon as any} size={18} color={category.accent} />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryHint}>{category.hint}</Text>
              </Pressable>
            ))}
          </View>

          <SectionTitle title="Public Features" subtitle="Everything the web app exposes, now surfaced in mobile." />
          <View style={styles.featureList}>
            {PUBLIC_FEATURES.map((feature) => (
              <View key={feature.title} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Feather name={feature.icon as any} size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                </View>
              </View>
            ))}
          </View>

          <SectionTitle title="Featured businesses" subtitle="Live data from the backend, if available." onPress={() => router.push("/(customer)/search")} actionLabel="Search" />
          {isLoading ? (
            <View style={{ gap: 12 }}>
              {[1, 2, 3].map((i) => <BusinessCardSkeleton key={i} />)}
            </View>
          ) : featured.length === 0 ? (
            <Animated.View entering={FadeIn} style={styles.emptyState}>
              <Feather name="briefcase" size={32} color={Colors.light.textTertiary} />
              <Text style={styles.emptyTitle}>No live businesses found</Text>
              <Text style={styles.emptySubtitle}>The app still includes cities, stories, pricing and referral screens.</Text>
            </Animated.View>
          ) : (
            <FlatList
              data={featured}
              renderItem={renderItem}
              keyExtractor={(item: any) => item.id}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 12 }}
            />
          )}
        </View>
      </ScrollView>

      {!isLoading && isFetching ? (
        <Animated.View entering={FadeInDown} style={styles.floatingRefresh}>
          <Feather name="refresh-cw" size={14} color="#fff" />
          <Text style={styles.floatingRefreshText}>Refreshing live shops…</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  kicker: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 27,
    lineHeight: 34,
    color: "#fff",
    maxWidth: 260,
  },
  heroSubtitle: {
    marginTop: 10,
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.82)",
    maxWidth: 320,
  },
  avatarBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarWrap: { marginTop: 6 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 50,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  searchText: { fontFamily: "Manrope_500Medium", fontSize: 14, color: Colors.light.textSecondary },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 18 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAction: {
    width: "48.2%",
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    padding: 14,
    gap: 10,
  },
  quickIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: Colors.light.text },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  sectionTitle: { fontFamily: "Sora_700Bold", fontSize: 18, color: Colors.light.text },
  sectionSubtitle: { marginTop: 4, fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  sectionAction: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: Colors.primary },
  cityRow: { gap: 12, paddingRight: 12 },
  cityCard: {
    width: 230,
    height: 180,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    justifyContent: "flex-end",
  },
  cityOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.18)" },
  cityMeta: { position: "absolute", left: 14, bottom: 18, right: 14 },
  cityName: { fontFamily: "Sora_700Bold", fontSize: 18, color: "#fff" },
  cityText: { fontFamily: "Manrope_400Regular", fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 2 },
  cityPill: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  cityPillText: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryCard: {
    width: "48.2%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  categoryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  categoryName: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: Colors.light.text },
  categoryHint: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textSecondary, lineHeight: 17 },
  featureList: { gap: 10 },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    borderRadius: 18,
    padding: 14,
  },
  featureIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: `${Colors.primary}18`, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontFamily: "Manrope_700Bold", fontSize: 14, color: Colors.light.text },
  featureSubtitle: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textSecondary, marginTop: 2, lineHeight: 17 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 24, paddingHorizontal: 20, gap: 8 },
  emptyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 16, color: Colors.light.text },
  emptySubtitle: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "center" },
  floatingRefresh: {
    position: "absolute",
    right: 16,
    bottom: 16,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  floatingRefreshText: { color: "#fff", fontFamily: "Manrope_600SemiBold", fontSize: 12 },
});
