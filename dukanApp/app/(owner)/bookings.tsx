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

const STATUS_FILTERS = ["all", "pending", "confirmed", "completed", "cancelled"];

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  pending: { color: "#D97706", bg: "#FEF3C7" },
  confirmed: { color: "#059669", bg: "#D1FAE5" },
  cancelled: { color: "#DC2626", bg: "#FEE2E2" },
  completed: { color: "#6B7280", bg: "#F3F4F6" },
};

export default function OwnerBookingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: bookings = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["owner-bookings"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/bookings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!accessToken,
  });

  const { mutate: updateBooking } = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner-bookings"] }),
  });

  const filtered = filter === "all" ? bookings : bookings.filter((b: any) => b.status === filter);

  function renderBooking({ item }: any) {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    return (
      <Pressable
        onPress={() => {
          if (item.status === "pending") {
            Alert.alert(
              `Booking - ${item.customerName}`,
              `Date: ${item.date}\n${item.timeSlot ? `Time: ${item.timeSlot}\n` : ""}Phone: ${item.customerPhone}${item.notes ? `\nNotes: ${item.notes}` : ""}`,
              [
                { text: "Confirm", onPress: () => updateBooking({ id: item.id, status: "confirmed" }) },
                { text: "Cancel", onPress: () => updateBooking({ id: item.id, status: "cancelled" }) },
                { text: "Close", style: "cancel" },
              ]
            );
          } else if (item.status === "confirmed") {
            Alert.alert(
              `Mark Completed?`,
              `${item.customerName} - ${item.date}`,
              [
                { text: "Mark Completed", onPress: () => updateBooking({ id: item.id, status: "completed" }) },
                { text: "Cancel", style: "cancel" },
              ]
            );
          }
        }}
        style={styles.bookingCard}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.customerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.customerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.customerPhone}>{item.customerPhone}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusText, { color: config.color }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.bookingMeta}>
          <Feather name="calendar" size={13} color={Colors.light.textSecondary} />
          <Text style={styles.bookingDate}>{item.date}</Text>
          {item.timeSlot && <>
            <Feather name="clock" size={13} color={Colors.light.textSecondary} />
            <Text style={styles.bookingDate}>{item.timeSlot}</Text>
          </>}
        </View>
        {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.count}>{bookings.length} total</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <Feather name="calendar" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>No {filter === "all" ? "" : filter} bookings</Text>
        </Animated.View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderBooking}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
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
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 26, color: Colors.light.text },
  count: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.backgroundSecondary },
  filterTabActive: { backgroundColor: Colors.primary },
  filterTabText: { fontFamily: "Manrope_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  filterTabTextActive: { color: "#fff", fontFamily: "Manrope_600SemiBold" },
  list: { padding: 16 },
  bookingCard: {
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
  bookingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  customerInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Sora_700Bold", fontSize: 15, color: Colors.accent },
  customerName: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: Colors.light.text },
  customerPhone: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: "Manrope_600SemiBold", fontSize: 12 },
  bookingMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  bookingDate: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  notes: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textTertiary, fontStyle: "italic" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
});
