import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { ListingCard } from "@/components/ListingCard";
import { getApiBase } from "@/utils/apiBase";

const API_BASE = getApiBase();

export default function OwnerBusinessDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: business, isLoading } = useQuery({
    queryKey: ["business", id],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/businesses/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/businesses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ isActive: !business?.isActive }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business", id] });
      queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
    },
  });

  const { mutate: deleteBusiness } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/businesses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
      router.back();
    },
  });

  function handleDelete() {
    Alert.alert(
      "Delete Business",
      "This will permanently delete your business and all associated data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteBusiness() },
      ]
    );
  }

  if (isLoading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>;
  }

  if (!business) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text }}>Business not found</Text>
    </View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 30 }}
    >
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{business.name}</Text>
        <View style={[styles.activeBadge, { backgroundColor: business.isActive ? "#D1FAE5" : "#FEE2E2" }]}>
          <View style={[styles.activeDot, { backgroundColor: business.isActive ? "#059669" : "#DC2626" }]} />
          <Text style={[styles.activeText, { color: business.isActive ? "#059669" : "#DC2626" }]}>
            {business.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(100)} style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Feather name="briefcase" size={16} color={Colors.light.textSecondary} />
          <Text style={styles.infoLabel}>Type:</Text>
          <Text style={styles.infoValue}>{business.businessType} · {business.category}</Text>
        </View>
        {business.city && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{business.address ? `${business.address}, ` : ""}{business.city}</Text>
          </View>
        )}
        {business.phone && (
          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color={Colors.light.textSecondary} />
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{business.phone}</Text>
          </View>
        )}
        {business.description && (
          <Text style={styles.description}>{business.description}</Text>
        )}
      </Animated.View>

      {/* Management Actions */}
      <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.actionGrid}>
          <Pressable
            onPress={() => router.push({ pathname: "/(owner)/add-listing", params: { businessId: business.id } })}
            style={[styles.actionCard, { borderColor: Colors.primary + "40" }]}
          >
            <Feather name="plus-circle" size={24} color={Colors.primary} />
            <Text style={[styles.actionLabel, { color: Colors.primary }]}>Add Listing</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: "/(owner)/bookings" })}
            style={[styles.actionCard, { borderColor: "#7C3AED40" }]}
          >
            <Feather name="calendar" size={24} color="#7C3AED" />
            <Text style={[styles.actionLabel, { color: "#7C3AED" }]}>View Bookings</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleActive()}
            style={[styles.actionCard, { borderColor: business.isActive ? "#DC262640" : "#05966940" }]}
          >
            <Feather name={business.isActive ? "eye-off" : "eye"} size={24} color={business.isActive ? "#DC2626" : "#059669"} />
            <Text style={[styles.actionLabel, { color: business.isActive ? "#DC2626" : "#059669" }]}>
              {business.isActive ? "Deactivate" : "Activate"}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleDelete}
            style={[styles.actionCard, { borderColor: "#DC262640" }]}
          >
            <Feather name="trash-2" size={24} color="#DC2626" />
            <Text style={[styles.actionLabel, { color: "#DC2626" }]}>Delete</Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* Listings */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Listings</Text>
          <Pressable onPress={() => router.push({ pathname: "/(owner)/add-listing", params: { businessId: business.id } })}>
            <Text style={styles.addText}>+ Add</Text>
          </Pressable>
        </View>
        {business.listings?.length > 0 ? (
          business.listings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} onPress={() => {}} />
          ))
        ) : (
          <View style={styles.emptyListings}>
            <Feather name="package" size={32} color={Colors.light.textTertiary} />
            <Text style={styles.emptyText}>No listings yet</Text>
            <Text style={styles.emptySubtext}>Add products, services, or courses</Text>
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -4 },
  headerTitle: { flex: 1, fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  activeText: { fontFamily: "Manrope_600SemiBold", fontSize: 12 },
  infoCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: Colors.light.textSecondary, width: 70 },
  infoValue: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.text, flex: 1 },
  description: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20, marginTop: 4 },
  section: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  sectionTitle: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addText: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: Colors.primary },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    aspectRatio: 1.5,
    backgroundColor: "#fff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
  },
  actionLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 13 },
  emptyListings: { alignItems: "center", gap: 8, padding: 24, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 14 },
  emptyText: { fontFamily: "Sora_600SemiBold", fontSize: 16, color: Colors.light.text },
  emptySubtext: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary },
});
