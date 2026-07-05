# Changelog

All notable changes to Harbor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Navigation events now use correct routes in main application logic.
- `reset_to_defaults` leaves the service stopped for user review; tutorial display logic improved.
- Styling adjustments for rule extensions in RulesPage.

## [2.0.2] - 2026-07-05

### Added
- Pointer-based drag and drop for rule reordering.
- sccache caching for improved CI build performance.

### Fixed
- Column widths in RulesPage for better layout.
- Python requirement set to >=3.8 in configuration files.
- Assertion formatting in service stop test.
- CI and release workflows updated to latest action versions.

## [2.0.1] - 2026-07-05

### Added
- Custom DMG with drag-to-install background and one-click install script.
- Ad-hoc code signing and unquarantine step for macOS app bundle.
- Offscreen bitmap DMG background generation (headless CI compatible).
- `Install Harbor.command` bundled in DMG root.
- sccache caching, parallel jobs, and optimized CI pipelines.

### Fixed
- DMG background at correct 660x480 resolution with sharp rendering.
- DMG background fallback to high-resolution offscreen bitmap for CI.
- SessionStorage mock in jsdom test setup (fixes SettingsPage test in CI).
- Removed broken DMG injection; installer script kept inside .app bundle.
- macOS build environment variable `TAURI_BUNDLER_DMG_IGNORE_CI` set correctly.

## [2.0.0] - 2026-07-05

### Added
- **macOS support** — Tauri app builds and runs on macOS (Apple Silicon + Intel).
  - Cross-platform path resolution module.
  - macOS-native tray icon with swapped click behavior and overlay titlebar.
  - macOS-aware layout padding and RuleModal placeholders.
  - DMG build in release pipeline.
- **Cross-platform task runner** — Migrated from PowerShell to Python.
- **Rule priority scoring** — Rules can be scored and reordered via drag-and-drop.
- **Modifier badges** — Visual badges for rule modifiers in the UI.
- Real OS process ID shown in settings (instead of hardcoded "Native").
- macOS CI check job (compilation + tests).

### Fixed
- Windows-only dependencies gated for macOS compilation.
- Path-based tests made platform-aware using `MAIN_SEPARATOR`.
- localStorage mocked in jsdom test setup (fixed 28 test failures).
- ESLint errors resolved across the frontend.
- `module_inception` lint fixed by renaming inner module.
- Missing `CommandExt` import for Windows symlink attribute command.

### Changed
- Task runner migrated from PowerShell to Python (cross-platform).
- Layout and styling updated for macOS compatibility.

## [1.0.5] - 2026-04-19

### Added
- **Reliability improvements** — TDD-driven feature set:
  - Structured `organize-now` outcomes returned to the frontend.
  - Typed app error DTO mapper for consistent error handling.
  - Transactional monitoring restarts with debounce support.
  - Explicit `null` clearing support in `update_rule`.
  - Grouped reliability UX with clear controls.
  - Tray organize outcome events and notifications.

### Fixed
- Clippy blockers in tray and Tauri commands resolved.

## [1.0.4] - 2026-03-31

### Added
- DPI scaling support with smart window sizing.
- Workspace dependencies table and Poe lint tasks.
- Coverage tests for backend and frontend.

### Changed
- **Refactored** command API — positional args replaced with typed request structs for `create_rule`/`update_rule`.
- `rule_name` parameters renamed to `rule_id`; `reorder_rules` optimized with HashMap.
- `harbor_app_dir` and `harbor_log_path` helpers moved to `harbor-core`.
- `save_config_to_disk` helper extracted to eliminate repetition.
- Icon/color derivation consolidated into shared `ui_helpers` module.
- `Rule.enabled` and `create_symlink` changed from `Option<bool>` to `bool` with serde defaults.
- `OrganizeResult` tuple type alias replaced with named struct.
- CI pipeline reorganized with logical flow and optimized builds.

### Fixed
- Collect `organize_once` move errors and surface them instead of printing to stderr.
- Non-ASCII corruption in `expand_env` fixed by using char-based parsing.
- No-op in `stop_watching` removed; stale comment fixed; silent startup failures logged.

## [1.0.3] - 2026-03-10

### Fixed
- 9 code review issues across the workspace.

## [1.0.2] - 2026-03-02

### Fixed
- GitHub repository URL in update checker updated to `eduard-lt/Harbor-Download-Organizer` (fixes "Failed to fetch release info" error).

## [1.0.1] - 2026-02-25

### Added
- More UI and backend tests for increased coverage.
- Modernized testing toolchain.

### Fixed
- **Critical bug** — Prevented premature organization of incomplete downloads:
  - 0-byte placeholder files created by browsers are now skipped.
  - Active partial download detection (`.crdownload`, `.part`, `.tmp`, `.download`, `.opdownload`).
  - `OrganizeResult` rename errors now warn instead of failing the entire process.
- Frontend test failures resolved; tooling modernized; security vulnerabilities fixed.
- CI pipeline failures fixed.

### Changed
- Overrode `yocto-queue` dependency to bypass npm 403 forbidden error.

## [1.0.0] - 2026-02-22

### Added
- Initial stable release of Harbor.
- Complete download organization system.
- System tray application (Windows) with menu controls.
- Command-line interface with commands: `downloads-init`, `downloads-organize`, `downloads-watch`, `tray-install`, `tray-uninstall`, `validate`, `init`, `up`, `down`, `status`, `logs`.
- YAML-based configuration system with customizable rules.
- Automatic file categorization by extension.
- Regex pattern matching for filenames.
- File size filtering (min/max).
- Symlink creation support (requires Developer Mode).
- Activity logging to `recent_moves.log`.
- Conflict handling with automatic file renaming.
- Partial download detection (skips `.crdownload`, `.part`, `.tmp`).
- Auto-start on Windows login.
- MSI installer (WiX-based).
- Single instance enforcement.

---

[Unreleased]: https://github.com/eduard-lt/Harbor-Download-Organizer/compare/v2.0.2...HEAD
[2.0.2]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v2.0.2
[2.0.1]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v2.0.1
[2.0.0]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v2.0.0
[1.0.5]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.0.5
[1.0.4]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.0.4
[1.0.3]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.0.3
[1.0.2]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.0.2
[1.0.1]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.0.1
[1.0.0]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.0.0
