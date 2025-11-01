import React from "react";
import type { YStackProps } from "tamagui";
import { H2, styled, XStack, YStack } from "tamagui";
import { M_Text } from "../atoms/M_Text";
import {
  ConnectionVisualization,
  type BLEConnectionStatus,
  type DeviceInfo,
} from "../molecules/ConnectionVisualization";
import { StatusCard, type AppState } from "../molecules/StatusCard";

// ベースとなるStatusDashboardスタイル
const StyledDashboard = styled(YStack, {
  name: "StatusDashboard",
  padding: "$4",
  space: "$4",

  variants: {
    layout: {
      default: {
        // デフォルトレイアウト
      },
      compact: {
        padding: "$3",
        space: "$3",
      },
      grid: {
        // グリッドレイアウト用
        flexDirection: "column",
      },
    },

    variant: {
      default: {
        backgroundColor: "$background",
      },
      elevated: {
        backgroundColor: "$backgroundStrong",
        borderRadius: "$6",
        shadowColor: "$shadowColor",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      },
      transparent: {
        backgroundColor: "transparent",
      },
    },
  } as const,

  defaultVariants: {
    layout: "default",
    variant: "default",
  },
});

// ダッシュボードセクション
const DashboardSection = styled(YStack, {
  name: "DashboardSection",
  space: "$3",

  variants: {
    spacing: {
      tight: { space: "$2" },
      normal: { space: "$3" },
      loose: { space: "$4" },
    },
  } as const,

  defaultVariants: {
    spacing: "normal",
  },
});

// ダッシュボードヘッダー
const DashboardHeader = styled(XStack, {
  name: "DashboardHeader",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "$3",
  borderBottomWidth: 1,
  borderBottomColor: "$borderColor",
  marginBottom: "$2",
});

// ダッシュボードの状態データ
export type DashboardState = {
  appState: AppState;
  appStateTimestamp?: Date;
  bleConnectionStatus: BLEConnectionStatus;
  deviceInfo?: DeviceInfo;
  lastUpdated?: Date;
  isOnline?: boolean;
  hasUnreadLogs?: boolean;
};

// StatusDashboard プロパティ
export type StatusDashboardProps = YStackProps & {
  layout?: "default" | "compact" | "grid";
  variant?: "default" | "elevated" | "transparent";

  // データ
  dashboardState: DashboardState;

  // 表示オプション
  showHeader?: boolean;
  showTimestamps?: boolean;
  title?: string;
  subtitle?: string;

  // レイアウトオプション
  stackCards?: boolean; // カードを縦並びにするか
  showConnectionDetails?: boolean;
  compactMode?: boolean;

  // インタラクション
  onAppStatePress?: (state: AppState) => void;
  onConnectionPress?: () => void;
  onRefresh?: () => void;

  // BLE操作
  onReconnect?: () => void;
  onDisconnect?: () => void;
  onCopyDeviceId?: (deviceId: string) => void;
  isReconnecting?: boolean;

  accessibilityLabel?: string;
};

// 状態に基づく推奨アクションを取得
const getRecommendedAction = (
  appState: AppState,
  bleStatus: BLEConnectionStatus
): string | null => {
  if (bleStatus === "disabled") {
    return "Bluetoothを有効にしてください";
  }

  if (bleStatus === "error") {
    return "BLE接続を再試行してください";
  }

  if (appState === "INSIDE_AREA" && bleStatus === "disconnected") {
    return "BLEスキャンを開始して在室登録を行ってください";
  }

  if (appState === "PRESENT" && bleStatus === "disconnected") {
    return "在室状態を維持するためBLE接続を確認してください";
  }

  if (appState === "UNCONFIRMED") {
    return "位置情報とBLE接続を確認してください";
  }

  return null;
};

// アプリ状態とBLE状態の組み合わせから全体的な状態を判定
const getOverallStatus = (
  appState: AppState,
  bleStatus: BLEConnectionStatus
): "good" | "warning" | "error" => {
  if (bleStatus === "error" || appState === "UNCONFIRMED") {
    return "error";
  }

  if (
    bleStatus === "disabled" ||
    (appState === "INSIDE_AREA" && bleStatus === "disconnected") ||
    (appState === "PRESENT" && bleStatus === "disconnected")
  ) {
    return "warning";
  }

  return "good";
};

