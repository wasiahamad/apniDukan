import React, { useRef, useState } from "react";
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
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { tryParsePhone10 } from "@/utils/apiClient";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const btnScale = useRef(new Animated.Value(1)).current;

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const phone10 = tryParsePhone10(phone);
    if (!phone10 || phone10.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone10,
      });

      if (result?.verificationRequired) {
        router.replace({ pathname: "/(auth)/verify-email", params: { email: String(result.email || email).trim().toLowerCase() } });
        return;
      }

      router.replace(role === "customer" ? "/(customer)" : "/(owner)");
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={Colors.light.text} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join thousands of local businesses & customers</Text>
      </View>

      <View style={styles.form}>
        {/* ROLE SELECTOR */}
        <View style={styles.field}>
          <Text style={styles.label}>I am a</Text>
          <View style={styles.roleRow}>
            <Pressable
              onPress={() => setRole("customer")}
              style={[styles.roleBtn, role === "customer" && styles.roleBtnActive]}
            >
              <View style={[styles.roleIconWrap, role === "customer" && styles.roleIconWrapActive]}>
                <Feather name="user" size={20} color={role === "customer" ? "#fff" : Colors.light.textSecondary} />
              </View>
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text style={[styles.roleBtnTitle, role === "customer" && styles.roleBtnTitleActive]}>Customer</Text>
                <Text style={[styles.roleBtnSub, role === "customer" && { color: "rgba(255,255,255,0.75)" }]}>Browse & book</Text>
              </View>
              {role === "customer" && (
                <View style={styles.roleCheck}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => setRole("business_owner")}
              style={[styles.roleBtn, role === "business_owner" && styles.roleBtnOwnerActive]}
            >
              <View style={[styles.roleIconWrap, role === "business_owner" && styles.roleIconWrapOwnerActive]}>
                <Feather name="briefcase" size={20} color={role === "business_owner" ? "#fff" : Colors.light.textSecondary} />
              </View>
              <View style={{ alignItems: "center", gap: 2 }}>
                <Text style={[styles.roleBtnTitle, role === "business_owner" && styles.roleBtnTitleActive]}>Owner</Text>
                <Text style={[styles.roleBtnSub, role === "business_owner" && { color: "rgba(255,255,255,0.75)" }]}>Manage shop</Text>
              </View>
              {role === "business_owner" && (
                <View style={[styles.roleCheck, { backgroundColor: Colors.accent }]}>
                  <Feather name="check" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* NAME */}
        <View style={styles.field}>
          <Text style={styles.label}>Full Name *</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Rahul Kumar"
              placeholderTextColor={Colors.light.textTertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* EMAIL */}
        <View style={styles.field}>
          <Text style={styles.label}>Email *</Text>
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

        {/* PHONE */}
        <View style={styles.field}>
          <Text style={styles.label}>Phone *</Text>
          <View style={styles.inputWrap}>
            <Feather name="phone" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor={Colors.light.textTertiary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* PASSWORD */}
        <View style={styles.field}>
          <Text style={styles.label}>Password *</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.light.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPw}
            />
            <Pressable onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
              <Feather name={showPw ? "eye-off" : "eye"} size={18} color={Colors.light.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* SUBMIT */}
        <Pressable
          onPress={handleRegister}
          disabled={loading}
          onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: false }).start()}
          onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: false }).start()}
        >
          <Animated.View style={[styles.btn,
            role === "business_owner" && { backgroundColor: Colors.accent },
            loading && { opacity: 0.7 },
            { transform: [{ scale: btnScale }] }
          ]}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={styles.btnText}>Create Account</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </>
            }
          </Animated.View>
        </Pressable>

        <Pressable onPress={() => router.push("/(auth)/login")} style={styles.switchLink}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <Text style={[styles.switchText, { color: Colors.primary, fontFamily: "Manrope_700Bold" }]}>Sign In</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8, marginBottom: 8 },
  header: { marginBottom: 28, gap: 6 },
  title: { fontFamily: "Sora_700Bold", fontSize: 30, color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Manrope_400Regular", fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
  form: { gap: 18 },
  field: { gap: 8 },
  label: { fontFamily: "Manrope_600SemiBold", fontSize: 14, color: Colors.light.text },

  roleRow: { flexDirection: "row", gap: 12 },
  roleBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    position: "relative",
  },
  roleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleBtnOwnerActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  roleIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconWrapActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  roleIconWrapOwnerActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  roleBtnTitle: {
    fontFamily: "Manrope_700Bold",
    fontSize: 15,
    color: Colors.light.text,
  },
  roleBtnTitleActive: { color: "#fff" },
  roleBtnSub: {
    fontFamily: "Manrope_400Regular",
    fontSize: 12,
    color: Colors.light.textTertiary,
  },
  roleCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

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
  btn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  btnText: { fontFamily: "Manrope_700Bold", fontSize: 17, color: "#fff" },
  switchLink: { flexDirection: "row", justifyContent: "center", paddingVertical: 8 },
  switchText: { fontFamily: "Manrope_500Medium", fontSize: 15, color: Colors.light.textSecondary },
});
