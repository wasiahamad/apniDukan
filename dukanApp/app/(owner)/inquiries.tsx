import React, { useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getApiBase } from "@/utils/apiBase";

const API_BASE = getApiBase();

const STATUS_CONFIG = {
  new: { color: "#D97706", bg: "#FEF3C7", label: "New" },
  read: { color: "#0284C7", bg: "#E0F2FE", label: "Read" },
  replied: { color: "#059669", bg: "#D1FAE5", label: "Replied" },
  closed: { color: "#6B7280", bg: "#F3F4F6", label: "Closed" },
};

export default function InquiriesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: inquiries = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["owner-inquiries"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/inquiries`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!accessToken,
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`${API_BASE}/inquiries/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-inquiries"] }),
  });

  function renderInquiry({ item }: any) {
    const config = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new;
    return (
      <Pressable
        onPress={() => {
          Alert.alert(
            item.name,
            `Phone: ${item.phone}\n\n${item.message}`,
            [
              { text: "Mark Read", onPress: () => updateStatus({ id: item.id, status: "read" }) },
              { text: "Mark Replied", onPress: () => updateStatus({ id: item.id, status: "replied" }) },
              { text: "Close", onPress: () => updateStatus({ id: item.id, status: "closed" }) },
              { text: "Cancel", style: "cancel" },
            ]
          );
        }}
        style={styles.inquiryCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.senderInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.senderName}>{item.name}</Text>
              <Text style={styles.senderPhone}>{item.phone}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString("en-IN")}</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.title}>Inquiries</Text>
        {inquiries.filter((i: any) => i.status === "new").length > 0 && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{inquiries.filter((i: any) => i.status === "new").length} New</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : inquiries.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <Feather name="message-circle" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>No inquiries yet</Text>
          <Text style={styles.emptySubtitle}>Customers will reach out through your listings</Text>
        </Animated.View>
      ) : (
        <FlatList
          data={inquiries}
          renderItem={renderInquiry}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 26, color: Colors.light.text },
  newBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.primary + "18", borderRadius: 20 },
  newBadgeText: { fontFamily: "Manrope_700Bold", fontSize: 13, color: Colors.primary },
  list: { padding: 16 },
  inquiryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  senderInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Sora_700Bold", fontSize: 16, color: Colors.primary },
  senderName: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: Colors.light.text },
  senderPhone: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: "Manrope_600SemiBold", fontSize: 12 },
  message: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  time: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textTertiary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  emptySubtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", paddingHorizontal: 24 },
});
