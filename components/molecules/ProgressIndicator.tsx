import { Pause, Play, X } from "@tamagui/lucide-icons";
import React from "react";
import type { CardProps } from "tamagui";
import { Card, Progress, styled, XStack, YStack } from "tamagui";
import { AnimatedSpinner } from "../atoms/AnimatedSpinner";
import { IconButton } from "../atoms/IconButton";
import { M_Text } from "../atoms/M_Text";

// ベ�EスとなるProgressIndicatorスタイル
const StyledProgressCard = styled(Card, {
  name: "ProgressIndicator",
  padding: "$4",
  margin: "$2",
  borderRadius: "$6",
  borderWidth: 1,
  backgroundColor: "$background",
  borderColor: "$borderColor",

  variants: {
    variant: {
      default: {
        // チE��ォルトスタイル
      },
      compact: {
        padding: "$3",
        margin: "$1",
      },
      floating: {
        shadowColor: "$shadowColor",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        backgroundColor: "$backgroundStrong",
      },
      minimal: {
        padding: "$2",
        backgroundColor: "transparent",
        borderWidth: 0,
      },
    },

    status: {
      active: {
        borderColor: "$blue6",
        backgroundColor: "$blue1",
      },
      paused: {
        borderColor: "$orange6",
        backgroundColor: "$orange1",
      },
      completed: {
        borderColor: "$green6",
        backgroundColor: "$green1",
      },
      error: {
        borderColor: "$red6",
        backgroundColor: "$red1",
      },
    },
  } as const,

  defaultVariants: {
    variant: "default",
    status: "active",
  },
});

// プログレスバ�Eのスタイル
const StyledProgress = styled(Progress, {
  name: "StyledProgress",
  height: 8,
  backgroundColor: "$background",

  variants: {
    status: {
      active: {
        $val: { backgroundColor: "$blue9" },
      },
      paused: {
        $val: { backgroundColor: "$orange9" },
      },
      completed: {
        $val: { backgroundColor: "$green9" },
      },
      error: {
        $val: { backgroundColor: "$red9" },
      },
    },

    size: {
      small: {
        height: 4,
      },
      medium: {
        height: 8,
      },
      large: {
        height: 12,
      },
    },
  } as const,

  defaultVariants: {
    status: "active",
    size: "medium",
  },
});

// 進行状況�E状慁E
export type ProgressStatus = "active" | "paused" | "completed" | "error";

// 進行段隁E
export type ProgressStep = {
  id: string;
  title: string;
  description?: string;
  isCompleted?: boolean;
  isActive?: boolean;
  hasError?: boolean;
};

// ProgressIndicator プロパティ
export type ProgressIndicatorProps = CardProps & {
  variant?: "default" | "compact" | "floating" | "minimal";
  status?: ProgressStatus;

  // 進行率表示
  progress?: number; // 0-100
  showPercentage?: boolean;
  showProgressBar?: boolean;
  progressSize?: "small" | "medium" | "large";

  // タスク惁E��
  title?: string;
  description?: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;

  // 時間関連
  estimatedTimeRemaining?: number; // 私E
  elapsedTime?: number; // 私E
  showTimer?: boolean;

  // スチE��プ表示
  steps?: ProgressStep[];
  showStepList?: boolean;

  // インタラクション
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  canCancel?: boolean;
  canPause?: boolean;

  // スピナー表示
  showSpinner?: boolean;
  spinnerType?: "refresh" | "loader";

  accessibilityLabel?: string;
};

// 時間フォーマット関数
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins > 0) {
    return `${mins}刁E{secs}秒`;
  }
  return `${secs}秒`;
};

// 進行率からメチE��ージを生戁E
const getProgressMessage = (
  progress: number,
  status: ProgressStatus
): string => {
  if (status === "completed") return "完亁E��ました";
  if (status === "error") return "エラーが発生しました";
  if (status === "paused") return "一時停止中";

  if (progress === 0) return "開始中...";
  if (progress < 25) return "処琁E��...";
  if (progress < 50) return "進行中...";
  if (progress < 75) return "もう少しでぁE..";
  if (progress < 100) return "完亁E��迁E..";
  return "処琁E��...";
};

