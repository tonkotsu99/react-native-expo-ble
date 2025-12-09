import AsyncStorage from "@react-native-async-storage/async-storage";
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
  ensureAndroidBackgroundCapabilities,
  logAndroidBackgroundState,
  notifyAndroidDebug,
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
const BACKGROUND_FETCH_STARTED_KEY = "background_fetch_started";

// メモリキャッシュ（起動中の高速アクセス用）
let backgroundFetchStartedCache: boolean | null = null;

/**
 * BackgroundFetch開始状態を取得（永続化対応）
 */
const getBackgroundFetchStarted = async (): Promise<boolean> => {
  if (backgroundFetchStartedCache !== null) {
    return backgroundFetchStartedCache;
  }
  try {
    const value = await AsyncStorage.getItem(BACKGROUND_FETCH_STARTED_KEY);
    backgroundFetchStartedCache = value === "true";
    return backgroundFetchStartedCache;
  } catch {
    return false;
  }
};

/**
 * BackgroundFetch開始状態を保存（永続化対応）
 */
const setBackgroundFetchStarted = async (started: boolean): Promise<void> => {
  backgroundFetchStartedCache = started;
  try {
    await AsyncStorage.setItem(
      BACKGROUND_FETCH_STARTED_KEY,
      started ? "true" : "false"
    );
  } catch (error) {
    console.warn(
      "[Geofencing Task] Failed to persist backgroundFetchStarted:",
      error
    );
  }
};

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
      // バックグラウンド能力を確認（通知許可、バッテリー最適化）
      // ジオフェンス ENTER はバックグラウンドで発火するため、interactive: false で
      // ユーザープロンプトは出さず、状態のログと通知のみ行う
      const capabilities = await ensureAndroidBackgroundCapabilities({
        interactive: false,
        reason: "geofence-enter",
      });

      await logAndroidBackgroundState("geofence-enter-capabilities", {
        notificationsGranted: capabilities.notificationsGranted,
        batteryOptimizationOk: capabilities.batteryOptimizationOk,
        backgroundFetchStatus: capabilities.backgroundFetchStatus,
      });

      // 通知許可がない場合は警告（フォアグラウンドサービスが制限される可能性）
      if (!capabilities.notificationsGranted) {
        console.warn(
          "[Geofencing Task] POST_NOTIFICATIONS not granted. Foreground service may be limited."
        );
        await notifyAndroidDebug(
          "Geofence Enter Warning",
          "通知許可がありません。バックグラウンドスキャンが制限される可能性があります。"
        );
      }

      // バッテリー最適化が有効な場合は警告
      if (!capabilities.batteryOptimizationOk) {
        console.warn(
          "[Geofencing Task] Battery optimization active. BackgroundFetch may be throttled."
        );
        await notifyAndroidDebug(
          "Geofence Enter Warning",
          "バッテリー最適化が有効です。定期スキャンが遅延する可能性があります。"
        );
      }

      // Android 13+ では POST_NOTIFICATIONS 権限がないとフォアグラウンドサービスの
      // 通知が表示されず、サービスが正常に動作しない
      // バッテリー最適化は警告のみで、フォアグラウンドサービスには影響しない
      const canStartForeground = capabilities.notificationsGranted;

      if (canStartForeground) {
        await startAndroidBleForegroundService("continuous-scan", {
          title: "研究室ビーコンを監視しています",
          body: "学内にいる間、バックグラウンドでビーコンを検出します",
        });
      } else {
        console.warn(
          "[Geofencing Task] Skipping foreground service: POST_NOTIFICATIONS not granted (required for Android 13+)"
        );
        await notifyAndroidDebug(
          "Foreground Service Skipped",
          "通知許可がありません。Android 13以上ではフォアグラウンドサービスに必須です。"
        );
      }

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
    const alreadyStarted = await getBackgroundFetchStarted();
    if (!alreadyStarted) {
      await safeSendDebugNotification(
        "Geofence Enter",
        "Entered area; initializing BackgroundFetch"
      );
      await initPeriodicTask();
      try {
        await BackgroundFetch.start();
        await setBackgroundFetchStarted(true);
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
      await setBackgroundFetchStarted(false);
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
