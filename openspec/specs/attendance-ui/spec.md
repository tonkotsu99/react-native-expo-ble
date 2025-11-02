# attendance-ui Specification

## Purpose

The attendance-ui specification defines the comprehensive user interface for the BLE attendance management application. This specification covers the atomic design system implementation, responsive layouts, theme support, accessibility features, and user interaction patterns for attendance tracking through BLE device connections.

## Requirements

### Requirement: Enhanced Atomic Design System

The application SHALL implement a complete atomic design hierarchy with atoms, molecules, organisms, and templates to ensure consistent, reusable, and maintainable UI components.

#### Scenario: Foundation Components

- **GIVEN** the application needs consistent UI elements
- **WHEN** developers create new UI components
- **THEN** they SHALL use the foundation components from `constants/icons.ts`, `constants/animations.ts`, and `utils/accessibility.ts`
- **AND** all components SHALL follow WCAG 2.1 AA accessibility guidelines
- **AND** components SHALL support both light and dark themes

#### Scenario: Atoms Layer Usage

- **GIVEN** basic UI elements are needed
- **WHEN** building interface components
- **THEN** developers SHALL use the atoms: `IconButton`, `StatusIcon`, `AnimatedSpinner`, and `ThemeToggleButton`
- **AND** each atom SHALL provide multiple variant presets
- **AND** atoms SHALL be fully accessible with proper ARIA labels

#### Scenario: Molecules Layer Composition

- **GIVEN** complex UI elements are needed
- **WHEN** combining atoms into functional units
- **THEN** developers SHALL use molecules: `StatusCard`, `ConnectionVisualization`, `LogEntry`, and `ProgressIndicator`
- **AND** molecules SHALL compose atoms in meaningful combinations
- **AND** molecules SHALL handle user interactions appropriately

#### Scenario: Organisms Layer Integration

- **GIVEN** complete UI sections are needed
- **WHEN** building page sections
- **THEN** developers SHALL use organisms: `StatusDashboard`, `ActivityLog`, `ConnectionPanel`, and `SettingsPanel`
- **AND** organisms SHALL integrate multiple molecules and atoms
- **AND** organisms SHALL manage complex state and user workflows

### Requirement: Responsive Main Template

The application SHALL provide a responsive main template that adapts to mobile, tablet, and desktop layouts with appropriate navigation patterns.

#### Scenario: Mobile Layout Adaptation

- **GIVEN** the application is running on a mobile device
- **WHEN** the main template renders
- **THEN** it SHALL use a single-column layout with bottom navigation
- **AND** the sidebar SHALL be hidden
- **AND** floating action buttons SHALL be available for quick access

#### Scenario: Tablet Layout Adaptation

- **GIVEN** the application is running on a tablet device
- **WHEN** the main template renders
- **THEN** it SHALL use a two-column layout with left sidebar
- **AND** navigation SHALL be available in the sidebar
- **AND** content SHALL use the remaining space efficiently

#### Scenario: Desktop Layout Adaptation

- **GIVEN** the application is running on a desktop device
- **WHEN** the main template renders
- **THEN** it SHALL use a multi-column layout with enhanced sidebar
- **AND** additional dashboard information SHALL be displayed
- **AND** hover effects and enhanced interactions SHALL be available

### Requirement: Theme and Accessibility Support

The application SHALL provide comprehensive theme switching and accessibility features that comply with modern web standards.

#### Scenario: Theme Switching

- **GIVEN** a user wants to change the application theme
- **WHEN** they interact with the theme toggle button
- **THEN** the application SHALL switch between light, dark, and system themes
- **AND** the preference SHALL be persisted across sessions
- **AND** all UI components SHALL adapt to the new theme instantly

#### Scenario: Accessibility Compliance

- **GIVEN** users with disabilities need to use the application
- **WHEN** they interact with any UI component
- **THEN** proper accessibility labels and hints SHALL be provided
- **AND** keyboard navigation SHALL be supported
- **AND** screen reader compatibility SHALL be maintained
- **AND** color contrast SHALL meet WCAG 2.1 AA standards

### Requirement: BLE Device Connection

UI はクロスプラットフォーム（iOS/Android）で BLE 権限処理と接続機能を提供しなければならない (SHALL)。権限拒否時には適切なユーザーフィードバックを表示しなければならない (SHALL)。

#### Scenario: Request BLE permissions on iOS

- **GIVEN** ユーザーが iOS デバイスで入室ボタンを押下する
- **WHEN** `useBLE.requestPermissions()` が呼び出される
- **THEN** システムは Bluetooth 状態を確認し、必要に応じて権限ダイアログを表示しなければならない (SHALL)
- **AND** ユーザーが権限を許可した場合、BLE スキャンを開始しなければならない (SHALL)
- **AND** ユーザーが権限を拒否した場合、適切なエラー通知を表示しなければならない (SHALL)

#### Scenario: Handle iOS Bluetooth disabled

- **GIVEN** iOS 端末で Bluetooth が無効になっている
- **WHEN** `useBLE.requestPermissions()` が呼び出される
- **THEN** システムは Bluetooth 有効化を促すメッセージを表示しなければならない (SHALL)
- **AND** ユーザーを設定画面に誘導する選択肢を提供しなければならない (SHALL)

#### Scenario: Cross-platform permission handling

