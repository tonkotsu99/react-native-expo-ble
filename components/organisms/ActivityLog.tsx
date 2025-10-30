import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  RefreshCw,
  Trash2,
} from "@tamagui/lucide-icons";
import React from "react";
import { ScrollView } from "react-native";
import type { YStackProps } from "tamagui";
import { H3, styled, XStack, YStack } from "tamagui";
import { IconButton } from "../atoms/IconButton";
import { M_Text } from "../atoms/M_Text";
import {
  LogEntry,
  LogEntryList,
  type LogEntryData,
} from "../molecules/LogEntry";

// ベースとなるActivityLogスタイル
const StyledActivityLog = styled(YStack, {
  name: "ActivityLog",

  variants: {
    variant: {
      default: {
        backgroundColor: "$background",
        borderRadius: "$6",
        borderWidth: 1,
        borderColor: "$borderColor",
      },
      card: {
        backgroundColor: "$backgroundStrong",
        borderRadius: "$6",
        borderWidth: 1,
        borderColor: "$borderColor",
        shadowColor: "$shadowColor",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      },
      panel: {
        backgroundColor: "$background",
        borderTopWidth: 1,
        borderTopColor: "$borderColor",
      },
      embedded: {
        backgroundColor: "transparent",
      },
    },

    size: {
      compact: {
        maxHeight: 300,
      },
      medium: {
        maxHeight: 500,
      },
      large: {
        maxHeight: 700,
      },
      full: {
        // 高さ制限なし
      },
    },
  } as const,

  defaultVariants: {
    variant: "default",
    size: "medium",
  },
});

// ログヘッダー
const LogHeader = styled(XStack, {
  name: "LogHeader",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "$4",
  borderBottomWidth: 1,
  borderBottomColor: "$borderColor",
});

// ログコンテンツエリア
const LogContent = styled(YStack, {
  name: "LogContent",
  flex: 1,
  padding: "$2",
});

// フィルターオプション
export type LogFilter = {
  severity?: ("info" | "success" | "warning" | "error")[];
  eventType?: (
    | "ble_connected"
    | "ble_disconnected"
    | "location_entered"
    | "location_exited"
    | "attendance_posted"
    | "state_changed"
    | "user_action"
  )[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
};

// ソートオプション
export type LogSortOption = "newest" | "oldest" | "severity" | "type";

// ActivityLog プロパティ
export type ActivityLogProps = YStackProps & {
  variant?: "default" | "card" | "panel" | "embedded";
  size?: "compact" | "medium" | "large" | "full";

  // データ
  logs: LogEntryData[];
  isLoading?: boolean;
  hasMore?: boolean;

  // 表示オプション
  title?: string;
  showHeader?: boolean;
  showControls?: boolean;
  maxEntries?: number;
  entryVariant?: "default" | "compact" | "detailed";

  // フィルターとソート
  filter?: LogFilter;
  sortBy?: LogSortOption;
  showFilterControls?: boolean;

  // インタラクション
  onLogPress?: (log: LogEntryData) => void;
  onLogDetails?: (log: LogEntryData) => void;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onClearAll?: () => void;
  onExport?: () => void;
  onFilterChange?: (filter: LogFilter) => void;
  onSortChange?: (sort: LogSortOption) => void;

  // 状態
  isRefreshing?: boolean;
  canClear?: boolean;
  canExport?: boolean;

  accessibilityLabel?: string;
};

// ログエントリーをフィルタリング
const filterLogs = (
  logs: LogEntryData[],
  filter?: LogFilter
): LogEntryData[] => {
  if (!filter) return logs;

  return logs.filter((log) => {
    // 重要度フィルター
    if (filter.severity && filter.severity.length > 0) {
      if (!filter.severity.includes(log.severity)) return false;
    }

    // イベントタイプフィルター
    if (filter.eventType && filter.eventType.length > 0) {
      if (!filter.eventType.includes(log.eventType as any)) return false;
    }

    // 時間範囲フィルター
    if (filter.timeRange) {
      const logTime = log.timestamp.getTime();
      const startTime = filter.timeRange.start.getTime();
      const endTime = filter.timeRange.end.getTime();
      if (logTime < startTime || logTime > endTime) return false;
    }

    // テキスト検索
    if (filter.searchText && filter.searchText.trim()) {
      const searchLower = filter.searchText.toLowerCase();
      const titleMatch = log.title.toLowerCase().includes(searchLower);
      const descMatch = log.description?.toLowerCase().includes(searchLower);
      if (!titleMatch && !descMatch) return false;
    }

    return true;
  });
};

// ログエントリーをソート
const sortLogs = (
  logs: LogEntryData[],
  sortBy: LogSortOption
): LogEntryData[] => {
  const sorted = [...logs];

  switch (sortBy) {
    case "newest":
      return sorted.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
    case "oldest":
      return sorted.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
    case "severity":
      const severityOrder = { error: 0, warning: 1, success: 2, info: 3 };
      return sorted.sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      );
    case "type":
      return sorted.sort((a, b) => a.eventType.localeCompare(b.eventType));
    default:
      return sorted;
  }
};

