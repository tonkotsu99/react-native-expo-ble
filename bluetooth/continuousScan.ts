import { AppState, Platform } from "react-native";
import {
  API_URL_ENTER,
  BLE_DEVICE_NAME_PREFIXES,
  BLE_SERVICE_UUIDS,
} from "../constants";
import { getAppState, setAppState } from "../state/appState";
import { getUserId } from "../state/userProfile";
import {
  sendBleConnectedNotification,
  sendBleDisconnectedNotification,
  sendDebugNotification,
} from "../utils/notifications";
import { bleManager } from "./bleManagerInstance";
import {
  getPresenceEnterSentAt,
  recordPresenceDetection,
  setPresenceEnterSentAt,
  waitForBlePoweredOn,
} from "./bleStateUtils";

// ----- Types -----
export type DetectionCallback = (detection: {
  deviceId: string;
  deviceName: string | null;
  rssi: number | null;
}) => void;

// ----- State -----
export let isContinuousScanActive = false;
let unconfirmedTimer: ReturnType<typeof setTimeout> | null = null;
let lastDetectionTime = 0;
let watchdogInterval: ReturnType<typeof setInterval> | null = null;
const WATCHDOG_INTERVAL_MS = 10000; // 10秒ごとにチェック
const DETECTION_TIMEOUT_MS = 180000; // 3分間検知がなければ切断とみなす

// RSSI Smoothing
const rssiHistory = new Map<string, number[]>();
const RSSI_SMOOTHING_WINDOW = 5;

const listeners: DetectionCallback[] = [];

// ----- Helpers -----

export const addDetectionListener = (callback: DetectionCallback) => {
  listeners.push(callback);
};

export const removeDetectionListener = (callback: DetectionCallback) => {
  const index = listeners.indexOf(callback);
  if (index > -1) {
    listeners.splice(index, 1);
  }
};

const notifyListeners = (detection: {
  deviceId: string;
  deviceName: string | null;
  rssi: number | null;
}) => {
  listeners.forEach((callback) => callback(detection));
};

const getSmoothedRssi = (deviceId: string, rssi: number): number => {
  if (!rssiHistory.has(deviceId)) {
    rssiHistory.set(deviceId, []);
  }
  const history = rssiHistory.get(deviceId)!;
  history.push(rssi);
  if (history.length > RSSI_SMOOTHING_WINDOW) {
    history.shift();
  }
  const sum = history.reduce((a, b) => a + b, 0);
  return sum / history.length;
};

export const clearUnconfirmedTimer = (): void => {
  if (unconfirmedTimer) {
    clearTimeout(unconfirmedTimer);
    unconfirmedTimer = null;
    console.log("[Continuous Scan] Unconfirmed timer cleared");
  }
};

const safeSendDebugNotification = async (
  title: string,
  body: string
): Promise<void> => {
  try {
    await sendDebugNotification(title, body);
  } catch (error) {
    console.warn("[Continuous Scan] Failed to send debug notification", error);
  }
};

const postEnterAttendance = async (payload: {
  deviceId: string;
  deviceName: string | null;
}): Promise<void> => {
  try {
    const userId = await getUserId();
    if (!userId) {
      console.warn(
        "[Continuous Scan] Skipping enter attendance: missing userId"
      );
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

    console.log("[Continuous Scan] Enter attendance posted", payload);
  } catch (error) {
    console.error(
      "[Continuous Scan] Failed to post enter attendance",
      (error as Error).message
    );
  }
};

const startWatchdog = () => {
  if (watchdogInterval) clearInterval(watchdogInterval);

  console.log("[Continuous Scan] Starting watchdog timer");
  watchdogInterval = setInterval(async () => {
    if (!isContinuousScanActive) {
      stopWatchdog();
      return;
    }

    const now = Date.now();

    // iOSバックグラウンド時はタイムアウト判定をスキップ
    // (OS仕様によりバックグラウンドではRSSI更新が止まるため、誤切断を防ぐ)
    if (Platform.OS === "ios" && AppState.currentState !== "active") {
      return;
    }

    if (
      lastDetectionTime > 0 &&
      now - lastDetectionTime > DETECTION_TIMEOUT_MS
    ) {
      const currentState = await getAppState();
      if (currentState === "PRESENT" || currentState === "UNCONFIRMED") {
        console.log(
          `[Continuous Scan] No beacon detected for ${DETECTION_TIMEOUT_MS}ms. Forcing state to INSIDE_AREA.`
        );
        await setAppState("INSIDE_AREA");

        await sendBleDisconnectedNotification(null);

        // リセット
        lastDetectionTime = 0;
        clearUnconfirmedTimer();
      }
    }
  }, WATCHDOG_INTERVAL_MS);
};

const stopWatchdog = () => {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    console.log("[Continuous Scan] Watchdog timer stopped");
  }
};

export const startUnconfirmedTimer = async (ms: number): Promise<void> => {
  clearUnconfirmedTimer();

  console.log(`[Continuous Scan] Starting unconfirmed timer (${ms}ms)`);
  unconfirmedTimer = setTimeout(async () => {
    try {
      const currentState = await getAppState();
      if (currentState === "UNCONFIRMED") {
        await setAppState("INSIDE_AREA");
        console.log(
          "[Continuous Scan] Unconfirmed timer expired. State changed to INSIDE_AREA"
        );

        await sendBleDisconnectedNotification(null);
      }
    } catch (error) {
      console.error(
        "[Continuous Scan] Failed to handle unconfirmed timer:",
        error
      );
    } finally {
      unconfirmedTimer = null;
    }
  }, ms);
};