export const ProgressIndicator = React.forwardRef<any, ProgressIndicatorProps>(
  (props, ref) => {
    const {
      variant = "default",
      status = "active",
      progress = 0,
      showPercentage = true,
      showProgressBar = true,
      progressSize = "medium",
      title,
      description,
      currentStep,
      totalSteps,
      completedSteps,
      estimatedTimeRemaining,
      elapsedTime,
      showTimer = false,
      steps,
      showStepList = false,
      onCancel,
      onPause,
      onResume,
      canCancel = !!onCancel,
      canPause = !!onPause,
      showSpinner = true,
      spinnerType = "refresh",
      accessibilityLabel,
      ...restProps
    } = props;

    const clampedProgress = Math.max(0, Math.min(100, progress));
    const progressMessage = getProgressMessage(clampedProgress, status);
    const isPaused = status === "paused";
    const isCompleted = status === "completed";
    const hasError = status === "error";

    // アクションボタンの処琁E
    const handleCancel = React.useCallback(() => {
      onCancel?.();
    }, [onCancel]);

    const handlePauseResume = React.useCallback(() => {
      if (isPaused) {
        onResume?.();
      } else {
        onPause?.();
      }
    }, [isPaused, onPause, onResume]);

    // アクセシビリチE��プロパティ
    const accessibilityProps = {
      accessibilityLabel:
        accessibilityLabel ||
        `進行状況E ${clampedProgress}%, ${progressMessage}`,
      accessibilityRole: "progressbar" as const,
      accessibilityValue: {
        min: 0,
        max: 100,
        now: clampedProgress,
      },
      accessible: true,
    };

    return (
      <StyledProgressCard
        ref={ref}
        variant={variant}
        status={status}
        animation="quick"
        {...accessibilityProps}
        {...restProps}
      >
        <YStack space="$3">
          {/* ヘッダー部刁E*/}
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" space="$3" flex={1}>
              {/* スピナー */}
              {showSpinner && !isCompleted && !hasError && (
                <AnimatedSpinner
                  size={variant === "compact" ? "small" : "medium"}
                  iconType={spinnerType}
                  animationStyle="continuous"
                  isAnimating={!isPaused}
                  color={status === "paused" ? "$orange9" : "$blue9"}
                />
              )}

              {/* タイトルと説昁E*/}
              <YStack flex={1}>
                {title && (
                  <M_Text
                    fontSize={variant === "compact" ? "$3" : "$4"}
                    fontWeight="600"
                    color="$color"
                    numberOfLines={1}
                  >
                    {title}
                  </M_Text>
                )}

                <M_Text
                  fontSize={variant === "compact" ? "$2" : "$3"}
                  color="$color11"
                  numberOfLines={1}
                >
                  {description || progressMessage}
                </M_Text>
              </YStack>
            </XStack>

            {/* アクションボタン */}
            <XStack alignItems="center" space="$2">
              {/* 進行率 */}
              {showPercentage && (
                <M_Text
                  fontSize={variant === "compact" ? "$2" : "$3"}
                  fontWeight="500"
                  color="$color11"
                  minWidth={40}
                  textAlign="right"
                >
                  {Math.round(clampedProgress)}%
                </M_Text>
              )}

              {/* 一時停止/再開ボタン */}
              {canPause && !isCompleted && !hasError && (
                <IconButton
                  size="small"
                  variant="ghost"
                  icon={isPaused ? Play : Pause}
                  onPress={handlePauseResume}
                  accessibilityLabel={isPaused ? "再開" : "一時停止"}
                />
              )}

              {/* キャンセルボタン */}
              {canCancel && !isCompleted && (
                <IconButton
                  size="small"
                  variant="ghost"
                  icon={X}
                  onPress={handleCancel}
                  accessibilityLabel="キャンセル"
                />
              )}
            </XStack>
          </XStack>

          {/* プログレスバ�E */}
          {showProgressBar && (
            <StyledProgress
              status={status}
              size={progressSize}
              value={clampedProgress}
              max={100}
            />
          )}

          {/* スチE��プ情報 */}
          {(currentStep || (totalSteps && completedSteps !== undefined)) &&
            variant !== "minimal" && (
              <XStack alignItems="center" justifyContent="space-between">
                {currentStep && (
                  <M_Text fontSize="$2" color="$color11">
                    現在: {currentStep}
                  </M_Text>
                )}

                {totalSteps && completedSteps !== undefined && (
                  <M_Text fontSize="$2" color="$color11">
                    {completedSteps} / {totalSteps} 完亁E
                  </M_Text>
                )}
              </XStack>
            )}

          {/* 時間惁E�� */}
          {showTimer &&
            (elapsedTime !== undefined ||
              estimatedTimeRemaining !== undefined) &&
            variant !== "compact" && (
              <XStack alignItems="center" justifyContent="space-between">
                {elapsedTime !== undefined && (
                  <M_Text fontSize="$2" color="$color11">
                    経過: {formatTime(elapsedTime)}
                  </M_Text>
                )}

                {estimatedTimeRemaining !== undefined && !isCompleted && (
                  <M_Text fontSize="$2" color="$color11">
                    残り: {formatTime(estimatedTimeRemaining)}
                  </M_Text>
                )}
              </XStack>
            )}

          {/* スチE��プリスチE*/}
          {showStepList && steps && variant === "default" && (
            <YStack
              space="$2"
              padding="$2"
              backgroundColor="$background"
              borderRadius="$4"
            >
              {steps.map((step, index) => (
                <XStack key={step.id} alignItems="center" space="$2">
                  <M_Text
                    fontSize="$2"
                    color={
                      step.isCompleted
                        ? "$green9"
                        : step.isActive
                        ? "$blue9"
                        : step.hasError
                        ? "$red9"
                        : "$color11"
                    }
                    fontWeight={step.isActive ? "600" : "400"}
                  >
                    {index + 1}. {step.title}
                  </M_Text>

                  {step.hasError && (
                    <M_Text fontSize="$1" color="$red9">
                      (エラー)
                    </M_Text>
                  )}

                  {step.isCompleted && (
                    <M_Text fontSize="$1" color="$green9">
                      ✁E
                    </M_Text>
                  )}
                </XStack>
              ))}
            </YStack>
          )}
        </YStack>
      </StyledProgressCard>
    );
  }
);

