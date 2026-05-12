import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { PUBLIC_WALLET } from "@/utils/publicCatalog";

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.light.background }} contentContainerStyle={{ paddingBottom: bottomPad + 110 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Referral Program</Text>
        <Text style={styles.subtitle}>Track referral earnings, wallet balance and rewards like the publicWebsite account area.</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Wallet balance</Text>
          <Text style={styles.balanceValue}>₹{PUBLIC_WALLET.balance.toLocaleString("en-IN")}</Text>
          <View style={styles.balanceStats}>
            <StatItem icon="clock" label="Pending" value={`₹${PUBLIC_WALLET.pending}`} />
            <StatItem icon="upload" label="Withdrawals" value={`${PUBLIC_WALLET.withdrawals}`} />
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow icon="gift" text="Share your referral code with friends and nearby shops." />
          <InfoRow icon="users" text="Earn rewards when referred businesses go live or customers signup." />
          <InfoRow icon="map-pin" text="City and category discovery pages can drive more referrals." />
          <InfoRow icon="bar-chart-2" text="Future sync with backend referral ledger and payout history." />
        </View>

        <Pressable style={styles.cta} onPress={() => router.push("/wallet" as any)}>
          <Feather name="dollar-sign" size={16} color="#fff" />
          <Text style={styles.ctaText}>View wallet and payouts</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Feather name={icon as any} size={14} color={Colors.primary} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Feather name={icon as any} size={16} color={Colors.primary} />
      </View>
      <Text style={styles.infoText}>{text}</Text>
    </View>
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
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  balanceLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.82)" },
  balanceValue: { fontFamily: "Sora_700Bold", fontSize: 34, color: "#fff" },
  balanceStats: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  statItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  statLabel: { fontFamily: "Manrope_500Medium", fontSize: 12, color: "rgba(255,255,255,0.85)" },
  statValue: { fontFamily: "Sora_600SemiBold", fontSize: 16, color: "#fff" },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    padding: 16,
    gap: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: `${Colors.primary}18`, alignItems: "center", justifyContent: "center" },
  infoText: { fontFamily: "Manrope_500Medium", fontSize: 14, color: Colors.light.textSecondary, flex: 1, lineHeight: 20 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 14 },
  ctaText: { fontFamily: "Manrope_700Bold", fontSize: 15, color: "#fff" },
});
