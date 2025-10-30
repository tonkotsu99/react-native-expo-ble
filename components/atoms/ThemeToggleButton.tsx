import { Moon, Sun } from "@tamagui/lucide-icons";
import React from "react";
import type { ButtonProps } from "tamagui";
import { Button, styled, useTheme } from "tamagui";

// テーマ切り替えボタンのスタイル
const StyledThemeToggle = styled(Button, {
  name: "ThemeToggleButton",
  borderRadius: "$round",
  padding: "$2",

  variants: {
    variant: {
      default: {
        backgroundColor: "$background",
        borderColor: "$borderColor",
        borderWidth: 1,
      },
      subtle: {
        backgroundColor: "transparent",
        borderWidth: 0,
      },
      floating: {
        backgroundColor: "$background",
        borderColor: "$borderColor",
        borderWidth: 1,
        shadowColor: "$shadowColor",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    },

    size: {
      small: {
        width: 32,
        height: 32,
        padding: "$1",
      },
      medium: {
        width: 40,
        height: 40,
        padding: "$1.5",
      },
      large: {
        width: 48,
        height: 48,
        padding: "$2",
      },
    },
  } as const,

  defaultVariants: {
    variant: "default",
    size: "medium",
  },

  hoverStyle: {
    backgroundColor: "$backgroundHover",
    scale: 1.05,
  },

  pressStyle: {
    scale: 0.95,
    backgroundColor: "$backgroundPress",
  },

  focusStyle: {
    borderColor: "$borderColorFocus",
    borderWidth: 2,
  },
});

// テーマ切り替えボタンのプロパティ
export type ThemeToggleButtonProps = Omit<ButtonProps, "variant"> & {
  variant?: "default" | "subtle" | "floating";
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  lightLabel?: string;
  darkLabel?: string;
  onThemeChange?: (theme: "light" | "dark") => void;
  customThemeDetection?: () => "light" | "dark";
  accessibilityLabel?: string;
};

// アイコンサイズマッピング
const getIconSize = (size: "small" | "medium" | "large"): number => {
  switch (size) {
    case "small":
      return 16;
    case "medium":
      return 20;
    case "large":
      return 24;
    default:
      return 20;
  }
};

export const ThemeToggleButton = React.forwardRef<any, ThemeToggleButtonProps>(
  (props, ref) => {
    const {
      variant = "default",
      size = "medium",
      showLabel = false,
      lightLabel = "ライトモード",
      darkLabel = "ダークモード",
      onThemeChange,
      customThemeDetection,
      accessibilityLabel,
      ...restProps
    } = props;

    const theme = useTheme();

    // 現在のテーマを判定 (カスタム検出関数があれば使用、なければTamaguiのテーマから推定)
    const getCurrentTheme = React.useCallback((): "light" | "dark" => {
      if (customThemeDetection) {
        return customThemeDetection();
      }

      // Tamaguiテーマから推定 (背景色の明度で判定)
      const bgColor = theme.background?.get?.();
      if (!bgColor) return "light";

      // 簡易的な明度判定 (実際のプロジェクトではより詳細な判定が必要)
      if (typeof bgColor === "string") {
        // hex color の場合の簡易判定
        if (bgColor.includes("#")) {
          const hex = bgColor.replace("#", "");
          const r = parseInt(hex.substr(0, 2), 16);
          const g = parseInt(hex.substr(2, 2), 16);
          const b = parseInt(hex.substr(4, 2), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          return brightness > 128 ? "light" : "dark";
        }
      }

      return "light"; // デフォルト
    }, [theme, customThemeDetection]);

    const currentTheme = getCurrentTheme();
    const isLightTheme = currentTheme === "light";

    const iconSize = getIconSize(size);
    const IconComponent = isLightTheme ? Sun : Moon;
    const currentLabel = isLightTheme ? lightLabel : darkLabel;

    const handlePress = React.useCallback(() => {
      const newTheme = isLightTheme ? "dark" : "light";
      onThemeChange?.(newTheme);
    }, [isLightTheme, onThemeChange]);

    const accessibilityProps = {
      accessibilityLabel:
        accessibilityLabel ||
        `現在${currentLabel}、タップで${
          isLightTheme ? darkLabel : lightLabel
        }に切り替え`,
      accessibilityRole: "button" as const,
      accessibilityHint: `アプリのテーマを${
        isLightTheme ? "ダーク" : "ライト"
      }モードに切り替えます`,
    };

    // ラベル表示ありの場合
    if (showLabel) {
      return (
        <StyledThemeToggle
          ref={ref}
          variant={variant}
          size={size}
          onPress={handlePress}
          animation="quick"
          {...accessibilityProps}
          {...restProps}
        >
          <IconComponent size={iconSize} color={theme.color?.get?.()} />
          {currentLabel}
        </StyledThemeToggle>
      );
    }

    // アイコンのみの場合（通常のButtonを使用）
    return (
      <StyledThemeToggle
        ref={ref}
        variant={variant}
        size={size}
        onPress={handlePress}
        animation="quick"
        {...accessibilityProps}
        {...restProps}
      >
        <IconComponent size={iconSize} color={theme.color?.get?.()} />
      </StyledThemeToggle>
    );
  }
);

ThemeToggleButton.displayName = "ThemeToggleButton";

// プリセットコンポーネント
export const FloatingThemeToggle = React.forwardRef<
  any,
  Omit<ThemeToggleButtonProps, "variant">
>((props, ref) => {
  const themedProps = { ...props, variant: "floating" as const };
  return <ThemeToggleButton ref={ref} {...themedProps} />;
});

export const SubtleThemeToggle = React.forwardRef<
  any,
  Omit<ThemeToggleButtonProps, "variant">
>((props, ref) => {
  const themedProps = { ...props, variant: "subtle" as const };
  return <ThemeToggleButton ref={ref} {...themedProps} />;
});

export const LabeledThemeToggle = React.forwardRef<
  any,
  Omit<ThemeToggleButtonProps, "showLabel">
>((props, ref) => {
  const themedProps = { ...props, showLabel: true };
  return <ThemeToggleButton ref={ref} {...themedProps} />;
});

FloatingThemeToggle.displayName = "FloatingThemeToggle";
SubtleThemeToggle.displayName = "SubtleThemeToggle";
LabeledThemeToggle.displayName = "LabeledThemeToggle";
