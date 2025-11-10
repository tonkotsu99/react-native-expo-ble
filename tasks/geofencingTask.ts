import {
  LocationGeofencingEventType,
  type LocationRegion,
} from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import { bleManager } from "../bluetooth/bleManagerInstance";
import {
  getPresenceEnterSentAt,
  recordPresenceDetection,
  resetPresenceSession,
  setPresenceEnterSentAt,
  waitForBlePoweredOn,
} from "../bluetooth/bleStateUtils";
import {
  API_URL_ENTER,
  API_URL_EXIT,
  BLE_DEVICE_NAME_PREFIXES,
  BLE_SERVICE_UUIDS,
} from "../constants";
import {
  getAppState,
  getInsideAreaReportStatus,
  setAppState,
  setInsideAreaReportStatus,
  setRapidRetryWindowUntil,
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
  sendDebugNotification,
  sendGeofenceEnterNotification,
  sendGeofenceExitNotification,
} from "../utils/notifications";
import { postInsideAreaStatus } from "./insideAreaStatus";
import { initPeriodicTask } from "./periodicCheckTask";

const GEOFENCING_TASK_NAME = "background-geofencing-task";
let backgroundFetchStarted = false;
const RAPID_RETRY_WINDOW_MS = 5 * 60 * 1000;
const RAPID_RETRY_INTERVAL_MS = 45000;
let rapidRetryInterval: ReturnType<typeof setInterval> | null = null;
let rapidRetryTimeout: ReturnType<typeof setTimeout> | null = null;
let rapidRetryWindowEndsAt = 0;
let backgroundScanInFlight = false;

// ----- Continuous BLE Scan State -----
export let isContinuousScanActive = false;
let unconfirmedTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * UNCONFIRMED タイマーをクリア
 */
export const clearUnconfirmedTimer = (): void => {
  if (unconfirmedTimer) {
    clearTimeout(unconfirmedTimer);
    unconfirmedTimer = null;
    console.log("[Geofencing Task] Unconfirmed timer cleared");
  }
};

/**
 * UNCONFIRMED タイマーを開始
 * @param ms - タイマーの待機時間（ミリ秒）
 */
