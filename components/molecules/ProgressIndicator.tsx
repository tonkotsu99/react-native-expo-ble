import { Pause, Play, X } from "@tamagui/lucide-icons";
import React from "react";
import type { CardProps } from "tamagui";
import { Card, Progress, styled, XStack, YStack } from "tamagui";
import { AnimatedSpinner } from "../atoms/AnimatedSpinner";
import { IconButton } from "../atoms/IconButton";
import { M_Text } from "../atoms/M_Text";

// 繝吶・繧ｹ縺ｨ縺ｪ繧輝rogressIndicator繧ｹ繧ｿ繧､繝ｫ
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
        // 繝・ヵ繧ｩ繝ｫ繝医せ繧ｿ繧､繝ｫ
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

// 繝励Ο繧ｰ繝ｬ繧ｹ繝舌・縺ｮ繧ｹ繧ｿ繧､繝ｫ
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

// 騾ｲ陦檎憾豕√・迥ｶ諷・
export type ProgressStatus = "active" | "paused" | "completed" | "error";

// 騾ｲ陦梧ｮｵ髫・
export type ProgressStep = {
  id: string;
  title: string;
  description?: string;
  isCompleted?: boolean;
  isActive?: boolean;
  hasError?: boolean;
};

// ProgressIndicator 繝励Ο繝代ユ繧｣
export type ProgressIndicatorProps = CardProps & {
  variant?: "default" | "compact" | "floating" | "minimal";
  status?: ProgressStatus;

  // 騾ｲ陦檎紫陦ｨ遉ｺ
  progress?: number; // 0-100
  showPercentage?: boolean;
  showProgressBar?: boolean;
  progressSize?: "small" | "medium" | "large";

  // 繧ｿ繧ｹ繧ｯ諠・ｱ
  title?: string;
  description?: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;

  // 譎る俣髢｢騾｣
  estimatedTimeRemaining?: number; // 遘・
  elapsedTime?: number; // 遘・
  showTimer?: boolean;

  // 繧ｹ繝・ャ繝苓｡ｨ遉ｺ
  steps?: ProgressStep[];
  showStepList?: boolean;

  // 繧､繝ｳ繧ｿ繝ｩ繧ｯ繧ｷ繝ｧ繝ｳ
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  canCancel?: boolean;
  canPause?: boolean;

  // 繧ｹ繝斐リ繝ｼ陦ｨ遉ｺ
  showSpinner?: boolean;
  spinnerType?: "refresh" | "loader";

  accessibilityLabel?: string;
};

// 譎る俣繝輔か繝ｼ繝槭ャ繝磯未謨ｰ
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (mins > 0) {
    return `${mins}蛻・{secs}遘蛋;
  }
  return `${secs}遘蛋;
};

