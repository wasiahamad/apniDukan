import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ActivityIndicator, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { apiRequest } from "@/utils/apiClient";
import { useAuth } from "@/context/AuthContext";

type WalletBalanceResponse = { data: { walletBalance: number } };

type WalletTransaction = {
  _id: string;
  amount: number;
  type: "credit" | "debit";
  source: "referral" | "withdrawal";
  status: "pending" | "completed" | "rejected";
  createdAt?: string;
};

type Withdrawal = {
  _id: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  processedAt?: string;
};

type WalletListResponse<T> = { data: T[] };

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending: { color: "#D97706", bg: "#FEF3C7" },
  completed: { color: "#059669", bg: "#D1FAE5" },
  approved: { color: "#059669", bg: "#D1FAE5" },
  rejected: { color: "#DC2626", bg: "#FEE2E2" },
};

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { accessToken } = useAuth();

  const {
    data: wallet,
    isLoading: isWalletLoading,
    isFetching: isWalletFetching,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: async () => {
      const out = await apiRequest<WalletBalanceResponse>("/wallet/me", { accessToken });
      return out?.data?.walletBalance ?? 0;
    },
    enabled: !!accessToken,
  });

  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    isFetching: isTransactionsFetching,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["wallet", "transactions"],
    queryFn: async () => {
      const out = await apiRequest<WalletListResponse<WalletTransaction>>("/wallet/transactions", { accessToken });
      return Array.isArray(out?.data) ? out.data : [];
    },
    enabled: !!accessToken,
  });

  const {
    data: withdrawals = [],
    isLoading: isWithdrawalsLoading,
    isFetching: isWithdrawalsFetching,
    refetch: refetchWithdrawals,
  } = useQuery({
    queryKey: ["wallet", "withdrawals"],
    queryFn: async () => {
      const out = await apiRequest<WalletListResponse<Withdrawal>>("/wallet/withdrawals", { accessToken });
      return Array.isArray(out?.data) ? out.data : [];
    },
    enabled: !!accessToken,
  });

  const isLoading = isWalletLoading || isTransactionsLoading || isWithdrawalsLoading;
  const isRefreshing = isWalletFetching || isTransactionsFetching || isWithdrawalsFetching;

  const pendingRewards = useMemo(() => transactions
    .filter((t) => t.type === "credit" && t.status === "pending")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0), [transactions]);

  const latestTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);
  const latestWithdrawals = useMemo(() => withdrawals.slice(0, 4), [withdrawals]);

  async function handleRefresh() {
    await Promise.all([refetchWallet(), refetchTransactions(), refetchWithdrawals()]);
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing && !isLoading}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Wallet</Text>
        <Text style={styles.subtitle}>Balance, pending rewards and withdrawal count from the public account experience.</Text>
      </View>

      {!accessToken ? (
        <View style={styles.centerState}>
          <Feather name="lock" size={46} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>Sign in to view wallet</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBtn}>
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceValue}>{formatMoney(wallet || 0)}</Text>
            <Text style={styles.balanceSub}>Pending rewards: {formatMoney(pendingRewards)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <SummaryBox label="Withdrawals" value={`${withdrawals.length}`} icon="send" />
            <SummaryBox label="Pending rewards" value={formatMoney(pendingRewards)} icon="gift" />
          </View>

          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Recent transactions</Text>
            </View>
            {latestTransactions.length === 0 ? (
              <Text style={styles.emptyListText}>No transactions yet.</Text>
            ) : latestTransactions.map((t) => {
              const config = STATUS_COLORS[t.status] || STATUS_COLORS.completed;
              return (
                <View key={t._id} style={styles.listRow}>
                  <View style={styles.listLeft}>
                    <View style={[styles.statusDot, { backgroundColor: config.bg }]}>
                      <Feather name={t.type === "credit" ? "arrow-down-left" : "arrow-up-right"} size={12} color={config.color} />
                    </View>
                    <View>
                      <Text style={styles.listLabel}>{t.source === "withdrawal" ? "Withdrawal" : "Referral"}</Text>
                      <Text style={styles.listMeta}>{t.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.listAmount}>{t.type === "credit" ? "+" : "-"}{formatMoney(t.amount)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Recent withdrawals</Text>
            </View>
            {latestWithdrawals.length === 0 ? (
              <Text style={styles.emptyListText}>No withdrawal requests yet.</Text>
            ) : latestWithdrawals.map((w) => {
              const config = STATUS_COLORS[w.status] || STATUS_COLORS.pending;
              return (
                <View key={w._id} style={styles.listRow}>
                  <View style={styles.listLeft}>
                    <View style={[styles.statusDot, { backgroundColor: config.bg }]}>
                      <Feather name="send" size={12} color={config.color} />
                    </View>
                    <View>
                      <Text style={styles.listLabel}>Withdrawal</Text>
                      <Text style={styles.listMeta}>{w.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.listAmount}>{formatMoney(w.amount)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
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
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    padding: 16,
    gap: 12,
  },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listTitle: { fontFamily: "Sora_600SemiBold", fontSize: 16, color: Colors.light.text },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  listLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: Colors.light.text },
  listMeta: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textSecondary },
  listAmount: { fontFamily: "Sora_600SemiBold", fontSize: 14, color: Colors.light.text },
  emptyListText: { fontFamily: "Manrope_500Medium", fontSize: 13, color: Colors.light.textSecondary },
  centerState: { alignItems: "center", justifyContent: "center", paddingTop: 32, gap: 12 },
  emptyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  signInBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },
  signInText: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: "#fff" },
});
