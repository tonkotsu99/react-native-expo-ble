# Proposal: Update iOS BLE Continuous Scan

## Background

現在の実装では、ジオフェンス進入時の BLE スキャン動作が Android と iOS で異なります:

- **Android**: `startContinuousBleScanner()` を呼び出し、フォアグラウンドサービスで RSSI ベースの連続スキャンを実行
- **iOS**: `tryDetectBeacon()` で短時間スキャン (15 秒) を実行し、検出できなければ Rapid Retry (45 秒間隔) にフォールバック

この差異により、iOS では以下の問題があります:

1. **検知遅延**: 短時間スキャンで検出できなかった場合、次回スキャンまで最大 45 秒待機
2. **一貫性の欠如**: Android では RSSI による入室/退室判定 (PRESENT ⇄ UNCONFIRMED) が機能するが、iOS では未対応
3. **バッテリー効率の誤解**: iOS でも `UIBackgroundModes: ["bluetooth-central"]` と State Restoration が設定されており、連続スキャンが可能

iOS の CoreBluetooth は、以下の条件を満たせばバックグラウンドで BLE スキャンを継続できます:

- ✅ `Info.plist` の `UIBackgroundModes` に `bluetooth-central` を含める (設定済み)
- ✅ `BleManager` で `restoreStateIdentifier` を指定 (設定済み)
- ✅ `startDeviceScan()` でサービス UUID フィルタリングを使用 (実装済み)

つまり、**iOS でも Android と同じ連続スキャン方式を適用すべき**です。

## Proposal

iOS でも Android と同様に `startContinuousBleScanner()` を呼び出し、RSSI ベースの連続スキャンを実装します。

### 主要な変更:

1. **ジオフェンスタスクの統一**:

   - `geofencingTask.ts` の ENTER イベントで、iOS でも `startContinuousBleScanner()` を呼び出す
   - iOS 専用の `tryDetectBeacon()` と Rapid Retry ウィンドウは廃止

2. **プラットフォーム差分の最小化**:

   - Android: フォアグラウンドサービス通知あり
   - iOS: フォアグラウンドサービスなし (State Restoration のみ)
   - 両 OS: 同じ RSSI しきい値 (-70 dBm 入室、-75 dBm 退室) と状態遷移ロジック

3. **定期タスクの役割変更**:
   - 両 OS で連続スキャンが優先され、定期タスク (`periodicCheckTask.ts`) はフォールバックのみに使用

## Benefits

- **検知精度の向上**: iOS でも RSSI による研究室内/廊下の判定が可能になる
- **コードの一貫性**: プラットフォーム間の分岐を削減し、保守性が向上
- **検知遅延の削減**: Rapid Retry の 45 秒待機を廃止し、リアルタイムに近い検知を実現
- **実装の簡潔化**: `tryDetectBeacon()` や Rapid Retry の複雑なロジックを削除

## Risks & Mitigations

### Risk 1: iOS のバックグラウンドスキャン持続性

- **懸念**: iOS がアプリを完全にサスペンドすると、スキャンが停止する可能性
- **Mitigation**:
  - State Restoration とサービス UUID フィルタリングにより、iOS は BLE イベント時にアプリをウェイクアップ
  - 定期タスク (15 分間隔) を保持し、スキャンが停止した場合の再開メカニズムとする

### Risk 2: iOS のバッテリー消費増加

- **懸念**: 連続スキャンによりバッテリー消費が増加する可能性
- **Mitigation**:
  - サービス UUID フィルタリング (`27adc9ca-35eb-465a-9154-b8ff9076f3e8` のみ) により、不要なデバイスをフィルタリング
  - iOS は元々 `bluetooth-central` モードで最適化されており、Android と同等の消費に収まる想定

### Risk 3: 通知の欠如 (iOS)

- **懸念**: Android のようなフォアグラウンドサービス通知が iOS にない
- **Mitigation**:
  - iOS はフォアグラウンドサービスの概念がないため、通知なしが正常動作
  - PRESENT 遷移時のローカル通知 (`sendBleConnectedNotification`) で状態変化を通知

## Impact

### 影響を受ける Specs

- `background-ble-maintenance`: iOS の BLE スキャン方式を変更 (MODIFIED)

### 影響を受けるコード

- `tasks/geofencingTask.ts`: iOS の ENTER イベント処理を `startContinuousBleScanner()` に統一
- `tasks/geofencingTask.ts`: `tryDetectBeacon()`, `startRapidRetryWindow()`, `stopRapidRetryWindow()` の削除 (または非推奨化)
- `tasks/geofencingTask.ts`: EXIT イベントで iOS も `stopContinuousBleScanner()` を呼び出す

### 非破壊的変更

- Android の動作は変更なし
- API エンドポイント、状態遷移、RSSI しきい値は変更なし
- 既存の定期タスクは保持 (フォールバックとして機能)

## Open Questions

1. **`tryDetectBeacon()` の完全削除 vs 非推奨化**:
   - → まず非推奨化し、iOS での動作を十分検証してから削除
2. **Rapid Retry ロジックの削除タイミング**:
   - → 連続スキャンが安定動作することを確認後、次の変更で削除
3. **iOS での実機テストの優先度**:
   - → 提案承認後、TestFlight ビルドで長時間 (6 時間) のバックグラウンドテストを実施