export const ActivityLog = React.forwardRef<any, ActivityLogProps>(
  (props, ref) => {
    const {
      variant = "default",
      size = "medium",
      logs,
      isLoading = false,
      hasMore = false,
      title = "アクティビティログ",
      showHeader = true,
      showControls = true,
      maxEntries = 50,
      entryVariant = "default",
      filter,
      sortBy = "newest",
      showFilterControls = false,
      onLogPress,
      onLogDetails,
      onRefresh,
      onLoadMore,
      onClearAll,
      onExport,
      onFilterChange,
      onSortChange,
      isRefreshing = false,
      canClear = true,
      canExport = true,
      accessibilityLabel,
      ...restProps
    } = props;

    // フィルター表示状態
    const [showFilters, setShowFilters] = React.useState(false);

    // ログを処理（フィルター、ソート、制限）
    const processedLogs = React.useMemo(() => {
      let filtered = filterLogs(logs, filter);
      let sorted = sortLogs(filtered, sortBy);

      if (maxEntries > 0) {
        sorted = sorted.slice(0, maxEntries);
      }

      return sorted;
    }, [logs, filter, sortBy, maxEntries]);

    // 統計情報
    const stats = React.useMemo(() => {
      const total = logs.length;
      const errors = logs.filter((log) => log.severity === "error").length;
      const warnings = logs.filter((log) => log.severity === "warning").length;
      const filtered = processedLogs.length;

      return { total, errors, warnings, filtered };
    }, [logs, processedLogs]);

    // 更新処理
    const handleRefresh = React.useCallback(() => {
      onRefresh?.();
    }, [onRefresh]);

    // クリア処理
    const handleClearAll = React.useCallback(() => {
      onClearAll?.();
    }, [onClearAll]);

    // エクスポート処理
    const handleExport = React.useCallback(() => {
      onExport?.();
    }, [onExport]);

    // フィルター切り替え
    const toggleFilters = React.useCallback(() => {
      setShowFilters((prev) => !prev);
    }, []);

    // ログエントリー押下処理
    const handleLogPress = React.useCallback(
      (log: LogEntryData) => {
        onLogPress?.(log);
      },
      [onLogPress]
    );

    // ログ詳細表示処理
    const handleLogDetails = React.useCallback(
      (log: LogEntryData) => {
        onLogDetails?.(log);
      },
      [onLogDetails]
    );

    // スクロール終了時の処理（追加読み込み）
    const handleLoadMore = React.useCallback(() => {
      if (hasMore && !isLoading) {
        onLoadMore?.();
      }
    }, [hasMore, isLoading, onLoadMore]);

    // アクセシビリティプロパティ
    const accessibilityProps = {
      accessibilityLabel:
        accessibilityLabel ||
        `アクティビティログ: ${stats.filtered}件のエントリー`,
      accessible: true,
    };

    return (
      <StyledActivityLog
        ref={ref}
        variant={variant}
        size={size}
        {...accessibilityProps}
        {...restProps}
      >
        {/* ヘッダー */}
        {showHeader && (
          <LogHeader>
            <YStack flex={1}>
              <H3 fontSize="$5" fontWeight="600" color="$color">
                {title}
              </H3>
              <XStack alignItems="center" space="$2">
                <M_Text fontSize="$2" color="$color11">
                  {stats.filtered} / {stats.total} エントリー
                </M_Text>
                {stats.errors > 0 && (
                  <XStack alignItems="center" space="$1">
                    <AlertCircle size={12} color="$red9" />
                    <M_Text fontSize="$2" color="$red9">
                      {stats.errors}
                    </M_Text>
                  </XStack>
                )}
                {stats.warnings > 0 && (
                  <XStack alignItems="center" space="$1">
                    <Clock size={12} color="$orange9" />
                    <M_Text fontSize="$2" color="$orange9">
                      {stats.warnings}
                    </M_Text>
                  </XStack>
                )}
              </XStack>
            </YStack>

            {/* コントロールボタン */}
            {showControls && (
              <XStack alignItems="center" space="$2">
                {showFilterControls && (
                  <IconButton
                    size="small"
                    variant="ghost"
                    icon={showFilters ? ChevronUp : ChevronDown}
                    onPress={toggleFilters}
                    accessibilityLabel="フィルターを切り替え"
                  />
                )}

                <IconButton
                  size="small"
                  variant="ghost"
                  icon={RefreshCw}
                  onPress={handleRefresh}
                  disabled={isRefreshing}
                  accessibilityLabel="ログを更新"
                />

                {canExport && (
                  <IconButton
                    size="small"
                    variant="ghost"
                    icon={Download}
                    onPress={handleExport}
                    accessibilityLabel="ログをエクスポート"
                  />
                )}

                {canClear && (
                  <IconButton
                    size="small"
                    variant="ghost"
                    icon={Trash2}
                    onPress={handleClearAll}
                    accessibilityLabel="ログをクリア"
                  />
                )}
              </XStack>
            )}
          </LogHeader>
        )}

        {/* フィルターコントロール */}
        {showFilters && showFilterControls && (
          <YStack
            padding="$3"
            borderBottomWidth={1}
            borderBottomColor="$borderColor"
          >
            <M_Text fontSize="$3" color="$color11">
              フィルター機能は実装予定です
            </M_Text>
          </YStack>
        )}

        {/* ログエントリーリスト */}
        <LogContent>
          {isLoading && processedLogs.length === 0 ? (
            <YStack alignItems="center" justifyContent="center" padding="$6">
              <M_Text fontSize="$3" color="$color11">
                ログを読み込み中...
              </M_Text>
            </YStack>
          ) : processedLogs.length === 0 ? (
            <YStack alignItems="center" justifyContent="center" padding="$6">
              <M_Text fontSize="$3" color="$color11" textAlign="center">
                表示するログエントリーがありません
              </M_Text>
            </YStack>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={true}
              onMomentumScrollEnd={handleLoadMore}
            >
              <LogEntryList>
                {processedLogs.map((log) => (
                  <LogEntry
                    key={log.id}
                    logData={log}
                    variant={entryVariant}
                    onPress={onLogPress ? () => handleLogPress(log) : undefined}
                    onShowDetails={
                      onLogDetails ? () => handleLogDetails(log) : undefined
                    }
                  />
                ))}

                {/* 追加読み込みインジケーター */}
                {hasMore && (
                  <YStack alignItems="center" padding="$3">
                    <M_Text fontSize="$2" color="$color11">
                      {isLoading
                        ? "読み込み中..."
                        : "スクロールして続きを読み込み"}
                    </M_Text>
                  </YStack>
                )}
              </LogEntryList>
            </ScrollView>
          )}
        </LogContent>
      </StyledActivityLog>
    );
  }
);

