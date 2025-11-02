import {
  ChevronRight,
  ExternalLink,
  Info,
  Shield,
  User,
} from "@tamagui/lucide-icons";
import React from "react";
import type { YStackProps } from "tamagui";
import { H3, H4, Input, styled, Switch, XStack, YStack } from "tamagui";
import { M_Text } from "../atoms/M_Text";

// ベースとなるSettingsPanelスタイル
const StyledSettingsPanel = styled(YStack, {
  name: "SettingsPanel",

  variants: {
    variant: {
      default: {
        backgroundColor: "$background",
        borderRadius: "$6",
        borderWidth: 1,
        borderColor: "$borderColor",
        padding: "$4",
      },
      card: {
        backgroundColor: "$backgroundStrong",
        borderRadius: "$6",
        borderWidth: 1,
        borderColor: "$borderColor",
        padding: "$4",
        shadowColor: "$shadowColor",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
      },
      modal: {
        backgroundColor: "$background",
        borderRadius: "$6",
        padding: "$5",
        shadowColor: "$shadowColor",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
      },
      embedded: {
        backgroundColor: "transparent",
        padding: "$2",
      },
    },
  } as const,

  defaultVariants: {
    variant: "default",
  },
});

// 設定セクション
const SettingsSection = styled(YStack, {
  name: "SettingsSection",
  space: "$3",
  paddingVertical: "$3",
  borderBottomWidth: 1,
  borderBottomColor: "$borderColor",
});

// 設定項目
const SettingsItem = styled(XStack, {
  name: "SettingsItem",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: "$2",
  paddingHorizontal: "$3",
  borderRadius: "$4",
  minHeight: 48,

  variants: {
    interactive: {
      true: {
        hoverStyle: {
          backgroundColor: "$backgroundHover",
        },
        pressStyle: {
          backgroundColor: "$backgroundPress",
          scale: 0.98,
        },
      },
      false: {},
    },
  } as const,
});

// パネルヘッダー
const PanelHeader = styled(XStack, {
  name: "PanelHeader",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: "$4",
  marginBottom: "$3",
  borderBottomWidth: 1,
  borderBottomColor: "$borderColor",
});

// 設定値の型定義
export type SettingsValues = {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  autoReconnect: boolean;
  keepScreenOn: boolean;
  vibrationFeedback: boolean;
  logLevel: "info" | "warning" | "error";
  dataRetentionDays: number;
  autoExportLogs: boolean;
  // UserID関連を追加
  userId: string | null;
};

// 設定項目の定義
export type SettingItem = {
  id: string;
  type: "toggle" | "select" | "action" | "info" | "link" | "input";
  title: string;
  description?: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  value?: any;
  options?: { label: string; value: any }[];
  onPress?: () => void;
  onChange?: (value: any) => void;
  disabled?: boolean;
  destructive?: boolean;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
};

// SettingsPanel プロパティ
export type SettingsPanelProps = YStackProps & {
  variant?: "default" | "card" | "modal" | "embedded";

  // データ
  settings: SettingsValues;

  // 表示オプション
  title?: string;
  showHeader?: boolean;
  compactMode?: boolean;
  sections?: {
    userId?: boolean;
    appearance?: boolean;
    notifications?: boolean;
    behavior?: boolean;
    data?: boolean;
    about?: boolean;
  };

  // カスタム設定項目
  customItems?: SettingItem[];

  // イベントハンドラー
  onSettingChange?: (key: keyof SettingsValues, value: any) => void;
  onThemeChange?: (theme: "light" | "dark" | "system") => void;
  onClearData?: () => void;
  onExportData?: () => void;
  onResetSettings?: () => void;
  onOpenPrivacyPolicy?: () => void;
  onOpenLicenses?: () => void;
  onContactSupport?: () => void;

  // UserID関連
  onUserIdSave?: (userId: string) => Promise<void>;
  onUserIdModalOpen?: () => void;
  userIdLoading?: boolean;
  userIdSaving?: boolean;

  // アプリ情報
  appVersion?: string;
  appBuild?: string;

  accessibilityLabel?: string;
};

