## Why

現状のリポジトリには BLE スキャンやジオフェンス連携を含むアプリ動作を検証する具体的な手順がなく、開発者が「アプリが正常に動作しているか」を判断しづらい。

## What Changes

- BLE 在室フローとジオフェンス連携を確認するための手順を含む手動検証チェックリストを追加する
- README から開発用クライアント利用と検証チェックリストへの導線を明記する

## Impact

- Affected specs: app-validation
- Affected code: README.md, docs/manual-verification.md (new)
