import {
  Activity,
  Settings as SettingsIcon,
  Wifi,
} from "@tamagui/lucide-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

export default function TabsLayout() {
  const TabBarHitSlopButton = React.useMemo(() => {
    const C = React.forwardRef<any, any>((props, ref) => (
      <Pressable ref={ref as any} hitSlop={16} {...props} />
    ));
    C.displayName = "TabBarHitSlopButton";
    return C;
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // タブボタンのタッチターゲットを拡大
        tabBarStyle: {
          height: 72,
          paddingVertical: 8,
          paddingBottom: 10, // ホームインジケータとの干渉を避ける
        },
        tabBarItemStyle: {
          paddingVertical: 6,
          minHeight: 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
        },
        // ボタン自体のヒット領域を拡大
        tabBarButton: (props) => <TabBarHitSlopButton {...props} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            // lucide icons don't use size/color props directly in RN, but keep minimal here
            <View pointerEvents="none">
              <Activity color={color as any} size={28 as any} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="connection"
        options={{
          title: "Connection",
          tabBarIcon: ({ color }) => (
            <View pointerEvents="none">
              <Wifi color={color as any} size={28 as any} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <View pointerEvents="none">
              <SettingsIcon color={color as any} size={28 as any} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
