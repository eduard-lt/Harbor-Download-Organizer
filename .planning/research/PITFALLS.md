# Pitfalls Research

**Domain:** macOS support for a Windows-first Tauri v2 app (tray UI, rules UI, autostart, file monitoring)  
**Researched:** 2026-05-24  
**Confidence:** MEDIUM (core items grounded in Tauri + notify docs; OS-level UX expectations and browser temp-file behavior are lower confidence)

## Critical Pitfalls

### Pitfall 1: Tray click behavior not wired for macOS status bar
**What goes wrong:**  
Tray icon appears, but left-click does nothing (or only shows a menu), leaving users unable to show/hide the main window from the tray.

**Why it happens:**  
Tauri v2 requires explicit wiring for tray icon events (`on_tray_icon_event`) and explicit configuration for left-click menu behavior (`show_menu_on_left_click` / `menuOnLeftClick`). Assuming Windows tray behavior maps 1:1 to macOS status bar causes dead clicks.

**How to avoid:**  
- Implement explicit tray icon click handling to show/unminimize/focus the main window.
- Set menu click behavior explicitly (`show_menu_on_left_click(true/false)` or `menuOnLeftClick`) and test on macOS.
- Verify the "restore window" path in the tray click handler.

**Warning signs:**  
- Users report "tray icon doesn't open the app."
- The tray menu appears but the window never focuses or becomes visible.

**Phase to address:**  
Phase 1 - macOS build + tray UI parity.

---

### Pitfall 2: Autostart toggle does not work because macOS requires LaunchAgent
**What goes wrong:**  
Auto-start toggle works on Windows but fails on macOS (nothing starts on login, or multiple duplicate entries appear).

**Why it happens:**  
macOS autostart uses LaunchAgents; Tauri v2 requires the autostart plugin and the `MacosLauncher::LaunchAgent` configuration. In dev builds, the app path changes often, so stale LaunchAgent entries point to old paths.

**How to avoid:**  
- Use `@tauri-apps/plugin-autostart` and initialize with `MacosLauncher::LaunchAgent`.
- Call `enable()`/`disable()` via plugin APIs; use `isEnabled()` to confirm registration.
- On dev builds, detect path changes and re-register.

**Warning signs:**  
- `isEnabled()` returns false after "enable."
- Login Items show duplicates or outdated paths.

**Phase to address:**  
Phase 3 - Autostart integration.

---

### Pitfall 3: File operations fail because Tauri FS scopes do not include Downloads
**What goes wrong:**  
Rules UI looks fine, but file moves/reads fail on macOS. Monitoring appears "on" but nothing is organized.

**Why it happens:**  
Tauri v2's permission system requires explicit `fs:scope` entries. If Downloads is not in the allow list, file operations are denied even if the backend code is correct.

**How to avoid:**  
- Add `fs:allow-*` and `fs:scope` for the Downloads directory in capabilities.
- Resolve the Downloads path via `downloadDir()` instead of hard-coding.

**Warning signs:**  
- Errors from filesystem APIs, or "permission denied" in logs.
- Behavior works on Windows but not on macOS.

**Phase to address:**  
Phase 2 - File monitoring + rules parity.

---

### Pitfall 4: macOS FSEvents semantics cause missed or duplicated file events
**What goes wrong:**  
Renames or moves appear as "remove + create," or do not appear at all; the app skips or duplicates actions.

**Why it happens:**  
On macOS, FSEvents coalesces changes and represents renames as `Modify(Name)` (and sometimes effectively "remove then create"). Parent renames may produce no event. Notify signals `need_rescan()` when coalescing occurs.

**How to avoid:**  
- Use `notify::recommended_watcher` and treat rename as remove+create.
- If `event.need_rescan()` is true, rescan the folder to rebuild state.
- Deduplicate actions using file IDs or path+timestamp.

**Warning signs:**  
- Missing log entries after renames.
- Files left behind or moved twice.

**Phase to address:**  
Phase 2 - File monitoring + rules parity.

---

### Pitfall 5: Hard-coded Windows paths break downloads monitoring on macOS
**What goes wrong:**  
App watches the wrong directory or fails to watch anything on macOS.

