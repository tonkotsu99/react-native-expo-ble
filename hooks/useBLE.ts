import { bleManager } from "@/bluetooth/bleManagerInstance";
import { API_URL_ENTER, API_URL_EXIT, BLE_SERVICE_UUID } from "@/constants";
import { setAppState } from "@/state/appState";
import { getUserId } from "@/state/userProfile";
import {
  sendBleConnectedNotification,
  sendBleDisconnectedNotification,
  sendBlePermissionErrorNotification,
  sendBluetoothDisabledNotification,
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
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === "ios") {
      try {
        const state = await bleManager.state();
        console.log(`iOS Bluetooth状態: ${state}`);

        switch (state) {
          case State.PoweredOn:
            return true;
          case State.PoweredOff:
            console.warn("Bluetoothが無効です。設定から有効にしてください。");
            await sendBluetoothDisabledNotification();
            return false;
          case State.Unauthorized:
            console.warn(
              "Bluetooth権限が拒否されています。設定から許可してください。"
            );
            await sendBlePermissionErrorNotification();
            return false;
          case State.Unsupported:
            console.error("このデバイスはBluetoothをサポートしていません。");
            await sendBlePermissionErrorNotification();
            return false;
          default:
            console.warn(`Bluetooth状態が不明です: ${state}`);
            await sendBlePermissionErrorNotification();
            return false;
        }
      } catch (error) {
        console.error("iOS Bluetooth状態取得エラー:", error);
        await sendBlePermissionErrorNotification();
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
      const subscription = device.onDisconnected(
        async (error, disconectedDevice) => {
          if (disconectedDevice) {
            console.log(`デバイスが切断されました: ${disconectedDevice.name}`);
            postAttendance(API_URL_EXIT, disconectedDevice);
            // BLE切断通知を送信
            await sendBleDisconnectedNotification(disconectedDevice.name);
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
      await connected.discoverAllServicesAndCharacteristics();
      setConnectedDevice(connected);
      await setAppState("PRESENT");
      await postAttendance(API_URL_ENTER, connected);
      // BLE接続成功通知を送信
      await sendBleConnectedNotification(connected.name);
      console.log(`接続成功: ${connected.name}`);
    } catch (error) {
      console.error(`接続失敗: ${device.name}`, error);
      throw error;
    }
  };

  const startScan = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      bleManager.startDeviceScan([BLE_SERVICE_UUID], null, (error, device) => {
        if (error) {
          console.error("Scan Error:", error);
          bleManager.stopDeviceScan();
          reject(error);
          return;
        }

        if (device) {
          bleManager.stopDeviceScan();
          connectToDevice(device)
            .then(() => resolve())
            .catch(reject);
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
