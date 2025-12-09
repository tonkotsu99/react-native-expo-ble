import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import BackgroundService from "react-native-background-actions";
import BackgroundFetch from "react-native-background-fetch";
import { DEBUG_BLE } from "../constants";
import { sendDebugNotification } from "./notifications";

type IntentLauncherModule = typeof import("expo-intent-launcher");

let cachedIntentLauncher: IntentLauncherModule | null | undefined;

const loadIntentLauncher = async (): Promise<IntentLauncherModule | null> => {
  if (cachedIntentLauncher !== undefined) {
    return cachedIntentLauncher;
  }

  try {
    const module = await import("expo-intent-launcher");
    cachedIntentLauncher = module;
    return module;
  } catch (error) {
    console.warn("[Android Background] expo-intent-launcher unavailable", {
      error,
    });
    cachedIntentLauncher = null;
    return null;
  }
};

const BATTERY_PROMPT_KEY = "android_battery_prompt_v1";
const NOTIFICATION_PROMPT_KEY = "android_post_notifications_prompt_v1";
const FOREGROUND_SERVICE_STATE_KEY = "android_foreground_service_state_v1";

let foregroundActiveReason: string | null = null;
let foregroundServiceRunning = false;

/**
 * フォアグラウンドサービス状態を永続化
 * プロセス再起動時に実際のサービス状態と同期するために使用
 */
const persistForegroundServiceState = async (
  running: boolean,
  reason: string | null
): Promise<void> => {
  try {
    if (running && reason) {
      await AsyncStorage.setItem(
        FOREGROUND_SERVICE_STATE_KEY,
        JSON.stringify({ running, reason, timestamp: Date.now() })
      );
    } else {
      await AsyncStorage.removeItem(FOREGROUND_SERVICE_STATE_KEY);
    }
  } catch (error) {
    console.warn(
      "[Android Background] Failed to persist foreground service state",
      error
    );
  }
};

/**
 * 永続化されたフォアグラウンドサービス状態と実際の状態を同期
 * Headless タスク起動時に呼び出す
 */
export const syncForegroundServiceState = async (): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    const isActuallyRunning = BackgroundService.isRunning();
    const stored = await AsyncStorage.getItem(FOREGROUND_SERVICE_STATE_KEY);

    if (stored) {
      const parsed = JSON.parse(stored) as {
        running: boolean;
        reason: string;
        timestamp: number;
      };

      if (isActuallyRunning) {
        // 実際に動作中なら状態を復元
        foregroundServiceRunning = true;
        foregroundActiveReason = parsed.reason;
        console.log(
          "[Android Background] Foreground service state restored",
          parsed
        );
      } else {
        // 実際には動作していない場合は永続化状態をクリア
        foregroundServiceRunning = false;
        foregroundActiveReason = null;
        await AsyncStorage.removeItem(FOREGROUND_SERVICE_STATE_KEY);
        console.log(
          "[Android Background] Foreground service state cleared (service not running)"
        );
      }
    } else {
      // 永続化されていない場合は実際の状態を使用
      foregroundServiceRunning = isActuallyRunning;
      foregroundActiveReason = isActuallyRunning ? "unknown" : null;
    }
  } catch (error) {
    console.warn(
      "[Android Background] Failed to sync foreground service state",
      error
    );
    // フォールバック: 実際のサービス状態を確認
    foregroundServiceRunning = BackgroundService.isRunning();
    foregroundActiveReason = foregroundServiceRunning ? "unknown" : null;
  }
};

// 無限ループタスク（フォアグラウンドサービスを維持するためのダミータスク）
// 実際のBLEスキャンは別のモジュールで行われる
const foregroundTask = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    // サービスが停止されるまで待機
    const checkInterval = setInterval(() => {
      if (!BackgroundService.isRunning()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000);
  });
};

const getAndroidSdkVersion = (): number => {
  if (typeof Platform.Version === "number") {
    return Platform.Version;
  }
  const parsed = parseInt(String(Platform.Version), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const backgroundFetchStatusLabel = (status: number): string => {
  switch (status) {
    case BackgroundFetch.STATUS_AVAILABLE:
      return "AVAILABLE";
    case BackgroundFetch.STATUS_DENIED:
      return "DENIED";
    case BackgroundFetch.STATUS_RESTRICTED:
      return "RESTRICTED";
    default:
      return `UNKNOWN(${status})`;
  }
};

export const notifyAndroidDebug = async (
  title: string,
  body: string
): Promise<void> => {
  const prepared = `[Android Background] ${title}`;
  console.log(`${prepared}: ${body}`);
  if (!DEBUG_BLE) {
    return;
  }
  try {
    await sendDebugNotification(prepared, body);
  } catch (error) {
    console.warn("[Android Background] Failed to send debug notification", {
      error,
      title,
    });
  }
};

export const logAndroidBackgroundState = async (
  context: string,
  extra: Record<string, unknown> = {}
): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    const status = await BackgroundFetch.status();
    const message = {
      status: backgroundFetchStatusLabel(status),
      foregroundServiceRunning: BackgroundService.isRunning(),
      foregroundReason: foregroundActiveReason,
      ...extra,
    };
    console.log(`[Android Background] ${context}`, message);
    if (DEBUG_BLE) {
      await notifyAndroidDebug(`State: ${context}`, JSON.stringify(message));
    }
  } catch (error) {
    console.warn("[Android Background] Failed to log background state", {
      context,
      error,
      extra,
    });
  }
};

