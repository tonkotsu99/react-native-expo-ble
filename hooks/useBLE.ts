import { bleManager } from "@/bluetooth/bleManagerInstance";
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
import { useEffect, useRef, useState } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { Device, State } from "react-native-ble-plx";

interface UseBLE {
  requestPermissions(): Promise<boolean>;
  startScan(): Promise<void>;
  disconnectDevice(): Promise<void>;
  refresh(): Promise<void>;
  connectedDevice: Device | null;
  connectedRssi: number | null;
}

const postAttendance = async (url: string, device: Device): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.warn(`API Skipped: Missing userId for POST to ${url}`);
      return;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: device.id,
        deviceName: device.name,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    console.log(`API Success: POST to ${url}`);
  } catch (error) {
    console.error(`API Failed: ${(error as Error).message}`);
  }
};

export const useBLE = (): UseBLE => {
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [connectedRssi, setConnectedRssi] = useState<number | null>(null);
  const rssiIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Adopt dedup/throttle guards
  const adoptInFlightRef = useRef(false);
  const lastAdoptRef = useRef<{ id: string | null; ts: number }>({
    id: null,
    ts: 0,
  });
  const debug = async (title: string, body: string) => {
    console.log(`[BLE][DEBUG] ${title}: ${body}`);
    if (DEBUG_BLE) {
      try {
        await sendDebugNotification(title, body);
      } catch {}
    }
  };
  const clearRssiInterval = () => {
    if (rssiIntervalRef.current) {
      clearInterval(rssiIntervalRef.current);
      rssiIntervalRef.current = null;
    }
  };
  const adoptExistingConnection = async () => {
    if (adoptInFlightRef.current) return;
    adoptInFlightRef.current = true;
    try {
      const already = await bleManager.connectedDevices(BLE_SERVICE_UUIDS);
      if (already.length > 0) {
        const normalizedPrefixes = BLE_DEVICE_NAME_PREFIXES.map((p) =>
          p.toLowerCase()
        );
        const preferred =
          already.find((d) =>
            d.name
              ? normalizedPrefixes.some((p) =>
                  d.name!.toLowerCase().startsWith(p)
                )
              : false
          ) || already[0];

        // If we already track this device, do nothing
        if (connectedDevice && connectedDevice.id === preferred.id) return;

        setConnectedDevice(preferred);
        setConnectedRssi(preferred.rssi ?? null);
        startRssiPolling(preferred);

        // Throttle duplicate adopt logs for the same id within 5s
        const now = Date.now();
        const shouldLog = !(
          lastAdoptRef.current.id === preferred.id &&
          now - lastAdoptRef.current.ts < 5000
        );
        if (shouldLog && DEBUG_BLE) {
          lastAdoptRef.current = { id: preferred.id, ts: now };
          await debug(
            "Adopted Existing Connection (auto)",
            `id=${preferred.id}, name=${preferred.name ?? "(none)"}`
          );
        }
      }
    } catch {
    } finally {
      adoptInFlightRef.current = false;
    }
  };
  const startRssiPolling = (device: Device) => {
    clearRssiInterval();
    rssiIntervalRef.current = setInterval(async () => {
      try {
        const updatedAny: any = await device.readRSSI();
        // Handle both return shapes: number (Android) or Device (iOS/types)
        if (typeof updatedAny === "number") {
          setConnectedRssi(updatedAny);
          if (DEBUG_BLE) {
            debug("RSSI", `id=${device.id}, rssi=${updatedAny}`);
          }
        } else {
          const updatedDevice = updatedAny as Device;
          setConnectedDevice(updatedDevice);
          setConnectedRssi(updatedDevice.rssi ?? null);
          if (DEBUG_BLE) {
            debug("RSSI", `id=${updatedDevice.id}, rssi=${updatedDevice.rssi}`);
          }
        }
      } catch {}
    }, 2000);
  };
  const requestPermissions = async (): Promise<boolean> => {
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
      } else {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        return (
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      }
    }

    return true;
  };

  // On mount: adopt any background-established connection
  useEffect(() => {
    adoptExistingConnection();
    // Also when app returns to foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") adoptExistingConnection();
    });
    // Also when Bluetooth state becomes PoweredOn
    const bleSub = bleManager.onStateChange((state) => {
      if (state === State.PoweredOn) {
        adoptExistingConnection();
      }
    }, false);
    return () => {
      try {
        sub.remove();
      } catch {}
      try {
        bleSub.remove();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAppState((state) => {
      if (state !== "PRESENT") {
        clearRssiInterval();
        setConnectedDevice(null);
        setConnectedRssi(null);
      }
    });

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, []);

  const connectToDevice = async (device: Device): Promise<void> => {
    try {
      if (DEBUG_BLE) {
        await debug(
          "Connecting",
          `id=${device.id}, name=${device.name ?? "(none)"}`
        );
      }
      const subscription = device.onDisconnected(
        async (error, disconectedDevice) => {
          if (disconectedDevice) {
            console.log(`デバイスが切断されました: ${disconectedDevice.name}`);
            // 退室APIはジオフェンシングのExit時に行う。BLE切断時はスキップ。
            // BLE切断通知を送信
            await sendBleDisconnectedNotification(disconectedDevice.name);
            if (DEBUG_BLE)
              await debug(
                "Disconnected",
                `id=${disconectedDevice.id}, name=${
                  disconectedDevice.name ?? "(none)"
                }, error=${
                  error ? String((error as any)?.message ?? error) : "none"
                }`
              );
          }

          // 状態を「学内（INSIDE_AREA）」へ戻す（位置情報で本当に外へ出た場合は
          // ジオフェンシングのExitがOUTSIDEへ更新・退室APIを送信する）
          try {
            const current = await getAppState();
            if (current !== "OUTSIDE") {
              await setAppState("INSIDE_AREA");
            }
          } catch {}

          clearRssiInterval();
          setConnectedDevice(null);
          setConnectedRssi(null);
          subscription.remove();
        }
      );

      console.log(`接続中: ${device.name}`);
      const connected = await device.connect();
      if (DEBUG_BLE) await debug("Connected", `id=${connected.id}`);
      await connected.discoverAllServicesAndCharacteristics();
      if (DEBUG_BLE) await debug("Discovered Services", `id=${connected.id}`);
      setConnectedDevice(connected);
      setConnectedRssi(connected.rssi ?? null);
      startRssiPolling(connected);
      await setAppState("PRESENT");
      await postAttendance(API_URL_ENTER, connected);
      // BLE接続成功通知を送信
      await sendBleConnectedNotification(connected.name);
      console.log(`接続成功: ${connected.name}`);
    } catch (error) {
      console.error(`接続失敗: ${device.name}`, error);
      if (DEBUG_BLE)
        await debug(
          "Connect Failed",
          `id=${device.id}, name=${device.name ?? "(none)"}, error=${String(
            (error as any)?.message ?? error
          )}`
        );
      throw error;
    }
  };

  const startScan = async (): Promise<void> => {
    const userId = await getUserId();
    if (!userId) {
      const message = "[BLE] Cannot start scan: missing userId";
      console.warn(message);
      if (DEBUG_BLE) await debug("Scan Skipped", "missing userId");
      throw new Error(message);
    }

    // First, adopt any existing connection established by background tasks
    try {
      const already = await bleManager.connectedDevices(BLE_SERVICE_UUIDS);
      if (already.length > 0) {
        // Prefer a device that matches our name prefix when multiple are present
        const normalizedPrefixes = BLE_DEVICE_NAME_PREFIXES.map((p) =>
          p.toLowerCase()
        );
        const preferred =
          already.find((d) =>
            d.name
              ? normalizedPrefixes.some((p) =>
                  d.name!.toLowerCase().startsWith(p)
                )
              : false
          ) || already[0];
        setConnectedDevice(preferred);
        setConnectedRssi(preferred.rssi ?? null);
        startRssiPolling(preferred);
        if (DEBUG_BLE)
          debug(
            "Adopted Existing Connection",
            `id=${preferred.id}, name=${preferred.name ?? "(none)"}`
          );
        return; // Consider scan satisfied
      }
    } catch {}

    const normalizedServiceUUIDs = BLE_SERVICE_UUIDS.map((uuid) =>
      uuid.toLowerCase()
    );
    const normalizedNamePrefixes = BLE_DEVICE_NAME_PREFIXES.map((prefix) =>
      prefix.toLowerCase()
    );

    return new Promise((resolve, reject) => {
      let finished = false;

      // Safety timeout to avoid indefinite scanning
      const timeoutMs = 15000;
      const timeoutId = setTimeout(async () => {
        if (finished) return;
        finished = true;
        try {
          bleManager.stopDeviceScan();
        } catch {}
        console.warn("[BLE] Scan timeout");
        if (DEBUG_BLE)
          debug(
            "Scan Timeout",
            `scanned=${scannedCount}, matched=${matchedCount}`
          );
        // Before rejecting, adopt an existing background connection if present
        try {
          const already = await bleManager.connectedDevices(BLE_SERVICE_UUIDS);
          if (already.length > 0) {
            const normalizedPrefixes = BLE_DEVICE_NAME_PREFIXES.map((p) =>
              p.toLowerCase()
            );
            const preferred =
              already.find((d) =>
                d.name
                  ? normalizedPrefixes.some((p) =>
                      d.name!.toLowerCase().startsWith(p)
                    )
                  : false
              ) || already[0];
            setConnectedDevice(preferred);
            setConnectedRssi(preferred.rssi ?? null);
            startRssiPolling(preferred);
            if (DEBUG_BLE)
              debug(
                "Adopted Existing Connection (post-timeout)",
                `id=${preferred.id}, name=${preferred.name ?? "(none)"}`
              );
            resolve();
            return;
          }
        } catch {}
        const err = new Error("BLE scan timed out");
        reject(err);
      }, timeoutMs);

      let scannedCount = 0;
      let matchedCount = 0;

      if (DEBUG_BLE) debug("Scan Started", `timeout=${timeoutMs}ms`);

      // Important: pass null to discover broadly, then filter in JS
      // Some devices don't advertise target services in the scan response on iOS
      bleManager.startDeviceScan(null, null, (error, device) => {
        if (finished) return;

        if (error) {
          console.error("[BLE] Scan Error:", error);
          finished = true;
          clearTimeout(timeoutId);
          try {
            bleManager.stopDeviceScan();
          } catch {}
          if (DEBUG_BLE)
            debug("Scan Error", String((error as any)?.message ?? error));
          reject(error);
          return;
        }

        if (!device) return;
        scannedCount++;

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

        if (matchesService || matchesName) {
          matchedCount++;
          console.log("[BLE] Target device detected:", {
            id: device.id,
            name: device.name,
            rssi: device.rssi,
            serviceUUIDs: device.serviceUUIDs,
          });

          finished = true;
          clearTimeout(timeoutId);
          try {
            bleManager.stopDeviceScan();
          } catch {}
          if (DEBUG_BLE)
            debug(
              "Match Found",
              `name=${
                device.name ?? "(none)"
              }, service=${matchesService}, prefix=${matchesName}, rssi=${
                device.rssi
              }`
            );
          connectToDevice(device)
            .then(() => resolve())
            .catch((e) => reject(e));
        } else if (__DEV__) {
          // Debug log can be noisy; keep in dev builds only
          console.log("[BLE] Ignoring device (no match):", {
            id: device.id,
            name: device.name,
            rssi: device.rssi,
            serviceUUIDs: device.serviceUUIDs,
          });
        }
      });
    });
  };

  const disconnectDevice = async (): Promise<void> => {
    if (connectedDevice) {
      try {
        clearRssiInterval();
        // If already disconnected (or in the middle of disconnect), avoid throwing
        let isConn = false;
        try {
          isConn = await connectedDevice.isConnected();
        } catch {}
        if (!isConn) {
          setConnectedDevice(null);
          setConnectedRssi(null);
          return;
        }
        await connectedDevice.cancelConnection();
      } catch (error) {
        const msg = String((error as any)?.message ?? error);
        // 'Operation was cancelled' is benign when a parallel disconnect occurs
        if (
          msg.includes("Operation was cancelled") ||
          msg.includes("not connected") ||
          msg.includes("Device is not connected")
        ) {
          console.warn("切断はすでに完了していました。メッセージ:", msg);
        } else {
          console.error("切断失敗:", error);
        }
      }
    }
  };
  return {
    requestPermissions,
    startScan,
    disconnectDevice,
    refresh: adoptExistingConnection,
    connectedDevice,
    connectedRssi,
  };
};
