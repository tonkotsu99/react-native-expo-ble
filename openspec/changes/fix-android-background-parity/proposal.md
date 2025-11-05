## Why

iOS ではジオフェンス入退場・BLE 再接続・退出 POST までバックグラウンドで一通り完了しますが、Android ビルドではバックグラウンドに遷移した時点で一連の処理が止まり、学内・研究室内の自動判定が機能しません。ジオフェンスイベントが届かない、届いても BLE スキャンや接続が実行されない、退出 POST が送られない、といった症状が確認されています。Android ユーザーは常にアプリを前面に出しておく必要があり、在室管理として成立していません。

## What Changes

- `background-ble-maintenance` 仕様に Android バックグラウンド要件を追加し、ジオフェンス →BLE 接続 → 在室・退出 API まで OS の制約を踏まえて明文化します。
- Android 専用のフォアグラウンドサービス起動、`autoConnect` を含む接続モード、Battery Optimization の例外確認など、必要な分岐を設計します。
- ログ／通知まわりを Android でも確実に取得できるよう POST_NOTIFICATIONS 権限やデバッグログの確認手順を仕様化します。

## Impact

- 影響する仕様: `background-ble-maintenance`。
- 影響するコード: `hooks/useGeofencing.ts`, `tasks/geofencingTask.ts`, `tasks/periodicCheckTask.ts`, `hooks/useBLE.ts`, Android ネイティブ設定 (モジュール / Manifest) など。
- リスク: Android のフォアグラウンドサービス／Battery Optimization 例外を扱う必要があり、通知常駐や追加プロンプトがユーザー体験を損なう可能性があります。実機での長時間検証が欠かせません。
