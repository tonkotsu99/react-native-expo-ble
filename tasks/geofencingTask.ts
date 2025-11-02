import {
  LocationGeofencingEventType,
  type LocationRegion,
} from "expo-location";
import * as TaskManager from "expo-task-manager";
import BackgroundFetch from "react-native-background-fetch";
import { bleManager } from "../bluetooth/bleManagerInstance";
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
  sendBleConnectedNotification,
  sendBleDisconnectedNotification,
  sendDebugNotification,
  sendGeofenceEnterNotification,
  sendGeofenceExitNotification,
} from "../utils/notifications";
import { postInsideAreaStatus } from "./insideAreaStatus";
import { initPeriodicTask } from "./periodicCheckTask";

const GEOFENCING_TASK_NAME = "background-geofencing-task";
let backgroundFetchStarted = false;
let geofenceDisconnectSubscription: { remove(): void } | null = null;
let geofenceConnectionPoll: ReturnType<typeof setInterval> | null = null;
let geofenceConnectedDevice: { id: string; name?: string | null } | null = null;
const RAPID_RETRY_WINDOW_MS = 5 * 60 * 1000;
const RAPID_RETRY_INTERVAL_MS = 45000;
let rapidRetryInterval: ReturnType<typeof setInterval> | null = null;
let rapidRetryTimeout: ReturnType<typeof setTimeout> | null = null;
let rapidRetryWindowEndsAt = 0;
let backgroundScanInFlight = false;

