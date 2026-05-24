# Project Research Summary

**Project:** Harbor  
**Domain:** macOS support for a Windows-first Tauri v2 download organizer  
**Researched:** 2026-05-24  
**Confidence:** MEDIUM

## Executive Summary

Harbor is a lightweight desktop utility that monitors the Downloads folder and organizes files using user-defined rules, delivered as a Tauri v2 (Rust + React) app with tray controls and a CLI. The research points to a macOS-first, menu bar oriented experience: a reliable tray UI with explicit click handlers, OS-correct path resolution, and low-friction file monitoring (preferably FSEvents-backed) are essential for parity with the existing Windows feature set.

The recommended approach is to keep the current Tauri v2 stack and core organizer, then add a platform adapter layer for macOS paths and shell commands, wire the tray behavior explicitly, and leverage official Tauri plugins for autostart. File monitoring must account for macOS permission scope and FSEvents coalescing, with rescans on `need_rescan()` and robust deduping. Key risks are tray click behavior mismatches, missing FS scope for Downloads, FSEvents rename/coalesce edge cases, and LaunchAgent registration issues in dev builds; each has clear prevention steps in the research.

## Key Findings

### Recommended Stack

Keep Tauri v2 and extend with official plugins and a path resolver to ensure macOS parity. The stack is stable but demands disciplined version alignment between Rust and JS packages.

**Core technologies:**
- **Tauri 2.9.x**: desktop runtime — provides macOS tray APIs and template icon support required for menu bar parity.
- **tauri-plugin-autostart 2.x**: autostart integration — supports macOS LaunchAgent via `MacosLauncher::LaunchAgent`.
- **directories 5.x**: cross-platform user dirs — correct Downloads path on macOS, avoids Windows-only defaults.

**Supporting libraries:**
- **@tauri-apps/plugin-autostart 2.5.1**: UI toggle for autostart enable/disable.
- **tauri-plugin-shell 2.x**: open Finder/config with `open` on macOS.
- **tauri-plugin-notification 2.x**: optional for move notifications/undo.

### Expected Features

**Must have (table stakes):**
- Menu bar (tray) icon with core actions (start/stop watch, organize now, open rules, quit).
- Downloads watcher using macOS FSEvents (or polling fallback) with debounced events.
- Rules UI fully functional on macOS (YAML + UI).
- Auto-start at login with user toggle (LaunchAgent).
- Partial download protection for macOS temp extensions.
- Permission guidance for Downloads access (TCC errors).

**Should have (competitive):**
- Menu bar snooze (pause with auto-resume timer).
- Move notifications with undo.
- Auto-detect non-standard Downloads path (iCloud/external).

**Defer (v2+):**
- Finder context menu integration for "Organize Downloads".

### Architecture Approach

Adopt a platform adapter boundary to keep core organizer logic OS-agnostic while isolating macOS path handling and shell commands. The Tauri backend remains the command facade, and the tray continues as the primary control surface.

**Major components:**
1. **React UI (packages/ui)** — rules editor, settings, activity.
2. **Tauri commands (crates/tauri-app/src/commands)** — validate/persist config and call core organizer.
3. **Core organizer (crates/core/src/downloads.rs)** — rule engine, file operations, watcher.
4. **Platform adapters (new core::platform + tauri-app::platform)** — macOS paths, open command, tray icon assets.
5. **Storage/logs** — YAML config + activity log in app data dir.

### Critical Pitfalls

1. **Tray clicks do nothing on macOS** — explicitly handle `on_tray_icon_event` and set `show_menu_on_left_click`/`menuOnLeftClick`.
2. **Autostart toggle fails on macOS** — use `tauri-plugin-autostart` with `MacosLauncher::LaunchAgent` and re-register on path changes in dev.
3. **Downloads operations fail due to missing FS scope** — add `fs:scope` for Downloads and resolve via `downloadDir()`.
4. **FSEvents coalescing/rename semantics** — treat rename as remove+create; rescan on `need_rescan()`.
5. **Hard-coded Windows paths** — use platform resolver and `PathBuf` for all path operations.

