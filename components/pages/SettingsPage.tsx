import type { SettingsValues } from "@/components/organisms/SettingsPanel";
import { UserIdModal } from "@/components/organisms/UserIdModal";
import { SettingsTemplate } from "@/components/templates/SettingsTemplate";
import { useAttendanceUserId } from "@/hooks/useAttendanceUserId";
import { useBLE } from "@/hooks/useBLE";
import { getAppState, setAppState, type AppState } from "@/state/appState";
import { MapPin } from "@tamagui/lucide-icons";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

export default function SettingsPage() {
  const { requestPermissions } = useBLE();
  const {
    userId,
    loading,
    isSaving,
    draftUserId,
    setDraftUserId,
    saveDraftAsUserId,
  } = useAttendanceUserId();
  // Settings screen does not initiate BLE actions; no need to require userId here

  const colorScheme = useColorScheme();
  const [hasPermissions, setPermissions] = useState(false);
  const [appState, setAppStateLocal] = useState<AppState>("OUTSIDE");
  const [isUserIdModalOpen, setIsUserIdModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timestamp: Date;
  } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const granted = await requestPermissions();
      setPermissions(granted);
      try {
        const s = await getAppState();
        setAppStateLocal(s);
      } catch {}
    })();
  }, [requestPermissions]);

  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCurrentLocation = useCallback(async (): Promise<void> => {
    if (!hasPermissions) return;
    setIsLocationLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(),
      };
      setCurrentLocation(newLocation);
    } finally {
      setIsLocationLoading(false);
    }
  }, [hasPermissions]);

  const customSettingsItems = useMemo(
    () => [
      {
        id: "getCurrentLocation",
        type: "action" as const,
        title: "現在位置を取得",
        description: currentLocation
          ? `最終取得: ${currentLocation.timestamp.toLocaleTimeString()}`
          : "位置情報とジオフェンシングの状態を確認",
        icon: MapPin,
        onPress: getCurrentLocation,
        disabled: isLocationLoading || !hasPermissions,
      },
      {
        id: "checkAppState",
        type: "action" as const,
        title: "アプリ状態を確認",
        description: `現在: ${appState}`,
        onPress: async () => {
          const currentAppState = await getAppState();
          console.log("App State:", currentAppState);
        },
      },
      {
        id: "checkGeofencing",
        type: "action" as const,
        title: "ジオフェンシング状態確認",
        description: "ジオフェンシングタスクの状態を確認",
        onPress: async () => {
          try {
            const taskName = "background-geofencing-task";
            const isRegistered = await TaskManager.isTaskRegisteredAsync(
              taskName
            );
            const isStarted = await Location.hasStartedGeofencingAsync(
              taskName
            );
            console.log("Geofencing Status", { isRegistered, isStarted });
          } catch (e) {
            console.warn("Geofencing status error", e);
          }
        },
      },
      {
        id: "forceInsideArea",
        type: "action" as const,
        title: "手動で「エリア内」に設定",
        description: "位置情報が正しい場合、手動で状態を修正",
        onPress: async () => {
          if (!currentLocation) return;
          const kyutechLat = 33.8935;
          const kyutechLng = 130.8412;
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            kyutechLat,
            kyutechLng
          );
          if (distance <= 1200) {
            await setAppState("INSIDE_AREA");
            setAppStateLocal("INSIDE_AREA");
          } else {
            console.log("範囲外のため更新拒否", distance);
          }
        },
      },
    ],
    [
      appState,
      currentLocation,
      getCurrentLocation,
      hasPermissions,
      isLocationLoading,
    ]
  );

  const [settings, setSettings] = useState<SettingsValues>({
    theme: colorScheme === "dark" ? "dark" : "light",
    notifications: true,
    vibrationFeedback: true,
    autoReconnect: true,
    keepScreenOn: false,
    logLevel: "info",
    autoExportLogs: false,
    dataRetentionDays: 30,
    userId,
  });

  // 外部要因で userId / theme が更新された場合に同期
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      theme: colorScheme === "dark" ? "dark" : "light",
      userId,
    }));
  }, [colorScheme, userId]);

  // テーマ変更UIは撤去

  const handleSettingChange = useCallback(
    (key: keyof SettingsValues, value: any) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleUserIdSave = useCallback(
    async (value: string) => {
      try {
        setDraftUserId(value);
        await saveDraftAsUserId();
      } catch (e) {
        console.warn("UserId save failed", e);
      }
    },
    [saveDraftAsUserId, setDraftUserId]
  );

  return (
    <>
      <SettingsTemplate
        dashboardState={{
          appState,
          appStateTimestamp: new Date(),
          bleConnectionStatus: "disconnected",
          deviceInfo: undefined,
          lastUpdated: new Date(),
          isOnline: true,
          hasUnreadLogs: false,
        }}
        settings={settings}
        customSettingsItems={customSettingsItems}
        onSettingChange={handleSettingChange}
        onUserIdSave={handleUserIdSave}
        onUserIdModalOpen={() => setIsUserIdModalOpen(true)}
        userIdLoading={loading}
        userIdSaving={isSaving}
        accessibilityLabel="Settings"
      />

      <UserIdModal
        isOpen={isUserIdModalOpen}
        onClose={() => setIsUserIdModalOpen(false)}
        userId={userId}
        draftUserId={draftUserId}
        onDraftUserIdChange={setDraftUserId}
        onSave={saveDraftAsUserId}
        saving={isSaving}
        loading={loading}
        hintVisible={!loading && !userId}
      />
    </>
  );
}
