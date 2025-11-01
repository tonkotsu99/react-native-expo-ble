import { Activity, Settings, Wifi } from "@tamagui/lucide-icons";
import React from "react";
import { SafeAreaView } from "react-native";
import type { YStackProps } from "tamagui";
import { ScrollView, styled, useMedia, XStack, YStack } from "tamagui";
import { IconButton } from "../atoms/IconButton";
import { M_Text } from "../atoms/M_Text";
import { ThemeToggleButton } from "../atoms/ThemeToggleButton";
import type { BLEConnectionStatus } from "../molecules/ConnectionVisualization";
import type { LogEntryData } from "../molecules/LogEntry";
// logs タブは廃止のため ActivityLog は使用しない
import { ConnectionPanel } from "../organisms/ConnectionPanel";
import {
  SettingsPanel,
  type SettingItem,
  type SettingsValues,
} from "../organisms/SettingsPanel";
import {
  StatusDashboard,
  type DashboardState,
} from "../organisms/StatusDashboard";

// ベ�EスとなるEnhancedMainTemplateスタイル
const StyledMainTemplate = styled(SafeAreaView, {
  name: "EnhancedMainTemplate",
  flex: 1,
  backgroundColor: "$background",
});

// レスポンシブコンチE��
const ResponsiveContainer = styled(YStack, {
  name: "ResponsiveContainer",
  flex: 1,

  variants: {
    layout: {
      mobile: {
        // モバイル�E�縦向き�E�レイアウチE
        flexDirection: "column",
      },
      tablet: {
        // タブレチE���E�横向き�E�レイアウチE
        flexDirection: "row",
        maxWidth: 1200,
        alignSelf: "center",
        width: "100%",
      },
      desktop: {
        // チE��クトップレイアウチE
        flexDirection: "row",
        maxWidth: 1400,
        alignSelf: "center",
        width: "100%",
        padding: "$4",
      },
    },
  } as const,

  defaultVariants: {
    layout: "mobile",
  },
});

// メインコンチE��チE��リア
const MainContent = styled(YStack, {
  name: "MainContent",
  flex: 1,

  variants: {
    layout: {
      mobile: {
        padding: "$3",
      },
      tablet: {
        padding: "$4",
        flex: 2,
      },
      desktop: {
        padding: "$5",
        flex: 3,
      },
    },
  } as const,
});

// サイドバー
const Sidebar = styled(YStack, {
  name: "Sidebar",

  variants: {
    layout: {
      mobile: {
        display: "none", // モバイルでは非表示
      },
      tablet: {
        width: 300,
        padding: "$3",
        borderRightWidth: 1,
        borderRightColor: "$borderColor",
      },
      desktop: {
        width: 350,
        padding: "$4",
        borderRightWidth: 1,
        borderRightColor: "$borderColor",
      },
    },
  } as const,
});

// フローチE��ングアクションボタン
const FloatingActionButton = styled(XStack, {
  name: "FloatingActionButton",
  position: "absolute",
  bottom: 20,
  right: 20,
  backgroundColor: "$blue10",
  borderRadius: "$round",
  padding: "$3",
  shadowColor: "$shadowColor",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 8,
  space: "$2",
  alignItems: "center",

  variants: {
    layout: {
      mobile: {
        // モバイルでのみ表示
      },
      tablet: {
        display: "none",
      },
      desktop: {
        display: "none",
      },
    },
  } as const,
});

// ボトムナビゲーション�E�モバイル用�E�E
const BottomNavigation = styled(XStack, {
  name: "BottomNavigation",
  backgroundColor: "$backgroundStrong",
  borderTopWidth: 1,
  borderTopColor: "$borderColor",
  paddingVertical: "$3",
  paddingHorizontal: "$4",
  justifyContent: "space-around",
  alignItems: "center",

  variants: {
    layout: {
      mobile: {
        // モバイルでのみ表示
      },
      tablet: {
        display: "none",
      },
      desktop: {
        display: "none",
      },
    },
  } as const,
});

