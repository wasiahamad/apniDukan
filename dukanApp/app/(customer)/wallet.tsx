import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import Colors from "@/constants/colors";
import { PUBLIC_WALLET } from "@/utils/publicCatalog";

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.light.background }} contentContainerStyle={{ paddingBottom: bottomPad + 110 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Wallet</Text>
        <Text style={styles.subtitle}>Balance, pending rewards and withdrawal count from the public account experience.</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Text style={styles.balanceValue}>₹{PUBLIC_WALLET.balance.toLocaleString("en-IN")}</Text>
          <Text style={styles.balanceSub}>Pending rewards: ₹{PUBLIC_WALLET.pending.toLocaleString("en-IN")}</Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryBox label="Withdrawals" value={`${PUBLIC_WALLET.withdrawals}`} icon="send" />
          <SummaryBox label="Rewards" value="Active" icon="gift" />
        </View>

        <View style={styles.infoCard}>
          <InfoRow icon="credit-card" text="Withdrawals and settlement history will sync from backend endpoints." />
          <InfoRow icon="clock" text="Pending rewards are shown before transfer is completed." />
          <InfoRow icon="refresh-cw" text="Wallet screen is ready to plug into live API responses." />
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryBox({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.summaryBox}>
      <Feather name={icon as any} size={16} color={Colors.primary} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
    backgroundColor: Colors.accent,
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  balanceLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.82)" },
  balanceValue: { fontFamily: "Sora_700Bold", fontSize: 34, color: "#fff" },
  balanceSub: { fontFamily: "Manrope_500Medium", fontSize: 13, color: "rgba(255,255,255,0.84)" },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    padding: 14,
    gap: 6,
  },
  summaryLabel: { fontFamily: "Manrope_500Medium", fontSize: 12, color: Colors.light.textSecondary },
  summaryValue: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
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
});
