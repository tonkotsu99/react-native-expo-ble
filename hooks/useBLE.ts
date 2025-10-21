import { bleManager } from "@/bluetooth/bleManagerInstance";
import { API_URL_ENTER, API_URL_EXIT, BLE_SERVICE_UUID } from "@/constants";
import { setAppState } from "@/state/appState";
import { getUserId } from "@/state/userProfile";
import * as DeviceInfo from "expo-device";
import { useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { Device } from "react-native-ble-plx";

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

  const requestAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== "android") {
      return true;
    }

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
  };

  const connectToDevice = async (device: Device): Promise<void> => {
    try {
      const subscription = device.onDisconnected(
        async (error, disconectedDevice) => {
          if (disconectedDevice) {
            console.log(`デバイスが切断されました: ${disconectedDevice.name}`);
            postAttendance(API_URL_EXIT, disconectedDevice);
          }

          // すぐにAPIを叩くのではなく、状態を「未確認」に変更する
          await setAppState("UNCONFIRMED");

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
    requestPermissions: requestAndroidPermissions,
    startScan,
    disconnectDevice,
    connectedDevice,
  };
};
