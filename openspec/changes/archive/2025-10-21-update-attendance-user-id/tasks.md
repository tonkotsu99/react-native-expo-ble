## 1. Implementation
- [x] 1.1 AsyncStorage ベースのユーザープロファイルストア (`state/userProfile.ts`) を追加し、`getUserId` / `setUserId` を実装する
- [x] 1.2 `hooks/useUserProfile.ts` を作成し、UI からユーザー ID を取得・更新できるようにする
- [x] 1.3 `useBLE`, `geofencingTask`, `periodicCheckTask` で `getUserId` を利用し、未設定時は API 呼び出しをスキップして警告を出す
- [x] 1.4 `AttendancePage` がユーザー ID 未設定時に操作をブロックし、設定手段へ誘導する
- [x] 1.5 OpenSpec (`attendance-ui`, `background-ble-maintenance`, `user-identity`) を更新する
- [x] 1.6 `npx eslint . --ext .ts,.tsx` などの検証を実施する
