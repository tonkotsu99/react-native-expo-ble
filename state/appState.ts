import AsyncStorage from "@react-native-async-storage/async-storage";

// アプリの状態を定義
export type AppState = "OUTSIDE" | "INSIDE_AREA" | "PRESENT" | "UNCONFIRMED";
const STATE_KEY = "app_state";
const INSIDE_AREA_REPORTED_KEY = "inside_area_reported";

// Simple in-memory subscription for app state changes
type AppStateListener = (state: AppState) => void;
const listeners = new Set<AppStateListener>();

/** Subscribe to app state changes; returns unsubscribe function */
export const subscribeAppState = (listener: AppStateListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** INSIDE_AREA 通知を既に送信済みかどうかを取得する */
export const getInsideAreaReportStatus = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(INSIDE_AREA_REPORTED_KEY);
  return value === "true";
};

/** INSIDE_AREA 通知の送信状態を更新する */
export const setInsideAreaReportStatus = async (
  reported: boolean
): Promise<void> => {
  await AsyncStorage.setItem(
    INSIDE_AREA_REPORTED_KEY,
    reported ? "true" : "false"
  );
};

/** 現在のアプリ状態を取得する */
export const getAppState = async (): Promise<AppState> => {
  const state = await AsyncStorage.getItem(STATE_KEY);
  return (state as AppState) || "OUTSIDE"; // デフォルトは 'OUTSIDE'
};

/** アプリの状態を設定する */
export const setAppState = async (state: AppState): Promise<void> => {
  const previousState = await getAppState();
  console.log(`State changed: ${previousState} -> ${state}`);
  await AsyncStorage.setItem(STATE_KEY, state);

  if (state !== "INSIDE_AREA" && previousState === "INSIDE_AREA") {
    await setInsideAreaReportStatus(false);
  }

  // Notify subscribers (fire-and-forget)
  try {
    listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {}
    });
  } catch {}
};
