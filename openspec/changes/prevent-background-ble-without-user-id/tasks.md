## 1. Implementation

- [x] 1.1 `tasks/geofencingTask.ts` と `tasks/periodicCheckTask.ts` のバックグラウンド接続処理で永続化されたユーザー ID がない場合は早期に return するガードを追加する
- [x] 1.2 `hooks/useBLE.ts` の再接続ヘルパーでユーザー ID 欠如時にスキャンや接続を開始しないよう防衛コードを入れる

## 2. Validation

- [x] 2.1 `npm run lint`
- [ ] 2.2 初回起動でユーザー ID 未設定の状態からジオフェンス入場を再現し、バックグラウンド接続が発生しないことをログで確認する
