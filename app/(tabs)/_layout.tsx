import {
  Activity,
  Settings as SettingsIcon,
  Wifi,
} from "@tamagui/lucide-icons";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // タブボタンのタッチターゲットを拡大
        tabBarStyle: {
          height: 72,
          paddingVertical: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
          minHeight: 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            // lucide icons don't use size/color props directly in RN, but keep minimal here
            <Activity color={color as any} size={28 as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="connection"
        options={{
          title: "Connection",
          tabBarIcon: ({ color }) => (
            <Wifi color={color as any} size={28 as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <SettingsIcon color={color as any} size={28 as any} />
          ),
        }}
      />
    </Tabs>
  );
}
