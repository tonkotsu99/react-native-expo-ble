## ADDED Requirements

### Requirement: Settings panel excludes app info section

設定画面は「アプリ情報」セクションを表示してはならない (SHALL NOT)。設定画面に表示する項目はユーザー操作や状態確認に必要なカードへ限定しなければならない (SHALL)。

#### Scenario: Settings screen hides app info block

- **GIVEN** ユーザーが設定タブを開く
- **WHEN** 画面がレンダリングされる
- **THEN** 「アプリ情報」という見出しやバージョン情報は表示されてはならない (SHALL NOT)
- **AND** プライバシーポリシーやサポートへのリンクを含むアプリ情報項目は設定画面に表示されてはならない (SHALL NOT)
