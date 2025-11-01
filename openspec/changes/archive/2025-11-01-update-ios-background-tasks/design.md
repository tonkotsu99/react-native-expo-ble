## Context

iOS のバックグラウンド実行は Info.plist の `UIBackgroundModes` とランタイム初期化の両輪が揃って初めて安定する。BLE のバックグラウンド動作では `bluetooth-central` と State Restoration（CoreBluetooth の再生成/復元）が特に重要。周期処理は `BackgroundFetch` を用いるが、`fetch`/`processing` モード宣言がないとスケジューラが起動しない。

## Goals / Non-Goals

- Goals:
  - iOS の実機で、学外 → 学内の入場時に確実にイベントが到達し、在室化と通知が行われる
  - 既存 Android 実装を壊さない
- Non-Goals:
  - 省電力の高度最適化（必要なら後続変更）

## Decisions

- Info.plist に `bluetooth-central`, `location`, `fetch`, `processing` を設定（Expo の plugin 追加に加えて明示）
- BleManager に `restoreStateIdentifier` と `restoreStateFunction` を設定し、復元パスでログと再同期を行う
- BackgroundFetch はジオフェンス入場をトリガーに開始（無闇に常時起動はしない）し、多重開始はガード

## Risks / Trade-offs

- iOS のバックグラウンド実行は OS 裁量が大きく、デバイス/OS バージョンにより頻度が変動 → 診断ログと通知を強化し観測性を上げる
- `bluetooth-central` の有効化でスキャンは許可されるが、無制限スキャンは電池に影響 → サービス UUID フィルタで限定

## Migration Plan

1. app.json の Info.plist 更新
2. BleManager の State Restoration 追加
3. geofencingTask / periodicCheckTask の診断強化
4. Dev Client で実機検証 →TestFlight で回帰

## Open Questions

- 端末側の「常に許可」設定が既に有効か（初回起動時の選択に依存）
- ビーコンのアドバタイズ間隔やサービス UUID の正確性（iOS 背景検出率に影響）
