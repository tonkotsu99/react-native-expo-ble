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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            // lucide icons don't use size/color props directly in RN, but keep minimal here
            <Activity color={color as any} size={size as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="connection"
        options={{
          title: "Connection",
          tabBarIcon: ({ color, size }) => (
            <Wifi color={color as any} size={size as any} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon color={color as any} size={size as any} />
          ),
        }}
      />
    </Tabs>
  );
}
