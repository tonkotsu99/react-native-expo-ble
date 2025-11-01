import { BleManager } from "react-native-ble-plx";

/**
 * アプリケーション全体で共有されるBleManagerの単一インスタンス。
 * このインスタンスをインポートして使用することで、
 * 複数のマネージャーが生成されることを防ぎます。
 */
export const bleManager = new BleManager({
  // iOS: enable CoreBluetooth state restoration so BLE can resume in background/after relaunch
  restoreStateIdentifier: "kyutech-ble-restoration",
  restoreStateFunction: (restoredState) => {
    try {
      console.log("[BleManager] State restoration invoked", {
        connectedPeripherals: restoredState?.connectedPeripherals?.length ?? 0,
      });
    } catch {
      // Avoid any crash in restoration callback
      console.log("[BleManager] State restoration logging failed");
    }
  },
});
