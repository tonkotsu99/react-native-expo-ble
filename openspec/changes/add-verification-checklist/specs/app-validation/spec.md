## ADDED Requirements

### Requirement: Manual Verification Checklist

アプリのドキュメントは在室管理フローが正常に動作していることを確認できる手動検証チェックリストを提供しなければならない (SHALL)。

#### Scenario: Baseline tooling verification

- **WHEN** 開発者がチェックリストの前提条件を確認する
- **THEN** チェックリストは `npm install` と `npm run lint` を実行して依存関係と静的チェックが成功することを含めなければならない (SHALL)
- **AND** Expo Go ではネイティブ機能が不足するため、開発用クライアントまたはスタンドアロンビルドを使用する必要がある旨を明記しなければならない (SHALL)

#### Scenario: BLE attendance flow verification

- **WHEN** 開発者が BLE 在室フローを確認する
- **THEN** チェックリストは共有シングルトン `bleManager` を利用したスキャン開始手順、対象ビーコン検出時の期待ログ、および接続成功時に在室 API (`API_URL_ENTER`) が呼ばれることの確認方法を記載しなければならない (SHALL)
- **AND** BLE パーミッション許可やユーザー ID 設定が未完了の場合に備えた確認項目を含めなければならない (SHALL)

#### Scenario: Geofence exit flow verification

- **WHEN** 開発者がジオフェンス退出時の挙動を確認する
- **THEN** チェックリストはジオフェンスのエリア内外をエミュレーションする手順、退出イベントで `API_URL_EXIT` が呼ばれること、およびアプリ状態が `OUTSIDE` に更新されるログを確認する方法を含めなければならない (SHALL)
