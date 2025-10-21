## Why

AttendancePage は在室アプリの既定画面ですが、現状 UI を返さずユーザーが手動でスキャン/切断できません。手動操作を備えたページを実装し、仕様化する必要があります。

## What Changes

- `AttendancePage` にヘッダーとアクションパネルを描画し、スキャン開始・切断操作を提供
- スキャン中のローディング状態と接続状態表示をフックから取得して連動
- OpenSpec に「手動入退室 UI」要件を追加して行動シナリオを明文化

## Impact

- Affected specs: `attendance-ui`
- Affected code: `components/pages/AttendancePage.tsx`, Tamagui UI コンポーネント呼び出し
