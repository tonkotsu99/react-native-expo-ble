import type { BLEConnectionStatus } from "@/components/molecules/ConnectionVisualization";
import type { LogEntryData } from "@/components/molecules/LogEntry";
import type { SettingsValues } from "@/components/organisms/SettingsPanel";
import { UserIdModal } from "@/components/organisms/UserIdModal";
import {
  EnhancedMainTemplate,
  type NavigationTab,
} from "@/components/templates/EnhancedMainTemplate";
import { useAttendanceUserId } from "@/hooks/useAttendanceUserId";
import { useBLE } from "@/hooks/useBLE";
import { useGeofencing } from "@/hooks/useGeofencing";
import { useRequireUserId } from "@/hooks/useRequireUserId";
import { getAppState, setAppState, type AppState } from "@/state/appState";
import { MapPin } from "@tamagui/lucide-icons";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import React, { useCallback, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

export default function AttendancePage() {
  // カスタムhookの使用
  const { requestPermissions, startScan, disconnectDevice, connectedDevice } =
    useBLE();
  const {
    userId,
    loading,
    isSaving,
    draftUserId,
    setDraftUserId,
    saveDraftAsUserId,
  } = useAttendanceUserId();
  const requireUserId = useRequireUserId({ userId, loading });
  useGeofencing(); // ジオフェンシングのセットアップ

  // ローカル状態
  const [isScanning, setIsScanning] = useState(false);
  const [appState, setAppStateLocal] = useState<AppState>("OUTSIDE");
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");
  const [activityLogs, setActivityLogs] = useState<LogEntryData[]>([]);
  const [bluetoothEnabled] = useState(true);
  const [hasPermissions, setPermissions] = useState(false);
  const [isUserIdModalOpen, setIsUserIdModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timestamp: Date;
  } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const colorScheme = useColorScheme();

  // 位置情報ベースの状態自動チェック・更新
  const checkAndUpdateLocationBasedState = useCallback(async (): Promise<void> => {
    if (!hasPermissions) {
      console.log("[Auto State Check] 位置情報権限がありません");
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      const kyutechLat = 33.8935;
      const kyutechLng = 130.8412;
      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        kyutechLat,
        kyutechLng
      );

      const currentAppState = await getAppState();
      const withinGeofence = distance <= 1200;

      console.log("[Auto State Check]", {
        distance: `${Math.round(distance)}m`,
        withinGeofence,
        currentState: currentAppState,
      });

      // 状態の自動修正
      if (withinGeofence && currentAppState === "OUTSIDE") {
        await setAppState("INSIDE_AREA");
        setAppStateLocal("INSIDE_AREA");
        
        const autoUpdateLog: LogEntryData = {
          id: Date.now().toString(),
          timestamp: new Date(),
          severity: "success",
          eventType: "system_event",
          title: "状態を自動修正",
          description: `起動時チェック: エリア内にいるため状態を修正 (${Math.round(distance)}m)`,
          details: {
            previousState: currentAppState,
            newState: "INSIDE_AREA",
            distance: `${Math.round(distance)}m`,
            reason: "起動時自動チェック",
          },
        };
        setActivityLogs((prev) => [autoUpdateLog, ...prev]);
        console.log("[Auto State Check] State corrected: OUTSIDE -> INSIDE_AREA");
      } else if (!withinGeofence && currentAppState === "INSIDE_AREA") {
        await setAppState("OUTSIDE");
        setAppStateLocal("OUTSIDE");
        
        const autoUpdateLog: LogEntryData = {
          id: Date.now().toString(),
          timestamp: new Date(),
          severity: "info",
          eventType: "system_event",
          title: "状態を自動修正",
          description: `起動時チェック: エリア外のため状態を修正 (${Math.round(distance)}m)`,
          details: {
            previousState: currentAppState,
            newState: "OUTSIDE",
            distance: `${Math.round(distance)}m`,
            reason: "起動時自動チェック",
          },
        };
        setActivityLogs((prev) => [autoUpdateLog, ...prev]);
        console.log("[Auto State Check] State corrected: INSIDE_AREA -> OUTSIDE");
      }
    } catch (error) {
      console.error("[Auto State Check] エラー:", error);
    }
  }, [hasPermissions]);

  // 2点間の距離計算（ヘーバーサイン公式）
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371000; // 地球の半径（メートル）
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

  // 状態初期化
  useEffect(() => {
    const initializeStates = async () => {
      try {
        const currentAppState = await getAppState();
        setAppStateLocal(currentAppState);

        // 初期化ログエントリ
        const initialLog: LogEntryData = {
          id: "1",
          timestamp: new Date(),
          severity: "info",
          eventType: "app_started",
          title: "App Initialization",
          description: "アプリが正常に起動しました",
        };
        setActivityLogs([initialLog]);

        // アプリ起動時の位置ベース状態チェック（5秒後に実行）
        setTimeout(async () => {
          await checkAndUpdateLocationBasedState();
        }, 5000);
      } catch (error) {
        console.error("状態初期化エラー:", error);
      }
    };

    initializeStates();
  }, [checkAndUpdateLocationBasedState]);

  // 権限チェック
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const granted = await requestPermissions();
        setPermissions(granted);
      } catch {
        setPermissions(false);
      }
    };

    checkPermissions();
  }, [requestPermissions]);

  // BLE接続状態のマッピング
  const bleConnectionStatus: BLEConnectionStatus = connectedDevice
    ? "connected"
    : isScanning
    ? "scanning"
    : bluetoothEnabled
    ? "disconnected"
    : "disabled";

  // ダッシュボード状態の構築
  const dashboardState = {
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
  };

  // 設定値の構築
  const settings: SettingsValues = {
    theme: colorScheme === "dark" ? "dark" : "light",
    notifications: true,
    vibrationFeedback: true,
    autoReconnect: true,
    keepScreenOn: false,
    logLevel: "info" as const,
    autoExportLogs: false,
    dataRetentionDays: 30,
    userId,
  };

  // アクションハンドラー
  const handleScan = useCallback(async (): Promise<void> => {
    const hasUserId = await requireUserId();
    if (!hasUserId) {
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      const errorLog: LogEntryData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        severity: "error",
        eventType: "ble_error",
        title: "Permission Error",
        description: "BLE権限が拒否されました",
        details: { message: "設定から権限を許可してください" },
      };
      setActivityLogs((prev) => [errorLog, ...prev]);
      return;
    }

    setIsScanning(true);
    const scanLog: LogEntryData = {
      id: Date.now().toString(),
      timestamp: new Date(),
      severity: "info",
      eventType: "ble_scan_started",
      title: "Scan Started",
      description: "BLEデバイスの検索を開始しました",
    };
    setActivityLogs((prev) => [scanLog, ...prev]);

    try {
      await startScan();
      const successLog: LogEntryData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        severity: "success",
        eventType: "ble_connected",
        title: "Connection Success",
        description: "BLEデバイスに正常に接続しました",
      };
      setActivityLogs((prev) => [successLog, ...prev]);
    } catch (error) {
      const errorLog: LogEntryData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        severity: "error",
        eventType: "ble_error",
        title: "Connection Failed",
        description: "BLEデバイスへの接続に失敗しました",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
      setActivityLogs((prev) => [errorLog, ...prev]);
    } finally {
      setIsScanning(false);
    }
  }, [requireUserId, requestPermissions, startScan]);

  const handleDisconnect = useCallback(async (): Promise<void> => {
    const hasUserId = await requireUserId();
    if (!hasUserId) {
      return;
    }

    try {
      await disconnectDevice();
      const disconnectLog: LogEntryData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        severity: "info",
        eventType: "ble_disconnected",
        title: "Manual Disconnect",
        description: "BLEデバイスから手動で切断しました",
      };
      setActivityLogs((prev) => [disconnectLog, ...prev]);
    } catch (error) {
      const errorLog: LogEntryData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        severity: "error",
        eventType: "ble_error",
        title: "Disconnect Failed",
        description: "切断に失敗しました",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
      setActivityLogs((prev) => [errorLog, ...prev]);
    }
  }, [disconnectDevice, requireUserId]);

  const handleReconnect = useCallback(async (): Promise<void> => {
    await handleDisconnect();
    setTimeout(() => {
      handleScan();
    }, 1000);
  }, [handleDisconnect, handleScan]);

  const handleCopyDeviceId = useCallback((deviceId: string): void => {
    console.log(`デバイスID ${deviceId} をクリップボードにコピー`);
    // 実際のコピー機能を実装する場合はここに追加
  }, []);

  const handleAppStatePress = useCallback((state: any): void => {
    console.log("アプリ状態が押されました:", state);
  }, []);

  // 位置情報取得関数
  const getCurrentLocation = useCallback(async (): Promise<void> => {
    if (!hasPermissions) {
      console.log("位置情報権限がありません");
      return;
    }

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

      // 九工大エリアとの距離を計算
      const kyutechLat = 33.8935;
      const kyutechLng = 130.8412;
      const distance = calculateDistance(
        newLocation.latitude,
        newLocation.longitude,
        kyutechLat,
        kyutechLng
      );

      const locationLog: LogEntryData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        severity: "info",
        eventType: "location_update",
        title: "位置情報取得",
        description: `現在位置: ${newLocation.latitude.toFixed(
          6
        )}, ${newLocation.longitude.toFixed(6)}`,
        details: {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          accuracy: newLocation.accuracy,
          distanceFromKyutech: `${Math.round(distance)}m`,
          withinGeofence: distance <= 1200 ? "YES" : "NO",
        },
      };
      setActivityLogs((prev) => [locationLog, ...prev]);

      console.log("位置情報取得成功:", {
        ...newLocation,
        distanceFromKyutech: `${Math.round(distance)}m`,
        withinGeofence: distance <= 1200,
      });
    } catch (error) {
      const errorLog: LogEntryData = {
        id: Date.now().toString(),
        timestamp: new Date(),
        severity: "error",
        eventType: "location_error",
        title: "位置情報取得失敗",
        description: "現在位置の取得に失敗しました",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
      setActivityLogs((prev) => [errorLog, ...prev]);
      console.error("位置情報取得エラー:", error);
    } finally {
      setIsLocationLoading(false);
    }
  }, [hasPermissions]);

  // カスタム設定項目（位置情報デバッグ）
  const customSettingsItems = [
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
        const stateLog: LogEntryData = {
          id: Date.now().toString(),
          timestamp: new Date(),
          severity: "info",
          eventType: "system_event",
          title: "アプリ状態確認",
          description: `現在のアプリ状態: ${currentAppState}`,
          details: {
            appState: currentAppState,
            displayedState: appState,
            match: currentAppState === appState ? "一致" : "不一致",
          },
        };
        setActivityLogs((prev) => [stateLog, ...prev]);
        console.log("App State Check:", {
          stored: currentAppState,
          displayed: appState,
        });
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
          const isStarted = await Location.hasStartedGeofencingAsync(taskName);

          const geofenceLog: LogEntryData = {
            id: Date.now().toString(),
            timestamp: new Date(),
            severity: "info",
            eventType: "system_event",
            title: "ジオフェンシング状態",
            description: `タスク登録: ${isRegistered ? "済" : "未"}, 実行中: ${
              isStarted ? "はい" : "いいえ"
            }`,
            details: {
              taskRegistered: isRegistered,
              geofencingStarted: isStarted,
              taskName: taskName,
            },
          };
          setActivityLogs((prev) => [geofenceLog, ...prev]);
          console.log("Geofencing Status:", {
            registered: isRegistered,
            started: isStarted,
          });
        } catch (error) {
          const errorLog: LogEntryData = {
            id: Date.now().toString(),
            timestamp: new Date(),
            severity: "error",
            eventType: "system_event",
            title: "ジオフェンシング状態確認エラー",
            description: "状態確認に失敗しました",
            details: {
              error: error instanceof Error ? error.message : String(error),
            },
          };
          setActivityLogs((prev) => [errorLog, ...prev]);
        }
      },
    },
    {
      id: "forceInsideArea",
      type: "action" as const,
      title: "手動で「エリア内」に設定",
      description: "位置情報が正しい場合、手動で状態を修正",
      onPress: async () => {
        if (!currentLocation) {
          const errorLog: LogEntryData = {
            id: Date.now().toString(),
            timestamp: new Date(),
            severity: "warning",
            eventType: "user_action",
            title: "状態更新失敗",
            description: "まず位置情報を取得してください",
          };
          setActivityLogs((prev) => [errorLog, ...prev]);
          return;
        }

        // 九工大エリアとの距離を再計算
        const kyutechLat = 33.8935;
        const kyutechLng = 130.8412;
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          kyutechLat,
          kyutechLng
        );

        if (distance <= 1200) {
          try {
            await setAppState("INSIDE_AREA");
            setAppStateLocal("INSIDE_AREA");
            
            const updateLog: LogEntryData = {
              id: Date.now().toString(),
              timestamp: new Date(),
              severity: "success",
              eventType: "user_action",
              title: "状態を手動更新",
              description: "アプリ状態を「エリア内」に設定しました",
              details: {
                previousState: appState,
                newState: "INSIDE_AREA",
                distance: `${Math.round(distance)}m`,
                reason: "手動修正",
              },
            };
            setActivityLogs((prev) => [updateLog, ...prev]);
            console.log("Manual state update: OUTSIDE -> INSIDE_AREA");
          } catch (error) {
            const errorLog: LogEntryData = {
              id: Date.now().toString(),
              timestamp: new Date(),
              severity: "error",
              eventType: "user_action",
              title: "状態更新エラー",
              description: "状態の更新に失敗しました",
              details: {
                error: error instanceof Error ? error.message : String(error),
              },
            };
            setActivityLogs((prev) => [errorLog, ...prev]);
          }
        } else {
          const warningLog: LogEntryData = {
            id: Date.now().toString(),
            timestamp: new Date(),
            severity: "warning",
            eventType: "user_action",
            title: "範囲外のため更新拒否",
            description: `九工大エリアから${Math.round(distance)}m離れています`,
            details: {
              distance: `${Math.round(distance)}m`,
              maxDistance: "1200m",
            },
          };
          setActivityLogs((prev) => [warningLog, ...prev]);
        }
      },
    },
    {
      id: "locationInfo",
      type: "info" as const,
      title: "位置情報ステータス",
      description: currentLocation
        ? `緯度: ${currentLocation.latitude.toFixed(
            6
          )}, 経度: ${currentLocation.longitude.toFixed(6)}`
        : "位置情報が取得されていません",
      value: currentLocation
        ? `精度: ±${currentLocation.accuracy?.toFixed(0) || "不明"}m`
        : "未取得",
    },
  ];

  const handleThemeChange = useCallback(
    (theme: "light" | "dark" | "system"): void => {
      console.log("テーマ変更:", theme);
      // テーマ変更ロジックを実装
    },
    []
  );

  const handleSettingChange = useCallback(
    (key: keyof SettingsValues, value: any): void => {
      console.log(`設定変更: ${key} = ${value}`);
      // 設定変更ロジックを実装
    },
    []
  );

  const handleRefreshDashboard = useCallback((): void => {
    const refreshLog: LogEntryData = {
      id: Date.now().toString(),
      timestamp: new Date(),
      severity: "info",
      eventType: "user_action",
      title: "Dashboard Refresh",
      description: "ダッシュボードを更新しました",
    };
    setActivityLogs((prev) => [refreshLog, ...prev]);
  }, []);

  const handleLogPress = useCallback((log: LogEntryData): void => {
    console.log("ログエントリが選択されました:", log);
  }, []);

  const handleLogDetails = useCallback((log: LogEntryData): void => {
    console.log("ログ詳細表示:", log);
  }, []);

  const handleRefreshLogs = useCallback((): void => {
    const refreshLog: LogEntryData = {
      id: Date.now().toString(),
      timestamp: new Date(),
      severity: "info",
      eventType: "user_action",
      title: "Logs Refresh",
      description: "ログリストを更新しました",
    };
    setActivityLogs((prev) => [refreshLog, ...prev]);
  }, []);

  const handleClearLogs = useCallback((): void => {
    setActivityLogs([]);
    const clearLog: LogEntryData = {
      id: Date.now().toString(),
      timestamp: new Date(),
      severity: "info",
      eventType: "user_action",
      title: "Logs Cleared",
      description: "ログがクリアされました",
    };
    setActivityLogs([clearLog]);
  }, []);

  // UserIDモーダル関連
  const handleOpenUserIdModal = useCallback(() => {
    setIsUserIdModalOpen(true);
  }, []);

  const handleCloseUserIdModal = useCallback(() => {
    setIsUserIdModalOpen(false);
  }, []);

  // UserID保存ハンドラー
  const handleUserIdSave = useCallback(
    async (userId: string): Promise<void> => {
      try {
        setDraftUserId(userId);
        await saveDraftAsUserId();
      } catch (error) {
        console.error("UserID保存エラー:", error);
      }
    },
    [setDraftUserId, saveDraftAsUserId]
  );

  const handleExportLogs = useCallback((): void => {
    console.log("ログエクスポート開始");
    const exportLog: LogEntryData = {
      id: Date.now().toString(),
      timestamp: new Date(),
      severity: "info",
      eventType: "user_action",
      title: "Logs Export",
      description: "ログをエクスポートしました",
    };
    setActivityLogs((prev) => [exportLog, ...prev]);
  }, []);

  return (
    <>
      <EnhancedMainTemplate
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
        logs={activityLogs}
        settings={settings}
        customSettingsItems={customSettingsItems}
        onStartScan={handleScan}
        onStopScan={() => setIsScanning(false)}
        onConnect={handleScan}
        onDisconnect={handleDisconnect}
        onReconnect={handleReconnect}
        onCopyDeviceId={handleCopyDeviceId}
        onAppStatePress={handleAppStatePress}
        onThemeChange={handleThemeChange}
        onSettingChange={handleSettingChange}
        onRefreshDashboard={handleRefreshDashboard}
        onLogPress={handleLogPress}
        onLogDetails={handleLogDetails}
        onRefreshLogs={handleRefreshLogs}
        onClearLogs={handleClearLogs}
        onExportLogs={handleExportLogs}
        onUserIdSave={handleUserIdSave}
        onUserIdModalOpen={handleOpenUserIdModal}
        userIdLoading={loading}
        userIdSaving={isSaving}
        isLoading={loading || isSaving}
        hasPermissions={hasPermissions}
        bluetoothEnabled={bluetoothEnabled}
        accessibilityLabel="BLE出席管理メインページ"
      />

      {/* UserIdモーダル */}
      <UserIdModal
        isOpen={isUserIdModalOpen}
        onClose={handleCloseUserIdModal}
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
