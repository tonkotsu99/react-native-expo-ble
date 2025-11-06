import type { BLEConnectionStatus } from "@/components/molecules/ConnectionVisualization";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import { useBLEContext } from "@/hooks/bleContext";
import { useAppState } from "@/hooks/useAppState";
import { useRequireUserId } from "@/hooks/useRequireUserId";
import { useUserProfile } from "@/hooks/useUserProfile";
import React, { useCallback, useMemo, useState } from "react";

export default function DashboardPage() {
  // Hooks
  const {
    requestPermissions,
    startScan,
    disconnectDevice,
    detectedBeacon,
    refresh,
  } = useBLEContext();

  // Ensure we reference the real persisted userId
  const { userId, loading } = useUserProfile();
  const requireUserId = useRequireUserId({ userId, loading });

  // Local state
  const [isScanning, setIsScanning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const appState = useAppState();

  // App state is kept in sync by useAppState

  const bleConnectionStatus: BLEConnectionStatus = useMemo(() => {
    return detectedBeacon
      ? "connected"
      : isScanning
      ? "scanning"
      : "disconnected";
  }, [detectedBeacon, isScanning]);

  const dashboardState = useMemo(
    () => ({
      appState,
      appStateTimestamp: new Date(),
      bleConnectionStatus,
      deviceInfo: detectedBeacon
        ? {
            id: detectedBeacon.id,
            name: detectedBeacon.name || "Unknown Device",
            rssi: detectedBeacon.rssi ?? undefined,
            lastSeen: new Date(detectedBeacon.lastSeen),
          }
        : undefined,
      lastUpdated: new Date(),
      isOnline: true,
      hasUnreadLogs: false,
    }),
    [appState, bleConnectionStatus, detectedBeacon]
  );

  const handleScan = useCallback(async () => {
    const ok = await requireUserId();
    if (!ok) return;
    const granted = await requestPermissions();
    if (!granted) return;
    setIsScanning(true);
    try {
      await startScan();
    } catch (e) {
      console.warn("Scan error", e);
    } finally {
      setIsScanning(false);
    }
  }, [requireUserId, requestPermissions, startScan]);

  const handleDisconnect = useCallback(async () => {
    const ok = await requireUserId();
    if (!ok) return;
    try {
      await disconnectDevice();
    } catch (e) {
      console.warn("Disconnect error", e);
    }
  }, [disconnectDevice, requireUserId]);

  const handleReconnect = useCallback(async () => {
    await handleDisconnect();
    setTimeout(() => {
      handleScan();
    }, 800);
  }, [handleDisconnect, handleScan]);

  const handleCopyDeviceId = useCallback((id: string) => {
    console.log("Copy deviceId:", id);
  }, []);

  const handleAppStatePress = useCallback((state: any) => {
    console.log("App state pressed:", state);
  }, []);

  const handleRefreshDashboard = useCallback(() => {
    setIsRefreshing(true);
    (async () => {
      try {
        // Refresh app state from storage
        // Lightweight BLE sync: refresh detection metadata without scanning
        await requestPermissions();
        await refresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 300);
      }
    })();
  }, [requestPermissions, refresh]);

  return (
    <DashboardTemplate
      dashboardState={dashboardState}
      connectionStatus={bleConnectionStatus}
      deviceInfo={
        detectedBeacon
          ? {
              id: detectedBeacon.id,
              name: detectedBeacon.name || "Unknown Device",
              rssi: detectedBeacon.rssi ?? undefined,
              lastSeen: new Date(detectedBeacon.lastSeen),
            }
          : undefined
      }
      isRefreshing={isRefreshing}
      onReconnect={handleReconnect}
      onDisconnect={handleDisconnect}
      onCopyDeviceId={handleCopyDeviceId}
      onAppStatePress={handleAppStatePress}
      onRefreshDashboard={handleRefreshDashboard}
      accessibilityLabel="Dashboard"
    />
  );
}
