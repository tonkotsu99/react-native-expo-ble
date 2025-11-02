import type {
  SettingItem,
  SettingsValues,
} from "@/components/organisms/SettingsPanel";
import { SettingsPanel } from "@/components/organisms/SettingsPanel";
import type { DashboardState } from "@/components/organisms/StatusDashboard";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView, styled, YStack } from "tamagui";

export type SettingsTemplateProps = {
  dashboardState: DashboardState; // currently unused, kept for parity
  settings: SettingsValues;
  customSettingsItems?: SettingItem[];
  onSettingChange?: (key: keyof SettingsValues, value: any) => void;
  onUserIdSave?: (userId: string) => Promise<void>;
  onUserIdModalOpen?: () => void;
  userIdLoading?: boolean;
  userIdSaving?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  accessibilityLabel?: string;
};

const Root = styled(SafeAreaView, {
  name: "SettingsTemplate",
  flex: 1,
  backgroundColor: "$background",
});

export function SettingsTemplate(props: SettingsTemplateProps) {
  const {
    settings,
    customSettingsItems,
    onSettingChange,
    onUserIdSave,
    onUserIdModalOpen,
    userIdLoading,
    userIdSaving,
    headerContent,
    footerContent,
    accessibilityLabel,
  } = props;

  const a11y = {
    accessibilityLabel: accessibilityLabel || "Settings",
    accessible: true,
  } as const;

  return (
    <Root {...a11y}>
      {headerContent}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <YStack space="$3">
          <SettingsPanel
            sections={{
              appearance: false,
              notifications: true,
              behavior: true,
              data: true,
              userId: true,
            }}
            variant="default"
            settings={settings}
            customItems={customSettingsItems}
            onSettingChange={onSettingChange}
            onUserIdSave={onUserIdSave}
            onUserIdModalOpen={onUserIdModalOpen}
            userIdLoading={userIdLoading}
            userIdSaving={userIdSaving}
          />
        </YStack>
      </ScrollView>
      {footerContent}
    </Root>
  );
}
