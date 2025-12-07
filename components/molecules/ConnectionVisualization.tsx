import type { BLEStateIconType } from "@/constants/icons";
import { AlertTriangle, Copy, Wifi, WifiOff } from "@tamagui/lucide-icons";
import React from "react";
import type { CardProps } from "tamagui";
import { Card, Circle, H4, styled, XStack, YStack } from "tamagui";
import { AnimatedSpinner } from "../atoms/AnimatedSpinner";
import { IconButton } from "../atoms/IconButton";
import { M_Text } from "../atoms/M_Text";
import { BLEStatusIcon } from "../atoms/StatusIcon";

// ベースとなるConnectionVisualizationスタイル
const StyledConnectionCard = styled(Card, {
  name: "ConnectionVisualization",
  padding: "$4",
  marginVertical: "$2",
  marginHorizontal: 0,
  borderRadius: "$6",
  borderWidth: 1,
  width: "100%",

  variants: {
    status: {
      connected: {
        backgroundColor: "$green2",
        borderColor: "$green6",
      },
      disconnected: {
        backgroundColor: "$gray2",
        borderColor: "$gray6",
      },
      scanning: {
        backgroundColor: "$blue2",
        borderColor: "$blue6",
      },
      disabled: {
        backgroundColor: "$red2",
        borderColor: "$red6",
      },
      error: {
        backgroundColor: "$orange2",
        borderColor: "$orange6",
      },
    },

    variant: {
      default: {
        // デフォルトスタイル
      },
      compact: {
        padding: "$3",
        marginVertical: "$1",
        marginHorizontal: 0,
      },
      detailed: {
        padding: "$5",
        marginVertical: "$3",
        marginHorizontal: 0,
      },
    },
  } as const,

  defaultVariants: {
    status: "disconnected",
    variant: "default",
  },
});

// 信号強度インジケーター
const SignalStrengthIndicator = styled(YStack, {
  name: "SignalStrengthIndicator",
  flexDirection: "row",
  alignItems: "flex-end",
  space: "$1",
});

// 信号バー
const SignalBar = styled(Circle, {
  name: "SignalBar",

  variants: {
    level: {
      1: { width: 4, height: 8 },
      2: { width: 4, height: 12 },
      3: { width: 4, height: 16 },
      4: { width: 4, height: 20 },
    },

    active: {
      true: { backgroundColor: "$green9" },
      false: { backgroundColor: "$gray6" },
    },
  } as const,
});

// BLE接続状態タイプ
export type BLEConnectionStatus =
  | "connected"
  | "disconnected"
  | "scanning"
  | "disabled"
  | "error";

// デバイス情報タイプ
export type DeviceInfo = {
  id: string;
  name?: string;
  rssi?: number; // 信号強度 (dBm)
  lastSeen?: Date;
  connectionTime?: Date;
  isStable?: boolean;
};

// 接続状態メッセージマッピング
const getConnectionMessage = (
  status: BLEConnectionStatus
): { title: string; description: string } => {
  const messages = {
    connected: {
      title: "ビーコン検出中",
      description: "研究室ビーコンの信号を受信しています",
    },
    disconnected: {
      title: "ビーコン未検出",
      description: "近くでビーコン信号が見つかっていません",
    },
    scanning: {
      title: "スキャン中",
      description: "ビーコン信号を探索しています",
    },
    disabled: {
      title: "Bluetooth無効",
      description: "Bluetoothが無効になっています",
    },
    error: {
      title: "接続エラー",
      description: "接続中にエラーが発生しました",
    },
  };

  return messages[status];
};

// 信号強度をレベルに変換（1-4）
const getRSSILevel = (rssi?: number): number => {
  if (!rssi) return 0;
  if (rssi >= -50) return 4; // 非常に強い
  if (rssi >= -60) return 3; // 強い
  if (rssi >= -70) return 2; // 中程度
  if (rssi >= -80) return 1; // 弱い
  return 0; // 非常に弱い
};