ProgressIndicator.displayName = "ProgressIndicator";

// プリセチE��コンポ�EネンチE
export const CompactProgressIndicator = React.forwardRef<
  any,
  Omit<ProgressIndicatorProps, "variant">
>((props, ref) => (
  <ProgressIndicator
    ref={ref}
    variant="compact"
    showStepList={false}
    showTimer={false}
    {...props}
  />
));

export const FloatingProgressIndicator = React.forwardRef<
  any,
  Omit<ProgressIndicatorProps, "variant">
>((props, ref) => (
  <ProgressIndicator ref={ref} variant="floating" {...props} />
));

export const MinimalProgressIndicator = React.forwardRef<
  any,
  Omit<ProgressIndicatorProps, "variant">
>((props, ref) => (
  <ProgressIndicator
    ref={ref}
    variant="minimal"
    showPercentage={true}
    showProgressBar={true}
    showSpinner={false}
    canCancel={false}
    canPause={false}
    {...props}
  />
));

export const DetailedProgressIndicator = React.forwardRef<
  any,
  Omit<ProgressIndicatorProps, "variant">
>((props, ref) => (
  <ProgressIndicator
    ref={ref}
    variant="default"
    showTimer={true}
    showStepList={true}
    canCancel={true}
    canPause={true}
    {...props}
  />
));

CompactProgressIndicator.displayName = "CompactProgressIndicator";
FloatingProgressIndicator.displayName = "FloatingProgressIndicator";
MinimalProgressIndicator.displayName = "MinimalProgressIndicator";
DetailedProgressIndicator.displayName = "DetailedProgressIndicator";
