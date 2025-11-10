## Context

現在の実装は `react-native-ble-plx` の広告スキャンに依存しており、iOS バックグラウンドでの動作が不安定です。iOS の CoreLocation フレームワークは iBeacon 領域監視 (CLBeaconRegion) を提供しており、OS がビーコンの入退室を検知してアプリをウェイクアップする完全なイベント駆動型アーキテクチャをサポートします。

### 制約

- `expo-location` は **ジオフェンス (円形領域) のみ** 対応し、iBeacon 領域監視は未実装
- `react-native-ble-plx` はバックグラウンドで広告スキャン可能だが、iOS がアプリをサスペンドすると停止する
- Android には CoreLocation 相当の API がないため、引き続き `react-native-ble-plx` を使用

### ステークホルダー

- iOS ユーザー: バッテリー消費削減と検知精度向上のメリット
- Android ユーザー: 影響なし（既存フロー継続）
- 開発者: ネイティブモジュール保守の負担増

## Goals / Non-Goals

### Goals

- iOS で CoreLocation の iBeacon 領域監視を実装し、OS にビーコン入退室検知を完全委任
- ジオフェンス ENTER 時に研究室ビーコン領域の監視を開始し、EXIT 時に停止
- ビーコン ENTER/EXIT イベントで在室 API を呼び出し、状態遷移と通知を実行
- iOS での定期 BLE スキャン (Rapid Retry, BackgroundFetch) を削除してバッテリー消費を削減

### Non-Goals

- Android の BLE 処理変更（既存の `react-native-ble-plx` 広告スキャンを継続）
- 複数ビーコンの同時監視（単一研究室ビーコンのみ対象）
- Ranging API によるリアルタイム距離測定（領域の ENTER/EXIT イベントのみ使用）
- Expo Go での動作（カスタム Dev Client / スタンドアロンビルド必須）

## Decisions

### Decision 1: Expo Config Plugin でネイティブモジュールを注入

- **Why**: Expo のビルドプロセスに統合し、プラグイン有効化だけでネイティブコードを追加できる
- **Alternatives**:
  - **Bare React Native**: Expo の利便性を失う
  - **Expo Modules API**: 学習コスト高、Swift/Kotlin 両対応が必要
- **Rationale**: Config Plugin は既存の `withTransistorsoftBackgroundFetch.js` パターンに沿い、iOS のみのモジュール追加に最適

### Decision 2: iOS のみ実装し、Android は既存フロー継続

- **Why**: Android には CoreLocation 相当の iBeacon 領域監視 API が存在しない
- **Alternatives**:
  - **AltBeacon ライブラリ (Android)**: サードパーティ依存増加、既存の広告スキャンで十分
  - **両 OS 統一**: 実装コスト大、Android のバッテリー消費改善効果が限定的
- **Rationale**: iOS でのバッテリー問題が最優先課題であり、Android は現状維持で問題なし

### Decision 3: CLBeaconIdentityConstraint (iOS 13+) を使用

- **Why**: 最新の iBeacon API で、UUID/Major/Minor の柔軟なフィルタリングが可能
- **Alternatives**:
  - **CLBeaconRegion (iOS 7+)**: 古い API、非推奨警告あり
  - **レガシー API 併用**: コード複雑化
- **Rationale**: iOS 13+ は 2019 年リリースで十分普及しており、最新 API 使用が推奨

### Decision 4: ジオフェンス ENTER でビーコン監視を動的開始

- **Why**: 学外ではビーコン監視不要、ジオフェンス外でのバッテリー消費を回避
- **Alternatives**:
  - **常時ビーコン監視**: ジオフェンス外での無駄なスキャン発生
  - **手動トリガー**: ユーザー操作必要、自動化の目的に反する
- **Rationale**: ジオフェンスとビーコンの 2 段階監視が iOS のベストプラクティス

## Architecture

### コンポーネント構成

```
┌─────────────────────────────────────────┐
│  React Native Layer                     │
│  ├─ hooks/useBeaconMonitoring.ts       │  ← 新規: ネイティブモジュール呼び出し
│  ├─ hooks/useGeofencing.ts             │  ← 改修: iOS でビーコン監視開始
│  └─ tasks/geofencingTask.ts            │  ← 改修: ENTER/EXIT でビーコン制御
└─────────────────────────────────────────┘
                   ↓ (NativeEventEmitter)
┌─────────────────────────────────────────┐
│  Native Module (iOS only)               │
│  ios/RNBeaconMonitoring.swift           │  ← 新規: Swift モジュール
│  └─ CLLocationManager                   │
│     ├─ startMonitoring(beaconRegion)   │
│     ├─ stopMonitoring(beaconRegion)    │
│     └─ didEnterRegion / didExitRegion  │
└─────────────────────────────────────────┘
                   ↓ (Expo Config Plugin)
┌─────────────────────────────────────────┐
│  plugins/withBeaconMonitoring.js        │  ← 新規: ネイティブコード注入
│  ├─ ios/ ディレクトリに .swift 追加     │
│  └─ Info.plist に権限記述追加          │
└─────────────────────────────────────────┘
```

### イベントフロー (iOS)

