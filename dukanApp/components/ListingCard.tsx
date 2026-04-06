import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

type Listing = {
  id: string;
  title: string;
  description?: string | null;
  listingType: string;
  price?: number | null;
  priceUnit?: string | null;
  images: string[];
  isAvailable: boolean;
  duration?: string | null;
  tags: string[];
};

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  product: { icon: "package", color: "#059669", label: "Product" },
  service: { icon: "tool", color: "#7C3AED", label: "Service" },
  course: { icon: "book-open", color: "#0284C7", label: "Course" },
  rental: { icon: "home", color: "#D97706", label: "Rental" },
  food: { icon: "coffee", color: "#DC2626", label: "Food" },
};

export function ListingCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const typeConfig = TYPE_CONFIG[listing.listingType] || { icon: "box", color: "#6B7280", label: listing.listingType };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={styles.card}
      >
        <View style={styles.imageWrap}>
          {listing.images.length > 0 ? (
            <Image source={{ uri: listing.images[0] }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: typeConfig.color + "18" }]}>
              <Feather name={typeConfig.icon as any} size={28} color={typeConfig.color} />
            </View>
          )}
        </View>
        <View style={styles.details}>
          <View style={styles.header}>
            <View style={[styles.typePill, { backgroundColor: typeConfig.color + "18" }]}>
              <Text style={[styles.typeText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
            </View>
            {!listing.isAvailable && (
              <View style={styles.unavailBadge}>
                <Text style={styles.unavailText}>Unavailable</Text>
              </View>
            )}
          </View>
          <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
          {listing.description && <Text style={styles.desc} numberOfLines={1}>{listing.description}</Text>}
          <View style={styles.footer}>
            {listing.price ? (
              <Text style={styles.price}>
                ₹{listing.price.toLocaleString("en-IN")}
                {listing.priceUnit ? <Text style={styles.priceUnit}>/{listing.priceUnit}</Text> : null}
              </Text>
            ) : <Text style={styles.freeText}>Free</Text>}
            {listing.duration && (
              <View style={styles.durationRow}>
                <Feather name="clock" size={12} color={Colors.light.textSecondary} />
                <Text style={styles.duration}>{listing.duration}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  imageWrap: { width: 100, height: 100 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  details: { flex: 1, padding: 12, gap: 4 },
  header: { flexDirection: "row", gap: 6, alignItems: "center" },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  typeText: { fontFamily: "Manrope_600SemiBold", fontSize: 11 },
  unavailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  unavailText: { fontFamily: "Manrope_600SemiBold", fontSize: 11, color: "#DC2626" },
  title: { fontFamily: "Sora_600SemiBold", fontSize: 14, color: Colors.light.text, marginTop: 4 },
  desc: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textSecondary },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  price: { fontFamily: "Sora_700Bold", fontSize: 15, color: Colors.primary },
  priceUnit: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textSecondary },
  freeText: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: Colors.accent },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  duration: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textSecondary },
});
