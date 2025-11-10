# Design: Continuous BLE Foreground Scan with RSSI-based Room Detection

## Architecture Overview

### Current Architecture (問題点)

```
ジオフェンス ENTER
  ↓
tryDetectBeacon() (15秒スキャン)
  ↓ (検出成功)
stopDeviceScan() + stopForegroundService()
  ↓
定期タスク (15分後)
  ↓
tryDetectBeacon() (15秒スキャン) ← 再スキャン
```

**問題**:

- 15 分間隔の断続的スキャンのため、入退室検知が最大 15 分遅延
- フォアグラウンドサービスが短時間で停止し、Android のバックグラウンド制限で BLE が不安定
- RSSI による距離判定がないため、廊下と研究室を区別できない

### Proposed Architecture (提案)

```
ジオフェンス ENTER
  ↓
startContinuousBleScanner()
  ├─ startForegroundService("学内ビーコン監視中")
  └─ bleManager.startDeviceScan() ← stopせずに継続
       ↓ (RSSI > -70 dBm)
       setAppState("PRESENT") + POST /enter
       ↓ (RSSI <= -70 dBm)
       setAppState("INSIDE_AREA" or "UNCONFIRMED")
       ↓ (3分間 RSSI 弱い状態継続)
       setAppState("INSIDE_AREA")
       ↓
ジオフェンス EXIT
  ↓
stopContinuousBleScanner()
  ├─ bleManager.stopDeviceScan()
  ├─ stopForegroundService()
  └─ POST /exit
```

## Key Design Decisions

### 1. 常時スキャンの実装場所

**選択肢 A: `geofencingTask.ts` に統合**

- メリット: 既存のジオフェンス処理と密結合し、状態管理が単純
- デメリット: ファイルが肥大化し、責任範囲が不明確

**選択肢 B: 新規ファイル `tasks/continuousBleScanner.ts` を作成**

- メリット: 関心の分離、テスト容易性向上
- デメリット: ファイル数増加、`geofencingTask.ts` との連携コード必要

**決定: 選択肢 A を採用**

- 理由: ジオフェンス ENTER/EXIT と BLE スキャンのライフサイクルが完全に一致するため、統合した方が状態管理がシンプル
- `geofencingTask.ts` 内に `startContinuousScan()` / `stopContinuousScan()` ヘルパー関数を追加

### 2. RSSI しきい値の設定

**決定: `-70 dBm` を初期値として設定**

- 根拠:
  - 一般的な BLE ビーコンの検出範囲: -90 dBm（10m 以上）、-50 dBm（1m 以内）
  - 研究室入口から室内 3~5m を想定すると、-70 dBm が妥当
- 調整可能性:
  - `constants/index.ts` に `RSSI_THRESHOLD_ROOM_ENTRY` として定義
  - 実測データに基づいて将来的に調整可能

### 3. RSSI の不安定性への対策

**ヒステリシス + 猶予期間を導入**

```typescript
// ヒステリシス
const RSSI_ENTER_THRESHOLD = -70; // 入室判定
const RSSI_EXIT_THRESHOLD = -75; // 退室判定（5dBm の差）

// 猶予期間
const RSSI_DEBOUNCE_TIME_MS = 3 * 60 * 1000; // 3分
```

- `PRESENT` → `UNCONFIRMED` 遷移時に 3 分間のタイマーを開始
- 3 分以内に強い RSSI を再検出 → `PRESENT` 復帰
- 3 分経過 → `INSIDE_AREA` に遷移

### 4. iOS vs Android の実装分岐

**決定: Android のみ常時スキャンを適用**

| Platform    | Implementation                                               |
| ----------- | ------------------------------------------------------------ |
| **Android** | ジオフェンス ENTER → フォアグラウンドサービス + 常時スキャン |
| **iOS**     | 既存の定期タスク（15 分間隔）を維持 + State Restoration      |

- 理由:
  - iOS は `bluetooth-central` バックグラウンドモードで既存実装が機能している
  - iOS のフォアグラウンド通知は不要（ユーザー体験を損なわない）
  - Android 13+ のバックグラウンド BLE 制限が厳しいため、フォアグラウンドサービスが必須

## State Transition Diagram

