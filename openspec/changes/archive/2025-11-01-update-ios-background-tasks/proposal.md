## Why

実機 (iOS) でバックグラウンド処理が発火せず、学外 → 学内の入場時に通知が来ない／学内で在室になっても BLE 接続と通知が行われない事象が発生している。iOS ではバックグラウンド実行に固有要件があり、現状の設定や初期化手順が不足している可能性が高い。

## What Changes

- iOS のバックグラウンド機能を有効にするため、Info.plist (app.json 経由) に必要な UIBackgroundModes を明示する
  - bluetooth-central, location, fetch, processing を設定（重複を除去）
- BleManager を iOS の State Restoration に対応（restoreStateIdentifier / restoreStateFunction）させ、バックグラウンド復帰や再起動後も動作継続できるようにする
- BackgroundFetch の初期化・開始を堅牢化（多重開始防止、ログ/通知の強化）し、INSIDE_AREA や UNCONFIRMED のときに軽量スキャンで自動再接続を試みる既存仕様を確実に動作させる
- ジオフェンス入場イベント (geofencingTask) 到達の診断を強化（到達時にデバッグ通知/ログを送る）
- OpenSpec の background-ble-maintenance に iOS 固有要件（UIBackgroundModes、State Restoration、Fetch/Processing）を明示する要求を追加/更新

## Impact

- Affected specs: background-ble-maintenance
- Affected code:
  - app.json (iOS infoPlist: UIBackgroundModes 設定の調整)
  - bluetooth/bleManagerInstance.ts（State Restoration 対応）
  - tasks/geofencingTask.ts（診断通知/ログ強化、BGFetch 初期化ガード）
  - tasks/periodicCheckTask.ts（ログとエラー処理の明確化。挙動は現行仕様踏襲）
