import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useDeviceLocation } from "@/hooks/useDeviceLocation";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Discover</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cities">
        <Icon sf={{ default: "mappin.and.ellipse", selected: "mappin.and.ellipse" }} />
        <Label>Cities</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stories">
        <Icon sf={{ default: "play.rectangle", selected: "play.rectangle.fill" }} />
        <Label>Stories</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings">
        <Icon sf={{ default: "calendar", selected: ("calendar.fill" as any) }} />
        <Label>Bookings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? Colors.dark.surface : Colors.light.surface,
          borderTopWidth: 0.5,
          borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
          elevation: 0,
          paddingBottom: insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="house.fill" tintColor={color} size={22} /> : <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cities"
        options={{
          title: "Cities",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="mappin.and.ellipse" tintColor={color} size={22} /> : <Feather name="map-pin" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="magnifyingglass" tintColor={color} size={22} /> : <Feather name="search" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          title: "Stories",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="play.rectangle" tintColor={color} size={22} /> : <Feather name="play-circle" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="calendar" tintColor={color} size={22} /> : <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.fill" tintColor={color} size={22} /> : <Feather name="user" size={22} color={color} />,
        }}
      />

      {/* Hidden routes (should not appear as tabs) */}
      <Tabs.Screen name="booking" options={{ href: null }} />
      <Tabs.Screen name="business/[id]" options={{ href: null }} />
      <Tabs.Screen name="pricing" options={{ href: null }} />
      <Tabs.Screen name="referrals" options={{ href: null }} />
      <Tabs.Screen name="wallet" options={{ href: null }} />
    </Tabs>
  );
}

export default function CustomerTabLayout() {
  const { accessToken } = useAuth();
  const { location, loading, permissionDenied, requestLocation } = useDeviceLocation(accessToken);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  if (!location) {
    return (
      <View style={styles.locationGate}>
        <View style={styles.locationCard}>
          <Feather name="map-pin" size={24} color={Colors.primary} />
          <Text style={styles.locationTitle}>Location Required</Text>
          <Text style={styles.locationSubtitle}>
            Nearby dukandars dikhane ke liye location allow karna zaroori hai.
          </Text>
          <Pressable style={styles.locationButton} onPress={requestLocation} disabled={loading}>
            <Text style={styles.locationButtonText}>{loading ? "Detecting..." : "Allow Location"}</Text>
          </Pressable>
          {permissionDenied ? (
            <Pressable style={styles.settingsButton} onPress={() => Linking.openSettings()}>
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </Pressable>
          ) : null}
          {permissionDenied ? (
            <Text style={styles.locationHint}>Location deny hua hai. Settings me allow kijiye.</Text>
          ) : null}
        </View>
      </View>
    );
  }

  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  locationGate: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  locationCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  locationTitle: { fontFamily: "Sora_700Bold", fontSize: 18, color: Colors.light.text },
  locationSubtitle: { fontFamily: "Manrope_400Regular", fontSize: 13, color: Colors.light.textSecondary, textAlign: "center" },
  locationButton: {
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  locationButtonText: { fontFamily: "Manrope_600SemiBold", color: "#fff", fontSize: 13 },
  settingsButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  settingsButtonText: { fontFamily: "Manrope_600SemiBold", color: Colors.primary, fontSize: 13 },
  locationHint: { fontFamily: "Manrope_400Regular", fontSize: 12, color: "#F97316", textAlign: "center" },
});
