import { L_Button } from "@/components/atoms/L_Button";
import { M_Text } from "@/components/atoms/M_Text";
import type { FC } from "react";
import { Input, YStack } from "tamagui";

type Props = {
  value: string;
  onChange: (nextValue: string) => void;
  onSave: () => void | Promise<void>;
  saving: boolean;
  loading: boolean;
  hintVisible: boolean;
};

export const UserIdPanel: FC<Props> = ({
  value,
  onChange,
  onSave,
  saving,
  loading,
  hintVisible,
}) => (
  <YStack gap="$2" width="80%" alignItems="center">
    <M_Text>ユーザーID</M_Text>
    <Input
      value={value}
      onChangeText={onChange}
      editable={!saving && !loading}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="default"
    />
    <L_Button onPress={onSave} disabled={loading || saving}>
      {saving ? "保存中..." : "ユーザーIDを保存"}
    </L_Button>
    {hintVisible ? (
      <M_Text color="$orange10">
        ユーザーIDを設定するとBLE操作が可能になります。
      </M_Text>
    ) : null}
  </YStack>
);
