import React from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getApiBase } from "@/utils/apiBase";

const API_BASE = getApiBase();

export default function PlansScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/plans`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 30 }}
    >
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <Text style={styles.headerSubtitle}>Grow your business with the right tools</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.plansContainer}>
          {plans.map((plan: any, index: number) => (
            <Animated.View key={plan.id} entering={FadeInDown.delay(index * 100)}>
              {plan.isPopular ? (
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryDark]}
                  style={styles.popularCard}
                >
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                  <Text style={styles.planNameLight}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLight}>₹{plan.price}</Text>
                    <Text style={styles.pricePeriodLight}>/{plan.billingCycle}</Text>
                  </View>
                  {plan.features.map((f: string, i: number) => (
                    <View key={i} style={styles.featureRow}>
                      <Feather name="check" size={14} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.featureTextLight}>{f}</Text>
                    </View>
                  ))}
                  <Pressable style={styles.planBtnLight}>
                    <Text style={[styles.planBtnText, { color: Colors.primary }]}>Get Started</Text>
                  </Pressable>
                </LinearGradient>
              ) : (
                <View style={styles.planCard}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    {plan.price === 0 ? (
                      <Text style={styles.price}>Free</Text>
                    ) : (
                      <>
                        <Text style={styles.price}>₹{plan.price}</Text>
                        <Text style={styles.pricePeriod}>/{plan.billingCycle}</Text>
                      </>
                    )}
                  </View>
                  {plan.features.map((f: string, i: number) => (
                    <View key={i} style={styles.featureRow}>
                      <Feather name="check" size={14} color={Colors.accent} />
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                  <Pressable style={[styles.planBtn, { borderColor: Colors.primary }]}>
                    <Text style={[styles.planBtnText, { color: Colors.primary }]}>
                      {plan.price === 0 ? "Current Plan" : "Upgrade"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Animated.View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.accent,
    padding: 20,
    paddingBottom: 32,
    gap: 6,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginLeft: -8, marginBottom: 12 },
  headerTitle: { fontFamily: "Sora_700Bold", fontSize: 28, color: "#fff" },
  headerSubtitle: { fontFamily: "Manrope_400Regular", fontSize: 15, color: "rgba(255,255,255,0.8)" },
  loading: { padding: 40, alignItems: "center" },
  plansContainer: { padding: 20, gap: 16, marginTop: -16 },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  popularCard: {
    borderRadius: 20,
    padding: 20,
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  popularBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 4,
  },
  popularBadgeText: { fontFamily: "Manrope_700Bold", fontSize: 12, color: "#fff" },
  planName: { fontFamily: "Sora_700Bold", fontSize: 22, color: Colors.light.text },
  planNameLight: { fontFamily: "Sora_700Bold", fontSize: 22, color: "#fff" },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  price: { fontFamily: "Sora_700Bold", fontSize: 32, color: Colors.primary },
  priceLight: { fontFamily: "Sora_700Bold", fontSize: 32, color: "#fff" },
  pricePeriod: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  pricePeriodLight: { fontFamily: "Manrope_400Regular", fontSize: 14, color: "rgba(255,255,255,0.8)" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontFamily: "Manrope_500Medium", fontSize: 14, color: Colors.light.text },
  featureTextLight: { fontFamily: "Manrope_500Medium", fontSize: 14, color: "rgba(255,255,255,0.9)" },
  planBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  planBtnLight: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  planBtnText: { fontFamily: "Manrope_700Bold", fontSize: 15 },
});
