import { bleManager } from "@/bluetooth/bleManagerInstance";
import {
  API_URL_ENTER,
  API_URL_EXIT,
  BLE_DEVICE_NAME_PREFIXES,
  BLE_SERVICE_UUIDS,
  DEBUG_BLE,
} from "@/constants";
import { setAppState } from "@/state/appState";
import { getUserId } from "@/state/userProfile";
import {
  sendBleConnectedNotification,
  sendBleDisconnectedNotification,
  sendBlePermissionErrorNotification,
  sendBluetoothDisabledNotification,
  sendDebugNotification,
  sendStateUnconfirmedNotification,
} from "@/utils/notifications";
import * as DeviceInfo from "expo-device";
import { useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { Device, State } from "react-native-ble-plx";

interface UseBLE {
  requestPermissions(): Promise<boolean>;
  startScan(): Promise<void>;
  disconnectDevice(): Promise<void>;
  connectedDevice: Device | null;
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
  const debug = async (title: string, body: string) => {
    console.log(`[BLE][DEBUG] ${title}: ${body}`);
    if (DEBUG_BLE) {
      try {
        await sendDebugNotification(title, body);
      } catch {}
    }
  };
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === "ios") {
      try {
        const state = await bleManager.state();
        console.log(`iOS Bluetooth状態: ${state}`);
        if (DEBUG_BLE) {
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
            postAttendance(API_URL_EXIT, disconectedDevice);
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

          // すぐにAPIを叩くのではなく、状態を「未確認」に変更する
          await setAppState("UNCONFIRMED");
          // 状態変化通知を送信
          await sendStateUnconfirmedNotification();

          setConnectedDevice(null);
          subscription.remove();
        }
      );

      console.log(`接続中: ${device.name}`);
      const connected = await device.connect();
      if (DEBUG_BLE) await debug("Connected", `id=${connected.id}`);
      await connected.discoverAllServicesAndCharacteristics();
      if (DEBUG_BLE) await debug("Discovered Services", `id=${connected.id}`);
      setConnectedDevice(connected);
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
      const timeoutId = setTimeout(() => {
        if (finished) return;
        finished = true;
        try {
          bleManager.stopDeviceScan();
        } catch {}
        const err = new Error("BLE scan timed out");
        console.warn("[BLE] Scan timeout");
        if (DEBUG_BLE)
          debug(
            "Scan Timeout",
            `scanned=${scannedCount}, matched=${matchedCount}`
          );
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
        await connectedDevice.cancelConnection();
      } catch (error) {
        console.error("切断失敗:", error);
      }
    }
  };
  return {
    requestPermissions,
    startScan,
    disconnectDevice,
    connectedDevice,
  };
};