```
1. [学外] アプリ起動 → useGeofencing が円形ジオフェンス登録
2. [学内進入] OS → didEnterRegion (geofence) → geofencingTask
   → RNBeaconMonitoring.startMonitoring(uuid, major, minor)
   → iOS が研究室ビーコン領域を監視開始
3. [研究室入室] OS → didEnterRegion (beacon) → RNBeaconMonitoring
   → NativeEventEmitter.emit('beaconEnter')
   → geofencingTask → setAppState('PRESENT') + API_URL_ENTER
4. [研究室退室] OS → didExitRegion (beacon) → RNBeaconMonitoring
   → NativeEventEmitter.emit('beaconExit')
   → geofencingTask → setAppState('UNCONFIRMED')
5. [学外退出] OS → didExitRegion (geofence) → geofencingTask
   → RNBeaconMonitoring.stopMonitoring()
   → setAppState('OUTSIDE') + API_URL_EXIT
```

### ネイティブモジュール API 設計

```swift
// RNBeaconMonitoring.swift
@objc(RNBeaconMonitoring)
class RNBeaconMonitoring: RCTEventEmitter {
  @objc func startMonitoring(
    _ uuid: String,
    major: NSNumber,
    minor: NSNumber,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  )

  @objc func stopMonitoring(
    _ uuid: String,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  )

  override func supportedEvents() -> [String]! {
    return ["beaconEnter", "beaconExit"]
  }
}
```

React Native 側インターフェース:

```typescript
// hooks/useBeaconMonitoring.ts
interface BeaconConfig {
  uuid: string;
  major: number;
  minor: number;
}

export const useBeaconMonitoring = () => {
  const startMonitoring = async (config: BeaconConfig): Promise<void> => {
    if (Platform.OS !== "ios") return;
    await RNBeaconMonitoring.startMonitoring(
      config.uuid,
      config.major,
      config.minor
    );
  };

  const stopMonitoring = async (uuid: string): Promise<void> => {
    if (Platform.OS !== "ios") return;
    await RNBeaconMonitoring.stopMonitoring(uuid);
  };

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const enterListener = RNBeaconMonitoring.addListener(
      "beaconEnter",
      (event: { uuid: string; major: number; minor: number }) => {
        // Handle beacon enter
      }
    );

    const exitListener = RNBeaconMonitoring.addListener(
      "beaconExit",
      (event: { uuid: string }) => {
        // Handle beacon exit
      }
    );

    return () => {
      enterListener.remove();
      exitListener.remove();
    };
  }, []);

  return { startMonitoring, stopMonitoring };
};
```

## Risks / Trade-offs

### Risk 1: iOS ネイティブ開発の保守負担

- **Impact**: Swift コードの保守、iOS バージョン更新への追従が必要
- **Mitigation**:
  - ネイティブコードを最小限に保ち、複雑なロジックは React Native 側に配置
  - Config Plugin で自動注入し、手動ネイティブ編集を不要にする
  - 既存の `withTransistorsoftBackgroundFetch.js` パターンを踏襲

### Risk 2: ビーコン検知の遅延・不安定性

- **Impact**: OS の省電力モードや電波状況でビーコン検知が遅れる可能性
- **Mitigation**:
  - 定期タスクを完全廃止せず、iOS でも長時間 (60 分) のフォールバックスキャンを残す
  - ビーコン EXIT 後も一定時間 (3 分) 様子見してから UNCONFIRMED に遷移
  - 通知でユーザーに状態変化を明示

### Risk 3: Android との動作差異

- **Impact**: iOS と Android で検知タイミングやバッテリー消費が異なる
- **Mitigation**:
  - 両 OS の動作をドキュメント化し、期待値を明確化
  - Android でも将来的に AltBeacon 導入を検討できるよう、インターフェースを抽象化

### Trade-off: 複数ビーコン対応の見送り

- **Decision**: 単一研究室ビーコンのみ監視（複数ビーコンの同時監視は Non-Goal）
- **Rationale**: 現在の要件は単一研究室の在室管理であり、複数ビーコン対応は将来拡張で対応可能

## Migration Plan

### Phase 1: ネイティブモジュール実装 (Week 1)

1. `plugins/withBeaconMonitoring.js` 作成
2. `ios/RNBeaconMonitoring.swift` 実装
3. `hooks/useBeaconMonitoring.ts` 実装
4. Dev Client でビーコンイベント受信を確認

### Phase 2: 既存タスク改修 (Week 2)

1. `tasks/geofencingTask.ts` にビーコン監視開始/停止を追加
2. `tasks/periodicCheckTask.ts` に iOS スキップガードを追加
3. 通知メッセージを「ビーコン入退室」に対応

### Phase 3: テスト・検証 (Week 3)

1. iOS Dev Client で学外 → 学内 → 研究室 → 学外のフルフロー確認
2. バックグラウンド 30 分放置後のビーコン検知確認
3. バッテリー消費ログ収集（既存実装と比較）

### Rollback Plan

- Config Plugin を `app.json` から削除して再ビルド
- `tasks/geofencingTask.ts` の変更を Revert
- iOS は既存の広告スキャンフローに戻る

### Monitoring

- ビーコン ENTER/EXIT イベント発生回数を Firebase Analytics で記録
- バックグラウンド実行時間を計測し、既存実装と比較
- ユーザーからの「検知されない」報告を Sentry で追跡

## Open Questions

1. **ビーコンの UUID/Major/Minor 値**: 現在の BLE_SERVICE_UUID から iBeacon パラメータへの移行方法
   - → ビーコンハードウェアの設定を確認し、`constants/index.ts` に追加定義
2. **ビーコン EXIT 後の猶予時間**: 即座に UNCONFIRMED にするか、一定時間 (3 分) 待つか
   - → 3 分間の TTL バッファを残し、頻繁な出入りでの状態フラップを防止
3. **Android への展開時期**: 将来的に AltBeacon で同様の OS 委任を実装するか
   - → Phase 3 完了後、Android のバッテリー消費を計測してから判断
