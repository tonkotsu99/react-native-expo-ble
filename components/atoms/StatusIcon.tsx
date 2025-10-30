import {
  AppStateIcons,
  BLEStateIcons,
  type AppStateIconType,
  type BLEStateIconType,
} from "@/constants/icons";
import React from "react";
import type { ViewProps } from "tamagui";
import { View, styled } from "tamagui";

// Lucide アイコンの型定義
type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

// ベ�EスとなるStatusIconスタイル
const StyledStatusIcon = styled(View, {
  name: "StatusIcon",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "$round",

  variants: {
    type: {
      app: {
        backgroundColor: "$blue2",
        borderColor: "$blue6",
        borderWidth: 1,
      },
      ble: {
        backgroundColor: "$green2",
        borderColor: "$green6",
        borderWidth: 1,
      },
      indicator: {
        backgroundColor: "transparent",
      },
    },

    size: {
      small: {
        width: 24,
        height: 24,
        padding: "$1",
      },
      medium: {
        width: 32,
        height: 32,
        padding: "$1.5",
      },
      large: {
        width: 48,
        height: 48,
        padding: "$2",
      },
    },

    status: {
      active: {
        backgroundColor: "$green2",
        borderColor: "$green6",
      },
      inactive: {
        backgroundColor: "$gray2",
        borderColor: "$gray6",
      },
      warning: {
        backgroundColor: "$orange2",
        borderColor: "$orange6",
      },
      error: {
        backgroundColor: "$red2",
        borderColor: "$red6",
      },
      scanning: {
        backgroundColor: "$blue2",
        borderColor: "$blue6",
        // アニメーション効果�Eアニメーション機�Eで処琁E
      },
    },
  } as const,

  defaultVariants: {
    type: "indicator",
    size: "medium",
    status: "inactive",
  },
});

// アプリケーション状態用のアイコンプロパティ
type AppStatusIconProps = ViewProps & {
  type: "app";
  iconKey: AppStateIconType;
  size?: "small" | "medium" | "large";
  status?: "active" | "inactive" | "warning" | "error";
  accessibilityLabel?: string;
};

// BLE状態用のアイコンプロパティ
type BLEStatusIconProps = ViewProps & {
  type: "ble";
  iconKey: BLEStateIconType;
  size?: "small" | "medium" | "large";
  status?: "active" | "inactive" | "warning" | "error" | "scanning";
  accessibilityLabel?: string;
};

// 汎用インジケーター用のプロパティ
type IndicatorIconProps = ViewProps & {
  type: "indicator";
  IconComponent: IconComponent;
  size?: "small" | "medium" | "large";
  status?: "active" | "inactive" | "warning" | "error";
  accessibilityLabel?: string;
};

// 統合されたプロパティ垁E
type StatusIconProps =
  | AppStatusIconProps
  | BLEStatusIconProps
  | IndicatorIconProps;

// アイコンサイズマッピング
const getIconSize = (size: "small" | "medium" | "large"): number => {
  switch (size) {
    case "small":
      return 16;
    case "medium":
      return 20;
    case "large":
      return 32;
    default:
      return 20;
  }
};

// アイコンカラーマッピング
const getIconColor = (status: string, type: string): string => {
  switch (status) {
    case "active":
      return "$green9";
    case "inactive":
      return "$gray9";
    case "warning":
      return "$orange9";
    case "error":
      return "$red9";
    case "scanning":
      return "$blue9";
    default:
      if (type === "app") return "$blue9";
      if (type === "ble") return "$green9";
      return "$gray9";
  }
};

export const StatusIcon = React.forwardRef<any, StatusIconProps>(
  (props, ref) => {
    const {
      type,
      size = "medium",
      status = "inactive",
      accessibilityLabel,
      ...restProps
    } = props;

    // アイコンコンポ�Eネントを取征E
    let IconComponent: IconComponent;

    if (type === "app") {
      const { iconKey } = props as AppStatusIconProps;
      IconComponent = AppStateIcons[iconKey];
    } else if (type === "ble") {
      const { iconKey } = props as BLEStatusIconProps;
      IconComponent = BLEStateIcons[iconKey];
    } else {
      const { IconComponent: ProvidedIcon } = props as IndicatorIconProps;
      IconComponent = ProvidedIcon;
    }

    const iconSize = getIconSize(size);
    const iconColor = getIconColor(status, type);

    return (
      <StyledStatusIcon
        ref={ref}
        type={type}
        size={size}
        status={status}
        animation="quick"
        accessibilityLabel={accessibilityLabel || `Status: ${status}`}
        accessibilityRole="image"
        accessible={true}
        {...restProps}
      >
        <IconComponent size={iconSize} color={iconColor} />
      </StyledStatusIcon>
    );
  }
);

StatusIcon.displayName = "StatusIcon";

// 使用例とヘルパ�E関数のエクスポ�EチE
export type {
  AppStatusIconProps,
  BLEStatusIconProps,
  IndicatorIconProps,
  StatusIconProps,
};

// よく使用される状態アイコンのヘルパ�E
export const AppStatusIcon = React.forwardRef<
  any,
  Omit<AppStatusIconProps, "type">
>((props, ref) => <StatusIcon ref={ref} type="app" {...props} />);

export const BLEStatusIcon = React.forwardRef<
  any,
  Omit<BLEStatusIconProps, "type">
>((props, ref) => <StatusIcon ref={ref} type="ble" {...props} />);

export const IndicatorIcon = React.forwardRef<
  any,
  Omit<IndicatorIconProps, "type">
>((props, ref) => <StatusIcon ref={ref} type="indicator" {...props} />);

AppStatusIcon.displayName = "AppStatusIcon";
BLEStatusIcon.displayName = "BLEStatusIcon";
IndicatorIcon.displayName = "IndicatorIcon";
