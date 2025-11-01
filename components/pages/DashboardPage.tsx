import type { BLEConnectionStatus } from "@/components/molecules/ConnectionVisualization";
import { DashboardTemplate } from "@/components/templates/DashboardTemplate";
import { useBLE } from "@/hooks/useBLE";
import { useRequireUserId } from "@/hooks/useRequireUserId";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getAppState, type AppState } from "@/state/appState";
import React, { useCallback, useEffect, useMemo, useState } from "react";

export default function DashboardPage() {
  // Hooks
  const { requestPermissions, startScan, disconnectDevice, connectedDevice } =
    useBLE();

  // Ensure we reference the real persisted userId
  const { userId, loading } = useUserProfile();
  const requireUserId = useRequireUserId({ userId, loading });

  // Local state
  const [isScanning, setIsScanning] = useState(false);
  const [appState, setAppStateLocal] = useState<AppState>("OUTSIDE");

  // Initialize app state once
  useEffect(() => {
    (async () => {
      try {
        const s = await getAppState();
        setAppStateLocal(s);
      } catch (e) {
        console.warn("Failed to read app state", e);
      }
    })();
  }, []);

  const bleConnectionStatus: BLEConnectionStatus = useMemo(() => {
    return connectedDevice
      ? "connected"
      : isScanning
      ? "scanning"
      : "disconnected";
  }, [connectedDevice, isScanning]);

  const dashboardState = useMemo(
    () => ({
      appState,
      appStateTimestamp: new Date(),
      bleConnectionStatus,
      deviceInfo: connectedDevice
        ? {
            id: connectedDevice.id,
            name: connectedDevice.name || "Unknown Device",
            rssi: connectedDevice.rssi || undefined,
          }
        : undefined,
      lastUpdated: new Date(),
      isOnline: true,
      hasUnreadLogs: false,
    }),
    [appState, bleConnectionStatus, connectedDevice]
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
    console.log("Dashboard refreshed");
  }, []);

  return (
    <DashboardTemplate
      dashboardState={dashboardState}
      connectionStatus={bleConnectionStatus}
      deviceInfo={
        connectedDevice
          ? {
              id: connectedDevice.id,
              name: connectedDevice.name || "Unknown Device",
              rssi: connectedDevice.rssi || undefined,
            }
          : undefined
      }
      onReconnect={handleReconnect}
      onDisconnect={handleDisconnect}
      onCopyDeviceId={handleCopyDeviceId}
      onAppStatePress={handleAppStatePress}
      onRefreshDashboard={handleRefreshDashboard}
      accessibilityLabel="Dashboard"
    />
  );
}