- **GIVEN** Android/iOS 問わず BLE 機能を使用する
- **WHEN** 権限リクエストが実行される
- **THEN** 各プラットフォーム固有の権限処理が適切に実行されなければならない (SHALL)
- **AND** 権限状態に応じて一貫した UI フィードバックが提供されなければならない (SHALL)

### Requirement: User ID Management Notifications

ユーザー ID の保存、読み込み、検証時の結果は `Alert.alert()` ではなくローカル通知で通知しなければならない (SHALL)。

#### Scenario: User ID save success notification

- **GIVEN** ユーザーが新しいユーザー ID を入力して保存する
- **WHEN** `useAttendanceUserId.ts` がユーザー ID を正常に保存する
- **THEN** 「ユーザー ID を保存しました」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない

#### Scenario: User ID save failure notification

- **GIVEN** ユーザー ID の保存処理でエラーが発生する
- **WHEN** `useAttendanceUserId.ts` が保存に失敗する
- **THEN** 「保存に失敗しました」というローカル通知を送信しなければならない (SHALL)
- **AND** エラーメッセージが通知本文に含まれる

#### Scenario: User ID required notification

- **GIVEN** ユーザー ID が未設定の状態で BLE 操作が試みられる
- **WHEN** `useRequireUserId.ts` がユーザー ID 未設定を検出する
- **THEN** 「ユーザー ID を設定してください」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない

#### Scenario: User ID loading notification

- **GIVEN** ユーザー ID の読み込み処理が進行中である
- **WHEN** `useRequireUserId.ts` がローディング状態を検出する
- **THEN** 「ユーザー ID 読込中」というローカル通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用しない

### Requirement: Manual Attendance Controls

アプリはダッシュボード内に BLE 在室フローのための接続操作を提供しなければならない (SHALL)。ユーザー操作の結果はローカル通知で通知しなければならない (SHALL)。ダッシュボードの手動操作のみで接続・切断フローを完遂でき、別タブに移動する必要があってはならない (SHALL NOT)。

#### Scenario: Start scan from dashboard controls

- **GIVEN** ユーザーがダッシュボードタブを開き、BLE デバイスが未接続である
- **WHEN** ユーザーがダッシュボード上のメインアクションボタンをタップする
- **THEN** アプリは `useBLE` を通じて BLE パーミッションを要求しなければならない (SHALL)
- **AND** スキャン/接続フローを起動し、成功時にはデバイスが接続済みになるようにしなければならない (SHALL)
- **AND** 接続成功時には「研究室デバイスに接続しました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Disconnect via dashboard action panel

- **GIVEN** BLE デバイスが接続済みである
- **WHEN** ユーザーがダッシュボード上の退室ボタンをタップする
- **THEN** アプリは `disconnectDevice` を呼び出して接続を解除しなければならない (SHALL)
- **AND** 接続状態インジケーターは切断状態を示さなければならない (SHALL)
- **AND** 切断成功時には「研究室デバイスから切断されました」というローカル通知を送信しなければならない (SHALL)

#### Scenario: Show scanning progress on dashboard

- **GIVEN** ユーザーがダッシュボードからスキャンを開始する
- **WHEN** スキャンが進行中である
- **THEN** ダッシュボードはスキャン完了までアクションボタンをローディングインジケーターに置き換えなければならない (SHALL)

#### Scenario: Display connected device details on dashboard

- **GIVEN** BLE デバイスが接続済みである
- **THEN** ダッシュボードは接続状態とデバイス名をヘッダーまたはカード内に表示しなければならない (SHALL)

#### Scenario: Align dashboard status cards

- **GIVEN** the dashboard renders the presence status card and the BLE connection card side by side
- **WHEN** the viewport is wide enough to support multiple columns
- **THEN** both cards SHALL share an equal width and align with the dashboard spacing tokens
- **AND** on narrow layouts the cards SHALL stack vertically while maintaining full-width sizing

#### Scenario: Require user identifier before dashboard actions

- **GIVEN** ユーザー ID が永続ストアに設定されていない
- **WHEN** ユーザーがダッシュボードからスキャンまたは退室操作を試みる
- **THEN** 操作をブロックし、ユーザーに ID 設定を促すガイダンス通知を送信しなければならない (SHALL)
- **AND** 既存の `Alert.alert()` は使用せず、ローカル通知を利用しなければならない (SHALL)

#### Scenario: Connection tab removed

- **GIVEN** ユーザーがボトムタブバーを確認する
- **THEN** 「Connection」タブは表示されてはならず (SHALL NOT)、ダッシュボードと設定タブのみが表示されなければならない (SHALL)

### Requirement: Settings panel excludes app info section

設定画面は「アプリ情報」セクションを表示してはならない (SHALL NOT)。設定画面に表示する項目はユーザー操作や状態確認に必要なカードへ限定しなければならない (SHALL)。

#### Scenario: Settings screen hides app info block

- **GIVEN** ユーザーが設定タブを開く
- **WHEN** 画面がレンダリングされる
- **THEN** 「アプリ情報」という見出しやバージョン情報は表示されてはならない (SHALL NOT)
- **AND** プライバシーポリシーやサポートへのリンクを含むアプリ情報項目は設定画面に表示されてはならない (SHALL NOT)
