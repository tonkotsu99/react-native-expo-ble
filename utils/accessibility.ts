import { AccessibilityInfo } from "react-native";

// アクセシビリティラベル生成関数
export const AccessibilityLabels = {
  // BLE状態用ラベル
  getBLEStatusLabel: (
    connected: boolean,
    deviceName?: string | null
  ): string => {
    if (connected) {
      return `BLEデバイス${deviceName || ""}に接続中`;
    }
    return "BLEデバイス未接続";
  },

  // アプリ状態用ラベル
  getAppStateLabel: (state: string): string => {
    const stateLabels = {
      OUTSIDE: "研究室エリア外",
      INSIDE_AREA: "研究室エリア内",
      PRESENT: "在室中",
      UNCONFIRMED: "状態未確認",
    };
    return stateLabels[state as keyof typeof stateLabels] || "不明な状態";
  },

  // ボタンアクション用ラベル
  getActionLabel: (action: string, isLoading = false): string => {
    if (isLoading) {
      return `${action}中...`;
    }
    const actionLabels = {
      scan: "BLEスキャン開始",
      disconnect: "BLE接続を切断",
      save: "ユーザーID保存",
    };
    return actionLabels[action as keyof typeof actionLabels] || action;
  },

  // 進行状況用ラベル
  getProgressLabel: (progress: number, total?: number): string => {
    if (total) {
      return `進行状況: ${progress}/${total}`;
    }
    return `進行状況: ${Math.round(progress)}%`;
  },
};

// アクセシビリティヒント生成関数
export const AccessibilityHints = {
  // 操作ヒント
  tapToAction: "タップして実行",
  longPressForOptions: "長押しでオプション表示",
  swipeToNavigate: "スワイプで移動",

  // 状態説明ヒント
  connectionStatus: "デバイスの接続状態を表示",
  appStatus: "アプリの現在の状態を表示",
  batteryStatus: "バッテリー残量を表示",

  // フォーム関連ヒント
  requiredField: "必須入力項目",
  optionalField: "任意入力項目",

  // ナビゲーションヒント
  backButton: "前の画面に戻る",
  nextButton: "次の画面に進む",
  menuButton: "メニューを開く",
};

// アクセシビリティロール定義
export const AccessibilityRoles = {
  button: "button" as const,
  text: "text" as const,
  image: "image" as const,
  header: "header" as const,
  link: "link" as const,
  switch: "switch" as const,
  checkbox: "checkbox" as const,
  radio: "radio" as const,
  progressbar: "progressbar" as const,
  tab: "tab" as const,
  tablist: "tablist" as const,
  timer: "timer" as const,
  alert: "alert" as const,
  dialog: "dialog" as const,
  menu: "menu" as const,
  menuitem: "menuitem" as const,
  toolbar: "toolbar" as const,
  summary: "summary" as const,
  list: "list" as const,
  listitem: "listitem" as const,
};

// アクセシビリティ状態ヘルパー
export const AccessibilityStates = {
  // ボタン状態
  getButtonState: (disabled = false, selected = false) => ({
    disabled,
    selected,
  }),

  // チェックボックス状態
  getCheckboxState: (checked = false, disabled = false) => ({
    checked,
    disabled,
  }),

  // 進行状況状態
  getProgressState: (valueNow: number, valueMin = 0, valueMax = 100) => ({
    valueNow,
    valueMin,
    valueMax,
    valueText: `${Math.round((valueNow / valueMax) * 100)}%`,
  }),
};

// スクリーンリーダー用アナウンス関数
export const AccessibilityAnnouncements = {
  // 即座にアナウンス
  announce: (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  },

  // 状態変更アナウンス
  announceStateChange: (newState: string) => {
    const message = AccessibilityLabels.getAppStateLabel(newState);
    AccessibilityInfo.announceForAccessibility(
      `状態が変更されました: ${message}`
    );
  },

  // 接続状態変更アナウンス
  announceConnectionChange: (
    connected: boolean,
    deviceName?: string | null
  ) => {
    const message = AccessibilityLabels.getBLEStatusLabel(
      connected,
      deviceName
    );
    AccessibilityInfo.announceForAccessibility(message);
  },

  // エラーアナウンス
  announceError: (error: string) => {
    AccessibilityInfo.announceForAccessibility(`エラー: ${error}`);
  },

  // 成功アナウンス
  announceSuccess: (message: string) => {
    AccessibilityInfo.announceForAccessibility(`成功: ${message}`);
  },
};

// アクセシビリティ設定確認
export const AccessibilityCheckers = {
  // スクリーンリーダー有効確認
  isScreenReaderEnabled: async (): Promise<boolean> => {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch {
      return false;
    }
  },

  // アニメーション無効設定確認
  isReduceMotionEnabled: async (): Promise<boolean> => {
    try {
      return await AccessibilityInfo.isReduceMotionEnabled();
    } catch {
      return false;
    }
  },

  // 高コントラスト設定確認
  isBoldTextEnabled: async (): Promise<boolean> => {
    try {
      return await AccessibilityInfo.isBoldTextEnabled();
    } catch {
      return false;
    }
  },
};

// フォーカス管理ヘルパー
export const AccessibilityFocus = {
  // 要素にフォーカス設定
  setAccessibilityFocus: (ref: React.RefObject<any>) => {
    if (ref.current) {
      AccessibilityInfo.setAccessibilityFocus(ref.current);
    }
  },
};

// アクセシビリティプロパティ生成ヘルパー
export const createAccessibilityProps = (
  label?: string,
  hint?: string,
  role?: keyof typeof AccessibilityRoles,
  state?: Record<string, boolean | number | string>
) => ({
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRole: role ? AccessibilityRoles[role] : undefined,
  accessibilityState: state,
  accessible: true,
});

export type AccessibilityRole = keyof typeof AccessibilityRoles;
