import {
  AlertTriangle,
  Bluetooth,
  CheckCircle,
  RotateCcw,
  Search,
  Settings,
  Wifi,
  WifiOff,
  XCircle,
} from "@tamagui/lucide-icons";
import React from "react";
import type { YStackProps } from "tamagui";
import { H3, styled, XStack, YStack } from "tamagui";
import { IconButton } from "../atoms/IconButton";
import { M_Text } from "../atoms/M_Text";
import {
  ConnectionVisualization,
  type BLEConnectionStatus,
  type DeviceInfo,
} from "../molecules/ConnectionVisualization";
import { ProgressIndicator } from "../molecules/ProgressIndicator";

// ベースとなるConnectionPanelスタイル
const StyledConnectionPanel = styled(YStack, {
  name: "ConnectionPanel",

  variants: {
    variant: {
      default: {
        backgroundColor: "$background",
        borderRadius: "$6",
        borderWidth: 1,
        borderColor: "$borderColor",
        padding: "$4",
      },
      card: {
        backgroundColor: "$backgroundStrong",
        borderRadius: "$6",
        borderWidth: 1,
        borderColor: "$borderColor",
        padding: "$4",
        shadowColor: "$shadowColor",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      },
      compact: {
        backgroundColor: "$background",
        borderRadius: "$4",
        padding: "$3",
      },
      embedded: {
        backgroundColor: "transparent",
        padding: "$2",
      },
    },
  } as const,

  defaultVariants: {
    variant: "default",
  },
});

// パネルヘッダー
const PanelHeader = styled(XStack, {
  name: "PanelHeader",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "$3",
  marginBottom: "$3",
  borderBottomWidth: 1,
  borderBottomColor: "$borderColor",
});

// アクションボタンエリア
const ActionArea = styled(XStack, {
  name: "ActionArea",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: "$3",
  marginTop: "$3",
  borderTopWidth: 1,
  borderTopColor: "$borderColor",
  flexWrap: "wrap",
  gap: "$2",
});

// 接続処理の状態
export type ConnectionProcess = {
  isScanning?: boolean;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
  scanProgress?: number;
  connectionProgress?: number;
  estimatedTime?: number;
  currentStep?: string;
  error?: string;
};

// ConnectionPanel プロパティ
export type ConnectionPanelProps = YStackProps & {
  variant?: "default" | "card" | "compact" | "embedded";

  // BLE関連データ
  connectionStatus: BLEConnectionStatus;
  deviceInfo?: DeviceInfo;
  process?: ConnectionProcess;

  // 表示オプション
  title?: string;
  showHeader?: boolean;
  showProgress?: boolean;
  showAdvancedControls?: boolean;
  compactMode?: boolean;

  // BLE操作
  onStartScan?: () => void;
  onStopScan?: () => void;
  onConnect?: (deviceId?: string) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onCopyDeviceId?: (deviceId: string) => void;
  onOpenSettings?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;

  // 状態
  canScan?: boolean;
  canConnect?: boolean;
  canDisconnect?: boolean;
  hasPermissions?: boolean;
  bluetoothEnabled?: boolean;

  accessibilityLabel?: string;
};

// 接続状態に基づくメッセージとアクションを取得
const getConnectionInfo = (
  status: BLEConnectionStatus,
  process?: ConnectionProcess,
  hasPermissions = true,
  bluetoothEnabled = true
) => {
  if (!bluetoothEnabled) {
    return {
      message: "Bluetoothが無効です",
      description: "デバイス設定でBluetoothを有効にしてください",
      primaryAction: "openSettings",
      primaryLabel: "設定を開く",
      variant: "error" as const,
      icon: XCircle,
    };
  }

  if (!hasPermissions) {
    return {
      message: "Bluetooth権限が必要です",
      description: "アプリ設定でBluetooth権限を許可してください",
      primaryAction: "openSettings",
      primaryLabel: "設定を開く",
      variant: "warning" as const,
      icon: AlertTriangle,
    };
  }

  if (process?.error) {
    return {
      message: "接続エラー",
      description: process.error,
      primaryAction: "retry",
      primaryLabel: "再試行",
      variant: "error" as const,
      icon: XCircle,
    };
  }

  switch (status) {
    case "connected":
      return {
        message: "接続済み",
        description: "BLEデバイスに接続されています",
        primaryAction: "disconnect",
        primaryLabel: "切断",
        variant: "success" as const,
        icon: CheckCircle,
      };

    case "scanning":
      return {
        message: "スキャン中",
        description: "近くのBLEデバイスを検索しています",
        primaryAction: "stopScan",
        primaryLabel: "スキャン停止",
        variant: "info" as const,
        icon: Search,
      };

    case "disconnected":
      if (process?.isConnecting) {
        return {
          message: "接続中",
          description: "BLEデバイスに接続しています",
          primaryAction: "cancel",
          primaryLabel: "キャンセル",
          variant: "info" as const,
          icon: Bluetooth,
        };
      }
      return {
        message: "未接続",
        description: "BLEデバイスとの接続が切断されています",
        primaryAction: "scan",
        primaryLabel: "スキャン開始",
        variant: "warning" as const,
        icon: Bluetooth,
      };

    case "error":
      return {
        message: "接続エラー",
        description: "BLE接続でエラーが発生しました",
        primaryAction: "retry",
        primaryLabel: "再試行",
        variant: "error" as const,
        icon: XCircle,
      };

    default:
      return {
        message: "状態不明",
        description: "BLE接続の状態を確認できません",
        primaryAction: "retry",
        primaryLabel: "再試行",
        variant: "warning" as const,
        icon: AlertTriangle,
      };
  }
};

