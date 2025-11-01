import { useGeofencing } from "@/hooks/useGeofencing";
import tamaguiConfig from "@/tamagui.config";
import {
  configureNotifications,
  requestNotificationPermissions,
} from "@/utils/notifications";
import { Slot } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PortalProvider, TamaguiProvider } from "tamagui";

export default function RootLayout() {
  useGeofencing();

  // 通知の初期化
  useEffect(() => {
    configureNotifications();
    requestNotificationPermissions();
  }, []);

  return (
    <TamaguiProvider config={tamaguiConfig}>
      <SafeAreaProvider>
        <PortalProvider>
          <StatusBar />
          <Slot />
        </PortalProvider>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}