// レイアウトタイチE
export type LayoutType = "mobile" | "tablet" | "desktop";

// ナビゲーションタチE
export type NavigationTab = "dashboard" | "connection" | "settings";

// DeviceInfo型！EonnectionVisualizationから忁E��E��E
export type DeviceInfo = {
  id: string;
  name?: string;
  rssi?: number;
  serviceUUIDs?: string[];
  isConnectable?: boolean;
};

// ConnectionProcess型！EonnectionPanelから忁E��E��E
export type ConnectionProcess = {
  step: string;
  progress: number;
  canCancel: boolean;
  estimatedTime?: number;
  errors?: string[];
};

// EnhancedMainTemplate プロパティ
export type EnhancedMainTemplateProps = YStackProps & {
  // レイアウト設宁E
  layout?: LayoutType;
  showSidebar?: boolean;

  // ナビゲーション
  activeTab?: NavigationTab;
  onTabChange?: (tab: NavigationTab) => void;

  // チE�Eタ
  dashboardState: DashboardState;
  connectionStatus: BLEConnectionStatus;
  deviceInfo?: DeviceInfo;
  connectionProcess?: ConnectionProcess;
  logs: LogEntryData[];
  settings: SettingsValues;
  customSettingsItems?: SettingItem[];

  // BLE操佁E
  onStartScan?: () => void;
  onStopScan?: () => void;
  onConnect?: (deviceId?: string) => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  onCopyDeviceId?: (deviceId: string) => void;

  // アプリ操作
  onAppStatePress?: (state: any) => void;
  onThemeChange?: (theme: "light" | "dark" | "system") => void;
  onSettingChange?: (key: keyof SettingsValues, value: any) => void;
  onRefreshDashboard?: () => void;
  onUserIdSave?: (userId: string) => Promise<void>;
  onUserIdModalOpen?: () => void;
  userIdLoading?: boolean;
  userIdSaving?: boolean;

  // ログ操佁E
  onLogPress?: (log: LogEntryData) => void;
  onLogDetails?: (log: LogEntryData) => void;
  onRefreshLogs?: () => void;
  onClearLogs?: () => void;
  onExportLogs?: () => void;

  // 状慁E
  isLoading?: boolean;
  hasPermissions?: boolean;
  bluetoothEnabled?: boolean;

  // カスタマイズ
  customContent?: React.ReactNode;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  // Router 管理タブ時に内部のボトムナビを抑止する
  hideBottomNavigation?: boolean;

  accessibilityLabel?: string;
};

export const EnhancedMainTemplate = React.forwardRef<
  any,
  EnhancedMainTemplateProps
