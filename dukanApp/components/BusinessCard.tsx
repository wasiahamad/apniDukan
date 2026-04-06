import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

type Business = {
  id: string;
  name: string;
  businessType: string;
  category: string;
  city?: string | null;
  address?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  rating?: number | null;
  reviewCount: number;
  isVerified: boolean;
};

const BUSINESS_TYPE_COLORS: Record<string, string> = {
  kirana: "#059669",
  restaurant: "#D97706",
  coaching: "#7C3AED",
  rental: "#0284C7",
  salon: "#DB2777",
  pharmacy: "#DC2626",
  other: "#6B7280",
};

const BUSINESS_TYPE_ICONS: Record<string, string> = {
  kirana: "shopping-bag",
  restaurant: "coffee",
  coaching: "book-open",
  rental: "home",
  salon: "scissors",
  pharmacy: "plus-circle",
  other: "briefcase",
};

export function BusinessCard({ business, onPress }: { business: Business; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const typeColor = BUSINESS_TYPE_COLORS[business.businessType] || "#6B7280";
  const typeIcon = BUSINESS_TYPE_ICONS[business.businessType] || "briefcase";

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={styles.card}
      >
        {/* Cover / Logo */}
        <View style={styles.imageContainer}>
          {business.coverImage ? (
            <Image source={{ uri: business.coverImage }} style={styles.coverImage} contentFit="cover" />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: typeColor + "20" }]}>
              <Feather name={typeIcon as any} size={36} color={typeColor} />
            </View>
          )}
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <Text style={styles.typeBadgeText}>{business.businessType.charAt(0).toUpperCase() + business.businessType.slice(1)}</Text>
          </View>
          {business.isVerified && (
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" size={14} color="#fff" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{business.name}</Text>
            {business.rating && (
              <View style={styles.ratingRow}>
                <Feather name="star" size={12} color="#F59E0B" />
                <Text style={styles.rating}>{business.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          {(business.city || business.address) && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={12} color={Colors.light.textSecondary} />
              <Text style={styles.location} numberOfLines={1}>{business.city || business.address}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function BusinessCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={[styles.imageContainer, { backgroundColor: "#E5E7EB" }]} />
      <View style={styles.info}>
        <View style={{ height: 16, backgroundColor: "#E5E7EB", borderRadius: 8, width: "70%" }} />
        <View style={{ height: 12, backgroundColor: "#E5E7EB", borderRadius: 6, width: "50%", marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  skeleton: {},
  imageContainer: { height: 160, position: "relative", overflow: "hidden" },
  coverImage: { width: "100%", height: "100%" },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
  verifiedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 14 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
    marginRight: 8,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  rating: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: Colors.light.text },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  location: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary, flex: 1 },
});
