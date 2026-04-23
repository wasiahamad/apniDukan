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
import { useAuth } from "@/context/AuthContext";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleSubmit() {
    if (!accessToken) {
      Alert.alert("Error", "Please login first");
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Error", "All fields are required");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "New password and confirm password do not match");
      return;
    }

    setLoading(true);
    try {
      await apiRequest<any>("/auth/change-password", {
        method: "POST",
        accessToken,
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      Alert.alert("Success", "Password changed successfully");
      router.back();
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Unable to change password");
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
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>Settings me apna password update karein.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor={Colors.light.textTertiary}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrap}>
            <Feather name="key" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
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

        <View style={styles.field}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputWrap}>
            <Feather name="check" size={18} color={Colors.light.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={Colors.light.textTertiary}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
            />
          </View>
        </View>

        <Pressable onPress={handleSubmit} disabled={loading} style={[styles.btn, loading && { opacity: 0.7 }]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Change Password</Text>}
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
});
