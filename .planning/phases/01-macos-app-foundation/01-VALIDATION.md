---
phase: 01
slug: macos-app-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-25
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `cargo test` (Rust), `vitest` (React frontend) |
| **Config file** | `crates/tauri-app/tauri.conf.json` |
| **Quick run command** | `cargo check --workspace` |
| **Full suite command** | `cargo test --workspace && npm test --prefix packages/ui` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cargo check --workspace`
- **After every plan wave:** Run `cargo test --workspace && npm test --prefix packages/ui`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | PLAT-01 | — | N/A | build | `cargo check --workspace` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | PLAT-01 | — | N/A | build | `cargo build --release` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | PLAT-01 | — | N/A | manual | — | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | PLAT-01 | — | N/A | unit | `cargo test --workspace` | ❌ W0 | ⬜ pending |
| 01-01-05 | 01 | 1 | PLAT-02 | — | N/A | manual | — | ❌ W0 | ⬜ pending |
| 01-01-06 | 01 | 1 | PLAT-02 | — | N/A | manual | — | ❌ W0 | ⬜ pending |
| 01-01-07 | 01 | 1 | PLAT-02 | — | N/A | unit | `npm test --prefix packages/ui` | ❌ W0 | ⬜ pending |
| 01-01-08 | 01 | 1 | PLAT-01 | — | N/A | source | `pyproject.toml` tasks run | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `crates/core/src/platform/` — test module for path resolution (macOS vs Windows)
- [ ] `crates/core/src/downloads.rs` — unit tests for `expand_env()` POSIX expansion
- [ ] `crates/tauri-app/src/main.rs` — integration test for tray icon loading (or manual verification)
- [ ] `.github/workflows/ci.yml` — macOS CI job for `cargo check --workspace`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `.app` bundle launches to main window | PLAT-01, PLAT-02 | Headless macOS GUI testing not feasible | Build `.app`, launch from Finder, verify main window renders |
| Tray icon appears in macOS menu bar | PLAT-02 | Requires GUI session | Launch app, verify icon in menu bar, click to show window |
| `open` command opens Downloads folder | PLAT-02 | Requires Finder UI | Right-click tray → Open Downloads → Finder opens ~/Downloads |
| Template PNG renders correctly in light/dark mode | PLAT-02 | Visual check | Toggle between light/dark macOS appearance, verify icon is visible |
| Quarantine removal on `.app` | PLAT-01 | Requires fresh build | `xattr -d com.apple.quarantine Harbor.app`, verify launches without Gatekeeper dialog |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