export const startContinuousBleScanner = async (): Promise<void> => {
  if (isContinuousScanActive) {
    console.log("[Continuous Scan] Continuous scan already active. Skipping.");
    return;
  }

  const userId = await getUserId();
  if (!userId) {
    console.warn("[Continuous Scan] Skipping continuous scan: missing userId");
    return;
  }

  const waitResult = await waitForBlePoweredOn({
    logPrefix: "[Continuous Scan]",
  });

  if (!waitResult.ready) {
    console.warn(
      "[Continuous Scan] Bluetooth not ready. Skipping continuous scan."
    );
    return;
  }

  console.log("[Continuous Scan] Starting continuous BLE scan...");
  await safeSendDebugNotification(
    "Background Scan Started",
    "Continuous scan started"
  );
  isContinuousScanActive = true;
  startWatchdog();

  const { RSSI_ENTER_THRESHOLD, RSSI_EXIT_THRESHOLD, RSSI_DEBOUNCE_TIME_MS } =
    await import("../constants");

  const normalizedServiceUUIDs = BLE_SERVICE_UUIDS.map((uuid) =>
    uuid.toLowerCase()
  );
  const normalizedNamePrefixes = BLE_DEVICE_NAME_PREFIXES.map((prefix) =>
    prefix.toLowerCase()
  );

  // iOSの場合は特定のUUIDのみを指定してOSに監視を委任する
  const scanUUIDs =
    Platform.OS === "android" ? null : ["0000180a-0000-1000-8000-00805f9b34fb"];

  try {
    bleManager.startDeviceScan(
      scanUUIDs,
      { allowDuplicates: true },
      async (scanError, device) => {
        if (scanError) {
          console.error("[Continuous Scan] Continuous scan error:", scanError);
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

        try {
          const rssi = device.rssi ?? -100;
          const smoothedRssi = getSmoothedRssi(device.id, rssi);
          const timestamp = Date.now();

          // Debug log for RSSI updates (throttled to avoid excessive logs)
          if (Math.random() < 0.2) {
            console.log(
              `[Continuous Scan] Update: ${device.name || "Unknown"} RSSI: ${
                device.rssi
              } (Smoothed: ${smoothedRssi.toFixed(1)})`
            );
          }

          // Notify listeners (e.g. UI)
          notifyListeners({
            deviceId: device.id,
            deviceName: device.name ?? null,
            rssi: smoothedRssi,
          });

          lastDetectionTime = timestamp;

          await recordPresenceDetection(
            {
              deviceId: device.id,
              deviceName: device.name ?? null,
              rssi: smoothedRssi,
            },
            timestamp
          );

          const currentState = await getAppState();

          if (currentState === "INSIDE_AREA" || currentState === "OUTSIDE") {
            if (smoothedRssi >= RSSI_ENTER_THRESHOLD) {
              console.log(
                `[Continuous Scan] Enter threshold met: ${smoothedRssi} >= ${RSSI_ENTER_THRESHOLD}`
              );
              await setAppState("PRESENT");
              await sendBleConnectedNotification(device.name);

              const enterSentAt = await getPresenceEnterSentAt();
              if (enterSentAt === null) {
                await postEnterAttendance({
                  deviceId: device.id,
                  deviceName: device.name ?? null,
                });
                await setPresenceEnterSentAt(timestamp);
              }
            }
          } else if (currentState === "PRESENT") {
            clearUnconfirmedTimer();
            if (smoothedRssi < RSSI_EXIT_THRESHOLD) {
              console.log(
                `[Continuous Scan] Exit threshold met: ${smoothedRssi} < ${RSSI_EXIT_THRESHOLD}`
              );
              await setAppState("UNCONFIRMED");
              await startUnconfirmedTimer(RSSI_DEBOUNCE_TIME_MS);
            }
          } else if (currentState === "UNCONFIRMED") {
            if (smoothedRssi >= RSSI_ENTER_THRESHOLD) {
              console.log(
                `[Continuous Scan] Re-entered threshold met: ${smoothedRssi} >= ${RSSI_ENTER_THRESHOLD}`
              );
              await setAppState("PRESENT");
              clearUnconfirmedTimer();
            }
          }
        } catch (error) {
          console.error(
            "[Continuous Scan] Failed to handle continuous scan detection:",
            error
          );
        }
      }
    );

    console.log("[Continuous Scan] Continuous scan started successfully");
  } catch (error) {
    isContinuousScanActive = false;
    stopWatchdog();
    console.error("[Continuous Scan] Failed to start continuous scan:", error);
    throw error;
  }
};

export const stopContinuousBleScanner = async (): Promise<void> => {
  if (!isContinuousScanActive) {
    console.log("[Continuous Scan] Continuous scan not active. Skipping stop.");
    return;
  }

  console.log("[Continuous Scan] Stopping continuous BLE scan...");

  try {
    bleManager.stopDeviceScan();
    isContinuousScanActive = false;
    stopWatchdog();
    clearUnconfirmedTimer();
    rssiHistory.clear();
    console.log("[Continuous Scan] Continuous scan stopped successfully");
  } catch (error) {
    console.error("[Continuous Scan] Failed to stop continuous scan:", error);
  }
};
