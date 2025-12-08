import {
  LocationGeofencingEventType,
  type LocationRegion,
} from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import { resetPresenceSession } from "../bluetooth/bleStateUtils";
import {
  startContinuousBleScanner,
  stopContinuousBleScanner,
} from "../bluetooth/continuousScan";
import { API_URL_EXIT } from "../constants";
import {
  getAppState,
  getInsideAreaReportStatus,
  setAppState,
  setInsideAreaReportStatus,
} from "../state/appState";
import { getUserId } from "../state/userProfile";
import {
  logAndroidBackgroundState,
  startAndroidBleForegroundService,
  stopAndroidBleForegroundService,
} from "../utils/androidBackground";
import {
  sendDebugNotification,
  sendGeofenceEnterNotification,
  sendGeofenceExitNotification,
} from "../utils/notifications";
import { postInsideAreaStatus } from "./insideAreaStatus";
import { initPeriodicTask } from "./periodicCheckTask";

const GEOFENCING_TASK_NAME = "background-geofencing-task";
let backgroundFetchStarted = false;

const safeSendDebugNotification = async (
  title: string,
  body: string
): Promise<void> => {
  try {
    await sendDebugNotification(title, body);
  } catch (error) {
    console.warn("[Geofencing Task] Failed to send debug notification", error);
  }
};

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

    await safeSendDebugNotification(
      "Geofence Enter Event",
      `previousState=${previousState}; timestamp=${new Date().toISOString()}`
    );

    await setAppState("INSIDE_AREA");

    // ジオフェンス入場通知を送信
    await sendGeofenceEnterNotification();
    await logAndroidBackgroundState("geofence-enter", {
      previousState,
    });

    // Android: フォアグラウンドサービス付きで常時 BLE スキャンを開始
    // ネットワーク通信(postInsideAreaStatus)の前に実行して、プロセスがキルされるのを防ぐ
    if (Platform.OS === "android") {
      await startAndroidBleForegroundService("continuous-scan", {
        title: "研究室ビーコンを監視しています",
        body: "学内にいる間、バックグラウンドでビーコンを検出します",
      });
      await startContinuousBleScanner();
    } else if (Platform.OS === "ios") {
      // iOS: 連続スキャンを開始
      await startContinuousBleScanner();
    }

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
      await safeSendDebugNotification(
        "Geofence Enter",
        "Entered area; initializing BackgroundFetch"
      );
      await initPeriodicTask();
      try {
        await BackgroundFetch.start();
        backgroundFetchStarted = true;
        console.log("[Geofencing Task] BackgroundFetch started");
        await logAndroidBackgroundState("background-fetch-start", {
          reason: "geofence-enter",
        });
      } catch (e) {
        console.error("[Geofencing Task] BackgroundFetch start failed", e);
      }
    } else {
      console.log(
        "[Geofencing Task] BackgroundFetch already started. Skipping start."
      );
      await logAndroidBackgroundState("background-fetch-start", {
        reason: "geofence-enter-skip",
      });
    }
  } else if (eventType === LocationGeofencingEventType.Exit) {
    console.log(
      "[Geofencing Task] Exited area:",
      region?.identifier ?? "unknown"
    );
    await resetPresenceSession();
    await setAppState("OUTSIDE");
    await logAndroidBackgroundState("geofence-exit", {
      connectedDeviceId: null,
    });

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
      await logAndroidBackgroundState("background-fetch-stop", {
        reason: "geofence-exit",
      });
    } catch (e) {
      console.error("[Geofencing Task] BackgroundFetch stop failed", e);
    }

    // 両 OS: 常時スキャンを停止
    if (Platform.OS === "android") {
      await stopContinuousBleScanner();
      await stopAndroidBleForegroundService("geofence-exit");
    } else if (Platform.OS === "ios") {
      await stopContinuousBleScanner();
    }
  }
});