export const ConnectionPanel = React.forwardRef<any, ConnectionPanelProps>(
  (props, ref) => {
    const {
      variant = "default",
      connectionStatus,
      deviceInfo,
      process,
      title = "BLE接続",
      showHeader = true,
      showProgress = true,
      showAdvancedControls = false,
      compactMode = false,
      onStartScan,
      onStopScan,
      onConnect,
      onDisconnect,
      onReconnect,
      onCopyDeviceId,
      onOpenSettings,
      onRetry,
      onCancel,
      canScan = true,
      canConnect = true,
      canDisconnect = true,
      hasPermissions = true,
      bluetoothEnabled = true,
      accessibilityLabel,
      ...restProps
    } = props;

    const connectionInfo = getConnectionInfo(
      connectionStatus,
      process,
      hasPermissions,
      bluetoothEnabled
    );

    // プライマリアクション実行
    const handlePrimaryAction = React.useCallback(() => {
      switch (connectionInfo.primaryAction) {
        case "scan":
          onStartScan?.();
          break;
        case "stopScan":
          onStopScan?.();
          break;
        case "connect":
          onConnect?.();
          break;
        case "disconnect":
          onDisconnect?.();
          break;
        case "retry":
          onRetry?.();
          break;
        case "cancel":
          onCancel?.();
          break;
        case "openSettings":
          onOpenSettings?.();
          break;
      }
    }, [
      connectionInfo.primaryAction,
      onStartScan,
      onStopScan,
      onConnect,
      onDisconnect,
      onRetry,
      onCancel,
      onOpenSettings,
    ]);

    // 進行状況表示の判定
    const shouldShowProgress =
      showProgress &&
      (process?.isScanning ||
        process?.isConnecting ||
        process?.isDisconnecting);

    // アクセシビリティプロパティ
    const accessibilityProps = {
      accessibilityLabel:
        accessibilityLabel || `BLE接続パネル: ${connectionInfo.message}`,
      accessible: true,
    };

    return (
      <StyledConnectionPanel
        ref={ref}
        variant={variant}
        space="$3"
        {...accessibilityProps}
        {...restProps}
      >
        {/* ヘッダー */}
        {showHeader && !compactMode && (
          <PanelHeader>
            <H3 fontSize="$5" fontWeight="600" color="$color">
              {title}
            </H3>

            {showAdvancedControls && (
              <IconButton
                size="small"
                variant="ghost"
                icon={Settings}
                onPress={onOpenSettings}
                accessibilityLabel="BLE設定を開く"
              />
            )}
          </PanelHeader>
        )}

        {/* 接続状態表示 */}
        <ConnectionVisualization
          status={connectionStatus}
          deviceInfo={deviceInfo}
          variant={compactMode ? "compact" : "default"}
          showSignalStrength={!compactMode}
          showDeviceInfo={!compactMode && connectionStatus === "connected"}
          showConnectionTime={!compactMode}
          onReconnect={onReconnect}
          onDisconnect={onDisconnect}
          onCopyDeviceId={onCopyDeviceId}
          isReconnecting={process?.isConnecting}
        />

        {/* 進行状況インジケーター */}
        {shouldShowProgress && (
          <ProgressIndicator
            variant={compactMode ? "minimal" : "default"}
            status={process?.error ? "error" : "active"}
            title={process?.currentStep || connectionInfo.message}
            description={connectionInfo.description}
            progress={
              process?.scanProgress ??
              process?.connectionProgress ??
              (process?.isScanning || process?.isConnecting ? undefined : 0)
            }
            estimatedTimeRemaining={process?.estimatedTime}
            showTimer={!compactMode}
            showSpinner={true}
            canCancel={!!onCancel}
            onCancel={onCancel}
          />
        )}

        {/* アクションエリア */}
        <ActionArea>
          <YStack flex={1} space="$2">
            <XStack alignItems="center" space="$2">
              <connectionInfo.icon
                size={16}
                color={
                  connectionInfo.variant === "success"
                    ? "$green9"
                    : connectionInfo.variant === "warning"
                    ? "$orange9"
                    : connectionInfo.variant === "error"
                    ? "$red9"
                    : "$blue9"
                }
              />
              <M_Text
                fontSize={compactMode ? "$3" : "$4"}
                fontWeight="500"
                color="$color"
              >
                {connectionInfo.message}
              </M_Text>
            </XStack>

            {!compactMode && (
              <M_Text fontSize="$3" color="$color11">
                {connectionInfo.description}
              </M_Text>
            )}
          </YStack>

          {/* アクションボタン */}
          <XStack space="$2">
            {/* セカンダリアクション */}
            {connectionStatus === "connected" && showAdvancedControls && (
              <IconButton
                size="small"
                variant="outline"
                icon={RotateCcw}
                onPress={onReconnect}
                disabled={process?.isConnecting}
                accessibilityLabel="再接続"
              >
                {compactMode ? undefined : "再接続"}
              </IconButton>
            )}

            {connectionStatus === "disconnected" && deviceInfo && (
              <IconButton
                size="small"
                variant="outline"
                icon={Wifi}
                onPress={() => onConnect?.(deviceInfo.id)}
                disabled={!canConnect || process?.isConnecting}
                accessibilityLabel="前回のデバイスに接続"
              >
                {compactMode ? undefined : "再接続"}
              </IconButton>
            )}

            {/* プライマリアクション */}
            <IconButton
              size={compactMode ? "small" : "medium"}
              variant={
                connectionInfo.variant === "success"
                  ? "outline"
                  : connectionInfo.variant === "error"
                  ? "danger"
                  : connectionInfo.variant === "warning"
                  ? "warning"
                  : "solid"
              }
              icon={
                connectionInfo.primaryAction === "scan"
                  ? Search
                  : connectionInfo.primaryAction === "stopScan"
                  ? XCircle
                  : connectionInfo.primaryAction === "connect"
                  ? Wifi
                  : connectionInfo.primaryAction === "disconnect"
                  ? WifiOff
                  : connectionInfo.primaryAction === "openSettings"
                  ? Settings
                  : RotateCcw
              }
              onPress={handlePrimaryAction}
              disabled={
                (connectionInfo.primaryAction === "scan" && !canScan) ||
                (connectionInfo.primaryAction === "connect" && !canConnect) ||
                (connectionInfo.primaryAction === "disconnect" &&
                  !canDisconnect) ||
                !!(
                  process?.isScanning ||
                  process?.isConnecting ||
                  process?.isDisconnecting
                )
              }
              accessibilityLabel={connectionInfo.primaryLabel}
            >
              {compactMode ? undefined : connectionInfo.primaryLabel}
            </IconButton>
          </XStack>
        </ActionArea>
      </StyledConnectionPanel>
    );
  }
);

