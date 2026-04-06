import React from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getApiBase } from "@/utils/apiBase";

const API_BASE = getApiBase();

export default function MyBusinessesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { accessToken } = useAuth();

  const { data: businesses = [], isLoading, refetch, isFetching } = useQuery({
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

  function renderBusiness({ item }: any) {
    return (
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/(owner)/business-detail", params: { id: item.id } });
        }}
        style={styles.businessCard}
      >
        <View style={styles.businessCardLeft}>
          <View style={[styles.businessIcon, { backgroundColor: item.isActive ? Colors.accent + "20" : "#F3F4F6" }]}>
            <Feather name="briefcase" size={22} color={item.isActive ? Colors.accent : Colors.light.textTertiary} />
          </View>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{item.name}</Text>
            <Text style={styles.businessMeta}>
              {item.businessType.charAt(0).toUpperCase() + item.businessType.slice(1)} · {item.category}
            </Text>
            {item.city && <Text style={styles.businessCity}>{item.city}</Text>}
          </View>
        </View>
        <View style={styles.businessRight}>
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
          <Feather name="chevron-right" size={18} color={Colors.light.textTertiary} />
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.title}>My Businesses</Text>
        <Pressable
          onPress={() => router.push("/(owner)/create-business")}
          style={styles.addBtn}
        >
          <Feather name="plus" size={20} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : businesses.length === 0 ? (
        <Animated.View entering={FadeIn} style={styles.center}>
          <Feather name="briefcase" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>No businesses yet</Text>
          <Text style={styles.emptySubtitle}>Create your first business to get started</Text>
          <Pressable onPress={() => router.push("/(owner)/create-business")} style={styles.createBtn}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.createBtnText}>Create Business</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <FlatList
          data={businesses}
          renderItem={renderBusiness}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontFamily: "Sora_700Bold", fontSize: 26, color: Colors.light.text },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 16, gap: 10 },
  businessCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  businessCardLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  businessIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  businessInfo: { gap: 2, flex: 1 },
  businessName: { fontFamily: "Sora_600SemiBold", fontSize: 16, color: Colors.light.text },
  businessMeta: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  businessCity: { fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textTertiary },
  businessRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: "#FEE2E2", borderRadius: 6 },
  inactiveBadgeText: { fontFamily: "Manrope_600SemiBold", fontSize: 11, color: "#DC2626" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  emptySubtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center", paddingHorizontal: 24 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 12, marginTop: 4 },
  createBtnText: { fontFamily: "Manrope_600SemiBold", fontSize: 15, color: "#fff" },
});