export const StatusDashboard = React.forwardRef<any, StatusDashboardProps>(
  (props, ref) => {
    const {
      layout = "default",
      variant = "default",
      dashboardState,
      showHeader = true,
      showTimestamps = true,
      title = "出席管理システム",
      subtitle,
      stackCards = false,
      showConnectionDetails = true,
      compactMode = false,
      onAppStatePress,
      onConnectionPress,
      onRefresh,
      onReconnect,
      onDisconnect,
      onCopyDeviceId,
      isReconnecting = false,
      accessibilityLabel,
      ...restProps
    } = props;

    const {
      appState,
      appStateTimestamp,
      bleConnectionStatus,
      deviceInfo,
      lastUpdated,
      isOnline = true,
      hasUnreadLogs = false,
    } = dashboardState;

    const recommendedAction = getRecommendedAction(
      appState,
      bleConnectionStatus
    );
    const overallStatus = getOverallStatus(appState, bleConnectionStatus);

    // 最終更新時刻のフォーマット
    const formatLastUpdated = (date: Date): string => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);

      if (diff < 60000) return "たった今更新";
      if (minutes < 60) return `${minutes}分前に更新`;
      return new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    };

    // アプリ状態カードを押した時の処理
    const handleAppStatePress = React.useCallback(() => {
      onAppStatePress?.(appState);
    }, [onAppStatePress, appState]);

    // BLE接続カードを押した時の処理
    const handleConnectionPress = React.useCallback(() => {
      onConnectionPress?.();
    }, [onConnectionPress]);

    // テーマ切り替え UI は廃止

    // アクセシビリティプロパティ
    const accessibilityProps = {
      accessibilityLabel:
        accessibilityLabel ||
        `ダッシュボード: アプリ状態 ${appState}, BLE ${bleConnectionStatus}`,
      accessible: true,
    };

    return (
      <StyledDashboard
        ref={ref}
        layout={layout}
        variant={variant}
        animation="quick"
        {...accessibilityProps}
        {...restProps}
      >
        {/* ヘッダー */}
        {showHeader && (
          <DashboardHeader>
            <YStack flex={1}>
              <H2 fontSize="$6" fontWeight="700" color="$color">
                {title}
              </H2>
              {subtitle && (
                <M_Text fontSize="$3" color="$color11" opacity={0.8}>
                  {subtitle}
                </M_Text>
              )}
            </YStack>

            <XStack alignItems="center" space="$3">
              {/* オンライン状態インジケーター */}
              {!isOnline && (
                <M_Text fontSize="$2" color="$red9">
                  オフライン
                </M_Text>
              )}

              {/* 未読ログ通知 */}
              {hasUnreadLogs && (
                <M_Text fontSize="$2" color="$orange9">
                  新しいログ
                </M_Text>
              )}

              {/* テーマ切り替えボタンは削除 */}
            </XStack>
          </DashboardHeader>
        )}

        {/* メインコンテンツエリア */}
        <DashboardSection spacing={compactMode ? "tight" : "normal"}>
          {/* 状態カードエリア */}
          {stackCards ? (
            // 縦並びレイアウト
            <YStack space="$3">
              <StatusCard
                status={appState}
                variant={compactMode ? "default" : "elevated"}
                size={compactMode ? "small" : "medium"}
                showTimestamp={showTimestamps}
                timestamp={appStateTimestamp}
                onPress={onAppStatePress ? handleAppStatePress : undefined}
                isInteractive={!!onAppStatePress}
              />

              {showConnectionDetails && (
                <ConnectionVisualization
                  status={bleConnectionStatus}
                  deviceInfo={deviceInfo}
                  variant={compactMode ? "compact" : "default"}
                  showSignalStrength={!compactMode}
                  showDeviceInfo={!compactMode}
                  showConnectionTime={showTimestamps && !compactMode}
                  onReconnect={onReconnect}
                  onDisconnect={onDisconnect}
                  onCopyDeviceId={onCopyDeviceId}
                  isReconnecting={isReconnecting}
                  onPress={
                    onConnectionPress ? handleConnectionPress : undefined
                  }
                />
              )}
            </YStack>
          ) : (
            // 横並びレイアウト（デフォルト）
            <XStack space="$3" flexWrap="wrap">
              <YStack flex={1} minWidth={280}>
                <StatusCard
                  status={appState}
                  variant={compactMode ? "default" : "elevated"}
                  size={compactMode ? "small" : "medium"}
                  showTimestamp={showTimestamps}
                  timestamp={appStateTimestamp}
                  onPress={onAppStatePress ? handleAppStatePress : undefined}
                  isInteractive={!!onAppStatePress}
                />
              </YStack>

              {showConnectionDetails && (
                <YStack flex={1} minWidth={280}>
                  <ConnectionVisualization
                    status={bleConnectionStatus}
                    deviceInfo={deviceInfo}
                    variant={compactMode ? "compact" : "default"}
                    showSignalStrength={!compactMode}
                    showDeviceInfo={!compactMode}
                    showConnectionTime={showTimestamps && !compactMode}
                    onReconnect={onReconnect}
                    onDisconnect={onDisconnect}
                    onCopyDeviceId={onCopyDeviceId}
                    isReconnecting={isReconnecting}
                  />
                </YStack>
              )}
            </XStack>
          )}

          {/* 推奨アクション */}
          {recommendedAction && !compactMode && (
            <YStack
              padding="$3"
              backgroundColor={
                overallStatus === "error"
                  ? "$red2"
                  : overallStatus === "warning"
                  ? "$orange2"
                  : "$blue2"
              }
              borderRadius="$4"
              borderWidth={1}
              borderColor={
                overallStatus === "error"
                  ? "$red6"
                  : overallStatus === "warning"
                  ? "$orange6"
                  : "$blue6"
              }
            >
              <M_Text
                fontSize="$3"
                fontWeight="500"
                color={
                  overallStatus === "error"
                    ? "$red11"
                    : overallStatus === "warning"
                    ? "$orange11"
                    : "$blue11"
                }
              >
                💡 {recommendedAction}
              </M_Text>
            </YStack>
          )}

          {/* フッター情報 */}
          {lastUpdated && showTimestamps && !compactMode && (
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingTop="$2"
              opacity={0.7}
            >
              <M_Text fontSize="$2" color="$color11">
                {formatLastUpdated(lastUpdated)}
              </M_Text>

              {onRefresh && (
                <M_Text
                  fontSize="$2"
                  color="$blue9"
                  onPress={onRefresh}
                  cursor="pointer"
                >
                  更新
                </M_Text>
              )}
            </XStack>
          )}
        </DashboardSection>
      </StyledDashboard>
    );
  }
);