// 騾ｲ陦檎紫縺九ｉ繝｡繝・そ繝ｼ繧ｸ繧堤函謌・
const getProgressMessage = (
  progress: number,
  status: ProgressStatus
): string => {
  if (status === "completed") return "螳御ｺ・＠縺ｾ縺励◆";
  if (status === "error") return "繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆";
  if (status === "paused") return "荳譎ょ●豁｢荳ｭ";

  if (progress === 0) return "髢句ｧ倶ｸｭ...";
  if (progress < 25) return "蜃ｦ逅・ｸｭ...";
  if (progress < 50) return "騾ｲ陦御ｸｭ...";
  if (progress < 75) return "繧ゅ≧蟆代＠縺ｧ縺・..";
  if (progress < 100) return "螳御ｺ・俣霑・..";
  return "蜃ｦ逅・ｸｭ...";
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

    // 繧｢繧ｯ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ縺ｮ蜃ｦ逅・
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

    // 繧｢繧ｯ繧ｻ繧ｷ繝薙Μ繝・ぅ繝励Ο繝代ユ繧｣
    const accessibilityProps = {
      accessibilityLabel:
        accessibilityLabel ||
        `騾ｲ陦檎憾豕・ ${clampedProgress}%, ${progressMessage}`,
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
          {/* 繝倥ャ繝繝ｼ驛ｨ蛻・*/}
          <XStack alignItems="center" justifyContent="space-between">
            <XStack alignItems="center" space="$3" flex={1}>
              {/* 繧ｹ繝斐リ繝ｼ */}
              {showSpinner && !isCompleted && !hasError && (
                <AnimatedSpinner
                  size={variant === "compact" ? "small" : "medium"}
                  iconType={spinnerType}
                  animationStyle="continuous"
                  isAnimating={!isPaused}
                  color={status === "paused" ? "$orange9" : "$blue9"}
                />
              )}

              {/* 繧ｿ繧､繝医Ν縺ｨ隱ｬ譏・*/}
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

            {/* 繧｢繧ｯ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ */}
            <XStack alignItems="center" space="$2">
              {/* 騾ｲ陦檎紫 */}
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

              {/* 荳譎ょ●豁｢/蜀埼幕繝懊ち繝ｳ */}
              {canPause && !isCompleted && !hasError && (
                <IconButton
                  size="$3"
                  variant="ghost"
                  icon={isPaused ? Play : Pause}
                  onPress={handlePauseResume}
                  accessibilityLabel={isPaused ? "蜀埼幕" : "荳譎ょ●豁｢"}
                />
              )}

              {/* 繧ｭ繝｣繝ｳ繧ｻ繝ｫ繝懊ち繝ｳ */}
              {canCancel && !isCompleted && (
                <IconButton
                  size="$3"
                  variant="ghost"
                  icon={X}
                  onPress={handleCancel}
                  accessibilityLabel="繧ｭ繝｣繝ｳ繧ｻ繝ｫ"
                />
              )}
            </XStack>
          </XStack>

          {/* 繝励Ο繧ｰ繝ｬ繧ｹ繝舌・ */}
          {showProgressBar && (
            <StyledProgress
              status={status}
              size={progressSize}
              value={clampedProgress}
              max={100}
            />
          )}

          {/* 繧ｹ繝・ャ繝玲ュ蝣ｱ */}
          {(currentStep || (totalSteps && completedSteps !== undefined)) &&
            variant !== "minimal" && (
              <XStack alignItems="center" justifyContent="space-between">
                {currentStep && (
                  <M_Text fontSize="$2" color="$color11">
                    迴ｾ蝨ｨ: {currentStep}
                  </M_Text>
                )}

                {totalSteps && completedSteps !== undefined && (
                  <M_Text fontSize="$2" color="$color11">
                    {completedSteps} / {totalSteps} 螳御ｺ・
                  </M_Text>
                )}
              </XStack>
            )}

          {/* 譎る俣諠・ｱ */}
          {showTimer &&
            (elapsedTime !== undefined ||
              estimatedTimeRemaining !== undefined) &&
            variant !== "compact" && (
              <XStack alignItems="center" justifyContent="space-between">
                {elapsedTime !== undefined && (
                  <M_Text fontSize="$2" color="$color11">
                    邨碁℃: {formatTime(elapsedTime)}
                  </M_Text>
                )}

                {estimatedTimeRemaining !== undefined && !isCompleted && (
                  <M_Text fontSize="$2" color="$color11">
                    谿九ｊ: {formatTime(estimatedTimeRemaining)}
                  </M_Text>
                )}
              </XStack>
            )}

          {/* 繧ｹ繝・ャ繝励Μ繧ｹ繝・*/}
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
                      (繧ｨ繝ｩ繝ｼ)
                    </M_Text>
                  )}

                  {step.isCompleted && (
                    <M_Text fontSize="$1" color="$green9">
                      笨・
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

// 繝励Μ繧ｻ繝・ヨ繧ｳ繝ｳ繝昴・繝阪Φ繝・
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
