import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { PUBLIC_PLANS } from "@/utils/publicCatalog";

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.light.background }} contentContainerStyle={{ paddingBottom: bottomPad + 110 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Plans & Pricing</Text>
        <Text style={styles.subtitle}>The same publicWebsite pricing story, now mirrored on mobile for customers and owners.</Text>
      </View>

      <View style={styles.body}>
        {PUBLIC_PLANS.map((plan, index) => (
          <Animated.View key={plan.name} entering={FadeInDown.delay(index * 70)}>
            <Pressable style={[styles.planCard, { borderTopColor: plan.accent }]} onPress={() => router.push("/referrals" as any)}>
              <View style={styles.planTop}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planHighlight}>{plan.highlight}</Text>
                </View>
                <View style={[styles.pricePill, { backgroundColor: `${plan.accent}18` }]}>
                  <Text style={[styles.priceText, { color: plan.accent }]}>{plan.price}</Text>
                </View>
              </View>
              <View style={styles.perkList}>
                {plan.perks.map((perk) => (
                  <View key={perk} style={styles.perkRow}>
                    <Feather name="check-circle" size={14} color={plan.accent} />
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}
              </View>
            </Pressable>
          </Animated.View>
        ))}

        <View style={styles.noteBox}>
          <Feather name="info" size={18} color={Colors.primary} />
          <Text style={styles.noteText}>This page is built to match the web app pricing section, but stays offline-friendly in mobile.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 28, color: Colors.light.text },
  subtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  body: { paddingHorizontal: 16, gap: 14 },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    borderWidth: 1,
    borderTopWidth: 4,
    borderColor: Colors.light.borderLight,
    padding: 16,
    gap: 12,
  },
  planTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  planName: { fontFamily: "Sora_700Bold", fontSize: 20, color: Colors.light.text },
  planHighlight: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary, marginTop: 4 },
  pricePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  priceText: { fontFamily: "Sora_700Bold", fontSize: 15 },
  perkList: { gap: 8, marginTop: 2 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  perkText: { fontFamily: "Manrope_500Medium", fontSize: 14, color: Colors.light.textSecondary, flex: 1 },
  noteBox: {
    marginTop: 6,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    padding: 14,
  },
  noteText: { flex: 1, fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary, lineHeight: 18 },
});
