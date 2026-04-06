import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, tryParsePhone10 } from "@/utils/apiClient";

type Slot = {
  _id: string;
  startTime: string;
  endTime: string;
  duration?: number;
  status?: "available" | "booked" | string;
  isBooked?: boolean;
};

export default function BookingScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { businessId, businessSlug, businessName } = useLocalSearchParams<{ businessId: string; businessSlug: string; businessName: string }>();
  const { user, accessToken } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: slots = [], isFetching: slotsLoading } = useQuery({
    queryKey: ["slots", businessSlug, date],
    queryFn: async () => {
      if (!businessSlug || !date.trim()) return [];
      const rows = await apiRequest<Slot[]>(`/bookings/slots/slug/${businessSlug}?date=${encodeURIComponent(date.trim())}`);
      return Array.isArray(rows) ? rows : [];
    },
    enabled: !!businessSlug && !!date.trim(),
    staleTime: 10_000,
  });

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  async function handleBook() {
    const phone10 = tryParsePhone10(phone);
    if (!name.trim() || !phone10 || !date.trim()) {
      Alert.alert("Error", "Please fill in name, valid phone, and date");
      return;
    }

    if (!businessSlug) {
      Alert.alert("Error", "Business is missing booking info");
      return;
    }

    if (!startTime) {
      Alert.alert("Error", "Please select a time slot");
      return;
    }

    setLoading(true);
    try {
      await apiRequest(`/bookings/book/slug/${businessSlug}`, {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          date: date.trim(),
          startTime,
          customerName: name.trim(),
          customerPhone: phone10,
          customerEmail: user?.email,
          customerNotes: notes.trim() || undefined,
        }),
      });
      Alert.alert("Booked!", "Your booking has been confirmed. The business will contact you.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to create booking. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: bottomPad + 20 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={Colors.light.text} />
      </Pressable>

      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <Text style={styles.title}>Book Appointment</Text>
        <Text style={styles.subtitle}>{businessName}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Your Name</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={16} color={Colors.light.textSecondary} />
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" placeholderTextColor={Colors.light.textTertiary} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputWrap}>
            <Feather name="phone" size={16} color={Colors.light.textSecondary} />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={Colors.light.textTertiary} keyboardType="phone-pad" />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.inputWrap}>
            <Feather name="calendar" size={16} color={Colors.light.textSecondary} />
            <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="e.g. 2024-12-25" placeholderTextColor={Colors.light.textTertiary} />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Time Slot</Text>
          {slotsLoading ? (
            <View style={{ paddingVertical: 6 }}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : slots.length === 0 && date.trim() ? (
            <Text style={{ fontFamily: "Manrope_400Regular", color: Colors.light.textSecondary }}>
              No slots available for this date.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeSlots}>
              {slots.map(slot => {
                const isAvailable = (slot.status || (slot.isBooked ? "booked" : "available")) === "available";
                const label = `${slot.startTime} - ${slot.endTime}`;
                const selected = startTime === slot.startTime;
                return (
                  <Pressable
                    key={slot._id || label}
                    onPress={() => isAvailable && setStartTime(selected ? "" : slot.startTime)}
                    disabled={!isAvailable}
                    style={[
                      styles.timeSlot,
                      selected && styles.timeSlotActive,
                      !isAvailable && { opacity: 0.4 },
                    ]}
                  >
                    <Text style={[styles.timeSlotText, selected && styles.timeSlotTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.inputWrap, { height: 80, alignItems: "flex-start", paddingVertical: 12 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special requirements..."
            placeholderTextColor={Colors.light.textTertiary}
            multiline
          />
        </View>

        <Animated.View style={animStyle}>
          <Pressable
            onPress={handleBook}
            disabled={loading}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            style={[styles.bookBtn, loading && { opacity: 0.7 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="check-circle" size={20} color="#fff" />
                <Text style={styles.bookBtnText}>Confirm Booking</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  header: { marginTop: 12, marginBottom: 28, gap: 4 },
  title: { fontFamily: "Sora_700Bold", fontSize: 26, color: Colors.light.text },
  subtitle: { fontFamily: "Manrope_400Regular", fontSize: 15, color: Colors.light.textSecondary },
  form: { gap: 18 },
  field: { gap: 8 },
  label: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: Colors.light.text },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    height: 50,
  },
  input: { flex: 1, fontFamily: "Manrope_500Medium", fontSize: 15, color: Colors.light.text },
  timeSlots: { gap: 8, paddingVertical: 4 },
  timeSlot: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: "#fff",
  },
  timeSlotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timeSlotText: { fontFamily: "Manrope_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  timeSlotTextActive: { color: "#fff" },
  bookBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  bookBtnText: { fontFamily: "Manrope_700Bold", fontSize: 17, color: "#fff" },
});
