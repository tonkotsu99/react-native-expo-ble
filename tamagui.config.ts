import { animations } from "@/constants/animations";
import { config } from "@tamagui/config/v3";
import { createTamagui, createTokens } from "tamagui";

// カスタムトークンの定義
const customTokens = createTokens({
  ...config.tokens,
  color: {
    ...config.tokens.color,
    // アプリ状態カラー
    statusOutside: "#6B7280", // グレー
    statusInsideArea: "#F59E0B", // アンバー
    statusPresent: "#10B981", // エメラルド
    statusUnconfirmed: "#8B5CF6", // バイオレット

    // BLE状態カラー
    bleConnected: "#10B981", // エメラルド
    bleDisconnected: "#6B7280", // グレー
    bleScanning: "#3B82F6", // ブルー
    bleError: "#EF4444", // レッド

    // UI強化カラー
    cardBackground: "$background",
    cardBorder: "$borderColor",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    info: "#3B82F6",
  },
  size: {
    ...config.tokens.size,
    // フォントサイズのエイリアス（数値で定義）
    small: 14, // 小サイズ
    medium: 16, // 中サイズ
    large: 20, // 大サイズ
  },
  radius: {
    ...config.tokens.radius,
    card: 12,
    button: 8,
    input: 6,
    round: 999, // 完全な円形
  },
  space: {
    ...config.tokens.space,
    card: 16,
    section: 24,
  },
  zIndex: {
    ...config.tokens.zIndex,
    modal: 1000,
    overlay: 999,
    dropdown: 100,
  },
});

// カスタムテーマの定義
const customThemes = {
  ...config.themes,
  light: {
    ...config.themes.light,
    statusOutside: customTokens.color.statusOutside,
    statusInsideArea: customTokens.color.statusInsideArea,
    statusPresent: customTokens.color.statusPresent,
    statusUnconfirmed: customTokens.color.statusUnconfirmed,
    bleConnected: customTokens.color.bleConnected,
    bleDisconnected: customTokens.color.bleDisconnected,
    bleScanning: customTokens.color.bleScanning,
    bleError: customTokens.color.bleError,
    cardBackground: "#FFFFFF",
    cardBorder: "#E5E7EB",
    shadowColor: "rgba(0, 0, 0, 0.1)",
  },
  dark: {
    ...config.themes.dark,
    statusOutside: customTokens.color.statusOutside,
    statusInsideArea: customTokens.color.statusInsideArea,
    statusPresent: customTokens.color.statusPresent,
    statusUnconfirmed: customTokens.color.statusUnconfirmed,
    bleConnected: customTokens.color.bleConnected,
    bleDisconnected: customTokens.color.bleDisconnected,
    bleScanning: customTokens.color.bleScanning,
    bleError: customTokens.color.bleError,
    cardBackground: "#1F2937",
    cardBorder: "#374151",
    shadowColor: "rgba(0, 0, 0, 0.3)",
  },
};

const tamaguiConfig = createTamagui({
  ...config,
  animations,
  tokens: customTokens,
  themes: customThemes,
  // シンプルなサイズマッピング
  shorthands: {
    ...config.shorthands,
  },
});

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
