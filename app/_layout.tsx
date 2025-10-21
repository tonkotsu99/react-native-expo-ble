import { useGeofencing } from "@/hooks/useGeofencing";
import tamaguiConfig from "@/tamagui.config";
import { Slot } from "expo-router";
import { StatusBar } from "react-native";
import { TamaguiProvider } from "tamagui";

export default function RootLayout() {
  useGeofencing();
  
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <StatusBar />
      <Slot />
    </TamaguiProvider>
  )
}