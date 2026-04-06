import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { BusinessCard, BusinessCardSkeleton } from "@/components/BusinessCard";
import { apiRequest } from "@/utils/apiClient";

const CATEGORIES = [
  { id: "all", label: "All", icon: "grid" },
  { id: "kirana", label: "Kirana", icon: "shopping-bag" },
  { id: "restaurant", label: "Food", icon: "coffee" },
  { id: "coaching", label: "Coaching", icon: "book-open" },
  { id: "rental", label: "Rental", icon: "home" },
  { id: "salon", label: "Salon", icon: "scissors" },
  { id: "pharmacy", label: "Pharmacy", icon: "plus-circle" },
];

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

async function fetchBusinesses(category?: string, search?: string, coords?: { lat: number; lng: number } | null) {
  const params = new URLSearchParams();
  if (category && category !== "all") params.set("category", category);
  if (search && search.trim()) params.set("search", search.trim());
  params.set("limit", "30");

  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
    params.set("lat", String(coords.lat));
    params.set("lng", String(coords.lng));
  }

  const data = await apiRequest<PublicShopList>(`/business/public/shops?${params.toString()}`);
  return { data: data.shops.map(mapShopToCard) };
}

function CategoryPill({ item, selected, onPress }: { item: typeof CATEGORIES[0]; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, selected && styles.pillActive]}
    >
      <Feather name={item.icon as any} size={14} color={selected ? "#fff" : Colors.light.textSecondary} />
      <Text style={[styles.pillText, selected && styles.pillTextActive]}>{item.label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (cancelled) return;
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        // Reduce refetch churn (GPS jitter) by rounding.
        setCoords({ lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) });
      } catch {
        // Ignore location errors; fall back to default listing.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["businesses", selectedCat, search, coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => fetchBusinesses(selectedCat, search, coords),
    staleTime: 30000,
  });

  const filtered = data?.data || [];

  const renderItem = useCallback(({ item }: any) => (
    <BusinessCard
      business={item}
      onPress={() => router.push({ pathname: "/(customer)/business/[id]", params: { id: item.id } })}
    />
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={[styles.header, { paddingTop: topPad + 8 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Namaste, {user?.name?.split(" ")[0] || "Guest"}</Text>
            <Text style={styles.headerSubtitle}>Discover local businesses</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(customer)/profile")}
            style={styles.avatarBtn}
          >
            <Feather name="user" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search shops, services..."
            placeholderTextColor={Colors.light.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={Colors.light.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
        >
          {CATEGORIES.map(cat => (
            <CategoryPill
              key={cat.id}
              item={cat}
              selected={selectedCat === cat.id}
              onPress={() => setSelectedCat(cat.id)}
            />
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Content */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {[1, 2, 3].map(i => <BusinessCardSkeleton key={i} />)}
        </ScrollView>
      ) : isError ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <Feather name="wifi-off" size={40} color={Colors.light.textTertiary} />
          <Text style={styles.errorText}>Failed to load businesses</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </Animated.View>
      ) : filtered.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <Feather name="inbox" size={40} color={Colors.light.textTertiary} />
          <Text style={styles.emptyText}>No businesses found</Text>
          <Text style={styles.emptySubText}>Try a different category or search</Text>
        </Animated.View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: { fontFamily: "Sora_700Bold", fontSize: 22, color: "#fff" },
  headerSubtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: Colors.light.text,
    height: "100%",
  },
  pills: { gap: 8, paddingRight: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  pillActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  pillText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.85)" },
  pillTextActive: { color: Colors.primary },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontFamily: "Manrope_600SemiBold", fontSize: 16, color: Colors.light.textSecondary },
  emptyText: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  emptySubText: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: "#fff" },
});
