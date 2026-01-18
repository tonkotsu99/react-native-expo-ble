import * as Location from "expo-location";
import { Platform } from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import { bleManager } from "../bluetooth/bleManagerInstance";
import {
  PRESENCE_TTL_MS,
  getPresenceEnterSentAt,
  getPresenceLastSeen,
  getPresenceMetadata,
  getUnconfirmedStartedAt,
  isUnconfirmedExpired,
  recordPresenceDetection,
  resetPresenceSession,
  setPresenceEnterSentAt,
  setUnconfirmedStartedAt,
  waitForBlePoweredOn,
} from "../bluetooth/bleStateUtils";
import {
  getPersistedContinuousScanState,
  isContinuousScanActive,
  startContinuousBleScanner,
  stopContinuousBleScanner,
  syncContinuousScanState,
} from "../bluetooth/continuousScan";
import {
  API_URL_ENTER,
  API_URL_EXIT,
  BLE_DEVICE_NAME_PREFIXES,
  BLE_SERVICE_UUIDS,
  DEBUG_BLE,
  RSSI_DEBOUNCE_TIME_MS,
  RSSI_ENTER_THRESHOLD,
} from "../constants";
import { GEOFENCE_REGION } from "../constants/geofence";
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
  sendGeofenceExitNotification,
} from "../utils/notifications";
import { postInsideAreaStatus } from "./insideAreaStatus";

const SCAN_TIMEOUT_MS = 15000;
const RETRY_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes backoff for repeated retries
const LAST_RETRY_TIMESTAMP_KEY = "last_retry_timestamp";
let lastRetryTimestamp = 0;
const LOG_PREFIX = "[Periodic Check]";

/**
 * 2点間の距離を計算（メートル）
 */
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 現在位置がジオフェンス外かどうかをチェック
 * ジオフェンス外の場合、状態をOUTSIDEに更新し、EXIT APIを呼び出す
 */
const checkGeofenceExit = async (): Promise<boolean> => {
  try {
    const currentState = await getAppState();

    // OUTSIDEの場合はチェック不要
    if (currentState === "OUTSIDE") {
      return false;
    }

    // 位置情報を取得
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
    });

    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      GEOFENCE_REGION.latitude,
      GEOFENCE_REGION.longitude
    );

    console.log(
      `${LOG_PREFIX} Geofence check: distance=${distance.toFixed(0)}m, radius=${
        GEOFENCE_REGION.radius
      }m, state=${currentState}`
    );

    // ジオフェンス外にいる場合
    if (distance > GEOFENCE_REGION.radius) {
      console.log(
        `${LOG_PREFIX} Outside geofence detected. Current state: ${currentState}. Updating to OUTSIDE.`
      );

      // UNCONFIRMEDタイマーをクリア（即座にOUTSIDEに遷移するため）
      const { clearUnconfirmedTimer } = await import(
        "../bluetooth/continuousScan"
      );
      clearUnconfirmedTimer();

      // 状態をOUTSIDEに更新
      await resetPresenceSession();
      await setAppState("OUTSIDE");
      await logAndroidBackgroundState("periodic-geofence-exit", {
        previousState: currentState,
        distance: distance.toFixed(0),
      });

      // ジオフェンス退出通知を送信
      await sendGeofenceExitNotification();

      // EXIT APIを呼び出す
      try {
        const userId = await getUserId();
        if (userId) {
          const response = await fetch(API_URL_EXIT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });

          if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
          }
          console.log(
            `${LOG_PREFIX} Exit attendance reported via periodic check.`
          );
        } else {
          console.warn(`${LOG_PREFIX} Skipping exit API: missing userId`);
        }
      } catch (exitError) {
        console.error(`${LOG_PREFIX} Exit attendance failed:`, exitError);
      }

      // BackgroundFetchを停止
      try {
        await BackgroundFetch.stop();
        console.log(
          `${LOG_PREFIX} BackgroundFetch stopped due to geofence exit`
        );
        await logAndroidBackgroundState("background-fetch-stop", {
          reason: "periodic-geofence-exit",
        });
      } catch (e) {
        console.error(`${LOG_PREFIX} BackgroundFetch stop failed:`, e);
      }

      // Android: 常時スキャンを停止
      if (Platform.OS === "android") {
        await stopContinuousBleScanner();
        await stopAndroidBleForegroundService("periodic-geofence-exit");
      } else if (Platform.OS === "ios") {
        await stopContinuousBleScanner();
      }

      if (Platform.OS === "android") {
        await notifyAndroidDebug(
          "Geofence exit detected",
          `distance=${distance.toFixed(0)}m; previousState=${currentState}`
        );
      }

      return true; // ジオフェンス外にいる
    }

    return false; // ジオフェンス内にいる
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to check geofence exit:`, error);
    // エラーが発生した場合は、ジオフェンス内にいると仮定して処理を続行
    return false;
  }
};

// 初期化済みフラグ（重複初期化を防ぐ）
let isPeriodicTaskInitialized = false;

/**
 * lastRetryTimestamp を永続化（Headless起動対応）
 */
const persistLastRetryTimestamp = async (timestamp: number): Promise<void> => {
  try {
    const { default: AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    await AsyncStorage.setItem(LAST_RETRY_TIMESTAMP_KEY, String(timestamp));
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to persist lastRetryTimestamp:`, error);
  }
};