// デフォルトの設定セクション定義はコンポーネント内で構築（ユーザーIDのドラフト管理のため）

export const SettingsPanel = React.forwardRef<any, SettingsPanelProps>(
  (props, ref) => {
    const {
      variant = "default",
      settings,
      title = "設定",
      showHeader = true,
      compactMode = false,
      sections = {
        appearance: false,
        notifications: true,
        behavior: true,
        data: true,
        about: true,
      },
      customItems = [],
      accessibilityLabel,
      ...restProps
    } = props;

    // デフォルトセクションの構築（appearance は非表示だが互換のため残置）
    const defaultSections: { [key: string]: SettingItem[] } = {
      userId: [
        {
          id: "userId",
          type: "info",
          title: "userId",
          description: settings.userId
            ? ``
            : "未設定 - BLE操作には設定が必要です",
          icon: User,
          value: settings.userId || "未設定",
        },
        {
          id: "userIdEdit",
          type: "action",
          title: "ユーザーIDを変更 (モーダル)",
          description: "モーダルで詳細に編集",
          disabled: restProps.userIdLoading || restProps.userIdSaving,
          onPress: restProps.onUserIdModalOpen,
        },
      ],
      about: [
        ...(restProps.appVersion
          ? [
              {
                id: "version",
                type: "info" as const,
                title: "バージョン",
                value: `${restProps.appVersion}${
                  restProps.appBuild ? ` (${restProps.appBuild})` : ""
                }`,
                icon: Info,
              },
            ]
          : []),
        {
          id: "privacy",
          type: "link",
          title: "プライバシーポリシー",
          icon: Shield,
          onPress: restProps.onOpenPrivacyPolicy,
        },
        {
          id: "licenses",
          type: "link",
          title: "ライセンス情報",
          icon: ExternalLink,
          onPress: restProps.onOpenLicenses,
        },
        {
          id: "support",
          type: "link",
          title: "サポートに連絡",
          icon: ExternalLink,
          onPress: restProps.onContactSupport,
        },
      ],
    };

    // 設定項目のレンダリング
    const renderSettingItem = React.useCallback(
      (item: SettingItem) => {
        const IconComponent = item.icon;

        return (
          <SettingsItem
            key={item.id}
            interactive={!!(item.onPress || item.onChange)}
            onPress={
              item.type === "action" || item.type === "link"
                ? item.onPress
                : undefined
            }
          >
            <XStack alignItems="center" space="$3" flex={1}>
              {IconComponent && (
                <IconComponent
                  size={20}
                  color={item.destructive ? "$red9" : "$color11"}
                />
              )}

              <YStack flex={1}>
                <M_Text
                  fontSize={compactMode ? "$3" : "$4"}
                  fontWeight="500"
                  color={item.destructive ? "$red11" : "$color"}
                >
                  {item.title}
                </M_Text>
                {item.description && !compactMode && (
                  <M_Text fontSize="$2" color="$color11" opacity={0.8}>
                    {item.description}
                  </M_Text>
                )}
              </YStack>
            </XStack>

            {/* 設定値とコントロール */}
            <XStack alignItems="center" space="$2">
              {item.type === "toggle" && (
                <Switch
                  size="$2"
                  checked={item.value}
                  onCheckedChange={item.onChange}
                  disabled={item.disabled}
                  accessibilityRole="switch"
                  accessibilityLabel={item.title}
                >
                  <Switch.Thumb />
                </Switch>
              )}

              {item.type === "input" && (
                <Input
                  flex={1}
                  size="$3"
                  value={item.value || ""}
                  placeholder={item.placeholder}
                  onChangeText={item.onChange}
                  disabled={item.disabled}
                  keyboardType={item.keyboardType || "default"}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              {item.type === "select" && (
                <XStack alignItems="center" space="$2">
                  <M_Text fontSize="$3" color="$color11">
                    {item.options?.find((opt) => opt.value === item.value)
                      ?.label || item.value}
                  </M_Text>
                  <ChevronRight size={16} color="$color11" />
                </XStack>
              )}

              {item.type === "info" && (
                <M_Text fontSize="$3" color="$color11">
                  {item.value}
                </M_Text>
              )}

              {(item.type === "action" || item.type === "link") && (
                <ChevronRight
                  size={16}
                  color={item.destructive ? "$red9" : "$color11"}
                />
              )}
            </XStack>
          </SettingsItem>
        );
      },
      [compactMode]
    );

    // アクセシビリティプロパティ
    const accessibilityProps = {
      accessibilityLabel: accessibilityLabel || "設定パネル",
      accessible: true,
    };

    return (
      <StyledSettingsPanel
        ref={ref}
        variant={variant}
        space={compactMode ? "$2" : "$3"}
        {...accessibilityProps}
        {...restProps}
      >
        {/* ヘッダー */}
        {showHeader && (
          <PanelHeader>
            <H3 fontSize="$6" fontWeight="700" color="$color">
              {title}
            </H3>
            {/* テーマ切り替えボタンは削除 */}
          </PanelHeader>
        )}

        {/* ユーザーID設定 */}
        {sections.userId && (
          <SettingsSection>
            <H4 fontSize="$4" fontWeight="600" color="$color" marginBottom="$2">
              ユーザー設定
            </H4>
            {(defaultSections.userId || []).map(renderSettingItem)}
          </SettingsSection>
        )}
        {/* カスタム設定項目 */}
        {Array.isArray(customItems) && customItems.length > 0 && (
          <SettingsSection>
            <H4 fontSize="$4" fontWeight="600" color="$color" marginBottom="$2">
              その他
            </H4>
            {(customItems || []).map(renderSettingItem)}
          </SettingsSection>
        )}

        {/* アプリ情報 */}
        {sections.about && (
          <SettingsSection borderBottomWidth={0}>
            <H4 fontSize="$4" fontWeight="600" color="$color" marginBottom="$2">
              アプリ情報
            </H4>
            {(defaultSections.about || []).map(renderSettingItem)}
          </SettingsSection>
        )}
      </StyledSettingsPanel>
    );
  }
);

SettingsPanel.displayName = "SettingsPanel";

// プリセットコンポーネント
export const CompactSettingsPanel = React.forwardRef<
  any,
  Omit<SettingsPanelProps, "variant" | "compactMode">
>((props, ref) => (
  <SettingsPanel
    ref={ref}
    variant="embedded"
    compactMode={true}
    showHeader={false}
    sections={{
      appearance: false,
      notifications: false,
      behavior: true,
      data: false,
      about: false,
    }}
    {...props}
  />
));

export const ModalSettingsPanel = React.forwardRef<
  any,
  Omit<SettingsPanelProps, "variant">
>((props, ref) => <SettingsPanel ref={ref} variant="modal" {...props} />);

export const CardSettingsPanel = React.forwardRef<
  any,
  Omit<SettingsPanelProps, "variant">
>((props, ref) => <SettingsPanel ref={ref} variant="card" {...props} />);

export const EssentialSettingsPanel = React.forwardRef<
  any,
  Omit<SettingsPanelProps, "sections">
>((props, ref) => (
  <SettingsPanel
    ref={ref}
    sections={{
      appearance: false,
      notifications: true,
      behavior: false,
      data: false,
      about: false,
    }}
    {...props}
  />
));

CompactSettingsPanel.displayName = "CompactSettingsPanel";
ModalSettingsPanel.displayName = "ModalSettingsPanel";
CardSettingsPanel.displayName = "CardSettingsPanel";
EssentialSettingsPanel.displayName = "EssentialSettingsPanel";
