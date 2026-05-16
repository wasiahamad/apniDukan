import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  Platform, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { BusinessCard } from "@/components/BusinessCard";
import { apiRequest } from "@/utils/apiClient";

type PublicShop = {
  _id: string;
  name: string;
  slug: string;
  isVerified?: boolean;
  logo?: string;
  coverImage?: string;
  businessType?: { name: string; slug: string } | null;
  address?: { street?: string; city?: string; state?: string };
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

async function searchBusinesses(query: string, city?: string) {
  const trimmedQuery = query.trim();
  const trimmedCity = city ? city.trim() : "";
  if (!trimmedQuery && !trimmedCity) return { data: [] };

  const params = new URLSearchParams();
  if (trimmedQuery) params.set("search", trimmedQuery);
  if (trimmedCity) params.set("city", trimmedCity);
  params.set("limit", "30");

  const data = await apiRequest<PublicShopList>(`/business/public/shops?${params.toString()}`);
  return { data: data.shops.map(mapShopToCard) };
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const params = useLocalSearchParams<{ city?: string }>();
  const cityParam = typeof params.city === "string" ? params.city : "";
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["search", submitted, cityParam],
    queryFn: () => searchBusinesses(submitted, cityParam),
    enabled: submitted.length > 0 || !!cityParam,
  });

  const results = data?.data || [];

  const renderItem = useCallback(({ item }: any) => (
    <BusinessCard
      business={item}
      onPress={() => router.push({ pathname: "/(customer)/business/[id]", params: { id: item.id } })}
    />
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.title}>{cityParam ? `Search in ${cityParam}` : "Search"}</Text>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Shop name, category..."
            placeholderTextColor={Colors.light.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setSubmitted(query)}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); setSubmitted(""); }}>
              <Feather name="x" size={16} color={Colors.light.textSecondary} />
            </Pressable>
          )}
        </View>
        {cityParam ? (
          <View style={styles.cityChip}>
            <Feather name="map-pin" size={12} color={Colors.primary} />
            <Text style={styles.cityChipText}>{cityParam}</Text>
          </View>
        ) : null}
      </View>

      {!submitted && !cityParam ? (
        <Animated.View entering={FadeIn} style={styles.emptyState}>
          <Feather name="search" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>Find local businesses</Text>
          <Text style={styles.emptySubtitle}>Search by name or category</Text>
        </Animated.View>
      ) : isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : results.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.emptyState}>
          <Feather name="inbox" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>
            {cityParam ? `No results in ${cityParam}` : `No results for "${submitted}"`}
          </Text>
          <Text style={styles.emptySubtitle}>
            {cityParam ? "Try a different search term" : "Try a different search term"}
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 14,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 26, color: Colors.light.text },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: { flex: 1, fontFamily: "Manrope_500Medium", fontSize: 15, color: Colors.light.text },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: `${Colors.primary}14`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cityChipText: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: Colors.primary },
  list: { paddingHorizontal: 16, paddingTop: 16 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  emptySubtitle: { fontFamily: "Manrope_400Regular", fontSize: 15, color: Colors.light.textSecondary },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