```
┌─────────────┐
│  OUTSIDE    │  (学外)
└──────┬──────┘
       │ ジオフェンス ENTER
       ↓
┌─────────────┐
│ INSIDE_AREA │  (学内・廊下)
└──────┬──────┘
       │ RSSI > -70 dBm
       ↓
┌─────────────┐
│  PRESENT    │  (研究室内)
└──────┬──────┘
       │ RSSI <= -75 dBm (3分間継続)
       ↓
┌──────────────┐
│ UNCONFIRMED  │  (一時的な信号喪失)
└──────┬───────┘
       │ RSSI 回復 OR 3分経過
       ↓
┌─────────────┐
│ INSIDE_AREA │
└──────┬──────┘
       │ ジオフェンス EXIT
       ↓
┌─────────────┐
│  OUTSIDE    │
└─────────────┘
```

## Data Flow

### スキャン開始 (Android)

```typescript
// geofencingTask.ts - ENTER イベント
if (Platform.OS === "android") {
  await startAndroidBleForegroundService("continuous-scan", {
    title: "研究室ビーコンを監視しています",
    body: "学内にいる間、バックグラウンドでビーコンを検出します",
  });

  await startContinuousBleScanner();
}
```

### RSSI ベース状態遷移

```typescript
// continuousBleScanner の内部ロジック
bleManager.startDeviceScan(BLE_SERVICE_UUIDS, null, async (error, device) => {
  if (!device || !device.rssi) return;

  const currentState = await getAppState();

  if (device.rssi > RSSI_ENTER_THRESHOLD) {
    // 強いシグナル → 研究室内
    if (currentState !== "PRESENT") {
      await setAppState("PRESENT");
      await postAttendance(API_URL_ENTER);
      await sendBleConnectedNotification(device.name);
    }
    clearUnconfirmedTimer(); // 猶予期間タイマーをクリア
  } else if (device.rssi <= RSSI_EXIT_THRESHOLD) {
    // 弱いシグナル → 廊下または信号喪失
    if (currentState === "PRESENT") {
      await setAppState("UNCONFIRMED");
      startUnconfirmedTimer(3 * 60 * 1000); // 3分後に INSIDE_AREA へ
    }
  }
});
```

### スキャン停止

```typescript
// geofencingTask.ts - EXIT イベント
if (Platform.OS === "android") {
  await stopContinuousBleScanner();
  await stopAndroidBleForegroundService("geofence-exit");
}
```

## Trade-offs

### Option A: 常時スキャン (提案)

- **メリット**: リアルタイム検出、RSSI による精度向上、Android バックグラウンド対応
- **デメリット**: バッテリー消費増加、フォアグラウンド通知の常駐

### Option B: 現行の定期スキャン (既存実装)

- **メリット**: バッテリー効率、通知の非常駐
- **デメリット**: 最大 15 分の遅延、RSSI 判定不可、Android バックグラウンド制限

**決定: Option A を採用**

- 理由: 在室管理システムとして入退室のリアルタイム検知が重要。バッテリー消費は学外でのスキャン停止で緩和。

## Risk Mitigation

### Risk 1: バッテリー消費

- **対策**: 学外では完全停止、スキャン頻度を最適化（連続スキャンではなく、1 秒スキャン → 1 秒待機のパターンも検討）

### Risk 2: フォアグラウンド通知の UX 低下

- **対策**: 通知文言を明確化、Android 13+ では通知チャンネル設定でユーザーが制御可能

### Risk 3: RSSI 不安定性

- **対策**: ヒステリシス + 3 分間の猶予期間で誤検出を削減

### Risk 4: iOS 未対応

- **対策**: iOS は既存実装を維持。将来的に iBeacon 領域監視への移行を検討

## Implementation Notes

- `tryDetectBeacon()` は既存の「一時的なスキャン」として残し、定期タスクでのみ使用
- 新しい `startContinuousBleScanner()` は `stopDeviceScan()` を呼ばずにスキャンを継続
- `bleManager` インスタンスは単一に保つため、スキャン状態をグローバル変数で管理（`isContinuousScanActive`）
- RSSI 遷移ロジックは `geofencingTask.ts` 内のヘルパー関数として実装
