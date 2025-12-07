# Proposal: iOS iBeacon Region Monitoring

## Why

現在の BLE 在室管理システムは `react-native-ble-plx` の広告スキャンに依存しており、iOS のバックグラウンドで次の問題があります：

1. **OS にビーコン監視を委任できない**: アプリが起動している間のみスキャン可能で、iOS が完全にサスペンドするとビーコン検知が止まる
2. **バッテリー消費が大きい**: Rapid Retry (45 秒間隔) と定期タスク (15 分間隔) で能動的にスキャンするため、バックグラウンド時間が長い
3. **入退室検知の遅延**: OS イベント駆動ではなく TTL ベースの推測のため、実際の入退室から最大 15 分の遅延が発生する
4. **Apple のベストプラクティスに非準拠**: iOS は `CoreLocation` の iBeacon 領域監視 (CLBeaconRegion) を用いてバックグラウンドでビーコン入退室を検知する設計を推奨している

理想的な iOS フローは以下の通りです：

- **学外**: アプリはジオフェンス監視のみ OS に委任してスリープ
- **学内進入**: OS がジオフェンス ENTER でアプリを起こし、アプリは「研究室ビーコン領域」の監視を OS に委任して再びスリープ
- **研究室入室**: OS がビーコン ENTER でアプリを起こし、アプリは在室 API を送信して再びスリープ
- **研究室退室**: OS がビーコン EXIT でアプリを起こし、アプリは退室 API を送信
- **学外退出**: OS がジオフェンス EXIT でアプリを起こし、アプリはビーコン監視を解除

このフローを実現するには、`expo-location` が対応していない **CoreLocation の iBeacon 領域監視 API** を呼び出すネイティブモジュールが必要です。

## What Changes

- **新規 Expo Config Plugin**: iOS の `CoreLocation` iBeacon API を React Native から呼び出せるネイティブモジュールを作成
- **バックグラウンド BLE 仕様の拡張**: iBeacon 領域監視 (CLBeaconRegion) によるイベント駆動型検知を追加
- **ジオフェンスタスクの改修**: 学内進入時にビーコン領域監視を開始し、学外退出時に停止するフローを実装
- **定期タスクの縮小**: iOS では iBeacon 監視に委任し、定期スキャンは Android のみに限定
- **通知の改善**: ビーコン入退室イベント時に通知を送信

**BREAKING**: 既存の広告スキャンベース (`react-native-ble-plx`) から、iOS では CoreLocation ベースの領域監視に移行します。Android は引き続き `react-native-ble-plx` を使用します。

## Impact

### 影響を受ける Specs

- `background-ble-maintenance`: iOS のビーコン監視方式を CLBeaconRegion に変更
- `notifications`: ビーコン入退室通知を追加

### 影響を受けるコード

- `ios/` ディレクトリ: 新規ネイティブモジュール `RNBeaconMonitoring.swift` を追加
- `plugins/`: 新規 Expo Config Plugin `withBeaconMonitoring.js` を追加
- `hooks/useGeofencing.ts`: iOS でのビーコン領域監視開始/停止ロジックを追加
- `tasks/geofencingTask.ts`: ジオフェンス ENTER でビーコン監視開始、EXIT で停止
- `tasks/periodicCheckTask.ts`: iOS では実行をスキップするガードを追加
- `app.json`: 新規プラグインを登録

### 依存関係

- iOS 13.0 以降 (CoreLocation の `CLBeaconIdentityConstraint` を使用)
- Android は影響なし (引き続き `react-native-ble-plx`)

### マイグレーション

既存の iOS ユーザーはアプリ更新後、初回ジオフェンス進入時に新しいビーコン監視フローに自動移行します。ユーザー操作は不要ですが、`Info.plist` に `NSLocationWhenInUseUsageDescription` と `NSLocationAlwaysAndWhenInUseUsageDescription` が必須です（`expo-location` プラグインで既に設定済み）。
