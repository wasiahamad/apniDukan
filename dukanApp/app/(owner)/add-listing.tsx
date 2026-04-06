import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  ActivityIndicator, Alert, Platform, Switch,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getApiBase } from "@/utils/apiBase";

const API_BASE = getApiBase();

const LISTING_TYPES = [
  { id: "product", label: "Product", icon: "package" },
  { id: "service", label: "Service", icon: "tool" },
  { id: "course", label: "Course", icon: "book-open" },
  { id: "rental", label: "Rental", icon: "home" },
  { id: "food", label: "Food", icon: "coffee" },
];

const PRICE_UNITS = ["item", "kg", "hour", "day", "month", "session", "course"];

export default function AddListingScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [listingType, setListingType] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState("item");
  const [duration, setDuration] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(false);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  async function handleAdd() {
    if (!title.trim() || !listingType) {
      Alert.alert("Error", "Please enter a title and select a listing type");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          businessId,
          title: title.trim(),
          listingType,
          description: description.trim() || undefined,
          price: price ? parseFloat(price) : undefined,
          priceUnit: price ? priceUnit : undefined,
          duration: duration.trim() || undefined,
          isAvailable,
        }),
      });
      if (!res.ok) throw new Error("Failed to add listing");
      await queryClient.invalidateQueries({ queryKey: ["business", businessId] });
      Alert.alert("Added!", "Your listing has been added.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add listing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={Colors.light.text} />
      </Pressable>

      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <Text style={styles.title}>Add Listing</Text>
        <Text style={styles.subtitle}>Add a product, service, or course</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
        {/* Listing Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Listing Type *</Text>
          <View style={styles.typeRow}>
            {LISTING_TYPES.map(type => (
              <Pressable
                key={type.id}
                onPress={() => setListingType(type.id)}
                style={[styles.typeBtn, listingType === type.id && styles.typeBtnActive]}
              >
                <Feather name={type.icon as any} size={16} color={listingType === type.id ? "#fff" : Colors.light.textSecondary} />
                <Text style={[styles.typeBtnText, listingType === type.id && styles.typeBtnTextActive]}>{type.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Fresh Basmati Rice, NEET Chemistry Course"
              placeholderTextColor={Colors.light.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.inputWrap, { height: 80, textAlignVertical: "top", paddingTop: 12 }]}
            placeholder="Describe this listing..."
            placeholderTextColor={Colors.light.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1.5 }]}>
            <Text style={styles.label}>Price (₹)</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.light.textTertiary}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Per</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {PRICE_UNITS.map(u => (
                <Pressable
                  key={u}
                  onPress={() => setPriceUnit(u)}
                  style={[styles.unitBtn, priceUnit === u && styles.unitBtnActive]}
                >
                  <Text style={[styles.unitBtnText, priceUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.inputWrap}>
            <Feather name="clock" size={16} color={Colors.light.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="e.g. 3 months, 1 hour"
              placeholderTextColor={Colors.light.textTertiary}
              value={duration}
              onChangeText={setDuration}
            />
          </View>
        </View>

        <View style={styles.availRow}>
          <View>
            <Text style={styles.label}>Available</Text>
            <Text style={styles.availSub}>Show this listing to customers</Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: Colors.light.border, true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <Animated.View style={animStyle}>
          <Pressable
            onPress={handleAdd}
            disabled={loading}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            style={[styles.addBtn, loading && { opacity: 0.7 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Feather name="plus-circle" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add Listing</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  header: { marginTop: 8, marginBottom: 28, gap: 4 },
  title: { fontFamily: "Sora_700Bold", fontSize: 28, color: Colors.light.text },
  subtitle: { fontFamily: "Manrope_400Regular", fontSize: 15, color: Colors.light.textSecondary },
  form: { gap: 18 },
  field: { gap: 8 },
  label: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: Colors.light.text },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  typeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeBtnText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },
  typeBtnTextActive: { color: "#fff" },
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
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  unitBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  unitBtnText: { fontFamily: "Manrope_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  unitBtnTextActive: { color: "#fff" },
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  availSub: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  addBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  addBtnText: { fontFamily: "Manrope_700Bold", fontSize: 17, color: "#fff" },
});
