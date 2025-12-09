import { Platform } from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import { bleManager } from "../bluetooth/bleManagerInstance";
import {
  PRESENCE_TTL_MS,
  getPresenceEnterSentAt,
  getPresenceLastSeen,
  recordPresenceDetection,
  resetPresenceSession,
  setPresenceEnterSentAt,
  waitForBlePoweredOn,
} from "../bluetooth/bleStateUtils";
import {
  API_URL_ENTER,
  BLE_DEVICE_NAME_PREFIXES,
  BLE_SERVICE_UUIDS,
  DEBUG_BLE,
} from "../constants";
import {
  getAppState,
  getInsideAreaReportStatus,
  getRapidRetryWindowUntil,
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
  sendBleConnectedNotification,
  sendBleDisconnectedNotification,
  sendDebugNotification,
} from "../utils/notifications";
import { postInsideAreaStatus } from "./insideAreaStatus";

const SCAN_TIMEOUT_MS = 15000;
const RETRY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes backoff for repeated retries
let lastRetryTimestamp = 0;
const LOG_PREFIX = "[Periodic Check]";

/**
 * iOS/Android両対応のBluetooth権限確認
 */
const checkBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS === "ios") {
    const waitResult = await waitForBlePoweredOn({
      timeoutMs: 15000,
      logPrefix: LOG_PREFIX,
    });

    if (!waitResult.ready) {
      console.warn(`${LOG_PREFIX} iOS Bluetooth not ready for scan`, {
        waitResult,
      });
      return false;
    }

    if (DEBUG_BLE) {
      console.log(`${LOG_PREFIX} iOS Bluetooth ready`, {
        initialState: waitResult.initialState ?? "unknown",
        finalState: waitResult.finalState ?? "unknown",
        durationMs: waitResult.durationMs,
      });
    }

    return true;
  }

  // Androidの場合は従来通り（権限はアプリ起動時に取得済み）
  return true;
};

