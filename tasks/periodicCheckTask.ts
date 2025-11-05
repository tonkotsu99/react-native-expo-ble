import { Platform } from "react-native";
import BackgroundFetch from "react-native-background-fetch";
import type { Device } from "react-native-ble-plx";
import { bleManager } from "../bluetooth/bleManagerInstance";
import { waitForBlePoweredOn } from "../bluetooth/bleStateUtils";
import {
  API_URL_ENTER,
  BLE_DEVICE_NAME_PREFIXES,
  BLE_SERVICE_UUIDS,
  DEBUG_BLE,
} from "../constants";
import type { AppState } from "../state/appState";
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

const postEnterAttendance = async (device: Device): Promise<void> => {
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
        deviceId: device.id,
        deviceName: device.name,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    console.log(
      `${LOG_PREFIX} Attendance posted for ${device.name ?? device.id}`
    );
  } catch (error) {
    console.error(
      `${LOG_PREFIX} Failed to post attendance: ${(error as Error).message}`
    );
  }
};

const scanAndReconnect = async (previousState: AppState): Promise<boolean> => {
  const userId = await getUserId();
  if (!userId) {
    console.warn(`${LOG_PREFIX} Skipping BLE scan: missing userId`);
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

      const canStartForeground =
        capabilities.notificationsGranted && capabilities.batteryOptimizationOk;
      if (canStartForeground) {
        await startAndroidBleForegroundService(androidReason, {
          title: "研究室ビーコンを再探索しています",
          body: "在室状況を自動で確認しています",
        });
        androidForegroundStarted = true;
      } else {
        await notifyAndroidDebug(
          "Foreground service unavailable",
          `context=periodic; notificationsGranted=${capabilities.notificationsGranted}; batteryOptimizationOk=${capabilities.batteryOptimizationOk}`
        );
      }
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to prepare Android foreground`, error);
    }
  }

  // 権限チェック
  const hasPermissions = await checkBluetoothPermissions();
  if (!hasPermissions) {
    console.warn(
      `${LOG_PREFIX} Bluetooth権限がありません。スキャンをスキップします。`
    );
    await stopAndroidForeground("missing-permission");
    return false;
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      bleManager.stopDeviceScan();
      clearTimeout(timeoutId);
      if (Platform.OS === "android") {
        void logAndroidBackgroundState(`${androidReason}:finish`, {
          result,
        });
        void stopAndroidForeground(result ? "success" : "failure");
      }
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      console.warn(`${LOG_PREFIX} Scan timed out. No device detected.`);
      if (Platform.OS === "android") {
        void notifyAndroidDebug("Periodic scan timeout", "no device detected");
        void stopAndroidForeground("timeout");
      }
      finish(false);
    }, SCAN_TIMEOUT_MS);

    // Broad scan + JS filters for iOS reliability
    bleManager.startDeviceScan(BLE_SERVICE_UUIDS, null, (error, device) => {
      if (error) {
        console.error(`${LOG_PREFIX} Scan error:`, error);
        if (Platform.OS === "android") {
          void notifyAndroidDebug(
            "Periodic scan error",
            String((error as Error)?.message ?? error)
          );
          void stopAndroidForeground("scan-error");
        }
        finish(false);
        return;
      }

      if (!device) {
        return;
      }

      const normalizedServiceUUIDs = BLE_SERVICE_UUIDS.map((u) =>
        u.toLowerCase()
      );
      const normalizedNamePrefixes = BLE_DEVICE_NAME_PREFIXES.map((p) =>
        p.toLowerCase()
      );
      const serviceUUIDs = device.serviceUUIDs?.map((u) => u.toLowerCase());
      const deviceName = device.name?.toLowerCase() ?? "";
      const matchesService = serviceUUIDs
        ? serviceUUIDs.some((u) => normalizedServiceUUIDs.includes(u))
        : false;
      const matchesName = normalizedNamePrefixes.some((p) =>
        deviceName.startsWith(p)
      );

      if (!matchesService && !matchesName) {
        return; // ignore non-target devices
      }

      // Stop scanning while attempting to connect so we don't process multiple devices.
      bleManager.stopDeviceScan();

      (async () => {
        try {
          const connectionOptions =
            Platform.OS === "android"
              ? { autoConnect: true as const, timeout: 15000 }
              : { timeout: 15000 };
          const connected = await bleManager.connectToDevice(
            device.id,
            connectionOptions
          );
          await connected.discoverAllServicesAndCharacteristics();
          console.log(
            `${LOG_PREFIX} Reconnected to device: ${
              connected.name ?? connected.id
            }`
          );

          await setAppState("PRESENT");
          if (previousState !== "PRESENT") {
            await postEnterAttendance(connected);
          } else {
            console.log(
              `${LOG_PREFIX} Reconnected while already PRESENT. Skipping duplicate attendance post.`
            );
          }
          if (Platform.OS === "android") {
            await notifyAndroidDebug(
              "Periodic reconnect success",
              `device=${connected.name ?? connected.id}`
            );
          }
          finish(true);
        } catch (connectError) {
          console.error(`${LOG_PREFIX} Reconnect failed:`, connectError);
          if (Platform.OS === "android") {
            await notifyAndroidDebug(
              "Periodic reconnect failed",
              String((connectError as Error)?.message ?? connectError)
            );
            await stopAndroidForeground("connect-error");
          }
          finish(false);
        }
      })();
    });
  });
};

/** 15分ごとに実行されるタスク */
const periodicTask = async (taskId: string) => {
  console.log("[BackgroundFetch] taskId:", taskId);
  await logAndroidBackgroundState("periodic-task", { taskId });
  const previousState = await getAppState();
  const rapidRetryWindowUntil = await getRapidRetryWindowUntil();
  const now = Date.now();
  const rapidRetryWindowActive =
    typeof rapidRetryWindowUntil === "number" && now < rapidRetryWindowUntil;
  const connectedDevices = await bleManager.connectedDevices(BLE_SERVICE_UUIDS);

  if (connectedDevices.length > 0) {
    const [device] = connectedDevices;
    if (previousState !== "PRESENT") {
      await setAppState("PRESENT");
      await postEnterAttendance(device);
    } else {
      console.log(
        `${LOG_PREFIX} Already PRESENT. Skipping duplicate attendance post.`
      );
    }
    if (Platform.OS === "android") {
      await notifyAndroidDebug(
        "Periodic check",
        `connectedDevice=${device.name ?? device.id}; state=${previousState}`
      );
    }
    BackgroundFetch.finish(taskId);
    return;
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
      previousState !== "INSIDE_AREA" ||
      now - lastRetryTimestamp >= RETRY_INTERVAL_MS;

    if (shouldRetryNow) {
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
      } else {
        console.log(`${LOG_PREFIX} Not connected. Starting scan...`);
        lastRetryTimestamp = now;
        const connected = await scanAndReconnect(previousState);
        if (!connected) {
          console.log(
            `${LOG_PREFIX} Device not found. Will retry after backoff.`
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
      }
    } else {
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
    }
  } else {
    console.log(`${LOG_PREFIX} Outside area. Skipping scan.`);
    if (Platform.OS === "android") {
      await notifyAndroidDebug("Periodic scan skipped", "state=OUTSIDE");
    }
  }

  BackgroundFetch.finish(taskId);
};

/** タスクの初期化と設定 */
export const initPeriodicTask = async () => {
  await BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // 実行間隔（分）
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      forceAlarmManager: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    periodicTask,
    (taskId: string) => {
      console.error("[BackgroundFetch] TIMEOUT:", taskId);
      BackgroundFetch.finish(taskId);
    }
  );
};
