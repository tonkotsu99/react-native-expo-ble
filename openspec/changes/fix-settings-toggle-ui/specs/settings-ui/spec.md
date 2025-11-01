## ADDED Requirements — Settings Toggle Controls

### Requirement: Toggle controls render and behave accessibly

#### Scenario: Toggles use Tamagui Switch with Thumb

- GIVEN a settings item with `type = "toggle"`
- WHEN the Settings panel is rendered
- THEN the control SHALL be implemented as `<Switch ...><Switch.Thumb ... /></Switch>`
- AND the visual state (on/off/disabled) SHALL be clearly indicated

#### Scenario: Accessibility semantics are provided

- GIVEN a toggle settings item
- WHEN assistive technologies inspect the element
- THEN it SHALL expose `accessibilityRole = "switch"`
- AND it SHALL provide an accessible name derived from the item title
- AND it SHALL announce current value (on/off)

#### Scenario: Touch target meets minimum size

- GIVEN mobile usage on iOS/Android
- WHEN a user attempts to activate a toggle
- THEN the touch target SHALL be at least 44pt in both dimensions

#### Scenario: State change invokes onSettingChange

- GIVEN `onSettingChange` handler is provided to SettingsPanel
- WHEN a toggle is changed by the user
- THEN `onSettingChange(key, value)` SHALL be called with the new boolean value
