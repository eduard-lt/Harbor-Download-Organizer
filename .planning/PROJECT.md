# Harbor

## What This Is

Harbor is a lightweight desktop utility that monitors your Downloads folder and automatically organizes files into categorized folders using custom rules. It ships today as a Windows app with a Tauri (Rust + React) UI, tray controls, and a CLI for automation.

## Core Value

Keep downloads organized automatically with minimal user effort.

## Current Milestone: v1.2.0 macos-release

**Goal:** Harbor builds and runs on macOS with full Windows feature parity.

**Target features:**
- macOS build + dev run (unsigned, local)
- Tray UI + rules management UI work on macOS
- Download monitoring, rules, symlinks, activity log, conflict handling on macOS
- Auto-start on macOS (LaunchAgent)

## Requirements

### Validated

- ✓ Auto-organize downloads into categorized folders using rules — v0.6.0
- ✓ Tray interface to start/stop watching and run organize now — v0.6.0
- ✓ Rules managed via YAML config and UI — v1.1.0
- ✓ Activity log of moves — v0.6.0
- ✓ Conflict handling via automatic rename — v0.6.0
- ✓ Safe moves that skip partial downloads — v0.6.0
- ✓ Optional symlink creation — v0.6.0
- ✓ Auto-start on Windows — v0.6.0
- ✓ CLI commands for init/organize/watch/validate — v0.6.0

### Active

- [ ] Harbor builds and runs on macOS 26.5+ using the existing Tauri app — v1.2.0
- [ ] Tray UI and rules management UI are fully functional on macOS — v1.2.0
- [ ] macOS download monitoring and file operations match Windows behavior — v1.2.0
- [ ] macOS auto-start is supported via LaunchAgent — v1.2.0
- [ ] macOS dev packaging produces a runnable .app without signing/notarization — v1.2.0

### Out of Scope

- Signed or notarized macOS releases — dev builds only for v1.2.0
- Support for macOS versions below 26.5 — cannot test
- Linux support — deferred

## Context

- Tauri v2 desktop app with Rust backend and React UI.
- Windows-only support today; MSI packaging via Tauri/WiX.
- Rules stored in YAML config and editable in UI; tray app controls watcher and quick actions.

## Constraints

- **Tech stack**: Tauri v2, Rust stable, React UI, Poe task runner — stay within existing stack
- **Platform**: macOS 26.5+ only — testing limitation
- **Distribution**: unsigned developer builds only — no signing/notarization in this milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| macOS dev builds only (no signing/notarization) for v1.2.0 | Focus on getting macOS functionality working before release tooling | — Pending |
| Minimum macOS version 26.5+ | Only version available for testing | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-24 after starting milestone v1.2.0 macos-release*
