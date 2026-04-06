import React from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/utils/apiClient";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  booked: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  pending: { color: "#D97706", bg: "#FEF3C7", icon: "clock" },
  confirmed: { color: "#059669", bg: "#D1FAE5", icon: "check-circle" },
  cancelled: { color: "#DC2626", bg: "#FEE2E2", icon: "x-circle" },
  completed: { color: "#6B7280", bg: "#F3F4F6", icon: "check" },
};

export default function BookingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { accessToken } = useAuth();

  const { data: bookings = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      if (!accessToken) return [];

      const out = await apiRequest<{ bookings: any[] }>("/bookings/my?limit=50", {
        accessToken,
      });

      const rows = Array.isArray(out?.bookings) ? out.bookings : [];
      return rows.map((b: any) => {
        const start = b?.startTime ? String(b.startTime) : "";
        const end = b?.endTime ? String(b.endTime) : "";
        const date = b?.date ? new Date(b.date) : null;
        const dateStr = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : String(b?.date || "");
        return {
          id: String(b?._id || b?.id || ""),
          date: dateStr,
          status: String(b?.status || "booked"),
          timeSlot: start && end ? `${start} - ${end}` : start,
          customerName: String(b?.customerName || ""),
          customerPhone: String(b?.customerPhone || ""),
          notes: b?.customerNotes ? String(b.customerNotes) : "",
        };
      });
    },
    enabled: !!accessToken,
  });

  function renderBooking({ item }: any) {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingDate}>{item.date}</Text>
          <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
            <Feather name={config.icon as any} size={12} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        {item.timeSlot && (
          <View style={styles.infoRow}>
            <Feather name="clock" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.infoText}>{item.timeSlot}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Feather name="user" size={14} color={Colors.light.textSecondary} />
          <Text style={styles.infoText}>{item.customerName} · {item.customerPhone}</Text>
        </View>
        {item.notes && (
          <Text style={styles.notes}>{item.notes}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : !accessToken ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <Feather name="lock" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>Sign in to view bookings</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBtn}>
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        </Animated.View>
      ) : bookings.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <Feather name="calendar" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtitle}>Book an appointment with any business</Text>
          <Pressable onPress={() => router.push("/(customer)")} style={styles.signInBtn}>
            <Text style={styles.signInText}>Discover Businesses</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBooking}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={Colors.primary} />
          }
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
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 26, color: Colors.light.text },
  list: { padding: 16, gap: 12 },
  bookingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    marginBottom: 12,
  },
  bookingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bookingDate: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: Colors.light.text },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: "Manrope_600SemiBold", fontSize: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  notes: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textTertiary, fontStyle: "italic" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  emptySubtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  signInBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10, marginTop: 4 },
  signInText: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: "#fff" },
});
