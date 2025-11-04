import { Platform } from "react-native";
import { State } from "react-native-ble-plx";
import { bleManager } from "./bleManagerInstance";

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
      `${logPrefix} 初期 BLE 状態の取得に失敗しました: ${(error as Error).message}`
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
