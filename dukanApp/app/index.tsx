import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/(auth)/welcome");
    } else if (user.role === "business_owner") {
      router.replace("/(owner)");
    } else {
      router.replace("/(customer)");
    }
  }, [user, isLoading]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