// 旧: RSSI値の説明文は未使用のため削除しました

// ConnectionVisualization プロパティ
export type ConnectionVisualizationProps = CardProps & {
  status: BLEConnectionStatus;
  deviceInfo?: DeviceInfo;
  variant?: "default" | "compact" | "detailed";
  showSignalStrength?: boolean;
  showDeviceInfo?: boolean;
  showConnectionTime?: boolean;
  onCopyDeviceId?: (deviceId: string) => void;
  onReconnect?: () => void;
  onDisconnect?: () => void;
  isReconnecting?: boolean;
  accessibilityLabel?: string;
};

export const ConnectionVisualization = React.forwardRef<
  any,
  ConnectionVisualizationProps
>((props, ref) => {
  const {
    status,
    deviceInfo,
    variant = "default",
    showSignalStrength = true,
    showDeviceInfo = true,
    showConnectionTime = true,
    onCopyDeviceId,
    onReconnect,
    onDisconnect,
    isReconnecting = false,
    accessibilityLabel,
    ...restProps
  } = props;

  const connectionMessage = getConnectionMessage(status);
  const signalLevel = getRSSILevel(deviceInfo?.rssi);
  // const rssiDescription = getRSSIDescription(deviceInfo?.rssi); // currently unused

  // BLEアイコンキーマッピング
  const getBLEIconKey = (status: BLEConnectionStatus): BLEStateIconType => {
    const iconMap: Record<BLEConnectionStatus, BLEStateIconType> = {
      connected: "connected",
      disconnected: "disconnected",
      scanning: "scanning",
      disabled: "disabled",
      error: "error",
    };
    return iconMap[status];
  };

  // 時刻フォーマット
  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  // デバイスIDをクリップボードにコピー
  const handleCopyDeviceId = React.useCallback(() => {
    if (deviceInfo?.id && onCopyDeviceId) {
      onCopyDeviceId(deviceInfo.id);
    }
  }, [deviceInfo?.id, onCopyDeviceId]);

  // アクセシビリティプロパティ
  const accessibilityProps = {
    accessibilityLabel:
      accessibilityLabel || `BLE接続状態: ${connectionMessage.title}`,
    accessibilityRole: "text" as const,
    accessible: true,
  };

  return (
    <StyledConnectionCard
      ref={ref}
      status={status}
      variant={variant}
      animation="quick"
      {...accessibilityProps}
      {...restProps}
    >
      <YStack space="$3">
        {/* ヘッダー部分 */}
        <XStack alignItems="center" justifyContent="space-between">
          <XStack alignItems="center" space="$3">
            {/* 状態アイコンまたはスピナー */}
            {status === "scanning" || isReconnecting ? (
              <AnimatedSpinner
                size="medium"
                iconType="refresh"
                animationStyle="continuous"
                color="$blue9"
              />
            ) : (
              <BLEStatusIcon
                iconKey={getBLEIconKey(status)}
                status={
                  status === "connected"
                    ? "active"
                    : status === "error"
                    ? "error"
                    : "inactive"
                }
                size="medium"
              />
            )}

            <YStack>
              <H4 fontSize="$5" color="$color" fontWeight="600">
                {connectionMessage.title}
              </H4>
              <M_Text fontSize="$3" color="$color11">
                {connectionMessage.description}
              </M_Text>
            </YStack>
          </XStack>

          {/* 信号強度インジケーター */}
          {showSignalStrength && status === "connected" && (
            <XStack alignItems="center" space="$2">
              <SignalStrengthIndicator>
                {[1, 2, 3, 4].map((level) => (
                  <SignalBar
                    key={level}
                    level={level as 1 | 2 | 3 | 4}
                    active={level <= signalLevel}
                  />
                ))}
              </SignalStrengthIndicator>
            </XStack>
          )}
        </XStack>

        {/* デバイス情報 */}
        {showDeviceInfo && deviceInfo && status === "connected" && (
          <YStack
            space="$2"
            padding="$3"
            backgroundColor="$background"
            borderRadius="$4"
          >
            <XStack alignItems="center" justifyContent="space-between">
              <M_Text fontSize="$3" fontWeight="500">
                デバイス名
              </M_Text>
              <M_Text fontSize="$3" color="$color11">
                {deviceInfo.name || "不明なデバイス"}
              </M_Text>
            </XStack>

            <XStack alignItems="center" justifyContent="space-between">
              <M_Text fontSize="$3" fontWeight="500">
                デバイスID
              </M_Text>
              <XStack alignItems="center" space="$2">
                <M_Text
                  fontSize="$3"
                  color="$color11"
                  numberOfLines={1}
                  maxWidth={120}
                >
                  {deviceInfo.id}
                </M_Text>
                {onCopyDeviceId && (
                  <IconButton
                    size="small"
                    variant="ghost"
                    icon={Copy}
                    onPress={handleCopyDeviceId}
                    accessibilityLabel="デバイスIDをコピー"
                  />
                )}
              </XStack>
            </XStack>

            {deviceInfo.rssi && (
              <XStack alignItems="center" justifyContent="space-between">
                <M_Text fontSize="$3" fontWeight="500">
                  信号強度
                </M_Text>
                <M_Text fontSize="$3" color="$color11">
                  {deviceInfo.rssi} dBm
                </M_Text>
              </XStack>
            )}

            {showConnectionTime && deviceInfo.connectionTime && (
              <XStack alignItems="center" justifyContent="space-between">
                <M_Text fontSize="$3" fontWeight="500">
                  接続時刻
                </M_Text>
                <M_Text fontSize="$3" color="$color11">
                  {formatTime(deviceInfo.connectionTime)}
                </M_Text>
              </XStack>
            )}

            {/* 接続安定性警告 */}
            {deviceInfo.isStable === false && (
              <XStack
                alignItems="center"
                space="$2"
                padding="$2"
                backgroundColor="$orange2"
                borderRadius="$3"
              >
                <AlertTriangle size={16} color="$orange9" />
                <M_Text fontSize="$2" color="$orange11">
                  接続が不安定です
                </M_Text>
              </XStack>
            )}
          </YStack>
        )}

        {/* アクションボタン */}
        {variant !== "compact" && (onReconnect || onDisconnect) && (
          <XStack space="$2" justifyContent="flex-end">
            {status === "connected" && onDisconnect && (
              <IconButton
                size="small"
                variant="outline"
                icon={WifiOff}
                onPress={onDisconnect}
                accessibilityLabel="検出をクリア"
              >
                クリア
              </IconButton>
            )}
            {(status === "disconnected" || status === "error") &&
              onReconnect && (
                <IconButton
                  size="small"
                  variant="solid"
                  icon={Wifi}
                  onPress={onReconnect}
                  disabled={isReconnecting}
                  accessibilityLabel="再検出"
                >
                  {isReconnecting ? "検出中..." : "再検出"}
                </IconButton>
              )}
          </XStack>
        )}
      </YStack>
    </StyledConnectionCard>
  );
});

ConnectionVisualization.displayName = "ConnectionVisualization";

// プリセットコンポーネント
export const CompactConnectionVisualization = React.forwardRef<
  any,
  Omit<ConnectionVisualizationProps, "variant">
>((props, ref) => (
  <ConnectionVisualization
    ref={ref}
    variant="compact"
    showDeviceInfo={false}
    showConnectionTime={false}
    {...props}
  />
));

export const DetailedConnectionVisualization = React.forwardRef<
  any,
  Omit<ConnectionVisualizationProps, "variant">
>((props, ref) => (
  <ConnectionVisualization
    ref={ref}
    variant="detailed"
    showSignalStrength={true}
    showDeviceInfo={true}
    showConnectionTime={true}
    {...props}
  />
));

CompactConnectionVisualization.displayName = "CompactConnectionVisualization";
DetailedConnectionVisualization.displayName = "DetailedConnectionVisualization";
