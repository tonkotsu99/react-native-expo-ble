# user-identity Specification

## Purpose
TBD - created by archiving change update-attendance-user-id. Update Purpose after archive.
## Requirements
### Requirement: Persisted User Identifier

アプリは在室 API 呼び出しに利用するユーザー ID を永続化し、フォアグラウンド/バックグラウンドのどちらからでも取得できるようにしなければならない (SHALL)。

#### Scenario: Save user identifier

- **WHEN** ユーザーがアプリ内でユーザー ID を設定する
- **THEN** システムはその ID を AsyncStorage に保存し、後続の API 呼び出しで利用できるようにしなければならない (SHALL)

#### Scenario: Read identifier in background task

- **WHEN** バックグラウンドタスクが出席 API を実行する必要がある
- **THEN** タスクは永続化されたユーザー ID を取得し、存在しない場合は API 呼び出しを行わず警告ログを残さなければならない (SHALL)

