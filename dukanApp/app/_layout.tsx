import {
  Sora_400Regular,
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts as useSoraFonts,
} from "@expo-google-fonts/sora";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  useFonts as useManropeFonts,
} from "@expo-google-fonts/manrope";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import Colors from "@/constants/colors";

void SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      <Stack.Screen name="(owner)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [soraLoaded, soraError] = useSoraFonts({
    Sora_400Regular,
    Sora_600SemiBold,
    Sora_700Bold,
  });
  const [manropeLoaded, manropeError] = useManropeFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const fontsLoaded = soraLoaded && manropeLoaded;
  const fontError = soraError || manropeError;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, []);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
              <AuthProvider>
                <RootLayoutNav />
              </AuthProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
