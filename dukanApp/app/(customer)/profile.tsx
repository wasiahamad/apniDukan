import React, { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, Platform, Modal,
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

function MenuItem({ icon, label, onPress, danger, color }: {
  icon: string; label: string; onPress: () => void; danger?: boolean; color?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <View style={[styles.menuIcon, {
        backgroundColor: danger ? "#FEE2E2" : (color ? color + "18" : Colors.light.backgroundSecondary)
      }]}>
        <Feather name={icon as any} size={18} color={danger ? Colors.light.error : (color || Colors.light.textSecondary)} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: Colors.light.error }]}>{label}</Text>
      {!danger && <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
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

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 20 }]}>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.guestBox}>
          <View style={styles.guestAvatar}>
            <Feather name="user" size={36} color="rgba(255,255,255,0.8)" />
          </View>
          <Text style={styles.guestTitle}>Not signed in</Text>
          <Text style={styles.guestSub}>Sign in to track your bookings and manage your profile.</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBtn}>
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          {user.role === "business_owner" && (
            <View style={styles.ownerMini}>
              <Feather name="briefcase" size={10} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
        <View style={[
          styles.roleBadge,
          user.role === "business_owner" && { backgroundColor: Colors.accent + "18", borderColor: Colors.accent + "40" }
        ]}>
          <Feather
            name={user.role === "business_owner" ? "briefcase" : "user"}
            size={12}
            color={user.role === "business_owner" ? Colors.accent : Colors.light.textSecondary}
          />
          <Text style={[styles.roleText, user.role === "business_owner" && { color: Colors.accent }]}>
            {user.role === "business_owner" ? "Business Owner" : "Customer"}
          </Text>
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <MenuItem icon="calendar" label="My Bookings" onPress={() => router.push("/(customer)/bookings")} color={Colors.primary} />
          <View style={styles.divider} />
          <MenuItem icon="map-pin" label="Browse Cities" onPress={() => router.push("/cities" as any)} color="#0284C7" />
          <View style={styles.divider} />
          <MenuItem icon="play-circle" label="Stories & Reels" onPress={() => router.push("/stories" as any)} color="#7C3AED" />
          <View style={styles.divider} />
          <MenuItem icon="gift" label="Referral Program" onPress={() => router.push("/referrals" as any)} color="#059669" />
          <View style={styles.divider} />
          <MenuItem icon="dollar-sign" label="Plans & Pricing" onPress={() => router.push("/pricing" as any)} color="#D97706" />
          <View style={styles.divider} />
          <MenuItem icon="bell" label="Notifications" onPress={() => {}} color="#7C3AED" />
          <View style={styles.divider} />
          <MenuItem icon="lock" label="Change Password" onPress={() => router.push("/(customer)/change-password")} color={Colors.primary} />
          <View style={styles.divider} />
          <MenuItem icon="help-circle" label="Help & Support" onPress={() => {}} color="#0284C7" />
        </View>
      </View>

      {user.role === "business_owner" && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BUSINESS</Text>
          <View style={styles.card}>
            <MenuItem icon="grid" label="Go to Owner Dashboard" onPress={() => router.replace("/(owner)")} color={Colors.accent} />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PUBLIC APP FEATURES</Text>
        <View style={styles.featureBox}>
          <View style={styles.featureRow}><Feather name="map-pin" size={16} color={Colors.primary} /><Text style={styles.featureText}>City-wise browsing with landmark images</Text></View>
          <View style={styles.featureRow}><Feather name="search" size={16} color={Colors.primary} /><Text style={styles.featureText}>Search shops, categories and live listings</Text></View>
          <View style={styles.featureRow}><Feather name="gift" size={16} color={Colors.primary} /><Text style={styles.featureText}>Referral code, earnings and wallet screens</Text></View>
          <View style={styles.featureRow}><Feather name="play-circle" size={16} color={Colors.primary} /><Text style={styles.featureText}>Stories, reels and featured updates</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
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
  container: { flex: 1, backgroundColor: Colors.light.background, paddingHorizontal: 20 },
  pageTitle: { fontFamily: "Sora_700Bold", fontSize: 28, color: Colors.light.text, marginBottom: 24 },
  guestBox: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  guestAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.textTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: { fontFamily: "Sora_600SemiBold", fontSize: 20, color: Colors.light.text },
  guestSub: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center" },
  signInBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  signInText: { fontFamily: "Manrope_700Bold", fontSize: 15, color: "#fff" },

  header: {
    backgroundColor: "#fff",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    gap: 6,
  },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "Sora_700Bold", fontSize: 34, color: "#fff" },
  ownerMini: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userName: { fontFamily: "Sora_600SemiBold", fontSize: 22, color: Colors.light.text },
  userEmail: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  userPhone: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginTop: 4,
  },
  roleText: { fontFamily: "Manrope_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },

  section: { paddingHorizontal: 20, paddingTop: 24, gap: 8 },
  sectionLabel: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: Colors.light.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontFamily: "Manrope_500Medium", fontSize: 15, color: Colors.light.text },
  divider: { height: 1, backgroundColor: Colors.light.borderLight, marginLeft: 66 },
  featureBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    padding: 16,
    gap: 10,
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { flex: 1, fontFamily: "Manrope_500Medium", fontSize: 14, color: Colors.light.textSecondary },

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
