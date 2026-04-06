import React, { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  ActivityIndicator, Alert, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getApiBase } from "@/utils/apiBase";

const API_BASE = getApiBase();

const BUSINESS_TYPES = [
  { id: "kirana", label: "Kirana Store", icon: "shopping-bag" },
  { id: "restaurant", label: "Restaurant", icon: "coffee" },
  { id: "coaching", label: "Coaching/Education", icon: "book-open" },
  { id: "rental", label: "Rental", icon: "home" },
  { id: "salon", label: "Salon/Beauty", icon: "scissors" },
  { id: "pharmacy", label: "Pharmacy", icon: "plus-circle" },
  { id: "other", label: "Other", icon: "briefcase" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function InputWrap({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <View style={styles.inputWrap}>
      {icon && <Feather name={icon as any} size={16} color={Colors.light.textSecondary} />}
      {children}
    </View>
  );
}

export default function CreateBusinessScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  async function handleCreate() {
    if (!name.trim() || !businessType || !category.trim()) {
      Alert.alert("Error", "Please fill in name, business type, and category");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/businesses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          businessType,
          category: category.trim(),
          description: description.trim() || undefined,
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create business");
      }
      await queryClient.invalidateQueries({ queryKey: ["my-businesses"] });
      Alert.alert("Success!", "Your business has been created.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create business");
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
        <Text style={styles.title}>Create Business</Text>
        <Text style={styles.subtitle}>Set up your business profile</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
        {/* Business Type */}
        <Field label="Business Type *">
          <View style={styles.typeGrid}>
            {BUSINESS_TYPES.map(type => (
              <Pressable
                key={type.id}
                onPress={() => setBusinessType(type.id)}
                style={[styles.typeBtn, businessType === type.id && styles.typeBtnActive]}
              >
                <Feather
                  name={type.icon as any}
                  size={18}
                  color={businessType === type.id ? "#fff" : Colors.light.textSecondary}
                />
                <Text style={[styles.typeBtnText, businessType === type.id && styles.typeBtnTextActive]}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Field>

        <Field label="Business Name *">
          <InputWrap icon="briefcase">
            <TextInput
              style={styles.input}
              placeholder="e.g. Sharma Kirana Store"
              placeholderTextColor={Colors.light.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </InputWrap>
        </Field>

        <Field label="Category *">
          <InputWrap icon="tag">
            <TextInput
              style={styles.input}
              placeholder="e.g. Grocery, Indian Food, NEET Coaching"
              placeholderTextColor={Colors.light.textTertiary}
              value={category}
              onChangeText={setCategory}
            />
          </InputWrap>
        </Field>

        <Field label="Description">
          <TextInput
            style={[styles.inputWrap, { height: 90, textAlignVertical: "top", paddingTop: 12 }]}
            placeholder="Describe your business, specialties..."
            placeholderTextColor={Colors.light.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </Field>

        <Field label="Phone">
          <InputWrap icon="phone">
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor={Colors.light.textTertiary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </InputWrap>
        </Field>

        <Field label="WhatsApp Number">
          <InputWrap icon="message-circle">
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor={Colors.light.textTertiary}
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
            />
          </InputWrap>
        </Field>

        <Field label="Address">
          <InputWrap icon="map-pin">
            <TextInput
              style={styles.input}
              placeholder="Street address"
              placeholderTextColor={Colors.light.textTertiary}
              value={address}
              onChangeText={setAddress}
            />
          </InputWrap>
        </Field>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>City</Text>
            <InputWrap>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={Colors.light.textTertiary}
                value={city}
                onChangeText={setCity}
              />
            </InputWrap>
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>State</Text>
            <InputWrap>
              <TextInput
                style={styles.input}
                placeholder="State"
                placeholderTextColor={Colors.light.textTertiary}
                value={state}
                onChangeText={setState}
              />
            </InputWrap>
          </View>
        </View>

        <Animated.View style={animStyle}>
          <Pressable
            onPress={handleCreate}
            disabled={loading}
            onPressIn={() => { scale.value = withSpring(0.97); }}
            onPressOut={() => { scale.value = withSpring(1); }}
            style={[styles.createBtn, loading && { opacity: 0.7 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check-circle" size={20} color="#fff" />
                <Text style={styles.createBtnText}>Create Business</Text>
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
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
    fontFamily: "Manrope_500Medium",
    fontSize: 15,
    color: Colors.light.text,
  },
  input: { flex: 1, fontFamily: "Manrope_500Medium", fontSize: 15, color: Colors.light.text },
  row: { flexDirection: "row", gap: 12 },
  createBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  createBtnText: { fontFamily: "Manrope_700Bold", fontSize: 17, color: "#fff" },
});
