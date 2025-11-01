import { ComponentProps, forwardRef } from "react";
import { Button, styled } from "tamagui";

// IconButton用の基本スタイル
const StyledIconButton = styled(Button, {
  name: "IconButton",
  padding: "$3",
  borderRadius: "$button",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: "$2",

  variants: {
    uiSize: {
      small: {
        padding: "$2",
        minHeight: 32,
        minWidth: 32,
      },
      medium: {
        padding: "$3",
        minHeight: 44,
        minWidth: 44,
      },
      large: {
        padding: "$4",
        minHeight: 56,
        minWidth: 56,
      },
    },

    variant: {
      solid: {
        backgroundColor: "$blue10",
        color: "white",

        hoverStyle: {
          backgroundColor: "$blue11",
        },

        pressStyle: {
          backgroundColor: "$blue12",
          scale: 0.95,
        },
      },

      outline: {
        borderWidth: 1,
        borderColor: "$blue10",
        backgroundColor: "transparent",
        color: "$blue10",

        hoverStyle: {
          backgroundColor: "$blue2",
        },

        pressStyle: {
          backgroundColor: "$blue3",
          scale: 0.95,
        },
      },

      ghost: {
        backgroundColor: "transparent",
        color: "$blue10",

        hoverStyle: {
          backgroundColor: "$blue2",
        },

        pressStyle: {
          backgroundColor: "$blue3",
          scale: 0.95,
        },
      },

      success: {
        backgroundColor: "$green10",
        color: "white",

        hoverStyle: {
          backgroundColor: "$green11",
        },

        pressStyle: {
          backgroundColor: "$green12",
          scale: 0.95,
        },
      },

      danger: {
        backgroundColor: "$red10",
        color: "white",

        hoverStyle: {
          backgroundColor: "$red11",
        },

        pressStyle: {
          backgroundColor: "$red12",
          scale: 0.95,
        },
      },

      warning: {
        backgroundColor: "$orange10",
        color: "white",

        hoverStyle: {
          backgroundColor: "$orange11",
        },

        pressStyle: {
          backgroundColor: "$orange12",
          scale: 0.95,
        },
      },
    },

    iconOnly: {
      true: {
        gap: 0,
      },
    },
  } as const,

  defaultVariants: {
    uiSize: "medium",
    variant: "solid",
  },
});

type IconComponent = React.ComponentType<{
  size?: number | string;
  color?: string;
}>;

type BaseStyledProps = Omit<
  ComponentProps<typeof StyledIconButton>,
  "size" | "uiSize"
>;

type IconButtonProps = BaseStyledProps & {
  // Public prop for sizing without passing Tamagui's size prop down to Button
  size?: "small" | "medium" | "large";
  icon?: IconComponent;
  iconAfter?: IconComponent;
  iconSize?: number | string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  loading?: boolean;
  children?: React.ReactNode;
};

export const IconButton = forwardRef<any, IconButtonProps>(
  (
    {
      icon: Icon,
      iconAfter: IconAfter,
      iconSize = "$1",
      accessibilityLabel,
      accessibilityHint,
      loading = false,
      disabled,
      children,
      onPress,
      size = "medium",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const iconOnly = !children;

    const accessibilityProps = {
      accessibilityLabel,
      accessibilityHint,
      accessibilityRole: "button" as const,
      accessible: true,
    };

    return (
      <StyledIconButton
        ref={ref}
        disabled={isDisabled}
        iconOnly={iconOnly}
        // map external size => internal uiSize to avoid Button size collisions
        uiSize={size}
        {...accessibilityProps}
        {...props}
        onPress={onPress}
        animation="quick"
      >
        {Icon && (
          <Icon
            size={iconSize}
            color={
              props.variant === "outline" || props.variant === "ghost"
                ? "$blue10"
                : "white"
            }
          />
        )}

        {children}

        {IconAfter && (
          <IconAfter
            size={iconSize}
            color={
              props.variant === "outline" || props.variant === "ghost"
                ? "$blue10"
                : "white"
            }
          />
        )}
      </StyledIconButton>
    );
  }
);

IconButton.displayName = "IconButton";
