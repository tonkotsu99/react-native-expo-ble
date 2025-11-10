# Tasks: Add Continuous BLE Foreground Scan with RSSI-based Room Detection

## Implementation Tasks

- [x] **Task 1: Add RSSI threshold constants**

  - Edit `constants/index.ts`
  - Add `RSSI_ENTER_THRESHOLD = -70`
  - Add `RSSI_EXIT_THRESHOLD = -75`
  - Add `RSSI_DEBOUNCE_TIME_MS = 3 * 60 * 1000`
  - **Validation**: `npm run lint` でエラーがないこと ✅

- [x] **Task 2: Add continuous scan state management**

  - Edit `tasks/geofencingTask.ts`
  - Add global variable `let isContinuousScanActive = false`
  - Add global variable `let unconfirmedTimer: NodeJS.Timeout | null = null`
  - Export helper functions: `clearUnconfirmedTimer()`, `startUnconfirmedTimer(ms)`
  - **Validation**: TypeScript コンパイルエラーがないこと ✅

- [x] **Task 3: Implement `startContinuousBleScanner()` function**

  - Edit `tasks/geofencingTask.ts`
  - Add `startContinuousBleScanner()` function
  - Logic:
    1. Check if `isContinuousScanActive === true` → return early
    2. Call `bleManager.startDeviceScan(BLE_SERVICE_UUIDS, null, callback)`
    3. In callback:
       - Get current app state
       - If `device.rssi > RSSI_ENTER_THRESHOLD` → `setAppState("PRESENT")` + POST `/enter`
       - If `device.rssi <= RSSI_EXIT_THRESHOLD` → `setAppState("UNCONFIRMED")` + start timer
    4. Set `isContinuousScanActive = true`
  - **Validation**: ビルドエラーがないこと、RSSI ロジックが設計通りであること ✅

- [x] **Task 4: Implement `stopContinuousBleScanner()` function**

  - Edit `tasks/geofencingTask.ts`
  - Add `stopContinuousBleScanner()` function
  - Logic:
    1. Call `bleManager.stopDeviceScan()`
    2. Set `isContinuousScanActive = false`
    3. Call `clearUnconfirmedTimer()`
  - **Validation**: スキャン停止時にフラグがリセットされること ✅

- [x] **Task 5: Integrate continuous scan into geofence ENTER**

  - Edit `tasks/geofencingTask.ts` → ENTER イベント処理
  - Add platform check: `if (Platform.OS === "android")`
  - Call `await startAndroidBleForegroundService("continuous-scan", { title: "...", body: "..." })`
  - Call `await startContinuousBleScanner()`
  - **Validation**: ジオフェンス ENTER 時にフォアグラウンドサービスが起動し、スキャンが開始されること ✅

- [x] **Task 6: Integrate continuous scan stop into geofence EXIT**

  - Edit `tasks/geofencingTask.ts` → EXIT イベント処理
  - Add platform check: `if (Platform.OS === "android")`
  - Call `await stopContinuousBleScanner()`
  - Call `await stopAndroidBleForegroundService("geofence-exit")`
  - **Validation**: ジオフェンス EXIT 時にスキャンが停止し、フォアグラウンドサービスが終了すること ✅

- [x] **Task 7: Skip periodic scan when continuous scan is active**

  - Edit `tasks/periodicCheckTask.ts`
  - Add check at start: `if (isContinuousScanActive) { log + BackgroundFetch.finish(taskId); return; }`
  - Import `isContinuousScanActive` from `geofencingTask.ts` (export it)
  - **Validation**: 常時スキャン中に定期タスクがスキップされること ✅

- [x] **Task 8: Add RSSI-based notifications**

  - Edit `utils/notifications.ts`
  - Ensure `sendBleConnectedNotification()` is called on RSSI > threshold
  - Ensure `sendBleDisconnectedNotification()` is called on UNCONFIRMED timeout
  - **Validation**: 入退室時に通知が送信されること ✅

- [ ] **Task 9: Test on Android device**

  - Build dev client: `eas build --profile development --platform android`
  - Test flow:
    1. 学外 → 学内（ジオフェンス ENTER）→ フォアグラウンド通知表示
    2. ビーコン接近（RSSI > -70 dBm）→ `PRESENT` 遷移 → 通知
    3. ビーコン離反（RSSI <= -75 dBm）→ `UNCONFIRMED` → 3 分後 `INSIDE_AREA`
    4. 学外（ジオフェンス EXIT）→ スキャン停止、通知消去
  - **Validation**: 全フローが正常動作し、API が送信されること
  - **Note**: 実機テストが必要（エミュレータでは BLE 動作不可）

- [ ] **Task 10: Verify iOS continues periodic scan**

  - Test on iOS device
  - Confirm that continuous scan is NOT started (no foreground notification)
  - Confirm that existing periodic scan (15min interval) works
  - **Validation**: iOS の既存動作が変更されていないこと
  - **Note**: 実機テストが必要

- [x] **Task 11: Update OpenSpec validation**
  - Run `npx openspec validate add-continuous-ble-foreground-scan --strict`
  - Fix any validation errors
  - **Validation**: OpenSpec validation passes ✅

## Dependencies

- Task 1 → Task 3 (RSSI 定数を使用)
- Task 2 → Task 3, 4 (グローバル変数を使用)
- Task 3, 4 → Task 5, 6 (関数を呼び出し)
- Task 5, 6 → Task 9 (実機テスト)
- Task 7 → Task 9 (定期タスクスキップの検証)

## Parallelizable Work

- Task 1, 2 は並行作業可能
- Task 8 は Task 3 と並行作業可能
