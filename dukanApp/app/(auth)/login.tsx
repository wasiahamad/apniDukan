import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const DEMO_ACCOUNTS = [
  { label: "👤 Customer Demo", email: "customer@demo.com", password: "demo1234", role: "customer" },
  { label: "🏪 Business Owner Demo", email: "owner@demo.com", password: "demo1234", role: "business_owner" },
];

function AnimBtn({ onPress, label, loading }: { onPress: () => void; label: string; loading?: boolean }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.btn, loading && { opacity: 0.7 }]}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{label}</Text>}
      </Pressable>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function fillDemo(acc: typeof DEMO_ACCOUNTS[0]) {
    setEmail(acc.email);
    setPassword(acc.password);
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const loggedInUser = await login(email.trim().toLowerCase(), password);
      if (loggedInUser.role === "business_owner") {
        router.replace("/(owner)");
      } else {
        router.replace("/(customer)");
      }
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeInDown.duration(400)}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.light.text} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </Animated.View>

      {/* Demo accounts */}
      <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.demoSection}>
        <View style={styles.demoHeader}>
          <Feather name="zap" size={14} color={Colors.primary} />
          <Text style={styles.demoLabel}>Quick Demo Login</Text>
        </View>
        <View style={styles.demoButtons}>
          {DEMO_ACCOUNTS.map(acc => (
            <Pressable
              key={acc.email}
              onPress={() => fillDemo(acc)}
              style={[styles.demoBtn, email === acc.email && styles.demoBtnActive]}
            >
              <Text style={[styles.demoBtnText, email === acc.email && styles.demoBtnTextActive]}>
                {acc.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.light.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Your password"
              placeholderTextColor={Colors.light.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
            />
            <Pressable onPress={() => setShowPw(v => !v)} style={styles.eyeBtn}>
              <Feather name={showPw ? "eye-off" : "eye"} size={18} color={Colors.light.textSecondary} />
            </Pressable>
          </View>
        </View>

        <AnimBtn onPress={handleLogin} label="Sign In" loading={loading} />

        <Pressable onPress={() => router.push("/(auth)/register")} style={styles.switchLink}>
          <Text style={styles.switchText}>Don't have an account? </Text>
          <Text style={[styles.switchText, { color: Colors.primary, fontFamily: "Manrope_700Bold" }]}>Sign Up</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  header: { marginTop: 24, marginBottom: 24, gap: 6 },
  title: { fontFamily: "Sora_700Bold", fontSize: 30, color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Manrope_400Regular", fontSize: 16, color: Colors.light.textSecondary },

  demoSection: {
    backgroundColor: Colors.primary + "0F",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.primary + "25",
    marginBottom: 20,
    gap: 10,
  },
  demoHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  demoLabel: { fontFamily: "Manrope_700Bold", fontSize: 13, color: Colors.primary },
  demoButtons: { flexDirection: "row", gap: 8 },
  demoBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  demoBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  demoBtnText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  demoBtnTextActive: { color: Colors.primary },

  form: { gap: 20 },
  field: { gap: 8 },
  label: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: Colors.light.text },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    height: 54,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "Manrope_500Medium",
    fontSize: 16,
    color: Colors.light.text,
    height: "100%",
  },
  eyeBtn: { padding: 4 },
  btn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  btnText: { fontFamily: "Manrope_700Bold", fontSize: 17, color: "#fff" },
  switchLink: { flexDirection: "row", justifyContent: "center", paddingVertical: 8 },
  switchText: { fontFamily: "Manrope_500Medium", fontSize: 15, color: Colors.light.textSecondary },
});