const clearGeofenceConnectionWatchers = () => {
  if (geofenceDisconnectSubscription) {
    try {
      geofenceDisconnectSubscription.remove();
    } catch (error) {
      console.warn(
        "[Geofencing Task] Failed to remove disconnect listener",
        error
      );
    }
    geofenceDisconnectSubscription = null;
  }

  if (geofenceConnectionPoll) {
    clearInterval(geofenceConnectionPoll);
    geofenceConnectionPoll = null;
  }

  geofenceConnectedDevice = null;
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

const handleBackgroundDisconnect = async (
  context: "event" | "poll",
  deviceName?: string | null
) => {
  console.log("[Geofencing Task] Background disconnect detected", {
    context,
    deviceName,
  });

  clearGeofenceConnectionWatchers();
  setTimeout(() => {
    void tryConnectBleDevice({ force: true });
  }, 5000);

  try {
    const currentState = await getAppState();
    if (currentState !== "OUTSIDE") {
      await setAppState("INSIDE_AREA");
    }
  } catch (error) {
    console.error(
      "[Geofencing Task] Failed to update state after disconnect",
      error
    );
  }

  try {
    await sendBleDisconnectedNotification(deviceName);
  } catch (error) {
    console.error(
      "[Geofencing Task] Failed to send disconnect notification",
      error
    );
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
async function tryConnectBleDevice(
  options: { force?: boolean } = {}
): Promise<void> {
  const { force = false } = options;
  const normalizedServiceUUIDs = BLE_SERVICE_UUIDS.map((u) => u.toLowerCase());
  const normalizedNamePrefixes = BLE_DEVICE_NAME_PREFIXES.map((p) =>
    p.toLowerCase()
  );

  console.log("[Geofencing Task] tryConnectBleDevice invoked", {
    force,
    backgroundScanInFlight,
    timestamp: new Date().toISOString(),
  });

  clearGeofenceConnectionWatchers();

  const userId = await getUserId();
  if (!userId) {
    console.warn(
      "[Geofencing Task] Skipping background BLE connect: missing userId"
    );
    return;
  }

  if (backgroundScanInFlight) {
    console.log(
      "[Geofencing Task] Background scan already in progress. Skipping new request."
    );
    return;
  }

  backgroundScanInFlight = true;

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    backgroundScanInFlight = false;
    try {
      bleManager.stopDeviceScan();
    } catch {}
  };

  const timeoutMs = 15000;
  const timeoutId = setTimeout(() => {
    console.warn("[Geofencing Task] Scan timeout");
    finish();
  }, timeoutMs);

  console.log("[Geofencing Task] BG scan started", { timeoutMs });

  // Broad scan + JS filtering for iOS reliability
  try {
    bleManager.startDeviceScan(null, null, async (scanError, device) => {
      if (settled) return;

      if (scanError) {
        console.error("[Geofencing Task] Scan Error:", scanError);
        clearTimeout(timeoutId);
        finish();
        return;
      }

      if (!device) return;

      const serviceUUIDs = device.serviceUUIDs?.map((u) => u.toLowerCase());
      const deviceName = device.name?.toLowerCase() ?? "";
      const matchesService = serviceUUIDs
        ? serviceUUIDs.some((u) => normalizedServiceUUIDs.includes(u))
        : false;
      const matchesName = normalizedNamePrefixes.some((p) =>
        deviceName.startsWith(p)
      );

      console.log("[Geofencing Task] Scan device", {
        id: device.id,
        name: device.name,
        rssi: device.rssi,
        serviceUUIDs: device.serviceUUIDs,
        matchesService,
        matchesName,
      });

      // Be conservative in background: require at least name prefix match
      if (!matchesName && !matchesService) {
        return; // ignore non-target devices
      }

      clearTimeout(timeoutId);
      finish();
      try {
        if (!force) {
          const connectedDevices = await bleManager.connectedDevices(
            BLE_SERVICE_UUIDS
          );
          if (connectedDevices.length > 0) {
            console.log(
              "[Geofencing Task] Existing connected device detected, skipping force scan."
            );
            finish();
            return;
          }
        }

        console.log("[Geofencing Task] Match Found", {
          id: device.id,
          name: device.name,
          rssi: device.rssi,
          matchesService,
          matchesName,
        });
        const connected = await device.connect();
        await connected.discoverAllServicesAndCharacteristics();
        console.log(
          "[Geofencing Task] Background connect success:",
          connected.name
        );

        geofenceConnectedDevice = { id: connected.id, name: connected.name };

        geofenceDisconnectSubscription = connected.onDisconnected(
          async (disconnectError, disconnectedDevice) => {
            if (disconnectError) {
              console.warn(
                "[Geofencing Task] Disconnect error",
                disconnectError
              );
            }

            const name = disconnectedDevice?.name ?? connected.name;
            await handleBackgroundDisconnect("event", name);
          }
        );

        geofenceConnectionPoll = setInterval(async () => {
          if (!geofenceConnectedDevice) {
            clearGeofenceConnectionWatchers();
            return;
          }

          try {
            const stillConnected = await bleManager.isDeviceConnected(
              geofenceConnectedDevice.id
            );

            if (!stillConnected) {
              await handleBackgroundDisconnect(
                "poll",
                geofenceConnectedDevice.name
              );
            }
          } catch (pollError) {
            console.warn("[Geofencing Task] Connection poll failed", pollError);
          }
        }, 20000);

        await setAppState("PRESENT");
        await postAttendance(API_URL_ENTER, {
          deviceId: connected.id,
          deviceName: connected.name,
        });
        await sendBleConnectedNotification(connected.name);
        await stopRapidRetryWindow("connected");
      } catch (connectError) {
        console.error(
          "[Geofencing Task] Background connect error:",
          connectError
        );
      }
    });
  } catch (error) {
    backgroundScanInFlight = false;
    clearTimeout(timeoutId);
    console.error("[Geofencing Task] Failed to start device scan", error);
  }
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
    void tryConnectBleDevice({ force });
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

    const forceReconnect =
      previousState === "INSIDE_AREA" || previousState === "UNCONFIRMED";

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

    await startRapidRetryWindow({ force: forceReconnect });
  } else if (eventType === LocationGeofencingEventType.Exit) {
    console.log(
      "[Geofencing Task] Exited area:",
      region?.identifier ?? "unknown"
    );

    const connectedDevice = geofenceConnectedDevice;
    clearGeofenceConnectionWatchers();
    await stopRapidRetryWindow("geofence-exit");
    if (connectedDevice) {
      try {
        await bleManager.cancelDeviceConnection(connectedDevice.id);
      } catch (cancelError) {
        console.warn(
          "[Geofencing Task] Failed to cancel background connection",
          cancelError
        );
      }
    }
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