ActivityLog.displayName = "ActivityLog";

// プリセットコンポーネント
export const CompactActivityLog = React.forwardRef<
  any,
  Omit<ActivityLogProps, "variant" | "size" | "entryVariant">
>((props, ref) => (
  <ActivityLog
    ref={ref}
    variant="embedded"
    size="compact"
    entryVariant="compact"
    showControls={false}
    maxEntries={20}
    {...props}
  />
));

export const CardActivityLog = React.forwardRef<
  any,
  Omit<ActivityLogProps, "variant">
>((props, ref) => <ActivityLog ref={ref} variant="card" {...props} />);

export const PanelActivityLog = React.forwardRef<
  any,
  Omit<ActivityLogProps, "variant">
>((props, ref) => (
  <ActivityLog
    ref={ref}
    variant="panel"
    size="full"
    showFilterControls={true}
    {...props}
  />
));

export const DetailedActivityLog = React.forwardRef<
  any,
  Omit<ActivityLogProps, "entryVariant" | "size">
>((props, ref) => (
  <ActivityLog
    ref={ref}
    entryVariant="detailed"
    size="large"
    showFilterControls={true}
    {...props}
  />
));

CompactActivityLog.displayName = "CompactActivityLog";
CardActivityLog.displayName = "CardActivityLog";
PanelActivityLog.displayName = "PanelActivityLog";
DetailedActivityLog.displayName = "DetailedActivityLog";
