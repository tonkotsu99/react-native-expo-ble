import { bleManager } from "@/bluetooth/bleManagerInstance";
import {
  getPresenceLastSeen,
  getPresenceMetadata,
  PRESENCE_TTL_MS,
  resetPresenceSession,
} from "@/bluetooth/bleStateUtils";
import {
  addDetectionListener,
  removeDetectionListener,
  startContinuousBleScanner,
  stopContinuousBleScanner,
} from "@/bluetooth/continuousScan";
import { DEBUG_BLE } from "@/constants";
import { getAppState, setAppState, subscribeAppState } from "@/state/appState";
import {
  sendBleDisconnectedNotification,
  sendBlePermissionErrorNotification,
  sendBluetoothDisabledNotification,
  sendDebugNotification,
} from "@/utils/notifications";
import * as DeviceInfo from "expo-device";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { State } from "react-native-ble-plx";

export type BeaconDetection = {
  id: string;
  name: string | null;
  rssi: number | null;
  lastSeen: number;
};

interface UseBLE {
  requestPermissions(): Promise<boolean>;
  startScan(): Promise<void>;
  disconnectDevice(): Promise<void>;
  refresh(): Promise<void>;
  detectedBeacon: BeaconDetection | null;
}

export const useBLE = (): UseBLE => {
  const [detectedBeacon, setDetectedBeacon] = useState<BeaconDetection | null>(
    null
  );

  const debug = useCallback(async (title: string, body: string) => {
    console.log(`[BLE][DEBUG] ${title}: ${body}`);
    if (!DEBUG_BLE) return;
    try {
      await sendDebugNotification(title, body);
    } catch {
      // ignore notification failures in debug helper
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "ios") {
      try {
        const state = await bleManager.state();
        if (DEBUG_BLE) {
          console.log(`iOS Bluetooth状態: ${state}`);
          await debug("BLE State (iOS)", String(state));
        }

        switch (state) {
          case State.PoweredOn:
            return true;
          case State.PoweredOff:
            console.warn("Bluetoothが無効です。設定から有効にしてください。");
            await sendBluetoothDisabledNotification();
            if (DEBUG_BLE) await debug("BLE Disabled", "PoweredOff");
            return false;
          case State.Unauthorized:
            console.warn(
              "Bluetooth権限が拒否されています。設定から許可してください。"
            );
            await sendBlePermissionErrorNotification();
            if (DEBUG_BLE) await debug("BLE Unauthorized", "No permission");
            return false;
          case State.Unsupported:
            console.error("このデバイスはBluetoothをサポートしていません。");
            await sendBlePermissionErrorNotification();
            if (DEBUG_BLE) await debug("BLE Unsupported", "Not supported");
            return false;
          default:
            console.warn(`Bluetooth状態が不明です: ${state}`);
            await sendBlePermissionErrorNotification();
            if (DEBUG_BLE) await debug("BLE Unknown", String(state));
            return false;
        }
      } catch (error) {
        console.error("iOS Bluetooth状態取得エラー:", error);
        await sendBlePermissionErrorNotification();
        if (DEBUG_BLE) await debug("BLE State Error", String(error));
        return false;
      }
    }

    if (Platform.OS === "android") {
      const sdkVersion = DeviceInfo.platformApiLevel;
      if (!sdkVersion) {
        return false;
      }

      if (sdkVersion < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "位置情報権限",
            message:
              "BLEスキャンのために位置情報へのアクセスを許可してください。",
            buttonPositive: "OK",
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ]);

      const scanGranted =
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const connectGranted =
        result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
        PermissionsAndroid.RESULTS.GRANTED;

      return scanGranted && connectGranted;
    }

    return true;
  }, [debug]);

  const setPresenceState = useCallback(
    async (state: "PRESENT" | "UNCONFIRMED") => {
      try {
        const current = await getAppState();
        if (current === state) return;
        if (state === "UNCONFIRMED" && current === "OUTSIDE") return;
        await setAppState(state);
      } catch (error) {
        console.warn("[BLE] Failed to update app state", error);
      }
    },
    []
  );

  const startScan = useCallback(async (): Promise<void> => {
    await startContinuousBleScanner();
  }, []);

  const disconnectDevice = useCallback(async (): Promise<void> => {
    await stopContinuousBleScanner();
    await resetPresenceSession();
    setDetectedBeacon(null);
    await setPresenceState("UNCONFIRMED");
    await sendBleDisconnectedNotification(null);
  }, [setPresenceState]);

  const refresh = useCallback(async (): Promise<void> => {
    const [metadata, lastSeen] = await Promise.all([
      getPresenceMetadata(),
      getPresenceLastSeen(),
    ]);

    if (!lastSeen) {
      setDetectedBeacon(null);
      return;
    }

    const age = Date.now() - lastSeen;
    if (age >= PRESENCE_TTL_MS) {
      setDetectedBeacon(null);
      return;
    }

    setDetectedBeacon((previous) => {
      const fallback = previous ?? {
        id: metadata?.deviceId ?? "unknown",
        name: metadata?.deviceName ?? null,
        rssi: metadata?.rssi ?? null,
        lastSeen,
      };
      return {
        id: metadata?.deviceId ?? fallback.id,
        name: metadata?.deviceName ?? fallback.name ?? null,
        rssi: metadata?.rssi ?? fallback.rssi ?? null,
        lastSeen,
      };
    });
  }, []);

  useEffect(() => {
    const handleDetection = (detection: {
      deviceId: string;
      deviceName: string | null;
      rssi: number | null;
    }) => {
      setDetectedBeacon({
        id: detection.deviceId,
        name: detection.deviceName,
        rssi: detection.rssi,
        lastSeen: Date.now(),
      });
    };

    addDetectionListener(handleDetection);
    return () => {
      removeDetectionListener(handleDetection);
    };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = subscribeAppState((state) => {
      if (state !== "PRESENT") {
        setDetectedBeacon(null);
      }
    });
    return () => {
      try {
        subscription();
      } catch {}
    };
  }, []);

  useEffect(() => {
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refresh();
      }
    });

    const bleSub = bleManager.onStateChange((state) => {
      if (state === State.PoweredOn) {
        void refresh();
      }
    }, true);

    return () => {
      try {
        appStateSub.remove();
      } catch {}
      try {
        bleSub.remove();
      } catch {}
    };
  }, [refresh]);

  return useMemo(
    () => ({
      requestPermissions,
      startScan,
      disconnectDevice,
      refresh,
      detectedBeacon,
    }),
    [requestPermissions, startScan, disconnectDevice, refresh, detectedBeacon]
  );
};
