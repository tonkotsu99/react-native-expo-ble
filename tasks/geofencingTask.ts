import {
  LocationGeofencingEventType,
  type LocationRegion,
} from "expo-location";
import * as TaskManager from "expo-task-manager";
import BackgroundFetch from "react-native-background-fetch";
import { bleManager } from "../bluetooth/bleManagerInstance";
import { API_URL_ENTER, API_URL_EXIT, BLE_SERVICE_UUID } from "../constants";
import {
  getAppState,
  getInsideAreaReportStatus,
  setAppState,
  setInsideAreaReportStatus,
} from "../state/appState";
import { getUserId } from "../state/userProfile";
import {
  sendBleConnectedNotification,
  sendDebugNotification,
  sendGeofenceEnterNotification,
  sendGeofenceExitNotification,
} from "../utils/notifications";
import { postInsideAreaStatus } from "./insideAreaStatus";
import { initPeriodicTask } from "./periodicCheckTask";

const GEOFENCING_TASK_NAME = "background-geofencing-task";
let backgroundFetchStarted = false;

// API通信を行う関数
const postAttendance = async (
  url: string,
  payload: { deviceId?: string; deviceName?: string | null } = {}
): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.warn(`[Geofencing Task] Skipping POST to ${url}: missing userId`);
      return;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        userId,
      }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    console.log(`[Geofencing Task] API Success: POST to ${url}`);
  } catch (error) {
    console.error(`[Geofencing Task] API Failed: ${(error as Error).message}`);
  }
};

/**
 * バックグラウンドでBLEデバイスに接続を試みる関数
 */
const tryConnectBleDevice = () => {
  bleManager.startDeviceScan([BLE_SERVICE_UUID], null, (scanError, device) => {
    if (scanError) {
      console.error("[Geofencing Task] Scan Error:", scanError);
      bleManager.stopDeviceScan();
      return;
    }

    if (device) {
      bleManager.stopDeviceScan();
      device
        .connect()
        .then(async (connectedDevice) => {
          console.log(
            "[Geofencing Task] Background connect success:",
            connectedDevice.name
          );
          await setAppState("PRESENT");
          await postAttendance(API_URL_ENTER, {
            deviceId: connectedDevice.id,
            deviceName: connectedDevice.name,
          });
          // BLE接続成功通知を送信
          await sendBleConnectedNotification(connectedDevice.name);
          // 接続維持や切断監視が必要な場合はここに追加
        })
        .catch((connectError) => {
          console.error(
            "[Geofencing Task] Background connect error:",
            connectError
          );
        });
    }
  });
};

/**
 * ジオフェンシングタスクの定義
 */
TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("[Geofencing Task] Error:", error);
    return;
  }

  const { eventType, region } = data as {
    eventType: LocationGeofencingEventType;
    region: LocationRegion | undefined;
  };

  // デバッグ情報を追加
  console.log("[Geofencing Task] Event received:", {
    eventType:
      eventType === LocationGeofencingEventType.Enter ? "ENTER" : "EXIT",
    regionId: region?.identifier,
    latitude: region?.latitude,
    longitude: region?.longitude,
    radius: region?.radius,
    timestamp: new Date().toISOString(),
  });

  if (eventType === LocationGeofencingEventType.Enter) {
    console.log(
      "[Geofencing Task] Entered area:",
      region?.identifier ?? "unknown"
    );
    const previousState = await getAppState();
    await setAppState("INSIDE_AREA");

    // ジオフェンス入場通知を送信
    await sendGeofenceEnterNotification();

    const alreadyReported = await getInsideAreaReportStatus();
    if (previousState === "INSIDE_AREA" && alreadyReported) {
      console.log(
        "[Geofencing Task] INSIDE_AREA already reported. Skipping status post."
      );
    } else {
      const posted = await postInsideAreaStatus({
        regionIdentifier: region?.identifier ?? null,
        latitude: region?.latitude ?? null,
        longitude: region?.longitude ?? null,
        radius: region?.radius ?? null,
        source: "geofence",
      });
      if (posted) {
        await setInsideAreaReportStatus(true);
      }
    }

    // 定期タスクを初期化して開始（多重開始をガード）
    if (!backgroundFetchStarted) {
      await sendDebugNotification(
        "Geofence Enter",
        "Entered area; initializing BackgroundFetch"
      );
      await initPeriodicTask();
      try {
        await BackgroundFetch.start();
        backgroundFetchStarted = true;
        console.log("[Geofencing Task] BackgroundFetch started");
      } catch (e) {
        console.error("[Geofencing Task] BackgroundFetch start failed", e);
      }
    } else {
      console.log(
        "[Geofencing Task] BackgroundFetch already started. Skipping start."
      );
    }
    tryConnectBleDevice(); // エリア進入時に一度BLE接続を試みる
  } else if (eventType === LocationGeofencingEventType.Exit) {
    console.log(
      "[Geofencing Task] Exited area:",
      region?.identifier ?? "unknown"
    );
    await setAppState("OUTSIDE");

    // ジオフェンス退出通知を送信
    await sendGeofenceExitNotification();

    try {
      await postAttendance(API_URL_EXIT);
      console.log("[Geofencing Task] Exit attendance reported.");
    } catch (exitError) {
      console.error("[Geofencing Task] Exit attendance failed:", exitError);
    }

    try {
      await BackgroundFetch.stop(); // 定期タスクを停止
      backgroundFetchStarted = false;
      console.log("[Geofencing Task] BackgroundFetch stopped");
    } catch (e) {
      console.error("[Geofencing Task] BackgroundFetch stop failed", e);
    }
  }
});