## Implications for Roadmap

Suggested phase structure:

### Phase 1: macOS Foundation + Tray Parity
**Rationale:** Everything else depends on a working macOS build, correct paths, and reliable tray controls.  
**Delivers:** macOS build/run, platform path resolver, tray icon/menu parity, open commands for config/downloads.  
**Addresses:** Menu bar tray controls; rules UI baseline (config load/save).  
**Avoids:** Tray click mismatch, hard-coded paths, `xdg-open` misuse.

### Phase 2: Downloads Monitoring + Rules Parity
**Rationale:** Core product value = correct file monitoring and rule execution.  
**Delivers:** Watcher (FSEvents or polling), partial download protection, permission guidance, proper fs scope.  
**Addresses:** Downloads watcher, rules UI fully functional, partial download protection, permission guidance.  
**Avoids:** Missing fs scope, FSEvents rename/coalesce issues, path mis-resolution, event storms.

### Phase 3: Autostart + Background Reliability
**Rationale:** Users expect the organizer to persist across reboots after core behavior is stable.  
**Delivers:** Autostart toggle backed by LaunchAgent, background lifecycle validation, reboot tests.  
**Addresses:** Auto-start at login.  
**Avoids:** LaunchAgent misconfig/duplication.

### Phase 4: Differentiators
**Rationale:** Add polish once parity is stable.  
**Delivers:** Snooze/pause timer, notifications with undo, optional downloads path auto-detection.  
**Addresses:** Differentiator features.  
**Avoids:** UX regressions, notification spam.

### Phase Ordering Rationale
- Establish reliable macOS build/tray and correct OS paths before file monitoring or autostart.
- File monitoring depends on FS scope, permission guidance, and path resolution.
- Autostart only makes sense once background behavior is stable.
- Differentiators should not block parity milestones.

### Research Flags
Phases likely needing deeper research during planning:
- **Phase 2:** FSEvents integration and debouncing behavior; TCC permission UX.
- **Phase 4:** Finder extension feasibility; notification + undo strategy.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Tauri tray + platform adapters.
- **Phase 3:** Tauri autostart plugin usage.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Official Tauri docs + plugins, but version pinning needs validation in repo. |
| Features | MEDIUM | Parity requirements clear; competitor analysis is low confidence. |
| Architecture | MEDIUM | Based on current repo layout and standard Tauri patterns. |
| Pitfalls | MEDIUM | Grounded in Tauri/notify docs; macOS UX assumptions need validation. |

**Overall confidence:** MEDIUM

### Gaps to Address
- Validate FSEvents behavior and `notify` integration on macOS 26.5+.
- Confirm permission error handling plus guidance UX for TCC blocks.
- Verify LaunchAgent reliability for dev builds with changing app paths.
- Confirm tray icon asset requirements (`iconAsTemplate`) and click behavior on macOS.

## Sources

### Primary (HIGH confidence)
- https://v2.tauri.app/learn/system-tray
- https://v2.tauri.app/reference/javascript/api/namespacepath
- https://v2.tauri.app/plugin/autostart
- https://v2.tauri.app/plugin/file-system
- https://v2.tauri.app/reference/config
- https://github.com/notify-rs/notify/wiki/The-Event-Guide
- https://docs.developer.apple.com/tutorials/data/documentation/coreservices/file_system_events.md
- https://docs.developer.apple.com/tutorials/data/documentation/servicemanagement/smappservice.md
- https://github.com/dirs/directories-rs/blob/main/README.md

### Secondary (MEDIUM confidence)
- `.planning/PROJECT.md`
- `crates/core/src/downloads.rs`
- `crates/tauri-app/src/main.rs`
- https://context7.com/notify-rs/notify/llms.txt

### Tertiary (LOW confidence)
- Competitor mentions (Hazel, Dropzone) without dedicated research.

---
*Research completed: 2026-05-24*  
*Ready for roadmap: yes (once SUMMARY.md can be written/committed)*
