import { createAnimations } from "@tamagui/animations-react-native";

// アニメーション設定
export const animations = createAnimations({
  // 基本的なトランジション
  quick: {
    type: "timing",
    duration: 150,
  },
  medium: {
    type: "timing",
    duration: 300,
  },
  slow: {
    type: "timing",
    duration: 500,
  },

  // ボタンアニメーション
  buttonPress: {
    type: "timing",
    duration: 100,
  },

  // 状態変更アニメーション
  stateChange: {
    type: "timing",
    duration: 400,
  },

  // スキャンアニメーション（ループ）
  scanning: {
    type: "timing",
    duration: 1000,
    loop: true,
  },

  // フェードイン/アウト
  fadeIn: {
    type: "timing",
    duration: 300,
  },
  fadeOut: {
    type: "timing",
    duration: 200,
  },

  // スライドアニメーション
  slideIn: {
    type: "spring",
    damping: 15,
    mass: 1,
    stiffness: 150,
  },
  slideOut: {
    type: "timing",
    duration: 200,
  },

  // スケールアニメーション
  scaleIn: {
    type: "spring",
    damping: 20,
    mass: 1,
    stiffness: 200,
  },
  scaleOut: {
    type: "timing",
    duration: 150,
  },

  // 接続状態アニメーション
  connect: {
    type: "spring",
    damping: 12,
    mass: 1,
    stiffness: 100,
  },
  disconnect: {
    type: "timing",
    duration: 250,
  },
});

// アニメーション定数
export const AnimationPresets = {
  // ボタン押下効果
  BUTTON_PRESS_SCALE: 0.95,
  BUTTON_PRESS_DURATION: 100,

  // フェード値
  FADE_IN_OPACITY: 1,
  FADE_OUT_OPACITY: 0,

  // スケール値
  SCALE_IN: 1,
  SCALE_OUT: 0.8,

  // 回転値（スキャンアニメーション用）
  ROTATION_360: "360deg",
  ROTATION_0: "0deg",

  // トランスレート値
  TRANSLATE_IN: 0,
  TRANSLATE_OUT: 20,
} as const;

// アニメーション状態の型定義
export type AnimationState = "idle" | "running" | "finished";

// アニメーション管理用ヘルパー
export const AnimationHelpers = {
  // ボタン押下アニメーション用のスタイル生成
  getButtonPressStyle: (isPressed: boolean) => ({
    scale: isPressed ? AnimationPresets.BUTTON_PRESS_SCALE : 1,
    animation: "buttonPress",
  }),

  // フェードアニメーション用のスタイル生成
  getFadeStyle: (isVisible: boolean) => ({
    opacity: isVisible
      ? AnimationPresets.FADE_IN_OPACITY
      : AnimationPresets.FADE_OUT_OPACITY,
    animation: isVisible ? "fadeIn" : "fadeOut",
  }),

  // スケールアニメーション用のスタイル生成
  getScaleStyle: (isVisible: boolean) => ({
    scale: isVisible ? AnimationPresets.SCALE_IN : AnimationPresets.SCALE_OUT,
    animation: isVisible ? "scaleIn" : "scaleOut",
  }),

  // スキャンアニメーション用のスタイル生成
  getScanningStyle: (isScanning: boolean) => ({
    animation: isScanning ? "scanning" : undefined,
    rotate: isScanning
      ? AnimationPresets.ROTATION_360
      : AnimationPresets.ROTATION_0,
  }),

  // 状態変更アニメーション用のスタイル生成
  getStateChangeStyle: () => ({
    animation: "stateChange",
  }),
};

export type AnimationType = keyof typeof animations;
