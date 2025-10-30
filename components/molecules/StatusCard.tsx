import type { AppStateIconType } from "@/constants/icons";
import React from "react";
import type { CardProps } from "tamagui";
import { Card, H3, XStack, YStack, styled } from "tamagui";
import { M_Text } from "../atoms/M_Text";
import { AppStatusIcon } from "../atoms/StatusIcon";

// ベースとなるStatusCardスタイル
const StyledStatusCard = styled(Card, {
  name: "StatusCard",
  padding: "$4",
  margin: "$2",
  borderRadius: "$6",
  borderWidth: 1,

  variants: {
    status: {
      OUTSIDE: {
        backgroundColor: "$gray2",
        borderColor: "$gray6",
      },
      INSIDE_AREA: {
        backgroundColor: "$blue2",
        borderColor: "$blue6",
      },
      PRESENT: {
        backgroundColor: "$green2",
        borderColor: "$green6",
      },
      UNCONFIRMED: {
        backgroundColor: "$orange2",
        borderColor: "$orange6",
      },
    },

    variant: {
      default: {
        // デフォルトスタイル
      },
      elevated: {
        shadowColor: "$shadowColor",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
      minimal: {
        borderWidth: 0,
        backgroundColor: "transparent",
        padding: "$3",
      },
    },

    size: {
      small: {
        padding: "$3",
        margin: "$1",
      },
      medium: {
        padding: "$4",
        margin: "$2",
      },
      large: {
        padding: "$5",
        margin: "$3",
      },
    },
  } as const,

  defaultVariants: {
    status: "UNCONFIRMED",
    variant: "default",
    size: "medium",
  },

  // ホバーエフェクト
  hoverStyle: {
    scale: 1.02,
    borderColor: "$borderColorHover",
  },

  // プレスエフェクト
  pressStyle: {
    scale: 0.98,
  },
});

// アプリ状態タイプ
export type AppState = "OUTSIDE" | "INSIDE_AREA" | "PRESENT" | "UNCONFIRMED";

// 状態メッセージマッピング
const getStatusMessage = (
  status: AppState
): { title: string; description: string } => {
  const messages = {
    OUTSIDE: {
      title: "研究室エリア外",
      description: "キャンパス外にいるか、研究室エリアから離れています",
    },
    INSIDE_AREA: {
      title: "研究室エリア内",
      description: "研究室エリア内にいますが、まだ在室登録されていません",
    },
    PRESENT: {
      title: "在室中",
      description: "研究室に在室中として登録されています",
    },
    UNCONFIRMED: {
      title: "状態未確認",
      description: "現在の状態を確認中です",
    },
  };

  return messages[status];
};

// 状態アイコンマッピング
const getStatusIcon = (status: AppState): AppStateIconType => {
  const iconMap: Record<AppState, AppStateIconType> = {
    OUTSIDE: "OUTSIDE",
    INSIDE_AREA: "INSIDE_AREA",
    PRESENT: "PRESENT",
    UNCONFIRMED: "UNCONFIRMED",
  };

  return iconMap[status];
};

// 状態カラーマッピング
const getStatusColor = (
  status: AppState
): "active" | "inactive" | "warning" | "error" => {
  const colorMap: Record<
    AppState,
    "active" | "inactive" | "warning" | "error"
  > = {
    OUTSIDE: "inactive",
    INSIDE_AREA: "warning",
    PRESENT: "active",
    UNCONFIRMED: "error",
  };

  return colorMap[status];
};

// StatusCard プロパティ
export type StatusCardProps = CardProps & {
  status: AppState;
  variant?: "default" | "elevated" | "minimal";
  size?: "small" | "medium" | "large";
  showTimestamp?: boolean;
  timestamp?: Date;
  onPress?: () => void;
  isInteractive?: boolean;
  customTitle?: string;
  customDescription?: string;
  accessibilityLabel?: string;
};

export const StatusCard = React.forwardRef<any, StatusCardProps>(
  (props, ref) => {
    const {
      status,
      variant = "default",
      size = "medium",
      showTimestamp = false,
      timestamp,
      onPress,
      isInteractive = !!onPress,
      customTitle,
      customDescription,
      accessibilityLabel,
      ...restProps
    } = props;

    const statusMessage = getStatusMessage(status);
    const statusIcon = getStatusIcon(status);
    const statusColor = getStatusColor(status);

    const title = customTitle || statusMessage.title;
    const description = customDescription || statusMessage.description;

    // タイムスタンプのフォーマット
    const formatTimestamp = (date: Date): string => {
      return new Intl.DateTimeFormat("ja-JP", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    };

    // アクセシビリティプロパティ
    const accessibilityProps = {
      accessibilityLabel:
        accessibilityLabel || `状態: ${title}. ${description}`,
      accessibilityRole: isInteractive
        ? ("button" as const)
        : ("text" as const),
      accessibilityHint: isInteractive ? "タップして詳細を表示" : undefined,
      accessible: true,
    };

    return (
      <StyledStatusCard
        ref={ref}
        status={status}
        variant={variant}
        size={size}
        onPress={isInteractive ? onPress : undefined}
        animation="quick"
        {...accessibilityProps}
        {...restProps}
      >
        <XStack alignItems="center" space="$3">
          {/* ステータスアイコン */}
          <AppStatusIcon
            iconKey={statusIcon}
            status={statusColor}
            size={size === "large" ? "large" : "medium"}
          />

          {/* ステータス情報 */}
          <YStack flex={1} space="$2">
            <XStack alignItems="center" justifyContent="space-between">
              <H3
                fontSize={
                  size === "large" ? "$6" : size === "small" ? "$4" : "$5"
                }
                color="$color"
                fontWeight="600"
              >
                {title}
              </H3>

              {/* タイムスタンプ */}
              {showTimestamp && timestamp && (
                <M_Text fontSize="$2" color="$color11" opacity={0.7}>
                  {formatTimestamp(timestamp)}
                </M_Text>
              )}
            </XStack>

            <M_Text
              fontSize={size === "large" ? "$4" : "$3"}
              color="$color11"
              numberOfLines={2}
            >
              {description}
            </M_Text>
          </YStack>
        </XStack>
      </StyledStatusCard>
    );
  }
);

StatusCard.displayName = "StatusCard";

// よく使用されるステータスカードのプリセット
export const OutsideStatusCard = React.forwardRef<
  any,
  Omit<StatusCardProps, "status">
>((props, ref) => <StatusCard ref={ref} status="OUTSIDE" {...props} />);

export const InsideAreaStatusCard = React.forwardRef<
  any,
  Omit<StatusCardProps, "status">
>((props, ref) => <StatusCard ref={ref} status="INSIDE_AREA" {...props} />);

export const PresentStatusCard = React.forwardRef<
  any,
  Omit<StatusCardProps, "status">
>((props, ref) => <StatusCard ref={ref} status="PRESENT" {...props} />);

export const UnconfirmedStatusCard = React.forwardRef<
  any,
  Omit<StatusCardProps, "status">
>((props, ref) => <StatusCard ref={ref} status="UNCONFIRMED" {...props} />);

// インタラクティブなステータスカード
export const InteractiveStatusCard = React.forwardRef<any, StatusCardProps>(
  (props, ref) => (
    <StatusCard ref={ref} variant="elevated" isInteractive={true} {...props} />
  )
);

// ステータスカード一覧表示用のコンテナ
export const StatusCardGrid = React.forwardRef<
  any,
  { children: React.ReactNode }
>((props, ref) => <YStack ref={ref} space="$3" padding="$2" {...props} />);

OutsideStatusCard.displayName = "OutsideStatusCard";
InsideAreaStatusCard.displayName = "InsideAreaStatusCard";
PresentStatusCard.displayName = "PresentStatusCard";
UnconfirmedStatusCard.displayName = "UnconfirmedStatusCard";
InteractiveStatusCard.displayName = "InteractiveStatusCard";
StatusCardGrid.displayName = "StatusCardGrid";
