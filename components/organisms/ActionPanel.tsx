import { FC } from "react";
import { Spinner, YStack } from "tamagui";
import { L_Button } from "../atoms/L_Button";

type Props = {
  connected: boolean;
  isScanning: boolean;
  onScan: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
};

export const ActionPanel: FC<Props> = ({
  connected,
  isScanning,
  onScan,
  onDisconnect,
  disabled = false,
}) => (
  <YStack justifyContent="center" alignItems="center" minHeight={80}>
    {isScanning ? (
      <Spinner size="large" color="$blue10" />
    ) : !connected ? (
      <L_Button onPress={onScan} disabled={disabled}>
        入室 (スキャン開始)
      </L_Button>
    ) : (
      <L_Button theme="red" onPress={onDisconnect} disabled={disabled}>
        退室 (接続解除)
      </L_Button>
    )}
  </YStack>
);
