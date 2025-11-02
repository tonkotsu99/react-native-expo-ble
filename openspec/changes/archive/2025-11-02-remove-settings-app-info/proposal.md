## Why

設定画面の「アプリ情報」セクションは不要になったため、表示から削除して UI を簡素化したい。

## What Changes

- SettingsPanel の既定セクションから「アプリ情報」ブロックを削除する。
- プライバシーポリシー等のリンクを設定画面から取り除くか、別導線へ移す方針を明確化する。
- attendance-ui の仕様を更新し、設定画面にアプリ情報セクションを表示しないことを明示する。

## Impact

- 影響する仕様: attendance-ui（設定画面の構成）。
- 影響するコード: components/organisms/SettingsPanel.tsx、components/templates/SettingsTemplate.tsx、設定画面関連のリンクハンドラー。
- リスク: プライバシーポリシー等のリンクを削除する場合、代替導線を別途検討する必要がある。必要なら別チケットでフォローする。