>((props, ref) => {
  const {
    layout,
    showSidebar = true,
    activeTab = "dashboard",
    onTabChange,
    dashboardState,
    connectionStatus,
    deviceInfo,
    connectionProcess,
    settings,
    customSettingsItems,
    onStartScan,
    onStopScan,
    onConnect,
    onDisconnect,
    onReconnect,
    onCopyDeviceId,
    onAppStatePress,
    onThemeChange,
    onSettingChange,
    onRefreshDashboard,
    onUserIdSave,
    onUserIdModalOpen,
    userIdLoading = false,
    userIdSaving = false,
    // logs タブは廃止（一部設定用ハンドラのみ利用）
    onClearLogs: _onClearLogs,
    onExportLogs: _onExportLogs,
    hasPermissions = true,
    bluetoothEnabled = true,
    customContent,
    headerContent,
    footerContent,
    accessibilityLabel,
    hideBottomNavigation = false,
  } = props;

  // メチE��アクエリでレスポンシブレイアウトを自動判宁E
  const media = useMedia();
  const detectedLayout: LayoutType =
    layout || (media.gtMd ? "desktop" : media.gtSm ? "tablet" : "mobile");

  // タブ�Eり替え�E琁E
  const handleTabChange = React.useCallback(
    (tab: NavigationTab) => {
      onTabChange?.(tab);
    },
    [onTabChange]
  );

  // アクセシビリチE��プロパティ
  const accessibilityProps = {
    accessibilityLabel: accessibilityLabel || "BLE出席管琁E��インペ�Eジ",
    accessible: true,
  };

  // アクチE��ブなコンチE��チE�E取征E
  const getActiveContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <StatusDashboard
            layout={detectedLayout === "mobile" ? "compact" : "default"}
            variant={detectedLayout === "desktop" ? "elevated" : "default"}
            dashboardState={dashboardState}
            showHeader={detectedLayout !== "mobile"}
            showThemeToggle={detectedLayout === "mobile"}
            compactMode={detectedLayout === "mobile"}
            stackCards={detectedLayout === "mobile"}
            onAppStatePress={onAppStatePress}
            onThemeToggle={onThemeChange}
            onRefresh={onRefreshDashboard}
            onReconnect={onReconnect}
            onDisconnect={onDisconnect}
            onCopyDeviceId={onCopyDeviceId}
          />
        );

      case "connection":
        return (
          <ConnectionPanel
            variant={detectedLayout === "mobile" ? "default" : "card"}
            connectionStatus={connectionStatus}
            deviceInfo={deviceInfo}
            process={connectionProcess}
            showHeader={detectedLayout !== "mobile"}
            showAdvancedControls={detectedLayout !== "mobile"}
            compactMode={detectedLayout === "mobile"}
            onStartScan={onStartScan}
            onStopScan={onStopScan}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onReconnect={onReconnect}
            onCopyDeviceId={onCopyDeviceId}
            hasPermissions={hasPermissions}
            bluetoothEnabled={bluetoothEnabled}
          />
        );

      // logs タブは廃止

      case "settings":
        return (
          <SettingsPanel
            variant={detectedLayout === "mobile" ? "default" : "card"}
            settings={settings}
            customItems={customSettingsItems}
            showHeader={detectedLayout !== "mobile"}
            compactMode={detectedLayout === "mobile"}
            sections={{
              userId: true,
              appearance: true,
              notifications: true,
              behavior: true,
              data: false,
              about: false,
            }}
            onSettingChange={onSettingChange}
            onThemeChange={onThemeChange}
            onClearData={_onClearLogs}
            onExportData={_onExportLogs}
            onUserIdSave={onUserIdSave}
            onUserIdModalOpen={onUserIdModalOpen}
            userIdLoading={userIdLoading}
            userIdSaving={userIdSaving}
          />
        );

      default:
        return customContent || null;
    }
  };

  return (
    <StyledMainTemplate ref={ref} {...accessibilityProps}>
      {/* ヘッダーコンチE��チE*/}
      {headerContent}

      {/* メインコンチE��チE��リア */}
      <ResponsiveContainer layout={detectedLayout}>
        {/* サイドバー�E�タブレチE��・チE��クトップ！E*/}
        {showSidebar && detectedLayout !== "mobile" && (
          <Sidebar layout={detectedLayout}>
            <YStack space="$3">
              {/* ナビゲーションメニュー */}
              <YStack space="$2">
                <M_Text
                  fontSize="$3"
                  fontWeight="600"
                  color="$color11"
                  paddingHorizontal="$3"
                >
                  メニュー
                </M_Text>

                <IconButton
                  variant={activeTab === "dashboard" ? "solid" : "ghost"}
                  size="medium"
                  icon={Activity}
                  onPress={() => handleTabChange("dashboard")}
                  justifyContent="flex-start"
                >
                  ダチE��ュボ�EチE
                </IconButton>

                <IconButton
                  variant={activeTab === "connection" ? "solid" : "ghost"}
                  size="medium"
                  icon={Wifi}
                  onPress={() => handleTabChange("connection")}
                  justifyContent="flex-start"
                >
                  BLE接綁E
                </IconButton>

                {/* logs タブは廃止 */}

                <IconButton
                  variant={activeTab === "settings" ? "solid" : "ghost"}
                  size="medium"
                  icon={Settings}
                  onPress={() => handleTabChange("settings")}
                  justifyContent="flex-start"
                >
                  設宁E
                </IconButton>
              </YStack>

              {/* サイドバーのダチE��ュボ�Eド情報�E�デスクトップ�Eみ�E�E*/}
              {detectedLayout === "desktop" && activeTab !== "dashboard" && (
                <StatusDashboard
                  layout="compact"
                  variant="transparent"
                  dashboardState={dashboardState}
                  showHeader={false}
                  showThemeToggle={false}
                  compactMode={true}
                  stackCards={true}
                  showConnectionDetails={false}
                />
              )}
            </YStack>
          </Sidebar>
        )}

        {/* メインコンチE��チE*/}
        <MainContent layout={detectedLayout}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {getActiveContent()}
          </ScrollView>
        </MainContent>
      </ResponsiveContainer>

      {/* ボトムナビゲーション�E�モバイルのみ�E�E*/}
      {detectedLayout === "mobile" && !hideBottomNavigation && (
        <BottomNavigation layout={detectedLayout}>
          <IconButton
            variant={activeTab === "dashboard" ? "solid" : "ghost"}
            size="$3"
            icon={Activity}
            onPress={() => handleTabChange("dashboard")}
            iconOnly
          />

          <IconButton
            variant={activeTab === "connection" ? "solid" : "ghost"}
            size="$3"
            icon={Wifi}
            onPress={() => handleTabChange("connection")}
            iconOnly
          />

          {/* logs タブは廃止 */}

          <IconButton
            variant={activeTab === "settings" ? "solid" : "ghost"}
            size="$3"
            icon={Settings}
            onPress={() => handleTabChange("settings")}
            iconOnly
          />
        </BottomNavigation>
      )}

      {/* フローチE��ングアクションボタン�E�モバイルのみ�E�E*/}
      {detectedLayout === "mobile" && activeTab === "dashboard" && (
        <FloatingActionButton layout={detectedLayout}>
          <ThemeToggleButton size="medium" onThemeChange={onThemeChange} />
        </FloatingActionButton>
      )}

      {/* フッターコンチE��チE*/}
      {footerContent}
    </StyledMainTemplate>
  );
});