export const startUnconfirmedTimer = async (ms: number): Promise<void> => {
  clearUnconfirmedTimer();

  console.log(`[Geofencing Task] Starting unconfirmed timer (${ms}ms)`);
  unconfirmedTimer = setTimeout(async () => {
    try {
      const currentState = await getAppState();
      if (currentState === "UNCONFIRMED") {
        await setAppState("INSIDE_AREA");
        console.log(
          "[Geofencing Task] Unconfirmed timer expired. State changed to INSIDE_AREA"
        );

        // 退室通知を送信
        const { sendBleDisconnectedNotification } = await import(
          "../utils/notifications"
        );
        await sendBleDisconnectedNotification(null);
      }
    } catch (error) {
      console.error(
        "[Geofencing Task] Failed to handle unconfirmed timer:",
        error
      );
    } finally {
      unconfirmedTimer = null;
    }
  }, ms);
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

const clearRapidRetryTimers = () => {
  if (rapidRetryInterval) {
    clearInterval(rapidRetryInterval);
    rapidRetryInterval = null;
  }
  if (rapidRetryTimeout) {
    clearTimeout(rapidRetryTimeout);
    rapidRetryTimeout = null;
  }
};

const stopRapidRetryWindow = async (
  reason: string,
  options: { silent?: boolean } = {}
): Promise<void> => {
  if (
    !rapidRetryInterval &&
    !rapidRetryTimeout &&
    rapidRetryWindowEndsAt === 0
  ) {
    return;
  }

  clearRapidRetryTimers();
  rapidRetryWindowEndsAt = 0;

  if (!options.silent) {
    console.log("[Geofencing Task] Rapid retry window stopped", { reason });
    if (Platform.OS === "android") {
      void notifyAndroidDebug("Rapid retry window stopped", `reason=${reason}`);
    }
  }

  try {
    await setRapidRetryWindowUntil(null);
  } catch (error) {
    console.warn(
      "[Geofencing Task] Failed to persist rapid retry window stop",
      error
    );
  }
};

/**
 * 常時 BLE スキャンを開始（Android のみ）
 * RSSI 値に基づいて研究室の入退室を判定
 */
const startContinuousBleScanner = async (): Promise<void> => {
  if (isContinuousScanActive) {
    console.log("[Geofencing Task] Continuous scan already active. Skipping.");
    return;
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn("[Geofencing Task] Skipping continuous scan: missing userId");
    return;
  }

  const waitResult = await waitForBlePoweredOn({
    logPrefix: "[Geofencing Task - Continuous]",
  });

  if (!waitResult.ready) {
    console.warn(
      "[Geofencing Task] Bluetooth not ready. Skipping continuous scan."
    );
    return;
  }

  console.log("[Geofencing Task] Starting continuous BLE scan...");
  isContinuousScanActive = true;

  const { RSSI_ENTER_THRESHOLD, RSSI_EXIT_THRESHOLD, RSSI_DEBOUNCE_TIME_MS } =
    await import("../constants");

  const normalizedServiceUUIDs = BLE_SERVICE_UUIDS.map((uuid) =>
    uuid.toLowerCase()
  );
  const normalizedNamePrefixes = BLE_DEVICE_NAME_PREFIXES.map((prefix) =>
    prefix.toLowerCase()
  );

  try {
    bleManager.startDeviceScan(
      BLE_SERVICE_UUIDS,
      null,
      async (scanError, device) => {
        if (scanError) {
          console.error("[Geofencing Task] Continuous scan error:", scanError);
          return;
        }

        if (!device) return;

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

        if (!matchesService && !matchesName) {
          return;
        }

        if (!device.rssi || typeof device.rssi !== "number") {
          console.warn(
            "[Geofencing Task] Device RSSI is null or invalid:",
            device.id
          );
          return;
        }

        const currentState = await getAppState();
        const timestamp = Date.now();

        try {
          await recordPresenceDetection(
            {
              deviceId: device.id,
              deviceName: device.name ?? null,
              rssi: device.rssi,
            },
            timestamp
          );

          // 強い RSSI → PRESENT (研究室内)
          if (device.rssi > RSSI_ENTER_THRESHOLD) {
            if (currentState !== "PRESENT") {
              console.log(
                `[Geofencing Task] Strong RSSI detected (${device.rssi} dBm). Transitioning to PRESENT.`
              );
              await setAppState("PRESENT");
              await sendBleConnectedNotification(device.name);

              const enterSentAt = await getPresenceEnterSentAt();
              if (enterSentAt === null) {
                await postAttendance(API_URL_ENTER, {
                  deviceId: device.id,
                  deviceName: device.name ?? null,
                });
                await setPresenceEnterSentAt(timestamp);
              }
            }
            clearUnconfirmedTimer();
          }
          // 弱い RSSI → UNCONFIRMED (信号喪失)
          else if (device.rssi <= RSSI_EXIT_THRESHOLD) {
            if (currentState === "PRESENT") {
              console.log(
                `[Geofencing Task] Weak RSSI detected (${device.rssi} dBm). Transitioning to UNCONFIRMED.`
              );
              await setAppState("UNCONFIRMED");
              await startUnconfirmedTimer(RSSI_DEBOUNCE_TIME_MS);
            }
          }
        } catch (error) {
          console.error(
            "[Geofencing Task] Failed to handle continuous scan detection:",
            error
          );
        }
      }
    );

    console.log("[Geofencing Task] Continuous scan started successfully");
  } catch (error) {
    isContinuousScanActive = false;
    console.error("[Geofencing Task] Failed to start continuous scan:", error);
    throw error;
  }
};

/**
 * 常時 BLE スキャンを停止
 */
const stopContinuousBleScanner = async (): Promise<void> => {
  if (!isContinuousScanActive) {
    console.log("[Geofencing Task] Continuous scan not active. Skipping stop.");
    return;
  }

  console.log("[Geofencing Task] Stopping continuous BLE scan...");

  try {
    bleManager.stopDeviceScan();
    isContinuousScanActive = false;
    clearUnconfirmedTimer();
    console.log("[Geofencing Task] Continuous scan stopped successfully");
  } catch (error) {
    console.error("[Geofencing Task] Failed to stop continuous scan:", error);
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
 * バックグラウンドでBLEデバイスに接続を試みる関数
 */
async function tryDetectBeacon(
  options: { force?: boolean; context?: string } = {}
): Promise<boolean> {
  const { context = "unspecified" } = options;

  if (backgroundScanInFlight) {
    console.log(
      "[Geofencing Task] Beacon scan already in progress. Skipping request.",
      { context }
    );
    await safeSendDebugNotification(
      "Beacon detection skipped",
      `context=${context}; reason=scan-in-flight`
    );
    return false;
  }

  const attemptStartedAt = Date.now();
  console.log("[Geofencing Task] tryDetectBeacon invoked", {
    context,
    timestamp: new Date(attemptStartedAt).toISOString(),
  });

  await safeSendDebugNotification(
    "Beacon detection attempt",
    `context=${context}; startedAt=${new Date(attemptStartedAt).toISOString()}`
  );

  let androidForegroundStarted = false;
  const androidReason = `detect:${context}`;

  const stopAndroidForeground = async (phase: string) => {
    if (!androidForegroundStarted) return;
    androidForegroundStarted = false;
    try {
      await stopAndroidBleForegroundService(`${androidReason}:${phase}`);
    } catch (error) {
      console.warn(
        "[Geofencing Task] Failed to stop Android foreground service",
        {
          error,
          phase,
          context,
        }
      );
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

      const canStartForeground =
        capabilities.notificationsGranted && capabilities.batteryOptimizationOk;
      if (canStartForeground) {
        await startAndroidBleForegroundService(androidReason, {
          title: "研究室ビーコンを探索しています",
          body: "在室状況を確認するためにビーコンを検出しています",
        });
        androidForegroundStarted = true;
      } else {
        await notifyAndroidDebug(
          "Foreground service unavailable",
          `context=${context}; notificationsGranted=${capabilities.notificationsGranted}; batteryOptimizationOk=${capabilities.batteryOptimizationOk}`
        );
      }
    } catch (error) {
      console.warn(
        "[Geofencing Task] Failed to prepare Android foreground capabilities",
        error
      );
    }
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn("[Geofencing Task] Skipping beacon detection: missing userId");
    await safeSendDebugNotification(
      "Beacon detection skipped",
      "missing userId"
    );
    await stopAndroidForeground("missing-user-id");
    return false;
  }

  backgroundScanInFlight = true;

  const waitResult = await waitForBlePoweredOn({
    logPrefix: "[Geofencing Task]",
  });

  if (!waitResult.ready) {
    backgroundScanInFlight = false;
    await safeSendDebugNotification(
      "Beacon detection blocked",
      `context=${context}; ready=${waitResult.ready}; timedOut=${waitResult.timedOut}`
    );
    await stopAndroidForeground("ble-not-ready");
    return false;
  }

  const normalizedServiceUUIDs = BLE_SERVICE_UUIDS.map((uuid) =>
    uuid.toLowerCase()
  );
  const normalizedNamePrefixes = BLE_DEVICE_NAME_PREFIXES.map((prefix) =>
    prefix.toLowerCase()
  );

  return await new Promise((resolve) => {
    let settled = false;

    const finish = async (
      result: boolean,
      reason: string,
      meta: Record<string, unknown> = {}
    ) => {
      if (settled) return;
      settled = true;
      backgroundScanInFlight = false;
      try {
        bleManager.stopDeviceScan();
      } catch {}

      const durationMs = Date.now() - attemptStartedAt;
      console.log("[Geofencing Task] Beacon detection finished", {
        context,
        result,
        reason,
        durationMs,
        ...meta,
      });

      await safeSendDebugNotification(
        result ? "Beacon detection success" : "Beacon detection failed",
        `context=${context}; reason=${reason}; durationMs=${durationMs}`
      );

      if (Platform.OS === "android") {
        void logAndroidBackgroundState(`${androidReason}:finish`, {
          result,
          reason,
        });
      }
      void stopAndroidForeground(result ? "success" : reason);

      resolve(result);
    };

    const timeoutMs = 15000;
    const timeoutId = setTimeout(() => {
      console.warn("[Geofencing Task] Beacon detection scan timeout");
      void stopAndroidForeground("timeout");
      void finish(false, "timeout");
    }, timeoutMs);

    console.log("[Geofencing Task] Beacon scan started", {
      context,
      timeoutMs,
    });

    try {
      bleManager.startDeviceScan(
        BLE_SERVICE_UUIDS,
        null,
        async (scanError, device) => {
          if (settled) return;

          if (scanError) {
            console.error("[Geofencing Task] Scan error", scanError);
            clearTimeout(timeoutId);
            await stopAndroidForeground("scan-error");
            await finish(false, "scan-error", {
              error: (scanError as Error).message,
            });
            return;
          }

          if (!device) return;

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

          if (!matchesService && !matchesName) {
            return;
          }

          clearTimeout(timeoutId);

          try {
            const timestamp = Date.now();

            await recordPresenceDetection(
              {
                deviceId: device.id,
                deviceName: device.name ?? null,
                rssi: typeof device.rssi === "number" ? device.rssi : null,
              },
              timestamp
            );

            const previousState = await getAppState();
            if (previousState !== "PRESENT") {
              await setAppState("PRESENT");
              await sendBleConnectedNotification(device.name);
            }

            const enterSentAt = await getPresenceEnterSentAt();
            if (enterSentAt === null) {
              await postAttendance(API_URL_ENTER, {
                deviceId: device.id,
                deviceName: device.name ?? null,
              });
              await setPresenceEnterSentAt(timestamp);
            }

            await stopRapidRetryWindow("detected");
            await finish(true, "detected", {
              deviceId: device.id,
              deviceName: device.name ?? null,
              rssi: device.rssi ?? null,
            });
          } catch (error) {
            console.error(
              "[Geofencing Task] Failed to handle beacon detection",
              error
            );
            await finish(false, "detection-error", {
              error: (error as Error).message,
            });
          }
        }
      );
    } catch (error) {
      backgroundScanInFlight = false;
      clearTimeout(timeoutId);
      console.error("[Geofencing Task] Failed to start beacon scan", error);
      void stopAndroidForeground("start-scan-error");
      void finish(false, "start-scan-error", {
        error: (error as Error).message,
      });
    }
  });
}

async function startRapidRetryWindow(
  options: { force?: boolean } = {}
): Promise<void> {
  const { force = false } = options;

  if (rapidRetryInterval || rapidRetryTimeout || rapidRetryWindowEndsAt) {
    await stopRapidRetryWindow("restart", { silent: true });
  }

  const userId = await getUserId();
  if (!userId) {
    await setRapidRetryWindowUntil(null);
    console.warn(
      "[Geofencing Task] Skipping rapid retry window: missing userId"
    );
    return;
  }

  const now = Date.now();
  rapidRetryWindowEndsAt = now + RAPID_RETRY_WINDOW_MS;

  try {
    await setRapidRetryWindowUntil(rapidRetryWindowEndsAt);
  } catch (error) {
    console.warn(
      "[Geofencing Task] Failed to persist rapid retry window start",
      error
    );
  }

  const triggerReconnect = () => {
    console.log("[Geofencing Task] Rapid retry tick", {
      force,
      windowEndsAtIso: new Date(rapidRetryWindowEndsAt).toISOString(),
      timestamp: new Date().toISOString(),
    });
    if (Platform.OS === "android") {
      void notifyAndroidDebug(
        "Rapid retry",
        `force=${force}; windowEndsAt=${new Date(
          rapidRetryWindowEndsAt
        ).toISOString()}`
      );
    }
    void tryDetectBeacon({ force, context: "rapid-retry" });
  };

  triggerReconnect();

  rapidRetryInterval = setInterval(triggerReconnect, RAPID_RETRY_INTERVAL_MS);
  rapidRetryTimeout = setTimeout(() => {
    void stopRapidRetryWindow("window-expired");
  }, RAPID_RETRY_WINDOW_MS);

  console.log("[Geofencing Task] Rapid retry window started", {
    windowMs: RAPID_RETRY_WINDOW_MS,
    intervalMs: RAPID_RETRY_INTERVAL_MS,
    force,
  });
  if (Platform.OS === "android") {
    void notifyAndroidDebug(
      "Rapid retry window started",
      `intervalMs=${RAPID_RETRY_INTERVAL_MS}; windowMs=${RAPID_RETRY_WINDOW_MS}; force=${force}`
    );
  }
}

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

    const forceReconnect =
      previousState === "INSIDE_AREA" || previousState === "UNCONFIRMED";

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

    // Android: 常時 BLE スキャンを開始
    if (Platform.OS === "android") {
      await startAndroidBleForegroundService("continuous-scan", {
        title: "研究室ビーコンを監視しています",
        body: "学内にいる間、バックグラウンドでビーコンを検出します",
      });
      await startContinuousBleScanner();
    } else {
      // iOS: 既存の定期スキャンを実行
      const detected = await tryDetectBeacon({
        force: forceReconnect,
        context: "geofence-enter",
      });

      if (!detected) {
        await safeSendDebugNotification(
          "BLE Rapid Retry Scheduled",
          `context=geofence-enter; force=${forceReconnect}`
        );
        await startRapidRetryWindow({ force: forceReconnect });
      }
    }
  } else if (eventType === LocationGeofencingEventType.Exit) {
    console.log(
      "[Geofencing Task] Exited area:",
      region?.identifier ?? "unknown"
    );
    await stopRapidRetryWindow("geofence-exit");
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

    // Android: 常時スキャンとフォアグラウンドサービスを停止
    if (Platform.OS === "android") {
      await stopContinuousBleScanner();
      await stopAndroidBleForegroundService("geofence-exit");
    }
  }
});
