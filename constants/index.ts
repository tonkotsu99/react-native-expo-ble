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
