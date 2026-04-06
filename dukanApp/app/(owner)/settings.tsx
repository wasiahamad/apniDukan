import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

function SignOutModal({ visible, onCancel, onConfirm }: {
  visible: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalIcon}>
            <Feather name="log-out" size={28} color={Colors.light.error} />
          </View>
          <Text style={styles.modalTitle}>Sign Out?</Text>
          <Text style={styles.modalMsg}>You'll be taken back to the welcome screen.</Text>
          <View style={styles.modalBtns}>
            <Pressable onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.confirmBtn}>
              <Text style={styles.confirmText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MenuItem({ icon, label, subtitle, onPress, danger, color }: {
  icon: string; label: string; subtitle?: string; onPress: () => void; danger?: boolean; color?: string;
}) {
  const ic = danger ? Colors.light.error : (color || Colors.light.textSecondary);
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <View style={[styles.menuIcon, { backgroundColor: danger ? "#FEE2E2" : (ic + "18") }]}>
        <Feather name={icon as any} size={18} color={ic} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.menuLabel, danger && { color: Colors.light.error }]}>{label}</Text>
        {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
      </View>
      {!danger && <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />}
    </Pressable>
  );
}

export default function OwnerSettingsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { user, logout } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);

  async function handleSignOut() {
    setShowSignOut(false);
    await logout();
    router.replace("/(auth)/welcome");
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileSection, { paddingTop: topPad + 16 }]}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || "O"}</Text>
          </View>
          <View style={styles.ownerMini}>
            <Feather name="briefcase" size={10} color="#fff" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.ownerBadge}>
            <Feather name="briefcase" size={11} color={Colors.accent} />
            <Text style={styles.ownerBadgeText}>Business Owner</Text>
          </View>
        </View>
      </View>

      {/* Business Management */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>BUSINESS</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="briefcase" label="My Businesses" subtitle="View and manage your shops" onPress={() => router.push("/(owner)/businesses")} color={Colors.accent} />
          <View style={styles.divider} />
          <MenuItem icon="package" label="Listings" subtitle="Products, services & courses" onPress={() => router.push("/(owner)/businesses")} color={Colors.primary} />
          <View style={styles.divider} />
          <MenuItem icon="calendar" label="Bookings" subtitle="Manage appointments" onPress={() => router.push("/(owner)/bookings")} color="#7C3AED" />
          <View style={styles.divider} />
          <MenuItem icon="message-circle" label="Inquiries" subtitle="Customer messages" onPress={() => router.push("/(owner)/inquiries")} color="#059669" />
        </View>
      </View>

      {/* Plans */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="credit-card" label="Plans & Pricing" subtitle="Upgrade your plan" onPress={() => router.push("/(owner)/plans")} color="#D97706" />
          <View style={styles.divider} />
          <MenuItem icon="gift" label="Referral Program" subtitle="Earn rewards by referring" onPress={() => {}} color="#7C3AED" />
        </View>
      </View>

      {/* Switch Mode */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MODE</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="users" label="Switch to Customer View" subtitle="Browse as a customer" onPress={() => router.replace("/(customer)")} color="#0284C7" />
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="bell" label="Notifications" onPress={() => {}} color={Colors.primary} />
          <View style={styles.divider} />
          <MenuItem icon="help-circle" label="Help & Support" onPress={() => {}} color="#0284C7" />
          <View style={styles.divider} />
          <MenuItem icon="log-out" label="Sign Out" onPress={() => setShowSignOut(true)} danger />
        </View>
      </View>

      <SignOutModal
        visible={showSignOut}
        onCancel={() => setShowSignOut(false)}
        onConfirm={handleSignOut}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  avatarWrap: { position: "relative" },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Sora_700Bold", fontSize: 28, color: "#fff" },
  ownerMini: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  userEmail: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  ownerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: Colors.accent + "18",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  ownerBadgeText: { fontFamily: "Manrope_700Bold", fontSize: 12, color: Colors.accent },

  section: { paddingHorizontal: 20, paddingTop: 24, gap: 8 },
  sectionLabel: { fontFamily: "Manrope_600SemiBold", fontSize: 12, color: Colors.light.textTertiary, letterSpacing: 0.8 },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontFamily: "Manrope_500Medium", fontSize: 15, color: Colors.light.text },
  menuSub: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textSecondary },
  divider: { height: 1, backgroundColor: Colors.light.borderLight, marginLeft: 68 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBox: {
    width: "82%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontFamily: "Sora_700Bold", fontSize: 20, color: Colors.light.text },
  modalMsg: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center" },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 8, width: "100%" },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: Colors.light.text },
  confirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { fontFamily: "Manrope_700Bold", fontSize: 15, color: "#fff" },
});