const postEnterAttendance = async (payload: {
  deviceId: string;
  deviceName: string | null;
}): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.warn(`${LOG_PREFIX} Skipping attendance post: missing userId`);
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

    console.log(
      `${LOG_PREFIX} Attendance posted for ${
        payload.deviceName ?? payload.deviceId
      }`
    );
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to post attendance: ${(error as Error).message}`
    );
  }
};

const scanAndReconnect = async (): Promise<boolean> => {
  const userId = await getUserId();
  if (!userId) {
    console.warn(`${LOG_PREFIX} Skipping beacon scan: missing userId`);
    return false;
  }

  let androidForegroundStarted = false;
  const androidReason = "periodic-scan";

  const stopAndroidForeground = async (phase: string) => {
    if (!androidForegroundStarted) {
      return;
    }
    androidForegroundStarted = false;
    try {
      await stopAndroidBleForegroundService(`${androidReason}:${phase}`);
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to stop Android foreground service`, {
        error,
        phase,
      });
    }
  };

  if (Platform.OS === "android") {
    try {
      const capabilities = await ensureAndroidBackgroundCapabilities({
        interactive: false,
        reason: androidReason,
      });
      await logAndroidBackgroundState(`${androidReason}:start`, {
        notificationsGranted: capabilities.notificationsGranted,
        batteryOptimizationOk: capabilities.batteryOptimizationOk,
        backgroundFetchStatus: capabilities.backgroundFetchStatus ?? null,
      });

      // Android 13+ では POST_NOTIFICATIONS 権限がフォアグラウンドサービスに必須
      // バッテリー最適化は BackgroundFetch のスロットリングに影響するが、
      // フォアグラウンドサービス自体の起動には影響しない
      const canStartForeground = capabilities.notificationsGranted;
      if (canStartForeground) {
        await startAndroidBleForegroundService(androidReason, {
          title: "研究室ビーコンを再探索しています",
          body: "在室状況を自動で確認しています",
        });
        androidForegroundStarted = true;
      } else {
        await notifyAndroidDebug(
          "Foreground service unavailable",
          `context=periodic; notificationsGranted=${capabilities.notificationsGranted} (required for Android 13+)`
        );
      }

      // バッテリー最適化が有効な場合は警告（スキャン自体は続行）
      if (!capabilities.batteryOptimizationOk) {
        console.warn(
          `${LOG_PREFIX} Battery optimization active. BackgroundFetch may be throttled.`
        );
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to prepare Android foreground`, error);
    }
  }

  const hasPermissions = await checkBluetoothPermissions();
  if (!hasPermissions) {
    console.warn(
      `${LOG_PREFIX} Bluetooth権限がありません。スキャンをスキップします。`
    );
    await stopAndroidForeground("missing-permission");
    return false;
  }

  if (DEBUG_BLE) {
    await sendDebugNotification(
      "Background Scan Started",
      "Periodic scan started"
    );
  }

  return await new Promise((resolve) => {
    let settled = false;

    const finish = async (result: boolean, reason: string) => {
      if (settled) return;
      settled = true;
      try {
        bleManager.stopDeviceScan();
      } catch {}
      clearTimeout(timeoutId);
      if (Platform.OS === "android") {
        void logAndroidBackgroundState(`${androidReason}:finish`, {
          result,
          reason,
        });
      }
      void stopAndroidForeground(result ? "success" : reason);
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      console.warn(`${LOG_PREFIX} Beacon scan timed out`);
      if (Platform.OS === "android") {
        void notifyAndroidDebug("Periodic scan timeout", "no beacon detected");
      }
      void finish(false, "timeout");
    }, SCAN_TIMEOUT_MS);

    const normalizedServiceUUIDs = BLE_SERVICE_UUIDS.map((u) =>
      u.toLowerCase()
    );
    const normalizedNamePrefixes = BLE_DEVICE_NAME_PREFIXES.map((p) =>
      p.toLowerCase()
    );

    try {
      bleManager.startDeviceScan(
        Platform.OS === "android" ? null : BLE_SERVICE_UUIDS,
        null,
        async (error, device) => {
          if (settled) return;

          if (error) {
            console.error(`${LOG_PREFIX} Scan error:`, error);
            if (Platform.OS === "android") {
              await notifyAndroidDebug(
                "Periodic scan error",
                String((error as Error)?.message ?? error)
              );
            }
            await finish(false, "scan-error");
            return;
          }

          if (!device) {
            return;
          }

          const serviceUUIDs = device.serviceUUIDs?.map((u) => u.toLowerCase());
          const deviceName = device.name?.toLowerCase() ?? "";
          const matchesService = serviceUUIDs
            ? serviceUUIDs.some((u) => normalizedServiceUUIDs.includes(u))
            : false;
          const matchesName = normalizedNamePrefixes.some((p) =>
            deviceName.startsWith(p)
          );

          if (!matchesService && !matchesName) {
            return;
          }

          const timestamp = Date.now();

          try {
            await recordPresenceDetection(
              {
                deviceId: device.id,
                deviceName: device.name ?? null,
                rssi: typeof device.rssi === "number" ? device.rssi : null,
              },
              timestamp
            );

            const currentState = await getAppState();
            if (currentState !== "PRESENT") {
              await setAppState("PRESENT");
              await sendBleConnectedNotification(device.name);
            }

            const enterSentAt = await getPresenceEnterSentAt();
            if (enterSentAt === null) {
              await postEnterAttendance({
                deviceId: device.id,
                deviceName: device.name ?? null,
              });
              await setPresenceEnterSentAt(timestamp);
              if (DEBUG_BLE) {
                await sendDebugNotification(
                  "Attendance Recorded",
                  device.name ?? device.id
                );
              }
            }

            if (Platform.OS === "android") {
              await notifyAndroidDebug(
                "Periodic detection success",
                `device=${device.name ?? device.id}`
              );
            }

            await finish(true, "detected");
          } catch (detectionError) {
            console.error(
              `${LOG_PREFIX} Detection handling failed`,
              detectionError
            );
            if (Platform.OS === "android") {
              await notifyAndroidDebug(
                "Periodic detection failed",
                String((detectionError as Error)?.message ?? detectionError)
              );
            }
            await finish(false, "detection-error");
          }
        }
      );
    } catch (startError) {
      console.error(`${LOG_PREFIX} Failed to start beacon scan`, startError);
      if (Platform.OS === "android") {
        void notifyAndroidDebug(
          "Periodic scan start error",
          String((startError as Error)?.message ?? startError)
        );
      }
      void finish(false, "start-scan-error");
    }
  });
};

/** 15分ごとに実行されるタスク */
const periodicTask = async (taskId: string) => {
  console.log("[BackgroundFetch] taskId:", taskId);
  await logAndroidBackgroundState("periodic-task", { taskId });

  // Android: 常時スキャンが有効な場合はスキップ
  if (Platform.OS === "android") {
    const { isContinuousScanActive } = await import(
      "../bluetooth/continuousScan"
    );
    if (isContinuousScanActive) {
      console.log(
        `${LOG_PREFIX} Continuous scan active. Skipping periodic scan.`
      );
      await notifyAndroidDebug(
        "Periodic scan skipped",
        "continuous scan is active"
      );
      BackgroundFetch.finish(taskId);
      return;
    }
  }

  const previousState = await getAppState();
  const rapidRetryWindowUntil = await getRapidRetryWindowUntil();
  const now = Date.now();
  const rapidRetryWindowActive =
    typeof rapidRetryWindowUntil === "number" && now < rapidRetryWindowUntil;

  const lastSeen = await getPresenceLastSeen();
  const presenceFresh = lastSeen !== null && now - lastSeen < PRESENCE_TTL_MS;

  if (previousState === "PRESENT" && !presenceFresh) {
    console.log(
      `${LOG_PREFIX} Presence TTL exceeded. Downgrading to UNCONFIRMED.`
    );
    await resetPresenceSession();
    await setAppState("UNCONFIRMED");
    await sendBleDisconnectedNotification(null);
  }

  if (
    previousState === "INSIDE_AREA" ||
    previousState === "UNCONFIRMED" ||
    previousState === "PRESENT"
  ) {
    if (previousState === "INSIDE_AREA") {
      const alreadyReported = await getInsideAreaReportStatus();
      if (alreadyReported) {
        console.log(
          `${LOG_PREFIX} INSIDE_AREA maintained. Skipping inside-area status post.`
        );
      } else {
        const posted = await postInsideAreaStatus({ source: "periodic" });
        if (posted) {
          await setInsideAreaReportStatus(true);
        } else {
          console.log(
            `${LOG_PREFIX} Inside-area status post failed. Will retry on next interval.`
          );
        }
      }
    }

    const shouldRetryNow =
      !presenceFresh ||
      previousState !== "INSIDE_AREA" ||
      now - lastRetryTimestamp >= RETRY_INTERVAL_MS;

    if (!shouldRetryNow) {
      console.log(
        `${LOG_PREFIX} Retry deferred to avoid frequent scans (elapsed ${
          now - lastRetryTimestamp
        }ms)`
      );
      if (Platform.OS === "android") {
        await notifyAndroidDebug(
          "Periodic scan deferred",
          `elapsedMs=${now - lastRetryTimestamp}`
        );
      }
      BackgroundFetch.finish(taskId);
      return;
    }

    if (rapidRetryWindowActive) {
      console.log(
        `${LOG_PREFIX} Rapid retry window active until ${new Date(
          rapidRetryWindowUntil!
        ).toISOString()}. Skipping periodic scan.`
      );
      if (Platform.OS === "android") {
        await notifyAndroidDebug(
          "Periodic scan skipped",
          `reason=rapid-retry; until=${new Date(
            rapidRetryWindowUntil!
          ).toISOString()}`
        );
      }
      BackgroundFetch.finish(taskId);
      return;
    }

    if (presenceFresh) {
      console.log(
        `${LOG_PREFIX} Beacon detection still fresh. Skipping additional scan.`
      );
      BackgroundFetch.finish(taskId);
      return;
    }

    console.log(`${LOG_PREFIX} Beacon not fresh. Starting detection scan...`);
    lastRetryTimestamp = now;
    const detected = await scanAndReconnect();
    if (!detected) {
      console.log(
        `${LOG_PREFIX} Beacon not detected. Will retry after backoff.`
      );
      if (Platform.OS === "android") {
        await notifyAndroidDebug(
          "Periodic scan failed",
          `state=${previousState}; nextRetry=${new Date(
            now + RETRY_INTERVAL_MS
          ).toISOString()}`
        );
      }
    }
  } else {
    console.log(`${LOG_PREFIX} Outside area. Skipping scan.`);
    if (Platform.OS === "android") {
      await notifyAndroidDebug("Periodic scan skipped", "state=OUTSIDE");
    }
  }

  BackgroundFetch.finish(taskId);
};

/**
 * タスクの初期化と設定
 *
 * 注意事項:
 * - iOS: minimumFetchInterval は目安であり、OS がアプリの使用パターンに基づいて
 *   実際の間隔を動的に調整します。数時間おきになる場合もあります。
 * - iOS: アプリが長期間使用されないと、イベント頻度がさらに低下します。
 * - Android: forceAlarmManager: true により、JobScheduler よりも正確なタイミングで
 *   実行されますが、バッテリー消費が増加します。
 */
export const initPeriodicTask = async () => {
  await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // 最小実行間隔（分）- iOS/Android共に15分が最小
      stopOnTerminate: false, // アプリ終了後も継続（Android のみ有効）
      startOnBoot: true, // デバイス再起動後に開始（Android のみ有効）
      enableHeadless: true, // HeadlessJS を有効化（Android のみ有効）
      forceAlarmManager: true, // AlarmManager を使用して精度向上（Android のみ有効）
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      requiresBatteryNotLow: false, // バッテリー残量が少なくても実行
      requiresCharging: false, // 充電中でなくても実行
      requiresDeviceIdle: false, // デバイスがアイドル状態でなくても実行
    },
    periodicTask,
    (taskId: string) => {
      console.error("[BackgroundFetch] TIMEOUT:", taskId);
      BackgroundFetch.finish(taskId);
    }
  );

  // Android: より頻繁なチェックのためにカスタムタスクをスケジュール
  if (Platform.OS === "android") {
    try {
      await BackgroundFetch.scheduleTask({
        taskId: "com.reactnativeexpoble.periodic-ble-check",
        delay: 5 * 60 * 1000, // 5分後に最初の実行
        periodic: true,
        forceAlarmManager: true,
        enableHeadless: true,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log(
        "[Periodic Check] Scheduled custom periodic task for Android"
      );
    } catch (error) {
      console.warn("[Periodic Check] Failed to schedule custom task:", error);
    }
  }
};

/**
 * Headless 環境での初期化を行う
 * アプリがバックグラウンドで起動された際、AsyncStorage や BLE Manager が
 * 正しく初期化されていることを確認する
 */
const ensureHeadlessInitialization = async (): Promise<boolean> => {
  const LOG = "[BackgroundFetch Headless]";

  try {
    // AsyncStorage の初期化確認（読み取りテスト）
    const testKey = "__headless_init_check";
    const { default: AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    await AsyncStorage.setItem(testKey, "1");
    await AsyncStorage.removeItem(testKey);
    console.log(`${LOG} AsyncStorage initialized successfully`);
  } catch (error) {
    console.error(`${LOG} AsyncStorage initialization failed:`, error);
    return false;
  }

  try {
    // BLE Manager の状態確認
    const { bleManager } = await import("../bluetooth/bleManagerInstance");
    const state = await bleManager.state();
    console.log(`${LOG} BLE Manager state: ${state}`);

    // Bluetooth がオフの場合でも初期化は成功とみなす
    // （スキャン時に再度チェックされる）
  } catch (error) {
    console.error(`${LOG} BLE Manager initialization failed:`, error);
    // BLE の初期化に失敗してもタスクは続行
    // （ネットワーク処理などは可能）
  }

  try {
    // フォアグラウンドサービス状態を同期
    const { syncForegroundServiceState } = await import(
      "../utils/androidBackground"
    );
    await syncForegroundServiceState();
    console.log(`${LOG} Foreground service state synchronized`);
  } catch (error) {
    console.warn(`${LOG} Failed to sync foreground service state:`, error);
  }

  return true;
};

/**
 * Android Headless タスクのハンドラ
 * アプリが終了している状態（プロセス殺害後やデバイス再起動後）でも
 * BackgroundFetch イベントが発火したときに呼び出される。
 */
const headlessTask = async (event: { taskId: string; timeout: boolean }) => {
  const { taskId, timeout } = event;
  const LOG = "[BackgroundFetch Headless]";

  if (timeout) {
    console.error(`${LOG} TIMEOUT:`, taskId);
    BackgroundFetch.finish(taskId);
    return;
  }

  console.log(`${LOG} Received event:`, taskId);

  try {
    // Headless 環境での初期化を確認
    const initialized = await ensureHeadlessInitialization();
    if (!initialized) {
      console.error(`${LOG} Initialization failed. Aborting task.`);
      BackgroundFetch.finish(taskId);
      return;
    }

    // periodicTask と同じ処理を実行
    await periodicTask(taskId);
  } catch (error) {
    console.error(`${LOG} Task failed:`, error);
    BackgroundFetch.finish(taskId);
  }
};

/**
 * Android Headless タスクを登録する。
 * アプリのエントリーポイント（index.js など）で呼び出す必要がある。
 * React コンポーネントのマウント前に実行されるため、
 * このファイルを import するだけで自動的に登録される。
 */
if (Platform.OS === "android") {
  BackgroundFetch.registerHeadlessTask(headlessTask);
  console.log("[Periodic Check] Registered Android headless task");
}
