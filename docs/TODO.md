# TODO

Contributions welcome. Open an issue before starting significant work.

## High Priority

- [ ] **macOS code signing** — Obtain an Apple Developer ID to sign the DMG build, removing the need for `xattr -cr` workaround.
- [x] **Release notes automation** — Generate changelog / release notes automatically from git tags (e.g. git-cliff or similar).
- [x] **CI coverage gates** — Make coverage thresholds blocking in CI (currently warning-only).

### Audit Findings — Critical

- [x] **Inconsistent log formats between tray and Tauri app** — `crates/tray/src/logic.rs` uses `"Moved src -> dst (Rule: name)"` while `crates/tauri-app/src/commands/settings.rs` uses `"src -> dst (name)"`. The activity log parser won't parse tray-produced entries correctly.
- [x] **Two separate download organization engines** — The tray crate (`crates/tray`) duplicates logic from the Tauri app for `append_recent`, `load_initial_config`, and `cleanup_old_symlinks`. These should be unified under `harbor-core`.
- [x] **`cli` crate contains legacy orchestrator code** — The 17K-line `crates/cli/src/main.rs` depends on `orchestrator` feature of `harbor-core`, which is a completely separate feature set (service orchestration, not download organization). This split personality is confusing and the CLI crate appears unmaintained.

### Audit Findings — High

- [x] **`assets/harbor_h.png` referenced via fragile relative path** — `crates/tauri-app/src/main.rs` uses `include_bytes!("../../../assets/harbor_h.png")`. Path is brittle and depends on the crate being built from the workspace root.
- [x] **`dismiss_update_available` is a no-op** — The `dismiss_update_available` Tauri command does nothing (comment says "Tray management removed"). Either remove the command or implement dismissal logic.
- [x] **`notify_update_available` ignores `_url` parameter** — The URL parameter is accepted but never used. The notification doesn't help the user actually get the update.
- [x] **uv.lock is effectively empty (125 bytes)** — Python dependencies are not locked, making Python tooling non-deterministic across environments.
- [x] **`open_config_file` on Windows uses `cmd /C start ""`** — The empty quoted argument after `start` is a known Windows quirk, but is fragile and uncommented.
- [x] **No integration tests for Tauri app** — All Tauri command tests (`crates/tauri-app/src/commands/*.rs`) are unit tests operating on `AppState` directly. No end-to-end Tauri `setup` or menu event tests exist.
- [x] **Fuzz build artifacts in `crates/core/fuzz/target`** — The fuzz target directory contains compiled binaries and build artifacts. Should be in `.gitignore` (currently only `artifacts/` and `corpus/` are ignored, not the full `target/`).
- [x] **Orchestrator `up`/`down` tests use `System::new_all()` and spawn real processes** — `crates/core/src/orchestrator.rs` tests spawn `sleep 5`/`ping` processes and use `ProcessesToUpdate::All`, which is resource-intensive and potentially flaky.
- [x] **Hardcoded `csp` in `tauri.conf.json` uses `unsafe-inline` for styles** — Relaxes CSP policy. Should use hashes or nonces instead.

## Features

- [ ] **Linux support** — Port the Tauri app and monitoring service to Linux. Includes adding `#[cfg(target_os = "linux")]` platform module with path resolution, tray integration, and installer packaging.
- [ ] **Multi-folder monitoring** — Watch more than just the Downloads folder.
- [ ] **Custom notifications** — System notifications when files are moved or rules fire.
- [x] **macOS notification center** — Integrate with macOS Notification Center (UNUserNotificationCenter) for native alerts.
- [ ] **Dry-run mode** — Preview what would be moved without actually moving files.
- [ ] **Log viewer** — In-app log viewer with search and filters.
- [x] **Save window position** — Persist window position across launches.
- [x] **Multi-monitor DPI** — Proper handling of mixed DPI across multiple monitors.

## Polish

- [ ] **macOS icon** — Native `.icns` with all required sizes (currently uses scaled PNG).
- [ ] **App sandboxing** — Evaluate sandbox requirements for macOS App Store distribution.
- [ ] **Dark mode refinements** — Ensure all UI surfaces render correctly in dark mode.
- [ ] **Startup performance** — Profile and reduce cold-start time.

## Testing

- [x] **E2E tests** — Add end-to-end tests for critical user flows.
- [x] **macOS CI coverage** — Add macOS-specific tests to CI (currently compilation-only check).
- [x] **Fuzz testing** — Fuzz the config parser with malformed YAML inputs.

## Documentation

- [x] **README** — Rewritten for public launch (v2.0.3).
- [x] **CHANGELOG** — Rebuilt from accurate git history.
- [x] **POE_TASKS.md** — Accurate reference for all tasks.
- [x] **Architecture doc** — Document crate layout and key abstractions (partially exists in git history).
- [x] **Contributing guide** — CONTRIBUTING.md with setup, workflow, and PR guidelines.

## Infrastructure

- [x] **Dependabot** — Enable Dependabot for Rust and npm dependency updates.
- [ ] **Stale issue bot** — Auto-close stale issues and PRs.
- [x] **GitHub Pages** — Documentation site hosted at [eduard-lt.github.io/Harbor-Download-Organizer](https://eduard-lt.github.io/Harbor-Download-Organizer/).