**Why it happens:**  
Using Windows-specific paths or naive `~/Downloads` strings instead of the OS-aware path API.

**How to avoid:**  
- Resolve the Downloads path with `@tauri-apps/api/path` `downloadDir()`.
- Build paths with `PathBuf` instead of manual string concatenation.

**Warning signs:**  
- "Path not found" errors.
- Monitoring "on" but no events.

**Phase to address:**  
Phase 2 - File monitoring + rules parity.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code `~/Downloads` or Windows paths | Quick port | Breaks on macOS and localized directories | Never |
| Ignore `event.need_rescan()` | Fewer code paths | Missed events on macOS FSEvents | Never |
| Over-broad FS scope (for example, `$HOME/**`) | Fewer permission issues | Security risk, future audit failures | Only for local dev |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Tauri tray | Expecting default click behavior to restore window | Wire `on_tray_icon_event` and set `show_menu_on_left_click`/`menuOnLeftClick` explicitly |
| Autostart | Reusing Windows registry logic | Use `tauri-plugin-autostart` with `MacosLauncher::LaunchAgent` |
| FS permissions | Assuming OS permissions are enough | Configure `fs:scope` for Downloads in capabilities |
| File watching | Assuming rename events are reliable | Handle rename as remove+create and rescan on `need_rescan()` |
| Path resolution | Manually building Downloads path | Use `downloadDir()` |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full rescan on every event | High CPU, laggy UI | Only rescan on `need_rescan()` or debounce bursts | Large Download folders (1k+ files) |
| One watcher per rule | Many threads, event storms | Use one watcher plus rule dispatcher | Multiple rule sets |
| Immediate organize on every change | Thrash during downloads | Debounce and ignore in-progress temp files | Large downloads or unpacking |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Over-broad FS scopes | Untrusted UI could read/write anywhere | Scope to Downloads and app data only |
| Accepting arbitrary paths from UI | Path traversal or unwanted moves | Validate target against allowed scopes |
| Autostart without explicit user consent | User distrust, flagged as malware | Require explicit opt-in toggle |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Tray clicks do nothing | App feels broken | Ensure click restores/focuses the main window |
| No guidance when macOS blocks Downloads access | User thinks rules are broken | Show permission troubleshooting message |
| Autostart toggle lacks confirmation | Unclear if it worked | Show status from `isEnabled()` |

## "Looks Done But Isn't" Checklist

- [ ] Tray UI: icon appears but left-click does not open the window (verify `on_tray_icon_event`).
- [ ] Downloads monitor: watcher runs but no moves happen (verify `fs:scope` includes Downloads).
- [ ] Rules parity: rules UI works but organizer fails on macOS (run end-to-end move tests).
- [ ] Autostart: toggle flips but app does not launch after reboot (verify LaunchAgent registration).

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tray click not restoring window | LOW | Patch tray click handler and release hotfix |
| Autostart broken | MEDIUM | Remove stale LaunchAgent and re-register via plugin |
| Missing FS scope | MEDIUM | Update capabilities and inform users to update |
| FSEvents rename/coalesce issues | MEDIUM | Add rescan logic and dedupe state; backfill logs |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Tray click behavior mismatch | Phase 1 - macOS build + tray UI | Manual tray click tests on macOS |
| Autostart misconfigured | Phase 3 - Autostart | Reboot test; `isEnabled()` true |
| FS scope missing | Phase 2 - File monitoring | Integration test moving a file |
| FSEvents rename/coalesce | Phase 2 - File monitoring | Rename/move tests; rescan on coalesce |
| Hard-coded paths | Phase 2 - File monitoring | Path resolves via `downloadDir()` |

## Sources

- https://v2.tauri.app/learn/system-tray
- https://v2.tauri.app/start/migrate/from-tauri-1
- https://v2.tauri.app/plugin/autostart
- https://v2.tauri.app/plugin/file-system
- https://v2.tauri.app/reference/javascript/api/namespacepath
- https://github.com/notify-rs/notify/wiki/The-Event-Guide
- https://context7.com/notify-rs/notify/llms.txt

---
*Pitfalls research for: macOS support (tray UI, file monitoring, autostart)*  
*Researched: 2026-05-24*
