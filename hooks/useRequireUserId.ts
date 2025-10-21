import { useCallback } from "react";
import { Alert } from "react-native";

type UseRequireUserIdOptions = {
  userId: string | null;
  loading: boolean;
};

type RequireUserIdFn = () => boolean;

export const useRequireUserId = ({
  userId,
  loading,
}: UseRequireUserIdOptions): RequireUserIdFn =>
  useCallback(() => {
    if (loading) {
      Alert.alert("ユーザーID読込中", "処理が完了するまでお待ちください。");
      return false;
    }

    if (!userId) {
      Alert.alert(
        "ユーザーIDが未設定です",
        "上部の入力欄からユーザーIDを登録してください。"
      );
      return false;
    }

    return true;
  }, [loading, userId]);
