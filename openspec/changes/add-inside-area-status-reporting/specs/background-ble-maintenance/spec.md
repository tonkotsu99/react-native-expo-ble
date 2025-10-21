## ADDED Requirements

### Requirement: Inside Area Status Reporting

ジオフェンスによって `INSIDE_AREA` と判断された際、システムはサーバーへ滞在中であることを通知しなければならない (SHALL)。

#### Scenario: Report geofence entry

- **GIVEN** ジオフェンスイベントによりアプリ状態が `INSIDE_AREA` に更新された
- **WHEN** 状態が `INSIDE_AREA` に遷移する
- **THEN** バックグラウンドタスクは `API_URL_INSIDE_AREA` へユーザー ID と現在時刻および利用可能な位置・デバイス情報を含むペイロードを POST しなければならない (SHALL)
- **AND** POST が成功した場合はログに成功メッセージを記録し、失敗時はエラーを記録して次回のイベントでリトライできるようにしなければならない (SHALL)

#### Scenario: Avoid duplicate inside-area posts

- **GIVEN** アプリ状態が `INSIDE_AREA` のまま変化していない
- **WHEN** 15 分ごとの定期チェックが起動する
- **THEN** タスクは `INSIDE_AREA` のままの場合に `API_URL_INSIDE_AREA` を再送せず、「状態維持」を示すログのみを出力しなければならない (SHALL)
- **AND** 状態が `PRESENT` または `OUTSIDE` に変化した後で再び `INSIDE_AREA` に戻った場合は、新たな `INSIDE_AREA` 通知を送信しなければならない (SHALL)
