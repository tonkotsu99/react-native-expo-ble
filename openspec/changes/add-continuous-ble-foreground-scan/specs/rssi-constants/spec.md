# RSSI Constants Specification

## Purpose

RSSI ベースの入退室判定に使用するしきい値を定数として定義し、将来的な調整を可能にする。

## ADDED Requirements

### Requirement: RSSI Threshold Constants

RSSI しきい値は `constants/index.ts` に定義され、研究室入退室判定に使用されなければならない (SHALL)。

#### Scenario: RSSI_ENTER_THRESHOLD is defined

- **WHEN** `constants/index.ts` をインポートする
- **THEN** `RSSI_ENTER_THRESHOLD` が `-70` (dBm) で定義されていなければならない (SHALL)
- **AND** この値を超える RSSI を持つビーコンは「研究室内」と判定されなければならない (SHALL)

#### Scenario: RSSI_EXIT_THRESHOLD is defined

- **WHEN** `constants/index.ts` をインポートする
- **THEN** `RSSI_EXIT_THRESHOLD` が `-75` (dBm) で定義されていなければならない (SHALL)
- **AND** この値以下の RSSI を持つビーコンは「廊下」または「信号喪失」と判定されなければならない (SHALL)
- **AND** ヒステリシスとして RSSI_ENTER_THRESHOLD との差が 5 dBm 以上でなければならない (SHALL)

#### Scenario: RSSI_DEBOUNCE_TIME_MS is defined

- **WHEN** `constants/index.ts` をインポートする
- **THEN** `RSSI_DEBOUNCE_TIME_MS` が `3 * 60 * 1000` (3 分) で定義されていなければならない (SHALL)
- **AND** この時間は `UNCONFIRMED` 状態から `INSIDE_AREA` への遷移猶予期間として使用されなければならない (SHALL)