EnhancedMainTemplate.displayName = "EnhancedMainTemplate";

// プリセチE��コンポ�EネンチE
export const MobileMainTemplate = React.forwardRef<
  any,
  Omit<EnhancedMainTemplateProps, "layout">
>((props, ref) => (
  <EnhancedMainTemplate
    ref={ref}
    layout="mobile"
    showSidebar={false}
    {...props}
  />
));

export const TabletMainTemplate = React.forwardRef<
  any,
  Omit<EnhancedMainTemplateProps, "layout">
>((props, ref) => (
  <EnhancedMainTemplate
    ref={ref}
    layout="tablet"
    showSidebar={true}
    {...props}
  />
));

export const DesktopMainTemplate = React.forwardRef<
  any,
  Omit<EnhancedMainTemplateProps, "layout">
>((props, ref) => (
  <EnhancedMainTemplate
    ref={ref}
    layout="desktop"
    showSidebar={true}
    {...props}
  />
));

export const CompactMainTemplate = React.forwardRef<
  any,
  Omit<EnhancedMainTemplateProps, "showSidebar">
>((props, ref) => (
  <EnhancedMainTemplate ref={ref} showSidebar={false} {...props} />
));

MobileMainTemplate.displayName = "MobileMainTemplate";
TabletMainTemplate.displayName = "TabletMainTemplate";
DesktopMainTemplate.displayName = "DesktopMainTemplate";
CompactMainTemplate.displayName = "CompactMainTemplate";
