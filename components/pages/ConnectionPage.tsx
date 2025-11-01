import type { BLEConnectionStatus } from "@/components/molecules/ConnectionVisualization";
import { ConnectionTemplate } from "@/components/templates/ConnectionTemplate";
import { useBLE } from "@/hooks/useBLE";
import { useRequireUserId } from "@/hooks/useRequireUserId";
import { useUserProfile } from "@/hooks/useUserProfile";
import React, { useCallback, useMemo, useState } from "react";

export default function ConnectionPage() {
  const { requestPermissions, startScan, disconnectDevice, connectedDevice } =
    useBLE();

  // Use persisted userId so connection actions don't get blocked incorrectly
  const { userId, loading } = useUserProfile();
  const requireUserId = useRequireUserId({ userId, loading });

  const [isScanning, setIsScanning] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [bluetoothEnabled] = useState(true);

  const bleConnectionStatus: BLEConnectionStatus = useMemo(() => {
    return connectedDevice
      ? "connected"
      : isScanning
      ? "scanning"
      : bluetoothEnabled
      ? "disconnected"
      : "disabled";
  }, [connectedDevice, isScanning, bluetoothEnabled]);

  const ensurePermissions = useCallback(async () => {
    try {
      const granted = await requestPermissions();
      setHasPermissions(granted);
      return granted;
    } catch {
      setHasPermissions(false);
      return false;
    }
  }, [requestPermissions]);

  const handleScan = useCallback(async () => {
    const ok = await requireUserId();
    if (!ok) return;
    const granted = await ensurePermissions();
    if (!granted) return;
    setIsScanning(true);
    try {
      await startScan();
    } catch (e) {
      console.warn("Scan error", e);
    } finally {
      setIsScanning(false);
    }
  }, [requireUserId, ensurePermissions, startScan]);

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

  return (
    <ConnectionTemplate
      dashboardState={{
        appState: "OUTSIDE",
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
      }}
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
      onStartScan={handleScan}
      onStopScan={() => setIsScanning(false)}
      onConnect={handleScan}
      onDisconnect={handleDisconnect}
      onReconnect={handleReconnect}
      onCopyDeviceId={handleCopyDeviceId}
      hasPermissions={hasPermissions}
      bluetoothEnabled={bluetoothEnabled}
      accessibilityLabel="Connection"
    />
  );
}