type ForegroundContent = {
  title?: string;
  body?: string;
};

export const startAndroidBleForegroundService = async (
  reason: string,
  content: ForegroundContent = {}
): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  // 既に実行中の場合はスキップ
  if (foregroundServiceRunning && BackgroundService.isRunning()) {
    await notifyAndroidDebug(
      "Foreground service already running",
      `reason=${reason}; skipping start`
    );
    return;
  }

  const title = content.title ?? "研究室ビーコンの接続を監視しています";
  const body =
    content.body ??
    "在室状況を自動で更新するため、バックグラウンドでBluetoothデバイスを探索しています";

  try {
    // 既存のサービスがあれば停止
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
    }

    const options = {
      taskName: "BLE_FOREGROUND_SCAN",
      taskTitle: title,
      taskDesc: body,
      taskIcon: {
        name: "ic_launcher",
        type: "mipmap",
      },
      color: "#0A84FF",
      parameters: {
        reason,
      },
    };

    await BackgroundService.start(foregroundTask, options);
    foregroundServiceRunning = true;
    foregroundActiveReason = reason;
    await persistForegroundServiceState(true, reason);
    await notifyAndroidDebug(
      "Foreground service started",
      `reason=${reason}; taskName=${options.taskName}`
    );
  } catch (error) {
    foregroundServiceRunning = false;
    foregroundActiveReason = null;
    await persistForegroundServiceState(false, null);
    const message = String((error as Error)?.message ?? error);
    console.warn("[Android Background] Failed to start foreground service", {
      error,
      reason,
    });
    await notifyAndroidDebug(
      "Foreground service start failed",
      `reason=${reason}; error=${message}`
    );
  }
};

export const stopAndroidBleForegroundService = async (
  reason: string
): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  try {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
      foregroundServiceRunning = false;
      foregroundActiveReason = null;
      await persistForegroundServiceState(false, null);
      await notifyAndroidDebug(
        "Foreground service stopped",
        `reason=${reason}`
      );
    } else {
      // サービスが動作していない場合も状態をクリア
      foregroundServiceRunning = false;
      foregroundActiveReason = null;
      await persistForegroundServiceState(false, null);
      await notifyAndroidDebug(
        "Foreground service not running",
        `reason=${reason}; nothing to stop`
      );
    }
  } catch (error) {
    const message = String((error as Error)?.message ?? error);
    console.warn("[Android Background] Failed to stop foreground service", {
      error,
      reason,
    });
    await notifyAndroidDebug(
      "Foreground service stop failed",
      `reason=${reason}; error=${message}`
    );
  }
};

/**
 * フォアグラウンドサービスの通知を更新
 */
export const updateAndroidForegroundNotification = async (
  content: ForegroundContent
): Promise<void> => {
  if (Platform.OS !== "android") {
    return;
  }

  if (!BackgroundService.isRunning()) {
    console.warn(
      "[Android Background] Cannot update notification: service not running"
    );
    return;
  }

  try {
    await BackgroundService.updateNotification({
      taskTitle: content.title,
      taskDesc: content.body,
    });
  } catch (error) {
    console.warn("[Android Background] Failed to update notification", error);
  }
};

/**
 * フォアグラウンドサービスが実行中かどうかを確認
 */
export const isAndroidForegroundServiceRunning = (): boolean => {
  if (Platform.OS !== "android") {
    return false;
  }
  return BackgroundService.isRunning();
};

type EnsureOptions = {
  interactive?: boolean;
  reason?: string;
};

type EnsureResult = {
  notificationsGranted: boolean;
  batteryOptimizationOk: boolean;
  backgroundFetchStatus: number | null;
  promptedBatterySettings: boolean;
  requestedNotificationPermissions: boolean;
};

