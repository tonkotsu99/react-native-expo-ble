import {
  Bluetooth,
  CheckCircle,
  ChevronRight,
  Clock,
  Info,
  MapPin,
  MoreHorizontal,
  User,
  XCircle,
} from "@tamagui/lucide-icons";
import React from "react";
import type { CardProps } from "tamagui";
import { Card, H5, XStack, YStack, styled } from "tamagui";
import { IconButton } from "../atoms/IconButton";
import { M_Text } from "../atoms/M_Text";
import { StatusIcon } from "../atoms/StatusIcon";

// ベースとなるLogEntryスタイル
const StyledLogEntry = styled(Card, {
  name: "LogEntry",
  padding: "$3",
  marginVertical: "$1",
  borderRadius: "$4",
  borderWidth: 1,
  borderColor: "$borderColor",
  backgroundColor: "$background",

  variants: {
    severity: {
      info: {
        borderLeftWidth: 4,
        borderLeftColor: "$blue6",
      },
      success: {
        borderLeftWidth: 4,
        borderLeftColor: "$green6",
      },
      warning: {
        borderLeftWidth: 4,
        borderLeftColor: "$orange6",
      },
      error: {
        borderLeftWidth: 4,
        borderLeftColor: "$red6",
      },
    },

    variant: {
      default: {
        // デフォルトスタイル
      },
      compact: {
        padding: "$2",
        marginVertical: 0,
      },
      detailed: {
        padding: "$4",
        marginVertical: "$2",
      },
    },

    isInteractive: {
      true: {
        hoverStyle: {
          backgroundColor: "$backgroundHover",
          scale: 1.02,
        },
        pressStyle: {
          backgroundColor: "$backgroundPress",
          scale: 0.98,
        },
      },
      false: {},
    },
  } as const,

  defaultVariants: {
    severity: "info",
    variant: "default",
    isInteractive: false,
  },
});

// ログエントリーの重要度
export type LogSeverity = "info" | "success" | "warning" | "error";

// ログエントリーのタイプ
export type LogEventType =
  | "ble_connected"
  | "ble_disconnected"
  | "ble_scan_started"
  | "ble_scan_completed"
  | "ble_error"
  | "location_entered"
  | "location_exited"
  | "location_update"
  | "location_error"
  | "attendance_posted"
  | "attendance_failed"
  | "state_changed"
  | "app_started"
  | "user_action"
  | "system_event";

// ログエントリーデータ
export type LogEntryData = {
  id: string;
  timestamp: Date;
  eventType: LogEventType;
  severity: LogSeverity;
  title: string;
  description?: string;
  details?: Record<string, any>;
  deviceId?: string;
  userId?: string;
  location?: string;
  duration?: number; // ミリ秒
  metadata?: Record<string, any>;
};

// イベントタイプからアイコンを取得
const getEventIcon = (eventType: LogEventType) => {
  const iconMap = {
    ble_connected: Bluetooth,
    ble_disconnected: Bluetooth,
    ble_scan_started: Bluetooth,
    ble_scan_completed: Bluetooth,
    ble_error: XCircle,
    location_entered: MapPin,
    location_exited: MapPin,
    location_update: MapPin,
    location_error: XCircle,
    attendance_posted: CheckCircle,
    attendance_failed: XCircle,
    state_changed: Info,
    app_started: Info,
    user_action: User,
    system_event: Info,
  };

  return iconMap[eventType] || Info;
};

// 重要度からステータスを取得
const getSeverityStatus = (
  severity: LogSeverity
): "active" | "inactive" | "warning" | "error" => {
  const statusMap = {
    info: "inactive" as const,
    success: "active" as const,
    warning: "warning" as const,
    error: "error" as const,
  };

  return statusMap[severity];
};

// LogEntry プロパティ
export type LogEntryProps = CardProps & {
  logData: LogEntryData;
  variant?: "default" | "compact" | "detailed";
  showTimestamp?: boolean;
  showDetails?: boolean;
  onPress?: (logData: LogEntryData) => void;
  onShowDetails?: (logData: LogEntryData) => void;
  isExpanded?: boolean;
  maxDescriptionLines?: number;
  accessibilityLabel?: string;
};

