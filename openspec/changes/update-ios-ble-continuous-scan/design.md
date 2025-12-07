# Design: Update iOS BLE Continuous Scan

## Context

現在の実装は `add-continuous-ble-foreground-scan` 変更により、Android で RSSI ベースの連続スキャンを実装しました。しかし、iOS は歴史的経緯から異なるアプローチ (短時間スキャン + Rapid Retry) を採用しており、コードベースに不必要な複雑性をもたらしています。

### 制約

- iOS は Android のようなフォアグラウンドサービス API がない
- iOS の CoreBluetooth は `UIBackgroundModes: ["bluetooth-central"]` でバックグラウンドスキャンをサポート
- `react-native-ble-plx` は両 OS で同じ API (`startDeviceScan`) を提供

### ステークホルダー

- iOS ユーザー: RSSI ベースの正確な入退室判定の恩恵を受ける
- Android ユーザー: 影響なし
- 開発者: プラットフォーム分岐の削減により保守性向上

## Goals / Non-Goals

### Goals

- iOS でも `startContinuousBleScanner()` を使用し、Android と同じ RSSI ベースの状態遷移を実現
- `tryDetectBeacon()` と Rapid Retry の複雑なロジックを廃止し、コードを簡潔化
- 両 OS で同じ動作を保証し、テストとデバッグを容易にする

### Non-Goals

- フォアグラウンドサービス通知を iOS に追加 (iOS はこの概念をサポートしない)
- iBeacon Region Monitoring への移行 (GATT Service UUID を維持)
- Android の動作変更

## Decisions

### Decision 1: iOS でも連続スキャンを採用

- **Why**: iOS の `bluetooth-central` モードは連続スキャンをサポートしており、State Restoration により省電力
- **Alternatives**:
  - **現状維持**: 短時間スキャン + Rapid Retry を継続 → 検知遅延と複雑性が残る
  - **iBeacon 移行**: CLBeaconRegion を使用 → GATT Service UUID では使用不可
- **Rationale**: 既存の設定 (`UIBackgroundModes`, `restoreStateIdentifier`) が連続スキャンをサポートしており、追加設定不要

### Decision 2: Rapid Retry ロジックを段階的に非推奨化

- **Why**: 連続スキャンが優先されるため、Rapid Retry は不要になる
- **Alternatives**:
  - **即座に削除**: リスクが高く、iOS での動作検証が不十分
  - **両方保持**: コードベースの複雑性が残る
- **Rationale**: まず非推奨化し、連続スキャンの安定性を確認後に削除する段階的アプローチが安全

### Decision 3: 定期タスクをフォールバックとして保持

- **Why**: iOS がアプリを完全サスペンドした場合のフェイルセーフ
- **Alternatives**:
  - **定期タスクを削除**: 連続スキャンのみに依存 → サスペンド時の検知不能リスク
- **Rationale**: 15 分間隔の定期タスクは低コストであり、保険として残す価値がある

## Architecture

### 変更前 (現在)

```
[ジオフェンス ENTER]
  ├─ Android: startContinuousBleScanner() → RSSI 監視
  └─ iOS: tryDetectBeacon() (15秒) → 失敗時 Rapid Retry (45秒間隔)
```

### 変更後

```
[ジオフェンス ENTER]
  ├─ Android: startContinuousBleScanner() → RSSI 監視 + フォアグラウンドサービス
  └─ iOS: startContinuousBleScanner() → RSSI 監視 (State Restoration のみ)

[定期タスク - 両OS共通]
  └─ 連続スキャン実行中ならスキップ (既存ロジック維持)
```

### コードフロー

```typescript
// tasks/geofencingTask.ts (ENTER イベント)

if (Platform.OS === "android") {
  await startAndroidBleForegroundService("continuous-scan", { ... });
  await startContinuousBleScanner();
} else if (Platform.OS === "ios") {
  // 新規: iOS でも連続スキャンを開始
  await startContinuousBleScanner();
}

// tryDetectBeacon() と Rapid Retry の呼び出しを削除
```

