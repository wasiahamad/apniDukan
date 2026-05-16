import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, ImageBackground, ActivityIndicator, Linking, RefreshControl } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import Colors from "@/constants/colors";
import { apiRequest } from "@/utils/apiClient";
import { useAuth } from "@/context/AuthContext";

type StoryBusiness = {
  _id: string;
  name: string;
  logo?: string | null;
  slug?: string | null;
} | null;

type StoryItem = {
  _id: string;
  businessId?: string;
  business?: StoryBusiness;
  kind: "story" | "reel";
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  linkUrl?: string | null;
  viewsCount?: number;
  createdAt?: string;
  expiresAt?: string | null;
};

type StoriesResponse = { data: StoryItem[] };

const ACCENT_COLORS = ["#2563EB", "#7C3AED", "#059669", "#DC2626", "#EA580C", "#0F766E"]; 

function pickAccent(id?: string) {
  if (!id) return ACCENT_COLORS[0];
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) sum += id.charCodeAt(i);
  return ACCENT_COLORS[sum % ACCENT_COLORS.length];
}

export default function StoriesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { accessToken } = useAuth();

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["stories", "public"],
    queryFn: async () => {
      const [storyOut, reelOut] = await Promise.all([
        apiRequest<StoriesResponse>("/stories?kind=story"),
        apiRequest<StoriesResponse>("/stories?kind=reel"),
      ]);
      const storyRows = Array.isArray(storyOut?.data) ? storyOut.data : [];
      const reelRows = Array.isArray(reelOut?.data) ? reelOut.data : [];
      return [...storyRows, ...reelRows].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    },
  });

  const stories = data || [];

  const cards = useMemo(() => stories.map((story) => {
    const businessName = story.business?.name || "Featured update";
    const title = story.caption ? String(story.caption) : businessName;
    const subtitle = story.business?.name && story.caption ? story.business.name : "Tap to view details";
    return {
      id: String(story._id),
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      title,
      subtitle,
      badge: story.kind === "reel" ? "Reel" : "Featured",
      accent: pickAccent(story.businessId || story.business?._id || story._id),
      linkUrl: story.linkUrl,
      businessId: story.businessId || story.business?._id,
    };
  }), [stories]);

  async function handleStoryPress(card: typeof cards[number]) {
    if (accessToken && card.id) {
      try {
        await apiRequest(`/stories/${card.id}/view`, { accessToken, method: "POST" });
      } catch {
        // Ignore view count errors
      }
    }

    if (card.linkUrl) {
      if (card.linkUrl.startsWith("/")) {
        router.push(card.linkUrl as any);
        return;
      }
      try {
        await Linking.openURL(card.linkUrl);
        return;
      } catch {
        // Fallback to business details
      }
    }

    if (card.businessId) {
      router.push({ pathname: "/(customer)/business/[id]", params: { id: card.businessId } });
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      contentContainerStyle={{ paddingBottom: bottomPad + 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Stories & Reels</Text>
        <Text style={styles.subtitle}>Featured updates, offers, bookings and verified business highlights.</Text>
      </View>

      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="play-circle" size={42} color={Colors.light.textTertiary} />
            <Text style={styles.emptyTitle}>No stories yet</Text>
            <Text style={styles.emptySubtitle}>Check back for fresh updates from local businesses.</Text>
          </View>
        ) : cards.map((story, index) => (
          <Animated.View key={story.id} entering={FadeInDown.delay(index * 70)}>
            <Pressable style={[styles.storyCard, { backgroundColor: story.accent }]} onPress={() => handleStoryPress(story)}>
              {story.mediaType === "image" && story.mediaUrl ? (
                <ImageBackground source={{ uri: story.mediaUrl }} style={styles.storyImage} imageStyle={styles.storyImageInner}>
                  <View style={styles.storyOverlay} />
                </ImageBackground>
              ) : null}
              <View style={styles.storyTop}>
                <View style={styles.storyIconWrap}>
                  <Feather name={story.mediaType === "video" ? "video" : "image"} size={18} color="#fff" />
                </View>
                <View style={styles.storyBadge}>
                  <Feather name={story.mediaType === "video" ? "play" : "star"} size={10} color="#fff" />
                  <Text style={styles.storyBadgeText}>{story.badge}</Text>
                </View>
              </View>
              <View style={styles.storyMeta}>
                <Text style={styles.storyTitle} numberOfLines={2}>{story.title}</Text>
                <Text style={styles.storySubtitle} numberOfLines={2}>{story.subtitle}</Text>
              </View>
            </Pressable>
          </Animated.View>
        ))}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What this page covers</Text>
          <View style={styles.infoRow}><Feather name="zap" size={16} color={Colors.primary} /><Text style={styles.infoText}>Daily highlights and featured offers</Text></View>
          <View style={styles.infoRow}><Feather name="calendar" size={16} color={Colors.primary} /><Text style={styles.infoText}>Appointment and booking reminders</Text></View>
          <View style={styles.infoRow}><Feather name="shield" size={16} color={Colors.primary} /><Text style={styles.infoText}>Trusted and verified business updates</Text></View>
          <View style={styles.infoRow}><Feather name="message-circle" size={16} color={Colors.primary} /><Text style={styles.infoText}>Quick chat and inquiry actions</Text></View>
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
  storyCard: {
    height: 190,
    borderRadius: 24,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 4,
    overflow: "hidden",
  },
  storyImage: {
    ...StyleSheet.absoluteFillObject,
  },
  storyImageInner: {
    borderRadius: 24,
  },
  storyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  storyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  storyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  storyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  storyBadgeText: { fontFamily: "Manrope_600SemiBold", fontSize: 11, color: "#fff" },
  storyMeta: { gap: 4 },
  storyTitle: { fontFamily: "Sora_700Bold", fontSize: 22, color: "#fff" },
  storySubtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: "rgba(255,255,255,0.88)", maxWidth: 260 },
  infoBox: {
    marginTop: 6,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    padding: 16,
    gap: 10,
  },
  infoTitle: { fontFamily: "Sora_700Bold", fontSize: 18, color: Colors.light.text, marginBottom: 2 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontFamily: "Manrope_500Medium", fontSize: 14, color: Colors.light.textSecondary, flex: 1 },
  loadingWrap: { paddingVertical: 32, alignItems: "center" },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 24 },
  emptyTitle: { fontFamily: "Sora_600SemiBold", fontSize: 18, color: Colors.light.text },
  emptySubtitle: { fontFamily: "Manrope_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center" },
});
