import { bleManager } from "@/bluetooth/bleManagerInstance";
import {
  getPresenceEnterSentAt,
  getPresenceLastSeen,
  getPresenceMetadata,
  PRESENCE_TTL_MS,
  recordPresenceDetection,
  resetPresenceSession,
  setPresenceEnterSentAt,
} from "@/bluetooth/bleStateUtils";
import {
  API_URL_ENTER,
  BLE_DEVICE_NAME_PREFIXES,
  BLE_SERVICE_UUIDS,
  DEBUG_BLE,
} from "@/constants";
import { getAppState, setAppState, subscribeAppState } from "@/state/appState";
import { getUserId } from "@/state/userProfile";
import {
  sendBleConnectedNotification,
  sendBleDisconnectedNotification,
  sendBlePermissionErrorNotification,
  sendBluetoothDisabledNotification,
  sendDebugNotification,
} from "@/utils/notifications";
import * as DeviceInfo from "expo-device";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { Device, State } from "react-native-ble-plx";

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

const postEnterAttendance = async (payload: {
  deviceId: string;
  deviceName: string | null;
  serviceUUIDs?: string[] | null;
}): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.warn("[BLE] Skipping enter attendance: missing userId");
      return;
    }

    const response = await fetch(API_URL_ENTER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: payload.deviceId,
        deviceName: payload.deviceName,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    console.log("[BLE] Enter attendance posted", payload);
  } catch (error) {
    console.error(
      "[BLE] Failed to post enter attendance",
      (error as Error).message
    );
  }
};

export const useBLE = (): UseBLE => {
  const [detectedBeacon, setDetectedBeacon] = useState<BeaconDetection | null>(
    null
  );
  const isScanningRef = useRef(false);

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

  const handleDetection = useCallback(async (device: Device): Promise<void> => {
    const timestamp = Date.now();
    const detectionPayload = {
      deviceId: device.id,
      deviceName: device.name ?? null,
      rssi: typeof device.rssi === "number" ? device.rssi : null,
    };

    await recordPresenceDetection(detectionPayload, timestamp);

    setDetectedBeacon({
      id: detectionPayload.deviceId,
      name: detectionPayload.deviceName,
      rssi: detectionPayload.rssi,
      lastSeen: timestamp,
    });

    const previousState = await getAppState();
    if (previousState !== "PRESENT") {
      await setAppState("PRESENT");
      await sendBleConnectedNotification(detectionPayload.deviceName);
    }

    const enterSentAt = await getPresenceEnterSentAt();
    if (enterSentAt === null) {
      await postEnterAttendance({
        deviceId: detectionPayload.deviceId,
        deviceName: detectionPayload.deviceName,
        serviceUUIDs: device.serviceUUIDs,
      });
      await setPresenceEnterSentAt(timestamp);
    }
  }, []);

  const startScan = useCallback(async (): Promise<void> => {
    if (isScanningRef.current) {
      await debug("Scan Skipped", "scan already in progress");
      return;
    }

    const userId = await getUserId();
    if (!userId) {
      const message = "[BLE] Cannot start scan: missing userId";
      console.warn(message);
      await debug("Scan Skipped", "missing userId");
      throw new Error(message);
    }

    isScanningRef.current = true;

    const normalizedServiceUUIDs = BLE_SERVICE_UUIDS.map((uuid) =>
      uuid.toLowerCase()
    );
    const normalizedNamePrefixes = BLE_DEVICE_NAME_PREFIXES.map((prefix) =>
      prefix.toLowerCase()
    );

    await new Promise<void>((resolve, reject) => {
      let finished = false;

      const stopScan = () => {
        try {
          bleManager.stopDeviceScan();
        } catch {}
      };

      const timeoutMs = 15000;
      const timeoutId = setTimeout(() => {
        if (finished) return;
        finished = true;
        stopScan();
        console.warn("[BLE] Scan timeout");
        reject(new Error("BLE scan timed out"));
      }, timeoutMs);

      if (DEBUG_BLE) {
        void debug("Scan Started", `timeout=${timeoutMs}ms`);
      }

      bleManager.startDeviceScan(null, null, async (error, device) => {
        if (finished) return;

        if (error) {
          finished = true;
          clearTimeout(timeoutId);
          stopScan();
          console.error("[BLE] Scan error", error);
          reject(error);
          return;
        }

        if (!device) {
          return;
        }

        const serviceUUIDs = device.serviceUUIDs?.map((uuid) =>
          uuid.toLowerCase()
        );
        const deviceName = device.name?.toLowerCase() ?? "";
        const matchesService = serviceUUIDs
          ? serviceUUIDs.some((uuid) => normalizedServiceUUIDs.includes(uuid))
          : false;
        const matchesName = normalizedNamePrefixes.some((prefix) =>
          deviceName.startsWith(prefix)
        );

        if (!matchesService && !matchesName) {
          if (__DEV__) {
            console.log("[BLE] Ignoring device", {
              id: device.id,
              name: device.name,
              rssi: device.rssi,
            });
          }
          return;
        }

        finished = true;
        clearTimeout(timeoutId);
        stopScan();

        if (DEBUG_BLE) {
          void debug(
            "Beacon Detected",
            `id=${device.id}, name=${device.name ?? "(none)"}, rssi=${
              device.rssi ?? "unknown"
            }`
          );
        }

        try {
          await handleDetection(device);
          resolve();
        } catch (detectionError) {
          reject(detectionError);
        }
      });
    })
      .catch(async (error) => {
        await debug("Scan Failed", String((error as Error).message));
        throw error;
      })
      .finally(() => {
        isScanningRef.current = false;
      });
  }, [debug, handleDetection]);

  const disconnectDevice = useCallback(async (): Promise<void> => {
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
