// ----- BLE & API Settings -----

/** 在室管理ビーコンがアドバタイズするサービスUUID */
export const BLE_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb";

/** 在室（入室）を記録するためのAPIエンドポイント */
export const API_URL_ENTER = "https://www.kyutech-4lab.jp/api/attendance/enter";

/** 退室を記録するためのAPIエンドポイント */
export const API_URL_EXIT = "https://www.kyutech-4lab.jp/api/attendance/exit";

/** ジオフェンス内滞在を記録するためのAPIエンドポイント */
export const API_URL_INSIDE_AREA =
  "https://www.kyutech-4lab.jp/api/attendance/inside-area";

// ---------------------------------
