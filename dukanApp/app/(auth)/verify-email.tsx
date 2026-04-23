import React, { useMemo, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const { verifyEmailOtp, resendEmailOtp } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();

  const initialEmail = useMemo(() => String(params.email || "").trim().toLowerCase(), [params.email]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleVerify() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!trimmedOtp || trimmedOtp.length < 4) {
      Alert.alert("Error", "Please enter the OTP");
      return;
    }

    setLoading(true);
    try {
      const user = await verifyEmailOtp(trimmedEmail, trimmedOtp);
      Alert.alert("Verified", "Your email is verified.");
      router.replace(user.role === "business_owner" ? "/(owner)" : "/(customer)");
    } catch (err: any) {
      Alert.alert("Verification Failed", err?.message || "Please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    setResendLoading(true);
    try {
      await resendEmailOtp(trimmedEmail);
      Alert.alert("OTP Sent", "We have resent the OTP to your email.");
    } catch (err: any) {
      Alert.alert("Resend Failed", err?.message || "Please try again");
    } finally {
      setResendLoading(false);
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
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>OTP enter karke apna email verify karein.</Text>
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

        <Pressable onPress={handleVerify} disabled={loading || resendLoading} style={[styles.btn, (loading || resendLoading) && { opacity: 0.7 }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Continue</Text>}
        </Pressable>

        <Pressable onPress={handleResend} disabled={loading || resendLoading} style={[styles.btnOutline, (loading || resendLoading) && { opacity: 0.7 }]}>
          {resendLoading ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.btnOutlineText}>Resend OTP</Text>}
        </Pressable>

        <Text style={styles.note}>Spam folder bhi check kar lena.</Text>
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
  note: { marginTop: 6, fontFamily: "Manrope_400Regular", fontSize: 12, color: Colors.light.textTertiary },
});
