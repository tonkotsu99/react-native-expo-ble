import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { State } from "react-native-ble-plx";
import { bleManager } from "./bleManagerInstance";

export const PRESENCE_TTL_MS = 180000;

export type PresenceMetadata = {
  deviceId: string | null;
  deviceName: string | null;
  rssi: number | null;
};

const PRESENCE_LAST_SEEN_KEY = "ble_presence_last_seen";
const PRESENCE_ENTER_SENT_AT_KEY = "ble_presence_enter_sent_at";
const PRESENCE_METADATA_KEY = "ble_presence_metadata";

let cachedPresenceLastSeen: number | null | undefined;
let cachedPresenceEnterSentAt: number | null | undefined;
let cachedPresenceMetadata: PresenceMetadata | null | undefined;

const parseNumber = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

export const getPresenceLastSeen = async (): Promise<number | null> => {
  if (cachedPresenceLastSeen !== undefined) {
    return cachedPresenceLastSeen;
  }
  const raw = await AsyncStorage.getItem(PRESENCE_LAST_SEEN_KEY);
  cachedPresenceLastSeen = parseNumber(raw);
  return cachedPresenceLastSeen;
};

const persistPresenceLastSeen = async (
  timestamp: number | null
): Promise<void> => {
  if (timestamp === null) {
    await AsyncStorage.removeItem(PRESENCE_LAST_SEEN_KEY);
  } else {
    await AsyncStorage.setItem(PRESENCE_LAST_SEEN_KEY, String(timestamp));
  }
};

export const setPresenceLastSeen = async (
  timestamp: number | null
): Promise<void> => {
  cachedPresenceLastSeen = timestamp;
  await persistPresenceLastSeen(timestamp);
};

export const getPresenceEnterSentAt = async (): Promise<number | null> => {
  if (cachedPresenceEnterSentAt !== undefined) {
    return cachedPresenceEnterSentAt;
  }
  const raw = await AsyncStorage.getItem(PRESENCE_ENTER_SENT_AT_KEY);
  cachedPresenceEnterSentAt = parseNumber(raw);
  return cachedPresenceEnterSentAt;
};

const persistPresenceEnterSentAt = async (
  timestamp: number | null
): Promise<void> => {
  if (timestamp === null) {
    await AsyncStorage.removeItem(PRESENCE_ENTER_SENT_AT_KEY);
  } else {
    await AsyncStorage.setItem(PRESENCE_ENTER_SENT_AT_KEY, String(timestamp));
  }
};

export const setPresenceEnterSentAt = async (
  timestamp: number | null
): Promise<void> => {
  cachedPresenceEnterSentAt = timestamp;
  await persistPresenceEnterSentAt(timestamp);
};

export const getPresenceMetadata =
  async (): Promise<PresenceMetadata | null> => {
    if (cachedPresenceMetadata !== undefined) {
      return cachedPresenceMetadata;
    }
    const raw = await AsyncStorage.getItem(PRESENCE_METADATA_KEY);
    if (!raw) {
      cachedPresenceMetadata = null;
      return cachedPresenceMetadata;
    }
    try {
      const parsed = JSON.parse(raw) as PresenceMetadata;
      cachedPresenceMetadata = {
        deviceId: parsed.deviceId ?? null,
        deviceName: parsed.deviceName ?? null,
        rssi: typeof parsed.rssi === "number" ? parsed.rssi : null,
      };
    } catch {
      cachedPresenceMetadata = null;
    }
    return cachedPresenceMetadata;
  };

const persistPresenceMetadata = async (
  metadata: PresenceMetadata | null
): Promise<void> => {
  if (!metadata) {
    await AsyncStorage.removeItem(PRESENCE_METADATA_KEY);
    return;
  }
  await AsyncStorage.setItem(PRESENCE_METADATA_KEY, JSON.stringify(metadata));
};

export const setPresenceMetadata = async (
  metadata: PresenceMetadata | null
): Promise<void> => {
  cachedPresenceMetadata = metadata;
  await persistPresenceMetadata(metadata);
};

