import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="businesses">
        <Icon sf={{ default: "storefront", selected: "storefront.fill" }} />
        <Label>Businesses</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings">
        <Icon sf={{ default: "calendar", selected: ("calendar.fill" as any) }} />
        <Label>Bookings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inquiries">
        <Icon sf={{ default: "message", selected: "message.fill" }} />
        <Label>Inquiries</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>Settings</Label>
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
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault,
        tabBarLabelStyle: {
          fontFamily: "Manrope_600SemiBold",
          fontSize: 11,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "#0A1A18" : "#fff",
          borderTopWidth: 0.5,
          borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
          elevation: 0,
          paddingBottom: isWeb ? 12 : insets.bottom,
          paddingTop: 8,
          height: isWeb ? 72 : 56 + insets.bottom,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#0A1A18" : "#fff" }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) =>
            isIOS
              ? <SymbolView name={focused ? "square.grid.2x2.fill" : "square.grid.2x2"} tintColor={color} size={22} />
              : <Feather name="grid" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="businesses"
        options={{
          title: "Businesses",
          tabBarIcon: ({ color, focused }) =>
            isIOS
              ? <SymbolView name={focused ? "storefront.fill" : "storefront"} tintColor={color} size={22} />
              : <Feather name="briefcase" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) =>
            isIOS
              ? <SymbolView name={focused ? ("calendar.fill" as any) : "calendar"} tintColor={color} size={22} />
              : <Feather name="calendar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inquiries"
        options={{
          title: "Inquiries",
          tabBarIcon: ({ color, focused }) =>
            isIOS
              ? <SymbolView name={focused ? "message.fill" : "message"} tintColor={color} size={22} />
              : <Feather name="message-circle" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) =>
            isIOS
              ? <SymbolView name={focused ? "gearshape.fill" : "gearshape"} tintColor={color} size={22} />
              : <Feather name="settings" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function OwnerTabLayout() {
  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
