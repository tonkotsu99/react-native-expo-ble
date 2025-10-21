## 1. Implementation

- [x] 1.1 `constants/index.ts` に `API_URL_INSIDE_AREA` を追加する
- [x] 1.2 `tasks/geofencingTask.ts` でジオフェンス侵入時に `API_URL_INSIDE_AREA` へステータスを送信し、重複送信を避ける
- [x] 1.3 `tasks/periodicCheckTask.ts` にも `INSIDE_AREA` 状態継続時の再送抑止ロジックと必要なログを追加する
- [x] 1.4 `state/appState.ts` などで状態遷移を検知できるヘルパーが必要であれば追加し、既存処理への影響を防ぐ

## 2. Validation

- [x] 2.1 `npm run lint` を実行して静的解析を通す
- [ ] 2.2 開発用クライアントでジオフェンス侵入シナリオを再現し、INSIDE_AREA 遷移時に API が呼び出され、状態が変わらない限り再送されないことを確認する
