import { Loader, RefreshCw } from "@tamagui/lucide-icons";
import React, { useEffect } from "react";
import { Animated, Easing } from "react-native";
import type { ViewProps } from "tamagui";
import { View, styled } from "tamagui";

// ベ�EスとなるAnimatedSpinnerスタイル
const StyledSpinnerContainer = styled(View, {
  name: "AnimatedSpinner",
  alignItems: "center",
  justifyContent: "center",

  variants: {
    size: {
      small: {
        width: 20,
        height: 20,
      },
      medium: {
        width: 32,
        height: 32,
      },
      large: {
        width: 48,
        height: 48,
      },
      xlarge: {
        width: 64,
        height: 64,
      },
    },

    variant: {
      default: {
        // チE��ォルトスタイル
      },
      subtle: {
        opacity: 0.7,
      },
      prominent: {
        backgroundColor: "$blue2",
        borderRadius: "$round",
        padding: "$2",
      },
    },
  } as const,

  defaultVariants: {
    size: "medium",
    variant: "default",
  },
});

// アイコンタイチE
type SpinnerIconType = "refresh" | "loader";

// アニメーションスタイル
type AnimationStyle = "continuous" | "pulse" | "bounce";

// スピナープロパティ
export type AnimatedSpinnerProps = ViewProps & {
  size?: "small" | "medium" | "large" | "xlarge";
  variant?: "default" | "subtle" | "prominent";
  iconType?: SpinnerIconType;
  animationStyle?: AnimationStyle;
  color?: string;
  speed?: number; // 回転速度 (秒単佁E
  isAnimating?: boolean;
  accessibilityLabel?: string;
};

// アイコンサイズマッピング
const getIconSize = (size: "small" | "medium" | "large" | "xlarge"): number => {
  switch (size) {
    case "small":
      return 16;
    case "medium":
      return 24;
    case "large":
      return 36;
    case "xlarge":
      return 48;
    default:
      return 24;
  }
};

// アイコンカラーマッピング
const getIconColor = (color?: string, variant?: string): string => {
  if (color) return color;

  switch (variant) {
    case "subtle":
      return "$gray9";
    case "prominent":
      return "$blue10";
    default:
      return "$blue9";
  }
};

export const AnimatedSpinner = React.forwardRef<any, AnimatedSpinnerProps>(
  (props, ref) => {
    const {
      size = "medium",
      variant = "default",
      iconType = "refresh",
      animationStyle = "continuous",
      color,
      speed = 1,
      isAnimating = true,
      accessibilityLabel,
      ...restProps
    } = props;

    // アニメーション値
    const rotateValue = React.useRef(new Animated.Value(0)).current;
    const scaleValue = React.useRef(new Animated.Value(1)).current;
    const opacityValue = React.useRef(new Animated.Value(1)).current;

    // アイコンコンポ�Eネントを選抁E
    const IconComponent = iconType === "refresh" ? RefreshCw : Loader;

    const iconSize = getIconSize(size);
    const iconColor = getIconColor(color, variant);

    // 連続回転アニメーション
    const startContinuousRotation = React.useCallback(() => {
      rotateValue.setValue(0);
      Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 1000 / speed,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }, [rotateValue, speed]);

    // パルスアニメーション
    const startPulseAnimation = React.useCallback(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacityValue, {
            toValue: 0.3,
            duration: 500 / speed,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 500 / speed,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, [opacityValue, speed]);

    // バウンスアニメーション
    const startBounceAnimation = React.useCallback(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 300 / speed,
            easing: Easing.elastic(1),
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 300 / speed,
            easing: Easing.elastic(1),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, [scaleValue, speed]);

    // アニメーション制御
    useEffect(() => {
      if (!isAnimating) {
        rotateValue.stopAnimation();
        scaleValue.stopAnimation();
        opacityValue.stopAnimation();
        return;
      }

      switch (animationStyle) {
        case "continuous":
          startContinuousRotation();
          break;
        case "pulse":
          startPulseAnimation();
          break;
        case "bounce":
          startBounceAnimation();
          break;
      }

      return () => {
        rotateValue.stopAnimation();
        scaleValue.stopAnimation();
        opacityValue.stopAnimation();
      };
    }, [
      animationStyle,
      isAnimating,
      startContinuousRotation,
      startPulseAnimation,
      startBounceAnimation,
      rotateValue,
      scaleValue,
      opacityValue,
    ]);

    // 回転値を角度に変換
    const rotateInterpolate = rotateValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    // アニメーションスタイルを適用
    const animatedStyle = {
      transform: [
        {
          rotate: animationStyle === "continuous" ? rotateInterpolate : "0deg",
        },
        { scale: animationStyle === "bounce" ? scaleValue : 1 },
      ],
      opacity: animationStyle === "pulse" ? opacityValue : 1,
    };

    return (
      <StyledSpinnerContainer
        ref={ref}
        size={size}
        variant={variant}
        accessibilityLabel={accessibilityLabel || "Loading..."}
        accessibilityRole="progressbar"
        accessible={true}
        {...restProps}
      >
        <Animated.View style={animatedStyle}>
          <IconComponent size={iconSize} color={iconColor} />
        </Animated.View>
      </StyledSpinnerContainer>
    );
  }
);

AnimatedSpinner.displayName = "AnimatedSpinner";

// よく使用されるスピナーのプリセチE��
export const LoadingSpinner = React.forwardRef<
  any,
  Omit<AnimatedSpinnerProps, "iconType" | "animationStyle">
>((props, ref) => (
  <AnimatedSpinner
    ref={ref}
    iconType="loader"
    animationStyle="continuous"
    {...props}
  />
));

export const RefreshSpinner = React.forwardRef<
  any,
  Omit<AnimatedSpinnerProps, "iconType" | "animationStyle">
>((props, ref) => (
  <AnimatedSpinner
    ref={ref}
    iconType="refresh"
    animationStyle="continuous"
    {...props}
  />
));

export const PulseIndicator = React.forwardRef<
  any,
  Omit<AnimatedSpinnerProps, "animationStyle">
>((props, ref) => (
  <AnimatedSpinner ref={ref} animationStyle="pulse" {...props} />
));

export const BounceIndicator = React.forwardRef<
  any,
  Omit<AnimatedSpinnerProps, "animationStyle">
>((props, ref) => (
  <AnimatedSpinner ref={ref} animationStyle="bounce" {...props} />
));

LoadingSpinner.displayName = "LoadingSpinner";
RefreshSpinner.displayName = "RefreshSpinner";
PulseIndicator.displayName = "PulseIndicator";
BounceIndicator.displayName = "BounceIndicator";