/**
 * 永続化された lastRetryTimestamp を取得
 */
const getPersistedLastRetryTimestamp = async (): Promise<number> => {
  try {
    const { default: AsyncStorage } = await import(
      "@react-native-async-storage/async-storage"
    );
    const value = await AsyncStorage.getItem(LAST_RETRY_TIMESTAMP_KEY);
    if (value) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} Failed to get lastRetryTimestamp:`, error);
  }
  return 0;
};

/**
 * Headless起動時に lastRetryTimestamp を同期
 */
const syncLastRetryTimestamp = async (): Promise<void> => {
  const persisted = await getPersistedLastRetryTimestamp();
  if (persisted > lastRetryTimestamp) {
    lastRetryTimestamp = persisted;
    console.log(
      `${LOG_PREFIX} lastRetryTimestamp synced from storage: ${persisted}`
    );
  }
};

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
          const rssi = typeof device.rssi === "number" ? device.rssi : -100;

          try {
            await recordPresenceDetection(
              {
                deviceId: device.id,
                deviceName: device.name ?? null,
                rssi: rssi !== -100 ? rssi : null,
              },
              timestamp
            );

            const currentState = await getAppState();
            const isIosBackground =
              Platform.OS === "ios" &&
              (await import("react-native")).AppState.currentState !== "active";

            // iOSバックグラウンドではRSSI閾値をスキップ
            // バックグラウンドでBLE検出できること自体が近くにいる証拠
            const shouldEnter = isIosBackground || rssi >= RSSI_ENTER_THRESHOLD;

            if (shouldEnter) {
              if (
                currentState === "INSIDE_AREA" ||
                currentState === "OUTSIDE"
              ) {
                console.log(
                  `${LOG_PREFIX} Enter condition met: RSSI=${rssi}, threshold=${RSSI_ENTER_THRESHOLD}, iosBackground=${isIosBackground}`
                );
                await setAppState("PRESENT");

                const enterSentAt = await getPresenceEnterSentAt();
                if (enterSentAt === null) {
                  // iOSバックグラウンドでは実行時間が限られているため、
                  // API呼び出しを最優先で実行
                  await postEnterAttendance({
                    deviceId: device.id,
                    deviceName: device.name ?? null,
                  });
                  await setPresenceEnterSentAt(timestamp);
                  if (DEBUG_BLE) {
                    void sendDebugNotification(
                      "Attendance Recorded",
                      device.name ?? device.id
                    );
                  }
                }
                // 通知はAPI呼び出しの後に送信（iOSバックグラウンドでの実行時間を確保）
                void sendBleConnectedNotification(device.name);
              } else if (currentState === "UNCONFIRMED") {
                console.log(
                  `${LOG_PREFIX} Re-entered threshold met: ${rssi} >= ${RSSI_ENTER_THRESHOLD}`
                );
                await setAppState("PRESENT");
                const enterSentAt = await getPresenceEnterSentAt();
                if (enterSentAt === null) {
                  await postEnterAttendance({
                    deviceId: device.id,
                    deviceName: device.name ?? null,
                  });
                  await setPresenceEnterSentAt(timestamp);
                  if (DEBUG_BLE) {
                    void sendDebugNotification(
                      "Attendance Recorded",
                      device.name ?? device.id
                    );
                  }
                }
                void sendBleConnectedNotification(device.name);
              } else if (currentState === "PRESENT") {
                // 既にPRESENTの場合は何もしない（在室維持）
              }
            } else {
              // フォアグラウンドでRSSIが弱い場合はINSIDE_AREAのまま維持
              // (iOSバックグラウンドはshouldEnter=trueなのでここには来ない)
              console.log(
                `${LOG_PREFIX} RSSI too weak: ${rssi} < ${RSSI_ENTER_THRESHOLD}. Maintaining ${currentState} state.`
              );
              if (Platform.OS === "android") {
                await notifyAndroidDebug(
                  "Periodic detection (weak signal)",
                  `device=${
                    device.name ?? device.id
                  }; rssi=${rssi}; threshold=${RSSI_ENTER_THRESHOLD}`
                );
              }
            }

            if (Platform.OS === "android") {
              await notifyAndroidDebug(
                "Periodic detection success",
                `device=${
                  device.name ?? device.id
                }; rssi=${rssi}; state=${currentState}`
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
  const isCustomTask = taskId === "com.reactnativeexpoble.periodic-ble-check";
  console.log(
    `[BackgroundFetch] taskId: ${taskId}${
      isCustomTask ? " (custom scheduled task)" : ""
    }`
  );
  await logAndroidBackgroundState("periodic-task", {
    taskId,
    isCustomTask,
  });

  try {
    // Android: 連続スキャン有効時でも、ジオフェンスEXIT取りこぼしの補完チェックは実行したい。
    // そのため「タスク全体」を早期returnせず、BLEスキャン部分だけ後でスキップする。
    const androidContinuousScanActive =
      Platform.OS === "android" &&
      (isContinuousScanActive || (await getPersistedContinuousScanState()));

    let previousState = await getAppState();
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
      // 状態変更後、previousStateを更新
      previousState = "UNCONFIRMED";
    }

    // 状態が UNCONFIRMED だが検出がまだ新鮮な場合（例: プロセス再起動などでスキャンが一時停止）
    // 追加スキャンは行わず、状態と入室送信状態の整合を取る。
    if (previousState === "UNCONFIRMED" && presenceFresh) {
      console.log(
        `${LOG_PREFIX} Presence is fresh but state is UNCONFIRMED. Reconciling to PRESENT.`
      );
      await setAppState("PRESENT");
      // UNCONFIRMED開始時刻をクリア
      await setUnconfirmedStartedAt(null);
      previousState = "PRESENT";

      const enterSentAt = await getPresenceEnterSentAt();
      if (enterSentAt === null) {
        const metadata = await getPresenceMetadata();
        if (metadata?.deviceId) {
          await postEnterAttendance({
            deviceId: metadata.deviceId,
            deviceName: metadata.deviceName ?? null,
          });
          await setPresenceEnterSentAt(now);
        }
      }
    }

    // Android: UNCONFIRMED状態で永続化タイマーが期限切れの場合、INSIDE_AREAに遷移
    // JavaScriptのsetTimeoutはバックグラウンドで停止するため、永続化された時刻でチェック
    if (Platform.OS === "android" && previousState === "UNCONFIRMED") {
      const unconfirmedExpired = await isUnconfirmedExpired(
        RSSI_DEBOUNCE_TIME_MS,
        now
      );
      if (unconfirmedExpired) {
        const unconfirmedStartedAt = await getUnconfirmedStartedAt();
        const elapsedMs = unconfirmedStartedAt
          ? now - unconfirmedStartedAt
          : "unknown";
        console.log(
          `${LOG_PREFIX} UNCONFIRMED timer expired (elapsed=${elapsedMs}ms). Transitioning to INSIDE_AREA.`
        );
        await setAppState("INSIDE_AREA");
        await setUnconfirmedStartedAt(null);
        previousState = "INSIDE_AREA";

        // 通知を送信
        await sendBleDisconnectedNotification(null);

        if (Platform.OS === "android") {
          await notifyAndroidDebug(
            "UNCONFIRMED timer expired",
            `elapsed=${elapsedMs}ms; state=INSIDE_AREA`
          );
        }
      }
    }

    if (
      previousState === "INSIDE_AREA" ||
      previousState === "UNCONFIRMED" ||
      previousState === "PRESENT"
    ) {
      // Android: ジオフェンスEXITイベントが発火しなかった場合の補完として、
      // 位置情報をチェックしてジオフェンス外にいることを検知する
      if (Platform.OS === "android") {
        const isOutside = await checkGeofenceExit();
        if (isOutside) {
          // ジオフェンス外にいることが確認されたため、処理を終了
          console.log(`${LOG_PREFIX} Geofence exit detected. Task completed.`);
          return;
        }
        // ジオフェンス内にいる場合は、既存のBLEスキャンを実行
      }

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
        return;
      }

      if (presenceFresh) {
        console.log(
          `${LOG_PREFIX} Beacon detection still fresh. Skipping additional scan.`
        );
        return;
      }

      if (androidContinuousScanActive) {
        console.log(
          `${LOG_PREFIX} Continuous scan active. Skipping periodic BLE scan portion.`
        );
        await notifyAndroidDebug(
          "Periodic BLE scan skipped",
          "continuous scan is active"
        );
        return;
      }

      console.log(`${LOG_PREFIX} Beacon not fresh. Starting detection scan...`);
      lastRetryTimestamp = now;
      await persistLastRetryTimestamp(now);
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
  } finally {
    // try-finallyパターン: 例外が発生しても確実にfinishを呼び出す
    BackgroundFetch.finish(taskId);
  }
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
  // 既に初期化済みの場合はスキップ（重複初期化を防ぐ）
  if (isPeriodicTaskInitialized) {
    console.log(
      `${LOG_PREFIX} Periodic task already initialized. Skipping re-initialization.`
    );
    return;
  }

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
  // 注意: scheduleTaskでスケジュールしたタスクは、configureで登録した
  // periodicTaskハンドラを使用します。taskIdで識別できます。
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
        "[Periodic Check] Scheduled custom periodic task for Android (5min interval)"
      );
      await logAndroidBackgroundState("custom-task-scheduled", {
        taskId: "com.reactnativeexpoble.periodic-ble-check",
      });
    } catch (error) {
      console.warn("[Periodic Check] Failed to schedule custom task:", error);
      await logAndroidBackgroundState("custom-task-schedule-failed", {
        error: String((error as Error)?.message ?? error),
      });
    }
  }

  // 初期化完了フラグを設定
  isPeriodicTaskInitialized = true;
  console.log(`${LOG_PREFIX} Periodic task initialization completed`);
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

  try {
    // 連続スキャン状態を同期
    await syncContinuousScanState();
    console.log(`${LOG} Continuous scan state synchronized`);
  } catch (error) {
    console.warn(`${LOG} Failed to sync continuous scan state:`, error);
  }

  try {
    // lastRetryTimestamp を同期（スロットリングのため）
    await syncLastRetryTimestamp();
    console.log(`${LOG} lastRetryTimestamp synchronized`);
  } catch (error) {
    console.warn(`${LOG} Failed to sync lastRetryTimestamp:`, error);
  }

  // Headless起動時に、状態が INSIDE_AREA または PRESENT の場合に連続スキャンを再開
  try {
    const appState = await getAppState();
    const persistedScanActive = await getPersistedContinuousScanState();

    if (
      (appState === "INSIDE_AREA" || appState === "PRESENT") &&
      persistedScanActive &&
      !isContinuousScanActive
    ) {
      console.log(
        `${LOG} State is ${appState} and scan was active. Attempting to resume continuous scan...`
      );

      // フォアグラウンドサービスを確認・再開
      const { isAndroidForegroundServiceRunning } = await import(
        "../utils/androidBackground"
      );
      const foregroundRunning = isAndroidForegroundServiceRunning();

      if (foregroundRunning) {
        // フォアグラウンドサービスが動作中なら連続スキャンを再開
        await startContinuousBleScanner();
        console.log(`${LOG} Continuous scan resumed successfully`);
        await notifyAndroidDebug(
          "Headless scan resumed",
          `state=${appState}; foregroundRunning=${foregroundRunning}`
        );
      } else {
        // フォアグラウンドサービスが動作していない場合、通知権限があれば再起動を試みる
        const {
          ensureAndroidBackgroundCapabilities,
          startAndroidBleForegroundService,
        } = await import("../utils/androidBackground");
        const capabilities = await ensureAndroidBackgroundCapabilities({
          interactive: false,
          reason: "headless-resume",
        });

        if (capabilities.notificationsGranted) {
          // 通知権限があればフォアグラウンドサービスを再起動して連続スキャンを再開
          try {
            await startAndroidBleForegroundService("headless-resume", {
              title: "研究室ビーコンを監視しています",
              body: "バックグラウンドでビーコンを検出しています",
            });
            await startContinuousBleScanner();
            console.log(
              `${LOG} Foreground service restarted and continuous scan resumed`
            );
            await notifyAndroidDebug(
              "Headless scan resumed",
              `state=${appState}; foreground service restarted`
            );
          } catch (restartError) {
            console.warn(
              `${LOG} Failed to restart foreground service:`,
              restartError
            );
            await notifyAndroidDebug(
              "Headless scan resume failed",
              `state=${appState}; error=${String(
                (restartError as Error)?.message ?? restartError
              )}`
            );
          }
        } else {
          // 通知権限がない場合は連続スキャンを再開しない
          // （バックグラウンド制限により数秒で停止するため）
          console.log(
            `${LOG} Foreground service not running and notifications not granted. Skipping continuous scan resume.`
          );
          await notifyAndroidDebug(
            "Headless scan skipped",
            `state=${appState}; foregroundRunning=false; notificationsGranted=false; relying on periodic scan`
          );
        }
      }
    }
  } catch (error) {
    console.warn(`${LOG} Failed to resume continuous scan:`, error);
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
    // 注意: periodicTask 内の try-finally で BackgroundFetch.finish() が呼ばれるため
    // ここでは finish を呼び出さない
    await periodicTask(taskId);
  } catch (error) {
    console.error(`${LOG} Task failed:`, error);
    // periodicTask が例外をスローした場合は、try-finally が実行されずにここに来る可能性がある
    // ただし、現在の periodicTask 実装では例外をスローしないので、ここには到達しないはず
    // 安全のため、フラグで二重呼び出しを防止
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
