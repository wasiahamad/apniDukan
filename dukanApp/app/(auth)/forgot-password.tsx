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
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { apiRequest } from "@/utils/apiClient";

type LoginResponse = {
  user: any;
  accessToken: string;
  refreshToken: string;
};

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  // NOTE: We intentionally call backend directly and then rely on login after reset.
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function sendOtp() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await apiRequest<any>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail }),
      });
      setStep("verify");
      setOtp("");
      Alert.alert("OTP Sent", "Reset OTP aapke email par bhej diya." );
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Please try again");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await apiRequest<any>("/auth/resend-reset-otp", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail }),
      });
      Alert.alert("OTP Resent", "Naya OTP bhej diya gaya." );
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Please try again");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !otp.trim() || !newPassword) {
      Alert.alert("Error", "Email, OTP aur new password required hai");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Backend returns loginResponse (tokens). For mobile we keep it minimal:
      // After reset, user can login with new password.
      await apiRequest<LoginResponse>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail, otp: otp.trim(), newPassword }),
      });
      Alert.alert("Success", "Password reset ho gaya. Ab login karein.");
      router.replace("/(auth)/login");
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={22} color={Colors.light.text} />
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>OTP se password reset karein.</Text>
      </View>

      <View style={styles.form}>
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

        {step === "verify" ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>OTP</Text>
              <View style={styles.inputWrap}>
                <Feather name="key" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={Colors.light.textTertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <Pressable onPress={resetPassword} disabled={loading} style={[styles.btn, loading && { opacity: 0.7 }]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
            </Pressable>

            <Pressable onPress={resendOtp} disabled={loading} style={[styles.btnOutline, loading && { opacity: 0.7 }]}>
              {loading ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.btnOutlineText}>Resend OTP</Text>}
            </Pressable>
          </>
        ) : (
          <Pressable onPress={sendOtp} disabled={loading} style={[styles.btn, loading && { opacity: 0.7 }]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
          </Pressable>
        )}

        <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8, marginBottom: 8 },
  header: { marginBottom: 22, gap: 6 },
  title: { fontFamily: "Sora_700Bold", fontSize: 30, color: Colors.light.text, letterSpacing: -0.5 },
  subtitle: { fontFamily: "Manrope_400Regular", fontSize: 15, color: Colors.light.textSecondary, lineHeight: 22 },
  form: { gap: 16 },
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
  btn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnText: { fontFamily: "Manrope_700Bold", fontSize: 17, color: "#fff" },
  btnOutline: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary + "55",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  btnOutlineText: { fontFamily: "Manrope_700Bold", fontSize: 16, color: Colors.primary },
  backLink: { alignItems: "center", paddingVertical: 10 },
  backLinkText: { fontFamily: "Manrope_700Bold", fontSize: 14, color: Colors.light.textSecondary },
});
