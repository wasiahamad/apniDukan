import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  Modal,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getApiBase } from "@/utils/apiBase";

const API_BASE = getApiBase();
const { width: SW } = Dimensions.get("window");

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function todayStr() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// ── Metric card (top-level KPIs) ──────────────────────────────────────────────
function MetricCard({ icon, value, label, color, onPress }: {
  icon: string; value: number | string; label: string; color: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.metricCard, { borderTopColor: color }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

// ── Order-overview card (booking status) ──────────────────────────────────────
function OrderCard({ icon, value, label, bg, iconColor }: {
  icon: string; value: number; label: string; bg: string; iconColor: string;
}) {
  return (
    <View style={[styles.orderCard, { backgroundColor: bg }]}>
      <View style={[styles.orderIcon, { backgroundColor: iconColor + "25" }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[styles.orderVal, { color: iconColor }]}>{value}</Text>
      <Text style={styles.orderLabel}>{label}</Text>
    </View>
  );
}

// ── Inquiry row ───────────────────────────────────────────────────────────────
function InquiryItem({ inq, onPress }: { inq: any; onPress: () => void }) {
  const statusColors: Record<string, string> = {
    new: "#D74E09",
    read: "#D97706",
    replied: "#059669",
    closed: "#6B7280",
  };
  const color = statusColors[inq.status] ?? "#6B7280";
  return (
    <Pressable onPress={onPress} style={styles.inqRow}>
      <View style={[styles.inqAvatar, { backgroundColor: color + "18" }]}>
        <Text style={[styles.inqAvatarText, { color }]}>{inq.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.inqName} numberOfLines={1}>{inq.name}</Text>
        <Text style={styles.inqMsg} numberOfLines={1}>{inq.message}</Text>
      </View>
      <View style={[styles.inqBadge, { backgroundColor: color + "18" }]}>
        <Text style={[styles.inqBadgeText, { color }]}>{inq.status.toUpperCase()}</Text>
      </View>
    </Pressable>
  );
}

// ── Booking row ───────────────────────────────────────────────────────────────
function BookingItem({ b }: { b: any }) {
  const statusColors: Record<string, string> = {
    confirmed: "#059669",
    pending: "#D97706",
    completed: "#0284C7",
    cancelled: "#DC2626",
  };
  const color = statusColors[b.status] ?? "#6B7280";
  return (
    <View style={styles.bookRow}>
      <View style={[styles.bookDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bookName}>{b.customerName}</Text>
        <Text style={styles.bookMeta}>{b.date}{b.timeSlot ? ` · ${b.timeSlot}` : ""}</Text>
      </View>
      <View style={[styles.bookBadge, { backgroundColor: color + "18" }]}>
        <Text style={[styles.bookBadgeText, { color }]}>
          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
        </Text>
      </View>
    </View>
  );
}

// ── Quick Action ──────────────────────────────────────────────────────────────
function QAction({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.qaction}>
      <View style={[styles.qactionIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={22} color={color} />
      </View>
      <Text style={styles.qactionLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

// ── Sign-out modal ────────────────────────────────────────────────────────────
function SignOutModal({ visible, onCancel, onConfirm }: {
  visible: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.signOutBox}>
          <View style={styles.signOutIconWrap}>
            <Feather name="log-out" size={28} color="#DC2626" />
          </View>
          <Text style={styles.signOutTitle}>Sign Out?</Text>
          <Text style={styles.signOutMsg}>You'll be returned to the welcome screen.</Text>
          <View style={styles.signOutBtns}>
            <Pressable onPress={onCancel} style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.btnConfirm}>
              <Text style={styles.btnConfirmText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { user, accessToken, logout } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);

  // ── data ────────────────────────────────────────────────────────────────────
  const { data: businesses = [], isLoading: bizLoading, refetch: refBiz } = useQuery({
    queryKey: ["my-businesses"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/businesses/my`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!accessToken,
  });

  const { data: bookings = [], isLoading: bookLoading, refetch: refBook } = useQuery({
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

  const { data: inquiries = [], isLoading: inqLoading, refetch: refInq } = useQuery({
    queryKey: ["owner-inquiries"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/inquiries`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!accessToken,
  });

  const { data: listingsData = [], refetch: refList } = useQuery({
    queryKey: ["owner-all-listings"],
    queryFn: async () => {
      const results = await Promise.all(
        businesses.map((b: any) =>
          fetch(`${API_BASE}/listings?businessId=${b.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then(r => (r.ok ? r.json() : []))
        )
      );
      return results.flat();
    },
    enabled: businesses.length > 0 && !!accessToken,
  });

  const isLoading = bizLoading || bookLoading || inqLoading;

  // ── derived metrics ─────────────────────────────────────────────────────────
  const totalViews = businesses.reduce((sum: number, b: any) => sum + (b.reviewCount || 0), 0);
  const totalListings = listingsData.length;
  const totalInquiries = inquiries.length;
  const newInquiries = inquiries.filter((i: any) => i.status === "new").length;

  const totalBookings = bookings.length;
  const confirmed = bookings.filter((b: any) => b.status === "confirmed").length;
  const pending = bookings.filter((b: any) => b.status === "pending").length;
  const completed = bookings.filter((b: any) => b.status === "completed").length;
  const cancelled = bookings.filter((b: any) => b.status === "cancelled").length;

  function doRefresh() { refBiz(); refBook(); refInq(); refList(); }

  async function handleSignOut() {
    setShowSignOut(false);
    await logout();
    router.replace("/(auth)/welcome");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={doRefresh} tintColor="#fff" />
        }
      >
        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#0A3D38", "#0F766E", "#14B8A6"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: topPad + 12 }]}
        >
          {/* decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          {/* top row */}
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerDate}>{todayStr()}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={styles.headerName}>
                  Welcome, {user?.name?.split(" ")[0]} 👋
                </Text>
              </View>
              {businesses.length > 0 && (
                <View style={styles.planRow}>
                  <View style={styles.planBadge}>
                    <Feather name="zap" size={10} color="#14B8A6" />
                    <Text style={styles.planText}>Free Plan</Text>
                  </View>
                  <Text style={styles.bizNameText} numberOfLines={1}>
                    {businesses[0]?.name}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push("/(customer)")} style={styles.headerChip}>
                <Feather name="users" size={13} color="#fff" />
                <Text style={styles.headerChipText}>View Shop</Text>
              </Pressable>
              <Pressable onPress={() => setShowSignOut(true)} style={styles.logoutBtn}>
                <Feather name="log-out" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* ── SUMMARY STRIP ──────────────────────────────────────────────── */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{businesses.length}</Text>
              <Text style={styles.summaryLabel}>Businesses</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{totalBookings}</Text>
              <Text style={styles.summaryLabel}>Total Bookings</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{totalInquiries}</Text>
              <Text style={styles.summaryLabel}>Inquiries</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── METRICS ──────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.metricsGrid}>
            <MetricCard icon="eye" value={totalViews} label="Total Views" color="#0F766E"
              onPress={() => {}} />
            <MetricCard icon="package" value={totalListings} label="Total Listings" color="#D74E09"
              onPress={() => router.push("/(owner)/businesses")} />
            <MetricCard icon="message-square" value={totalInquiries} label="Inquiries" color="#7C3AED"
              onPress={() => router.push("/(owner)/inquiries")} />
            <MetricCard icon="phone-call" value={businesses.filter((b: any) => b.phone).length} label="Active Shops" color="#D97706"
              onPress={() => router.push("/(owner)/businesses")} />
          </View>
        </View>

        {/* ── BOOKINGS OVERVIEW ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWrap}>
              <Text style={styles.sectionEmoji}>📋</Text>
              <Text style={styles.sectionTitle}>Bookings Overview</Text>
            </View>
            <Pressable onPress={() => router.push("/(owner)/bookings")}>
              <Text style={styles.seeAll}>See all →</Text>
            </Pressable>
          </View>
          <View style={styles.orderGrid}>
            <OrderCard icon="list" value={totalBookings} label="Total" bg="#E8F5F4" iconColor="#0F766E" />
            <OrderCard icon="check-circle" value={confirmed} label="Confirmed" bg="#D1FAE5" iconColor="#059669" />
            <OrderCard icon="clock" value={pending} label="Pending" bg="#FEF3C7" iconColor="#D97706" />
            <OrderCard icon="x-circle" value={cancelled} label="Cancelled" bg="#FEE2E2" iconColor="#DC2626" />
          </View>
        </View>

        {/* ── NO BUSINESS PROMPT ───────────────────────────────────────────── */}
        {!isLoading && businesses.length === 0 && (
          <View style={styles.section}>
            <View style={styles.promptCard}>
              <View style={styles.promptIconWrap}>
                <Feather name="trending-up" size={24} color="#D74E09" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.promptText}>Start adding products to make your shop visible to customers!</Text>
              </View>
              <Pressable onPress={() => router.push("/(owner)/create-business")} style={styles.promptBtn}>
                <Text style={styles.promptBtnText}>Add Now</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── QUICK ACTIONS ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionEmoji}>⚡</Text>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.qactionsGrid}>
            <QAction icon="plus-circle" label="New Business" color="#0F766E"
              onPress={() => router.push("/(owner)/create-business")} />
            <QAction icon="package" label="Add Listing" color="#D74E09"
              onPress={() => router.push("/(owner)/businesses")} />
            <QAction icon="calendar" label="Bookings" color="#7C3AED"
              onPress={() => router.push("/(owner)/bookings")} />
            <QAction icon="inbox" label="Inquiries" color="#059669"
              onPress={() => router.push("/(owner)/inquiries")} />
            <QAction icon="credit-card" label="Plans" color="#D97706"
              onPress={() => router.push("/(owner)/plans")} />
            <QAction icon="bar-chart-2" label="Analytics" color="#0284C7"
              onPress={() => {}} />
          </View>
        </View>

        {/* ── MY BUSINESSES ────────────────────────────────────────────────── */}
        {businesses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionEmoji}>🏪</Text>
                <Text style={styles.sectionTitle}>My Businesses</Text>
              </View>
              <Pressable onPress={() => router.push("/(owner)/businesses")}>
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
              <View style={{ flexDirection: "row", gap: 12, paddingRight: 20 }}>
                {businesses.map((biz: any) => (
                  <Pressable
                    key={biz.id}
                    onPress={() => router.push(`/(owner)/business-detail?id=${biz.id}`)}
                    style={styles.bizHCard}
                  >
                    <LinearGradient
                      colors={["#0F766E", "#0A3D38"]}
                      style={styles.bizHTop}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.bizHIcon}>
                        <Feather name="briefcase" size={20} color="#fff" />
                      </View>
                      <View style={[styles.bizHStatus, { backgroundColor: biz.isActive ? "#4ADE80" : "#F87171" }]} />
                    </LinearGradient>
                    <View style={styles.bizHBody}>
                      <Text style={styles.bizHName} numberOfLines={1}>{biz.name}</Text>
                      <Text style={styles.bizHType}>{biz.businessType} · {biz.city}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                        <Feather name="star" size={11} color="#D97706" />
                        <Text style={styles.bizHRating}>{biz.rating || "—"}</Text>
                        <Text style={styles.bizHReviews}>({biz.reviewCount})</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* ── RECENT INQUIRIES ─────────────────────────────────────────────── */}
        {inquiries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionEmoji}>💬</Text>
                <Text style={styles.sectionTitle}>Recent Inquiries</Text>
              </View>
              <Pressable onPress={() => router.push("/(owner)/inquiries")}>
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>
            <View style={styles.listCard}>
              {inquiries.slice(0, 4).map((inq: any, i: number) => (
                <View key={inq.id}>
                  <InquiryItem inq={inq} onPress={() => router.push("/(owner)/inquiries")} />
                  {i < Math.min(inquiries.length, 4) - 1 && <View style={styles.sep} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── RECENT BOOKINGS ──────────────────────────────────────────────── */}
        {bookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWrap}>
                <Text style={styles.sectionEmoji}>📅</Text>
                <Text style={styles.sectionTitle}>Recent Bookings</Text>
              </View>
              <Pressable onPress={() => router.push("/(owner)/bookings")}>
                <Text style={styles.seeAll}>See all →</Text>
              </Pressable>
            </View>
            <View style={styles.listCard}>
              {bookings.slice(0, 4).map((b: any, i: number) => (
                <View key={b.id}>
                  <BookingItem b={b} />
                  {i < Math.min(bookings.length, 4) - 1 && <View style={styles.sep} />}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <SignOutModal
        visible={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: "hidden",
  },
  decCircle1: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -80,
    right: -60,
  },
  decCircle2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -40,
    left: -40,
  },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 20 },
  headerDate: { fontFamily: "Manrope_400Regular", fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 4 },
  headerName: { fontFamily: "Sora_700Bold", fontSize: 22, color: "#fff", lineHeight: 28 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(20,184,166,0.3)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.4)",
  },
  planText: { fontFamily: "Manrope_700Bold", fontSize: 11, color: "#A7F3D0" },
  bizNameText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.75)", maxWidth: 180 },
  headerActions: { alignItems: "flex-end", gap: 8 },
  headerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerChipText: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: "#fff" },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(220,38,38,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.5)",
  },

  // ── Summary strip ───────────────────────────────────────────────────────────
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryNum: { fontFamily: "Sora_700Bold", fontSize: 22, color: "#fff" },
  summaryLabel: { fontFamily: "Manrope_400Regular", fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  summaryDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center" },

  // ── Sections ────────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { fontFamily: "Sora_700Bold", fontSize: 17, color: "#1A1A1A" },
  seeAll: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: "#0F766E" },

  // ── Metrics ─────────────────────────────────────────────────────────────────
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderTopWidth: 3,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  metricIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  metricVal: { fontFamily: "Sora_700Bold", fontSize: 26, color: "#1A1A1A", marginTop: 4 },
  metricLabel: { fontFamily: "Manrope_400Regular", fontSize: 13, color: "#6B7280" },

  // ── Order cards ─────────────────────────────────────────────────────────────
  orderGrid: { flexDirection: "row", gap: 10 },
  orderCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "flex-start",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  orderIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  orderVal: { fontFamily: "Sora_700Bold", fontSize: 22, marginTop: 2 },
  orderLabel: { fontFamily: "Manrope_400Regular", fontSize: 12, color: "#6B7280" },

  // ── Prompt ──────────────────────────────────────────────────────────────────
  promptCard: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  promptIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FED7AA",
    alignItems: "center",
    justifyContent: "center",
  },
  promptText: { fontFamily: "Manrope_500Medium", fontSize: 14, color: "#92400E", lineHeight: 20, flex: 1 },
  promptBtn: {
    backgroundColor: "#D74E09",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  promptBtnText: { fontFamily: "Manrope_700Bold", fontSize: 13, color: "#fff" },

  // ── Quick Actions ────────────────────────────────────────────────────────────
  qactionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  qaction: {
    flex: 1,
    minWidth: 80,
    aspectRatio: 0.95,
    backgroundColor: "#fff",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: 10,
  },
  qactionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  qactionLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: "#1A1A1A", textAlign: "center" },

  // ── Businesses horizontal ────────────────────────────────────────────────────
  bizHCard: {
    width: 160,
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  bizHTop: { height: 72, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  bizHIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bizHStatus: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  bizHBody: { padding: 12 },
  bizHName: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "#1A1A1A" },
  bizHType: { fontFamily: "Manrope_400Regular", fontSize: 12, color: "#6B7280", marginTop: 2, textTransform: "capitalize" },
  bizHRating: { fontFamily: "Manrope_700Bold", fontSize: 12, color: "#D97706" },
  bizHReviews: { fontFamily: "Manrope_400Regular", fontSize: 11, color: "#9CA3AF" },

  // ── Lists ───────────────────────────────────────────────────────────────────
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sep: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 60 },

  inqRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  inqAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  inqAvatarText: { fontFamily: "Sora_700Bold", fontSize: 16 },
  inqName: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "#1A1A1A" },
  inqMsg: { fontFamily: "Manrope_400Regular", fontSize: 13, color: "#6B7280", marginTop: 2 },
  inqBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  inqBadgeText: { fontFamily: "Manrope_700Bold", fontSize: 11 },

  bookRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  bookDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  bookName: { fontFamily: "Manrope_700Bold", fontSize: 14, color: "#1A1A1A" },
  bookMeta: { fontFamily: "Manrope_400Regular", fontSize: 13, color: "#6B7280", marginTop: 2 },
  bookBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  bookBadgeText: { fontFamily: "Manrope_700Bold", fontSize: 11 },

  // ── Sign-out modal ──────────────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  signOutBox: { width: "82%", backgroundColor: "#fff", borderRadius: 24, padding: 28, alignItems: "center", gap: 12 },
  signOutIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  signOutTitle: { fontFamily: "Sora_700Bold", fontSize: 20, color: "#1A1A1A" },
  signOutMsg: { fontFamily: "Manrope_400Regular", fontSize: 14, color: "#6B7280", textAlign: "center" },
  signOutBtns: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  btnCancel: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" },
  btnCancelText: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: "#1A1A1A" },
  btnConfirm: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  btnConfirmText: { fontFamily: "Manrope_700Bold", fontSize: 15, color: "#fff" },
});
