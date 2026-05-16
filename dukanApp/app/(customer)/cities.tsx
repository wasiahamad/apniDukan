import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Image } from "expo-image";

import Colors from "@/constants/colors";
import { FEATURED_CITIES, FEATURED_CATEGORIES, getCityArtwork } from "@/utils/publicCatalog";
import { apiRequest } from "@/utils/apiClient";
import { fetchCityImages, groupCategoriesFromShops, groupCitiesFromShops } from "@/utils/publicDynamic";

type PublicShop = {
  _id: string;
  address?: { city?: string | null } | null;
  businessType?: { name?: string | null; slug?: string | null } | null;
  coverImage?: string | null;
};

export default function CitiesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: metaShops = [] } = useQuery({
    queryKey: ["public-shops-meta", "cities"],
    queryFn: async () => {
      const out = await apiRequest<{ shops: PublicShop[] }>("/business/public/shops?limit=100");
      return out?.shops || [];
    },
    staleTime: 60_000,
  });

  const dynamicCities = groupCitiesFromShops(metaShops, FEATURED_CITIES);
  const dynamicCategories = groupCategoriesFromShops(metaShops, FEATURED_CATEGORIES);

  const { data: cityImages = [] } = useQuery({
    queryKey: ["city-images", "cities", dynamicCities.map((c) => c.name).join("|")],
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.light.background }} contentContainerStyle={{ paddingBottom: bottomPad + 110 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Browse by City</Text>
        <Text style={styles.subtitle}>Landmark-style artwork, live shop counts and city-wise discovery.</Text>
      </View>

      <View style={styles.body}>
        {citiesWithImages.map((city, index) => (
          <Animated.View key={city.slug} entering={FadeInDown.delay(index * 60)}>
            <Pressable onPress={() => router.push({ pathname: "/(customer)/search", params: { city: city.name } })} style={styles.cityCard}>
              {city.imageUrl ? (
                <Image source={{ uri: city.imageUrl }} style={StyleSheet.absoluteFillObject as any} contentFit="cover" />
              ) : (
                <SvgXml xml={getCityArtwork(city.name)} width="100%" height="100%" style={StyleSheet.absoluteFillObject as any} />
              )}
              <View style={styles.overlay} />
              <View style={styles.topRow}>
                <View style={[styles.badge, { backgroundColor: `${city.accent}22` }]}>
                  <Text style={[styles.badgeText, { color: city.accent }]}>{city.landmark}</Text>
                </View>
                <View style={styles.countPill}>
                  <Feather name="shopping-bag" size={12} color="#fff" />
                  <Text style={styles.countText}>{city.shops} shops</Text>
                </View>
              </View>
              <View style={styles.cityMeta}>
                <Text style={styles.cityName}>{city.name}</Text>
                <Text style={styles.citySub}>Tap to search businesses in {city.name}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}

        <Text style={styles.sectionTitle}>Popular categories</Text>
        <View style={styles.categoryGrid}>
          {dynamicCategories.map((category) => (
            <Pressable key={category.slug} onPress={() => router.push("/(customer)/search")} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: `${category.accent}18` }]}>
                <Feather name={category.icon as any} size={18} color={category.accent} />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryHint}>{category.hint}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 28, color: Colors.light.text },
  subtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  body: { paddingHorizontal: 16, gap: 14 },
  cityCard: {
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    justifyContent: "flex-end",
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.18)" },
  topRow: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flex: 1, marginRight: 8 },
  badgeText: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
  countPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(15, 23, 42, 0.68)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  countText: { fontFamily: "Manrope_600SemiBold", fontSize: 11, color: "#fff" },
  cityMeta: { position: "absolute", left: 16, bottom: 16, right: 16 },
  cityName: { fontFamily: "Sora_700Bold", fontSize: 20, color: "#fff" },
  citySub: { fontFamily: "Manrope_400Regular", fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 4 },
  sectionTitle: { fontFamily: "Sora_700Bold", fontSize: 18, color: Colors.light.text, marginTop: 10 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
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
});
