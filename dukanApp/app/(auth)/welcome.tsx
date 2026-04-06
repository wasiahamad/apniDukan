import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

function LogoIcon() {
  const scale = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0.1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: false }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: false }),
    ]).start(() => {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.4, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowOpacity, { toValue: 0.1, duration: 1500, useNativeDriver: false }),
        ])
      );
      pulse.start();
    });
  }, []);

  return (
    <View style={styles.logoContainer}>
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
      <Animated.View style={[styles.logoBox, { opacity: logoOpacity, transform: [{ scale }] }]}>
        <Feather name="shopping-bag" size={44} color="#fff" />
      </Animated.View>
    </View>
  );
}

function PressableBtn({ onPress, children, style }: { onPress: () => void; children: React.ReactNode; style?: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: false }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      delay: 300,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#D74E09", "#B83D07", "#7C2505"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />

      <View style={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 24 }]}>

        {/* Hero */}
        <View style={styles.heroSection}>
          <LogoIcon />
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={styles.appName}>Apni Dukan</Text>
            <Text style={styles.tagline}>Your local marketplace, reimagined</Text>
          </View>
        </View>

        {/* Features + hint + CTA fade in together */}
        <Animated.View style={{ opacity: contentOpacity, gap: 20, flex: 1, justifyContent: "flex-end" }}>
          {/* Features card */}
          <View style={styles.featuresSection}>
            {[
              { icon: "map-pin", text: "Discover nearby shops & services" },
              { icon: "package", text: "Browse products, courses & more" },
              { icon: "calendar", text: "Book appointments instantly" },
              { icon: "message-circle", text: "Connect with business owners" },
            ].map(f => (
              <View key={f.icon} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Feather name={f.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Demo hint */}
          <View style={styles.demoHint}>
            <Feather name="zap" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.demoHintText}>Demo ready — use Quick Login on the next screen</Text>
          </View>

          {/* CTA */}
          <View style={styles.ctaSection}>
            <PressableBtn onPress={() => router.push("/(auth)/login")} style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>Get Started</Text>
              <Feather name="arrow-right" size={18} color={Colors.primary} />
            </PressableBtn>
            <PressableBtn onPress={() => router.push("/(auth)/register")} style={styles.btnSecondary}>
              <Text style={styles.btnSecondaryText}>Create new account</Text>
            </PressableBtn>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, gap: 24 },

  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  circle1: { width: 340, height: 340, top: -100, right: -90 },
  circle2: { width: 220, height: 220, bottom: 100, left: -70 },

  heroSection: { alignItems: "center", gap: 18, paddingTop: 12 },
  logoContainer: { alignItems: "center", justifyContent: "center", width: 110, height: 110 },
  glow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#fff",
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  appName: {
    fontFamily: "Sora_700Bold",
    fontSize: 36,
    color: "#fff",
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: "Manrope_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },

  featuresSection: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    color: "#fff",
    flex: 1,
  },

  demoHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  demoHintText: {
    fontFamily: "Manrope_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },

  ctaSection: { gap: 10 },
  btnPrimary: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnSecondary: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  btnPrimaryText: {
    fontFamily: "Manrope_700Bold",
    fontSize: 17,
    color: Colors.primary,
  },
  btnSecondaryText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