export const LogEntry = React.forwardRef<any, LogEntryProps>((props, ref) => {
  const {
    logData,
    variant = "default",
    showTimestamp = true,
    showDetails = false,
    onPress,
    onShowDetails,
    isExpanded = false,
    maxDescriptionLines = 2,
    accessibilityLabel,
    ...restProps
  } = props;

  const isInteractive = !!(onPress || onShowDetails);
  const IconComponent = getEventIcon(logData.eventType);
  const severityStatus = getSeverityStatus(logData.severity);

  // 相対時間フォーマット
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (diff < 60000) return "たった今";
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    return new Intl.DateTimeFormat("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // 詳細時間フォーマット
  const formatDetailedTime = (date: Date): string => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  // エントリーをタップした時の処理
  const handlePress = React.useCallback(() => {
    if (onPress) {
      onPress(logData);
    }
  }, [onPress, logData]);

  // 詳細表示ボタンをタップした時の処理
  const handleShowDetails = React.useCallback(() => {
    if (onShowDetails) {
      onShowDetails(logData);
    }
  }, [onShowDetails, logData]);

  // アクセシビリティプロパティ
  const accessibilityProps = {
    accessibilityLabel:
      accessibilityLabel ||
      `${logData.title}, ${formatRelativeTime(logData.timestamp)}`,
    accessibilityRole: isInteractive ? ("button" as const) : ("text" as const),
    accessibilityHint: isInteractive ? "タップして詳細を表示" : undefined,
    accessible: true,
  };

  return (
    <StyledLogEntry
      ref={ref}
      severity={logData.severity}
      variant={variant}
      isInteractive={isInteractive}
      onPress={isInteractive ? handlePress : undefined}
      animation="quick"
      {...accessibilityProps}
      {...restProps}
    >
      <XStack alignItems="flex-start" space="$3">
        {/* イベントアイコン */}
        <StatusIcon
          type="indicator"
          IconComponent={IconComponent}
          status={severityStatus}
          size={variant === "compact" ? "small" : "medium"}
        />

        {/* メイン内容 */}
        <YStack flex={1} space="$1">
          <XStack alignItems="center" justifyContent="space-between">
            <H5
              fontSize={variant === "compact" ? "$3" : "$4"}
              color="$color"
              fontWeight="600"
              numberOfLines={1}
              flexShrink={1}
            >
              {logData.title}
            </H5>

            {/* タイムスタンプ */}
            {showTimestamp && (
              <M_Text
                fontSize={variant === "compact" ? "$1" : "$2"}
                color="$color11"
                opacity={0.7}
                flexShrink={0}
                marginLeft="$2"
              >
                {variant === "detailed"
                  ? formatDetailedTime(logData.timestamp)
                  : formatRelativeTime(logData.timestamp)}
              </M_Text>
            )}
          </XStack>

          {/* 説明 */}
          {logData.description && variant !== "compact" && (
            <M_Text
              fontSize="$3"
              color="$color11"
              numberOfLines={isExpanded ? undefined : maxDescriptionLines}
            >
              {logData.description}
            </M_Text>
          )}

          {/* 詳細情報 */}
          {showDetails && logData.details && variant === "detailed" && (
            <YStack
              space="$1"
              padding="$2"
              backgroundColor="$background"
              borderRadius="$3"
              marginTop="$2"
            >
              {Object.entries(logData.details).map(([key, value]) => (
                <XStack
                  key={key}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <M_Text fontSize="$2" fontWeight="500" color="$color11">
                    {key}
                  </M_Text>
                  <M_Text fontSize="$2" color="$color11">
                    {String(value)}
                  </M_Text>
                </XStack>
              ))}

              {/* 期間表示 */}
              {logData.duration && (
                <XStack alignItems="center" justifyContent="space-between">
                  <M_Text fontSize="$2" fontWeight="500" color="$color11">
                    期間
                  </M_Text>
                  <M_Text fontSize="$2" color="$color11">
                    {logData.duration < 1000
                      ? `${logData.duration}ms`
                      : `${(logData.duration / 1000).toFixed(1)}s`}
                  </M_Text>
                </XStack>
              )}
            </YStack>
          )}

          {/* メタデータ表示 */}
          {variant === "detailed" &&
            logData.metadata &&
            Object.keys(logData.metadata).length > 0 && (
              <XStack alignItems="center" space="$2" marginTop="$1">
                <Clock size={12} color="$color11" />
                <M_Text fontSize="$1" color="$color11" opacity={0.8}>
                  {Object.keys(logData.metadata).length} 項目の追加情報
                </M_Text>
              </XStack>
            )}
        </YStack>

        {/* アクションボタン */}
        {(onShowDetails || isInteractive) && variant !== "compact" && (
          <XStack alignItems="center" space="$1">
            {onShowDetails && (
              <IconButton
                size="small"
                variant="ghost"
                icon={MoreHorizontal}
                onPress={handleShowDetails}
                accessibilityLabel="詳細を表示"
              />
            )}
            {isInteractive && <ChevronRight size={16} color="$color11" />}
          </XStack>
        )}
      </XStack>
    </StyledLogEntry>
  );
});

LogEntry.displayName = "LogEntry";

// プリセットコンポーネント
export const CompactLogEntry = React.forwardRef<
  any,
  Omit<LogEntryProps, "variant">
>((props, ref) => (
  <LogEntry
    ref={ref}
    variant="compact"
    showTimestamp={true}
    showDetails={false}
    {...props}
  />
));

export const DetailedLogEntry = React.forwardRef<
  any,
  Omit<LogEntryProps, "variant">
>((props, ref) => (
  <LogEntry
    ref={ref}
    variant="detailed"
    showTimestamp={true}
    showDetails={true}
    {...props}
  />
));

export const InteractiveLogEntry = React.forwardRef<any, LogEntryProps>(
  (props, ref) => <LogEntry ref={ref} variant="default" {...props} />
);

// ログエントリーコンテナ
export const LogEntryList = React.forwardRef<
  any,
  { children: React.ReactNode }
>((props, ref) => <YStack ref={ref} space="$1" {...props} />);

CompactLogEntry.displayName = "CompactLogEntry";
DetailedLogEntry.displayName = "DetailedLogEntry";
InteractiveLogEntry.displayName = "InteractiveLogEntry";
LogEntryList.displayName = "LogEntryList";