export const recordPresenceDetection = async (
  metadata: PresenceMetadata,
  timestamp: number
): Promise<void> => {
  await Promise.all([
    setPresenceMetadata(metadata),
    setPresenceLastSeen(timestamp),
  ]);
};

export const isPresenceFresh = (now: number = Date.now()): boolean => {
  if (cachedPresenceLastSeen === undefined) {
    return false;
  }
  if (cachedPresenceLastSeen === null) {
    return false;
  }
  return now - cachedPresenceLastSeen < PRESENCE_TTL_MS;
};

export const hasFreshPresence = async (
  now: number = Date.now()
): Promise<boolean> => {
  const lastSeen = await getPresenceLastSeen();
  if (lastSeen === null) return false;
  return now - lastSeen < PRESENCE_TTL_MS;
};

export const resetPresenceSession = async (): Promise<void> => {
  cachedPresenceLastSeen = null;
  cachedPresenceEnterSentAt = null;
  cachedPresenceMetadata = null;
  await AsyncStorage.multiRemove([
    PRESENCE_LAST_SEEN_KEY,
    PRESENCE_ENTER_SENT_AT_KEY,
    PRESENCE_METADATA_KEY,
  ]);
};

export type WaitForBlePoweredOnResult = {
  ready: boolean;
  initialState: State | null;
  finalState: State | null;
  durationMs: number;
  timedOut: boolean;
};

const WAITABLE_STATES = new Set<State>([
  State.Unknown,
  State.Resetting,
  State.PoweredOff,
]);

/**
 * iOS で BLE アダプタが State.PoweredOn になるまで待機し、安全にスキャンを開始できるようにします。
 * 他プラットフォームでは即座に完了します。
 */
export async function waitForBlePoweredOn(
  options: { timeoutMs?: number; logPrefix?: string } = {}
): Promise<WaitForBlePoweredOnResult> {
  const { timeoutMs = 15000, logPrefix = "[BLE状態]" } = options;
  const start = Date.now();

  if (Platform.OS !== "ios") {
    return {
      ready: true,
      initialState: null,
      finalState: null,
      durationMs: Date.now() - start,
      timedOut: false,
    };
  }

  let initialState: State | null = null;
  try {
    initialState = await bleManager.state();
  } catch (error) {
    console.warn(
      `${logPrefix} 初期 BLE 状態の取得に失敗しました: ${
        (error as Error).message
      }`
    );
    return {
      ready: false,
      initialState,
      finalState: null,
      durationMs: Date.now() - start,
      timedOut: false,
    };
  }

  if (initialState === State.PoweredOn) {
    return {
      ready: true,
      initialState,
      finalState: State.PoweredOn,
      durationMs: Date.now() - start,
      timedOut: false,
    };
  }

  if (!WAITABLE_STATES.has(initialState)) {
    console.warn(
      `${logPrefix} 初期 BLE 状態 ${initialState} は待機しても回復できません`
    );
    return {
      ready: false,
      initialState,
      finalState: initialState,
      durationMs: Date.now() - start,
      timedOut: false,
    };
  }

  return await new Promise((resolve) => {
    let settled = false;

    const finish = (result: WaitForBlePoweredOnResult) => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        subscription.remove();
      } catch {}
      clearTimeout(timeoutId);
      resolve(result);
    };

    const subscription = bleManager.onStateChange((newState) => {
      console.log(`${logPrefix} BLE 状態が変化しました: ${newState}`);
      if (newState === State.PoweredOn) {
        finish({
          ready: true,
          initialState,
          finalState: newState,
          durationMs: Date.now() - start,
          timedOut: false,
        });
      } else if (!WAITABLE_STATES.has(newState)) {
        finish({
          ready: false,
          initialState,
          finalState: newState,
          durationMs: Date.now() - start,
          timedOut: false,
        });
      }
    }, true);

    const timeoutId = setTimeout(() => {
      console.warn(
        `${logPrefix} BLE が PoweredOn になるのを待機中にタイムアウトしました (timeoutMs=${timeoutMs})`
      );
      finish({
        ready: false,
        initialState,
        finalState: null,
        durationMs: Date.now() - start,
        timedOut: true,
      });
    }, timeoutMs);
  });
}
