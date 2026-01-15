import AsyncStorage from "@react-native-async-storage/async-storage";
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

// Enter API呼び出し中フラグ（競合状態を防ぐ）
let isPostingEnterAttendance = false;

// 永続化キー
const CONTINUOUS_SCAN_ACTIVE_KEY = "continuous_scan_active";

// RSSI Smoothing
const rssiHistory = new Map<string, number[]>();
const RSSI_SMOOTHING_WINDOW = 5;

const listeners: DetectionCallback[] = [];

// ----- Persistence Helpers -----

/**
 * 連続スキャン状態を永続化
 * Headless起動時に状態を復元するために使用
 */
const persistContinuousScanState = async (active: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      CONTINUOUS_SCAN_ACTIVE_KEY,
      active ? "true" : "false"
    );
  } catch (error) {
    console.warn("[Continuous Scan] Failed to persist scan state:", error);
  }
};

/**
 * 永続化された連続スキャン状態を取得
 */
export const getPersistedContinuousScanState = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(CONTINUOUS_SCAN_ACTIVE_KEY);
    return value === "true";
  } catch {
    return false;
  }
};

/**
 * Headless起動時にメモリ状態を永続化状態と同期
 */
export const syncContinuousScanState = async (): Promise<void> => {
  try {
    const persisted = await getPersistedContinuousScanState();
    isContinuousScanActive = persisted;
    console.log(
      `[Continuous Scan] State synced from storage: active=${persisted}`
    );
  } catch (error) {
    console.warn("[Continuous Scan] Failed to sync scan state:", error);
  }
};

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
  const isBackground =
    Platform.OS === "ios" && AppState.currentState !== "active";
  console.log(
    `[Continuous Scan] postEnterAttendance called (background=${isBackground})`
  );

  try {
    const userId = await getUserId();
    if (!userId) {
      console.warn(
        "[Continuous Scan] Skipping enter attendance: missing userId"
      );
      return;
    }

    console.log(
      `[Continuous Scan] Sending fetch to ${API_URL_ENTER} (background=${isBackground})`
    );

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
      `[Continuous Scan] Enter attendance posted (background=${isBackground})`,
      payload
    );

    // iOSバックグラウンドでの成功を通知で可視化
    if (isBackground) {
      await safeSendDebugNotification(
        "Enter API Success (BG)",
        `${payload.deviceName ?? payload.deviceId}`
      );
    }
  } catch (error) {
    console.error(
      `[Continuous Scan] Failed to post enter attendance (background=${isBackground}):`,
      (error as Error).message
    );
    // iOSバックグラウンドでもエラーを通知
    if (isBackground) {
      await safeSendDebugNotification(
        "Enter API Error (BG)",
        (error as Error).message
      );
    }
    throw error; // 呼び出し元でキャッチできるように再スロー
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
  await persistContinuousScanState(true);

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

        const isBackground =
          Platform.OS === "ios" && AppState.currentState !== "active";

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

        // iOSバックグラウンドでビーコン検出時にログ
        if (isBackground) {
          console.log(
            `[Continuous Scan] iOS background detection: ${
              device.name ?? device.id
            }, RSSI: ${device.rssi}`
          );
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

          await recordPresenceDetection(
            {
              deviceId: device.id,
              deviceName: device.name ?? null,
              rssi: smoothedRssi,
            },
            timestamp
          );

          const currentState = await getAppState();
          const isBackground =
            Platform.OS === "ios" && AppState.currentState !== "active";

          // iOSバックグラウンドではRSSI閾値をスキップ
          // バックグラウンドでBLE検出できること自体が近くにいる証拠
          const shouldEnter =
            isBackground || smoothedRssi >= RSSI_ENTER_THRESHOLD;

          if (currentState === "INSIDE_AREA" || currentState === "OUTSIDE") {
            if (shouldEnter) {
              console.log(
                `[Continuous Scan] Enter condition met: RSSI=${smoothedRssi}, threshold=${RSSI_ENTER_THRESHOLD}, background=${isBackground}, skipThreshold=${isBackground}`
              );
              await setAppState("PRESENT");

              const enterSentAt = await getPresenceEnterSentAt();
              console.log(
                `[Continuous Scan] enterSentAt check: ${enterSentAt} (background=${isBackground})`
              );
              if (enterSentAt === null && !isPostingEnterAttendance) {
                isPostingEnterAttendance = true;
                console.log(
                  `[Continuous Scan] Calling postEnterAttendance (background=${isBackground})`
                );
                try {
                  // iOSバックグラウンドでは実行時間が限られているため、
                  // API呼び出しを最優先で実行
                  await postEnterAttendance({
                    deviceId: device.id,
                    deviceName: device.name ?? null,
                  });
                  console.log(
                    `[Continuous Scan] postEnterAttendance completed (background=${isBackground})`
                  );
                  // 成功した場合のみタイムスタンプを記録
                  await setPresenceEnterSentAt(timestamp);
                } catch (enterError) {
                  console.error(
                    `[Continuous Scan] postEnterAttendance failed (background=${isBackground}):`,
                    enterError
                  );
                  // iOSバックグラウンドでも通知でエラーを可視化
                  await safeSendDebugNotification(
                    "Enter API Failed",
                    `${(enterError as Error).message} (bg=${isBackground})`
                  );
                  // エラー時はタイムスタンプを記録しない（次のスキャンで再試行）
                } finally {
                  isPostingEnterAttendance = false;
                }
              } else if (enterSentAt !== null) {
                console.log(
                  `[Continuous Scan] Skipping postEnterAttendance: already sent at ${enterSentAt}`
                );
              } else if (isPostingEnterAttendance) {
                console.log(
                  `[Continuous Scan] Skipping postEnterAttendance: already in progress`
                );
              }

              // 通知はAPI呼び出しの後に送信（iOSバックグラウンドでの実行時間を確保）
              // 通知の失敗はAPI呼び出しに影響しないようにvoid
              void sendBleConnectedNotification(device.name);
            } else {
              // フォアグラウンドでRSSIが閾値未満の場合（iOSバックグラウンドはshouldEnter=trueなのでここには来ない）
              console.log(
                `[Continuous Scan] RSSI below threshold: ${smoothedRssi} < ${RSSI_ENTER_THRESHOLD} (state=${currentState})`
              );
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

              // UNCONFIRMED から PRESENT に復帰した場合でも、
              // まだ入室 API を送っていなければ送信する（手動の再検出/再接続フローで必要）。
              const enterSentAt = await getPresenceEnterSentAt();
              if (enterSentAt === null && !isPostingEnterAttendance) {
                isPostingEnterAttendance = true;
                console.log(
                  `[Continuous Scan] Calling postEnterAttendance from UNCONFIRMED (background=${isBackground})`
                );
                try {
                  await postEnterAttendance({
                    deviceId: device.id,
                    deviceName: device.name ?? null,
                  });
                  await setPresenceEnterSentAt(timestamp);
                } catch (enterError) {
                  console.error(
                    `[Continuous Scan] postEnterAttendance failed from UNCONFIRMED (background=${isBackground}):`,
                    enterError
                  );
                  await safeSendDebugNotification(
                    "Enter API Failed",
                    `${(enterError as Error).message} (bg=${isBackground})`
                  );
                } finally {
                  isPostingEnterAttendance = false;
                }
              } else if (enterSentAt !== null) {
                console.log(
                  `[Continuous Scan] Skipping postEnterAttendance from UNCONFIRMED: already sent at ${enterSentAt}`
                );
              } else if (isPostingEnterAttendance) {
                console.log(
                  `[Continuous Scan] Skipping postEnterAttendance from UNCONFIRMED: already in progress`
                );
              }
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
    await persistContinuousScanState(false);
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
  } catch (error) {
    console.error("[Continuous Scan] Failed to stop device scan:", error);
    // スキャン停止に失敗しても状態はリセットする
  }

  // 状態を確実にリセット
  isContinuousScanActive = false;
  await persistContinuousScanState(false);
  clearUnconfirmedTimer();
  rssiHistory.clear();
  console.log("[Continuous Scan] Continuous scan stopped successfully");
};