```typescript
// tasks/geofencingTask.ts (EXIT イベント)

if (Platform.OS === "android") {
  await stopContinuousBleScanner();
  await stopAndroidBleForegroundService("geofence-exit");
} else if (Platform.OS === "ios") {
  // 新規: iOS でも連続スキャンを停止
  await stopContinuousBleScanner();
}
```

### iOS バックグラウンドスキャンの仕組み

1. **State Restoration 有効**:

   ```typescript
   // bleManagerInstance.ts (既存)
   export const bleManager = new BleManager({
     restoreStateIdentifier: "kyutech-ble-restoration",
     restoreStateFunction: (restoredState) => { ... },
   });
   ```

2. **サービス UUID フィルタリング**:

   ```typescript
   // geofencingTask.ts (既存)
   bleManager.startDeviceScan(
     BLE_SERVICE_UUIDS, // ["27adc9ca-35eb-465a-9154-b8ff9076f3e8"]
     null,
     async (scanError, device) => { ... }
   );
   ```

3. **iOS の動作**:
   - アプリがバックグラウンドに移行してもスキャン継続
   - 該当 UUID のデバイス検出時、iOS がアプリをウェイクアップ
   - RSSI 値を評価して PRESENT/UNCONFIRMED を判定

## Risks / Trade-offs

### Risk 1: iOS のサスペンドによるスキャン停止

- **Likelihood**: 中 (長時間バックグラウンドでは発生する可能性)
- **Impact**: 高 (入退室検知の遅延)
- **Mitigation**:
  - 定期タスク (15 分) がフォールバックとして機能
  - `isContinuousScanActive` フラグで定期タスクがスキャン再開を判断

### Risk 2: バッテリー消費の増加

- **Likelihood**: 低 (サービス UUID フィルタリングで最小化)
- **Impact**: 中 (ユーザー体験に影響)
- **Mitigation**:
  - 実機での長時間テスト (6 時間) でバッテリー消費を測定
  - 必要に応じて RSSI しきい値の調整で検知頻度を制御

### Trade-off: Rapid Retry ロジックの削除

- **Gain**: コードベースの簡潔化、保守性向上
- **Loss**: 短時間スキャンという既知の動作パターンの喪失
- **Mitigation**: 段階的非推奨化により、問題発生時のロールバックを容易にする

## Migration Plan

### Phase 1: iOS 連続スキャンの実装 (Week 1)

1. `geofencingTask.ts` の ENTER イベントで iOS も `startContinuousBleScanner()` を呼び出す
2. EXIT イベントで iOS も `stopContinuousBleScanner()` を呼び出す
3. `tryDetectBeacon()` と Rapid Retry 呼び出しをコメントアウト (削除はしない)

### Phase 2: 検証 (Week 2)

1. TestFlight ビルドで iOS 実機テスト
   - 学外 → 学内 (ジオフェンス ENTER)
   - ビーコン接近 (RSSI > -70) → PRESENT 遷移
   - ビーコン離反 (RSSI <= -75) → UNCONFIRMED 遷移
   - 3 分後 INSIDE_AREA 遷移 → 退室通知
   - 学外退出 (ジオフェンス EXIT) → OUTSIDE 遷移
2. バックグラウンド 6 時間放置テスト
   - バッテリー消費ログ収集
   - スキャン継続性の確認

### Phase 3: クリーンアップ (Week 3)

1. iOS で問題がなければ、`tryDetectBeacon()` と Rapid Retry 関連コードを削除
2. OpenSpec アーカイブとドキュメント更新

### Rollback Plan

- `geofencingTask.ts` の変更を Revert
- iOS は `tryDetectBeacon()` と Rapid Retry に戻る
- Android は影響なし

## Open Questions

1. **iOS での RSSI 値の安定性**: Android と同等か？
   - → Phase 2 で実測データを収集し、必要に応じてしきい値を調整
2. **State Restoration の発動頻度**: iOS がどの程度アプリをウェイクアップするか？
   - → ログ収集で発動回数を測定し、定期タスクの必要性を再評価
3. **フォアグラウンドサービス通知の代替**: iOS ユーザーに状態を明示する方法は？
   - → ローカル通知 (`sendBleConnectedNotification`) で十分か検証