ConnectionPanel.displayName = "ConnectionPanel";

// プリセットコンポーネント
export const CompactConnectionPanel = React.forwardRef<
  any,
  Omit<ConnectionPanelProps, "variant" | "compactMode">
>((props, ref) => (
  <ConnectionPanel
    ref={ref}
    variant="compact"
    compactMode={true}
    showHeader={false}
    showAdvancedControls={false}
    {...props}
  />
));

export const CardConnectionPanel = React.forwardRef<
  any,
  Omit<ConnectionPanelProps, "variant">
>((props, ref) => <ConnectionPanel ref={ref} variant="card" {...props} />);

export const EmbeddedConnectionPanel = React.forwardRef<
  any,
  Omit<ConnectionPanelProps, "variant">
>((props, ref) => (
  <ConnectionPanel ref={ref} variant="embedded" showHeader={false} {...props} />
));

export const AdvancedConnectionPanel = React.forwardRef<
  any,
  Omit<ConnectionPanelProps, "showAdvancedControls">
>((props, ref) => (
  <ConnectionPanel
    ref={ref}
    showAdvancedControls={true}
    showProgress={true}
    {...props}
  />
));

CompactConnectionPanel.displayName = "CompactConnectionPanel";
CardConnectionPanel.displayName = "CardConnectionPanel";
EmbeddedConnectionPanel.displayName = "EmbeddedConnectionPanel";
AdvancedConnectionPanel.displayName = "AdvancedConnectionPanel";