StatusDashboard.displayName = "StatusDashboard";

// プリセットコンポーネント
export const CompactStatusDashboard = React.forwardRef<
  any,
  Omit<StatusDashboardProps, "layout" | "compactMode">
>((props, ref) => (
  <StatusDashboard
    ref={ref}
    layout="compact"
    compactMode={true}
    stackCards={true}
    showConnectionDetails={true}
    showHeader={false}
    showTimestamps={false}
    {...props}
  />
));

export const ElevatedStatusDashboard = React.forwardRef<
  any,
  Omit<StatusDashboardProps, "variant">
>((props, ref) => <StatusDashboard ref={ref} variant="elevated" {...props} />);

export const GridStatusDashboard = React.forwardRef<
  any,
  Omit<StatusDashboardProps, "layout" | "stackCards">
>((props, ref) => (
  <StatusDashboard ref={ref} layout="grid" stackCards={true} {...props} />
));

export const MinimalStatusDashboard = React.forwardRef<
  any,
  Omit<StatusDashboardProps, "variant" | "showHeader">
>((props, ref) => (
  <StatusDashboard
    ref={ref}
    variant="transparent"
    showHeader={false}
    compactMode={true}
    {...props}
  />
));

CompactStatusDashboard.displayName = "CompactStatusDashboard";
ElevatedStatusDashboard.displayName = "ElevatedStatusDashboard";
GridStatusDashboard.displayName = "GridStatusDashboard";
MinimalStatusDashboard.displayName = "MinimalStatusDashboard";
