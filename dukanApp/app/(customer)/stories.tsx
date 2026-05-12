import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import Colors from "@/constants/colors";
import { FEATURE_STORIES } from "@/utils/publicCatalog";

export default function StoriesScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.light.background }} contentContainerStyle={{ paddingBottom: bottomPad + 110 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Stories & Reels</Text>
        <Text style={styles.subtitle}>Featured updates, offers, bookings and verified business highlights.</Text>
      </View>

      <View style={styles.body}>
        {FEATURE_STORIES.map((story, index) => (
          <Animated.View key={story.id} entering={FadeInDown.delay(index * 70)}>
            <Pressable style={[styles.storyCard, { backgroundColor: story.accent }]} onPress={() => router.push("/pricing" as any) }>
              <View style={styles.storyTop}>
                <View style={styles.storyIconWrap}>
                  <Feather name={story.icon as any} size={18} color="#fff" />
                </View>
                <View style={styles.storyBadge}>
                  <Feather name="play" size={10} color="#fff" />
                  <Text style={styles.storyBadgeText}>Featured</Text>
                </View>
              </View>
              <View style={styles.storyMeta}>
                <Text style={styles.storyTitle}>{story.title}</Text>
                <Text style={styles.storySubtitle}>{story.subtitle}</Text>
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
});
