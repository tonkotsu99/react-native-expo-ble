// ----- BLE & API Settings -----

/**
 * 在室管理ビーコンがアドバタイズする候補サービスUUID。
 * - 0x180D: 旧仕様（Heart Rate）
 * - 0x180A: 現在のLINBLE端末が公開するDevice Information Service
 */
export const BLE_SERVICE_UUIDS = [
  "0000180d-0000-1000-8000-00805f9b34fb",
  "0000180a-0000-1000-8000-00805f9b34fb",
];

/** 後方互換用。優先するサービスUUID */
export const BLE_SERVICE_UUID = BLE_SERVICE_UUIDS[0];

/** ビーコン名のプレフィックス（LINBLEシリーズなど） */
export const BLE_DEVICE_NAME_PREFIXES = ["LINBLE"];

// ----- RSSI Thresholds for Room Detection -----

/**
 * RSSI しきい値 - 研究室入室判定
 * この値を超える RSSI を持つビーコンは「研究室内」と判定される
 */
export const RSSI_ENTER_THRESHOLD = -70; // dBm

/**
 * RSSI しきい値 - 研究室退室判定
 * この値以下の RSSI を持つビーコンは「廊下」または「信号喪失」と判定される
 * ヒステリシスとして RSSI_ENTER_THRESHOLD との差が 5 dBm
 */
export const RSSI_EXIT_THRESHOLD = -75; // dBm

/**
 * UNCONFIRMED 状態から INSIDE_AREA への遷移猶予期間（ミリ秒）
 * 3分間 RSSI が弱い状態が続いた場合に INSIDE_AREA に遷移
 */
export const RSSI_DEBOUNCE_TIME_MS = 3 * 60 * 1000; // 3分

// ---------------------------------

/** 在室（入室）を記録するためのAPIエンドポイント */
export const API_URL_ENTER = "https://www.kyutech-4lab.jp/api/attendance/enter";

/** 退室を記録するためのAPIエンドポイント */
export const API_URL_EXIT = "https://www.kyutech-4lab.jp/api/attendance/exit";

/** ジオフェンス内滞在を記録するためのAPIエンドポイント */
export const API_URL_INSIDE_AREA =
  "https://www.kyutech-4lab.jp/api/attendance/inside-area";

// ---------------------------------

// Debug flags
export const DEBUG_BLE = false; // set to false to silence debug notifications
