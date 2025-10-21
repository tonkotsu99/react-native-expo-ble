import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_ID_KEY = "user_profile_user_id";

/** 永続化されたユーザーIDを取得する */
export const getUserId = async (): Promise<string | null> => {
  const stored = await AsyncStorage.getItem(USER_ID_KEY);
  if (!stored) {
    return null;
  }
  return stored;
};

/** ユーザーIDを保存する */
export const setUserId = async (userId: string): Promise<void> => {
  await AsyncStorage.setItem(USER_ID_KEY, userId);
};

/** ユーザーIDを削除する */
export const clearUserId = async (): Promise<void> => {
  await AsyncStorage.removeItem(USER_ID_KEY);
};
