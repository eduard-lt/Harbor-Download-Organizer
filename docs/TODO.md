# TODO

Contributions welcome. Open an issue before starting significant work.

## High Priority

- [ ] **macOS code signing** — Obtain an Apple Developer ID to sign the DMG build, removing the need for `xattr -cr` workaround.
- [ ] **Release notes automation** — Generate changelog / release notes automatically from git tags (e.g. git-cliff or similar).
- [ ] **CI coverage gates** — Make coverage thresholds blocking in CI (currently warning-only).

## Features

- [ ] **Linux support** — Port the Tauri app and monitoring service to Linux.
- [ ] **Multi-folder monitoring** — Watch more than just the Downloads folder.
- [ ] **Custom notifications** — System notifications when files are moved or rules fire.
- [ ] **Dry-run mode** — Preview what would be moved without actually moving files.
- [ ] **Log viewer** — In-app log viewer with search and filters.
- [ ] **Zoom controls** — Ctrl+/Ctrl- for in-app UI scaling.
- [ ] **Save window position** — Persist window position across launches.
- [ ] **Multi-monitor DPI** — Proper handling of mixed DPI across multiple monitors.

## Polish

- [ ] **macOS icon** — Native `.icns` with all required sizes (currently uses scaled PNG).
- [ ] **App sandboxing** — Evaluate sandbox requirements for macOS App Store distribution.
- [ ] **Dark mode refinements** — Ensure all UI surfaces render correctly in dark mode.
- [ ] **Startup performance** — Profile and reduce cold-start time.

## Testing

- [ ] **E2E tests** — Add end-to-end tests for critical user flows.
- [ ] **macOS CI coverage** — Add macOS-specific tests to CI (currently compilation-only check).
- [ ] **Fuzz testing** — Fuzz the config parser with malformed YAML inputs.

## Documentation

- [x] **README** — Rewritten for public launch (v2.0.3).
- [x] **CHANGELOG** — Rebuilt from accurate git history.
- [x] **POE_TASKS.md** — Accurate reference for all tasks.
- [ ] **Architecture doc** — Document crate layout and key abstractions (partially exists in git history).
- [ ] **Contributing guide** — CONTRIBUTING.md with setup, workflow, and PR guidelines.

## Infrastructure

- [ ] **Dependabot** — Enable Dependabot for Rust and npm dependency updates.
- [ ] **Stale issue bot** — Auto-close stale issues and PRs.
- [ ] **GitHub pages** — Host documentation site (optional).