const requestPostNotificationsAsync = async (
  interactive: boolean,
  reason: string
): Promise<{ granted: boolean; requested: boolean }> => {
  const sdk = getAndroidSdkVersion();
  if (sdk < 33) {
    return { granted: true, requested: false };
  }

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.status === "granted") {
      return { granted: true, requested: false };
    }

    const alreadyPrompted = await AsyncStorage.getItem(NOTIFICATION_PROMPT_KEY);
    if (!interactive && alreadyPrompted) {
      await notifyAndroidDebug(
        "POST_NOTIFICATIONS denied",
        `reason=${reason}; status=${current.status}`
      );
      return { granted: false, requested: false };
    }

    if (!interactive) {
      await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, "requested");
      await notifyAndroidDebug(
        "POST_NOTIFICATIONS required",
        `reason=${reason}; prompting deferred. Note: Android 13+ requires notification permission for foreground service (background BLE scanning).`
      );
      return { granted: false, requested: false };
    }

    // 初回プロンプトの場合、より詳細な説明をログに記録
    const isFirstPrompt = !(await AsyncStorage.getItem(
      NOTIFICATION_PROMPT_KEY
    ));
    if (isFirstPrompt) {
      console.log(
        "[Android Background] Requesting notification permission for the first time."
      );
      console.log(
        "[Android Background] IMPORTANT: Android 13+ requires notification permission to run foreground services."
      );
      console.log(
        "[Android Background] Without this permission, background BLE scanning will be limited to periodic checks (15min intervals)."
      );
    }

    const requested = await Notifications.requestPermissionsAsync({
      android: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    const granted = requested.granted || requested.status === "granted";
    await AsyncStorage.setItem(NOTIFICATION_PROMPT_KEY, "requested");
    if (!granted) {
      console.warn(
        "[Android Background] Notification permission denied. Background BLE scanning will be limited."
      );
      console.warn(
        "[Android Background] Users can grant permission later in Settings > Apps > [App Name] > Notifications"
      );
      await notifyAndroidDebug(
        "POST_NOTIFICATIONS denied",
        `reason=${reason}; status=${requested.status}. Background scanning will use periodic checks only (15min intervals).`
      );
    } else {
      console.log(
        "[Android Background] Notification permission granted. Foreground service can be used for continuous BLE scanning."
      );
    }
    return { granted, requested: true };
  } catch (error) {
    console.warn("[Android Background] Failed to request notifications", {
      error,
      reason,
    });
    return { granted: false, requested: false };
  }
};

const maybePromptBatteryOptimizationAsync = async (
  interactive: boolean,
  reason: string
): Promise<{ ok: boolean; prompted: boolean; status: number | null }> => {
  try {
    const status = await BackgroundFetch.status();
    const ok = status === BackgroundFetch.STATUS_AVAILABLE;
    if (ok) {
      return { ok: true, prompted: false, status };
    }

    const statusLabel = backgroundFetchStatusLabel(status);
    await notifyAndroidDebug(
      "BackgroundFetch limited",
      `reason=${reason}; status=${statusLabel}`
    );

    const alreadyPrompted = await AsyncStorage.getItem(BATTERY_PROMPT_KEY);
    if (!interactive) {
      if (!alreadyPrompted) {
        await AsyncStorage.setItem(BATTERY_PROMPT_KEY, "deferred");
      }
      return { ok: false, prompted: false, status };
    }

    const packageName = Constants.expoConfig?.android?.package ?? "";

    const intentLauncher = await loadIntentLauncher();
    if (intentLauncher?.startActivityAsync) {
      try {
        await intentLauncher.startActivityAsync(
          intentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          packageName ? { data: `package:${packageName}` } : undefined
        );
        await AsyncStorage.setItem(BATTERY_PROMPT_KEY, "requested");
        return { ok: false, prompted: true, status };
      } catch (launchError) {
        const message = String((launchError as Error)?.message ?? launchError);
        console.warn(
          "[Android Background] Failed to launch battery optimization intent",
          {
            launchError,
            reason,
          }
        );
        await notifyAndroidDebug(
          "Battery optimization intent failed",
          `reason=${reason}; message=${message}`
        );
      }
    } else {
      await notifyAndroidDebug(
        "Battery optimization intent unavailable",
        `reason=${reason}`
      );
    }

    try {
      await Linking.openSettings();
      await AsyncStorage.setItem(BATTERY_PROMPT_KEY, "requested");
      await notifyAndroidDebug(
        "Battery optimization settings opened",
        `reason=${reason}`
      );
      return { ok: false, prompted: true, status };
    } catch (linkError) {
      console.warn(
        "[Android Background] Failed to open battery optimization settings",
        {
          linkError,
          reason,
        }
      );
      return { ok: false, prompted: false, status };
    }
  } catch (error) {
    console.warn(
      "[Android Background] Failed to check BackgroundFetch status",
      {
        error,
        reason,
      }
    );
    return { ok: false, prompted: false, status: null };
  }
};

export const ensureAndroidBackgroundCapabilities = async (
  options: EnsureOptions = {}
): Promise<EnsureResult> => {
  const { interactive = false, reason = "unspecified" } = options;

  if (Platform.OS !== "android") {
    return {
      notificationsGranted: true,
      batteryOptimizationOk: true,
      backgroundFetchStatus: null,
      promptedBatterySettings: false,
      requestedNotificationPermissions: false,
    };
  }

  const notificationResult = await requestPostNotificationsAsync(
    interactive,
    reason
  );
  const batteryResult = await maybePromptBatteryOptimizationAsync(
    interactive,
    reason
  );

  return {
    notificationsGranted: notificationResult.granted,
    batteryOptimizationOk: batteryResult.ok,
    backgroundFetchStatus: batteryResult.status,
    promptedBatterySettings: batteryResult.prompted,
    requestedNotificationPermissions: notificationResult.requested,
  };
};
