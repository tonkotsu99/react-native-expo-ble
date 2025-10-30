import {
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  BluetoothSearching,
  CheckCircle,
  Clock,
  Home,
  MapPin,
  Moon,
  Radio,
  RefreshCw,
  Settings,
  Sun,
  User,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
  ZapOff,
} from "@tamagui/lucide-icons";

// アプリ状態用アイコン
export const AppStateIcons = {
  OUTSIDE: Home,
  INSIDE_AREA: MapPin,
  PRESENT: CheckCircle,
  UNCONFIRMED: Clock,
} as const;

// BLE接続状態用アイコン
export const BLEStateIcons = {
  connected: BluetoothConnected,
  disconnected: Bluetooth,
  scanning: BluetoothSearching,
  disabled: BluetoothOff,
  error: XCircle,
} as const;

// 一般的なアクション用アイコン
export const ActionIcons = {
  scan: RefreshCw,
  connect: Wifi,
  disconnect: WifiOff,
  settings: Settings,
  user: User,
  power: Zap,
  powerOff: ZapOff,
} as const;

// テーマ用アイコン
export const ThemeIcons = {
  light: Sun,
  dark: Moon,
} as const;

// ステータス用アイコン
export const StatusIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: Clock,
  info: Radio,
} as const;

// アイコンサイズの定義
export const IconSizes = {
  small: "$1",
  medium: "$1.5",
  large: "$2",
  xlarge: "$3",
} as const;

// アイコンカラーパレット
export const IconColors = {
  primary: "$blue10",
  success: "$green10",
  warning: "$orange10",
  error: "$red10",
  muted: "$gray10",
  accent: "$purple10",
} as const;

export type AppStateIconType = keyof typeof AppStateIcons;
export type BLEStateIconType = keyof typeof BLEStateIcons;
export type ActionIconType = keyof typeof ActionIcons;
export type ThemeIconType = keyof typeof ThemeIcons;
export type StatusIconType = keyof typeof StatusIcons;
export type IconSizeType = keyof typeof IconSizes;
export type IconColorType = keyof typeof IconColors;
