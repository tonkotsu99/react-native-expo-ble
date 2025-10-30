import { UserIdPanel } from "@/components/organisms/UserIdPanel";
import { X } from "@tamagui/lucide-icons";
import type { FC } from "react";
import React from "react";
import { Modal, View } from "react-native";
import { Button, H2, Separator, XStack, YStack } from "tamagui";

type UserIdModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  draftUserId: string;
  onDraftUserIdChange: (value: string) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  loading: boolean;
  hintVisible: boolean;
};

export const UserIdModal: FC<UserIdModalProps> = ({
  isOpen,
  onClose,
  userId,
  draftUserId,
  onDraftUserIdChange,
  onSave,
  saving,
  loading,
  hintVisible,
}) => {
  const handleSave = async () => {
    await onSave();
    // 保存成功後、モーダルを閉じる
    if (!saving) {
      onClose();
    }
  };

  const modalContent = (
    <YStack space="$4" padding="$4">
      {/* ヘッダー */}
      <XStack alignItems="center" justifyContent="space-between">
        <H2 fontSize="$6" fontWeight="700" color="$color">
          ユーザーID設定
        </H2>
        <Button
          size="$3"
          circular
          icon={X}
          onPress={onClose}
          disabled={saving}
          variant="outlined"
          accessibilityLabel="モーダルを閉じる"
        />
      </XStack>

      <Separator />

      {/* 現在のユーザーID表示 */}
      {userId && (
        <YStack space="$2">
          <H2 fontSize="$4" color="$color11">
            現在のユーザーID
          </H2>
          <YStack
            padding="$3"
            backgroundColor="$backgroundFocus"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <H2 fontSize="$5" fontWeight="600" color="$color">
              {userId}
            </H2>
          </YStack>
        </YStack>
      )}

      {/* UserIdPanelを使用 */}
      <YStack space="$3" alignItems="center">
        <UserIdPanel
          value={draftUserId}
          onChange={onDraftUserIdChange}
          onSave={handleSave}
          saving={saving}
          loading={loading}
          hintVisible={hintVisible}
        />
      </YStack>

      {/* ボタンエリア */}
      <XStack space="$3" justifyContent="flex-end">
        <Button
          size="$4"
          variant="outlined"
          onPress={onClose}
          disabled={saving}
          accessibilityLabel="キャンセル"
        >
          キャンセル
        </Button>
        <Button
          size="$4"
          onPress={handleSave}
          disabled={loading || saving || !draftUserId.trim()}
          accessibilityLabel={saving ? "保存中" : "ユーザーIDを保存"}
        >
          {saving ? "保存中..." : "保存"}
        </Button>
      </XStack>
    </YStack>
  );

  // React Native Modalを使用してPortal依存を回避
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        <View
          style={{
            width: "90%",
            maxWidth: 500,
            maxHeight: "80%",
            backgroundColor: "white",
            borderRadius: 12,
            padding: 0,
          }}
        >
          {modalContent}
        </View>
      </View>
    </Modal>
  );
};

export default UserIdModal;
