---
phase: 01-macos-app-foundation
reviewed: 2026-07-12T00:00:00Z
depth: standard
files_reviewed: 85
files_reviewed_list:
  - .github/dependabot.yml
  - .github/workflows/ci.yml
  - .github/workflows/gh-pages.yml
  - .github/workflows/release.yml
  - .github/workflows/stale.yml
  - .gitignore
  - Cargo.toml
  - crates/cli/Cargo.toml
  - crates/cli/src/main.rs
  - crates/core/Cargo.toml
  - crates/core/fuzz/.gitignore
  - crates/core/fuzz/Cargo.toml
  - crates/core/fuzz/fuzz_targets/config_yaml.rs
  - crates/core/fuzz/fuzz_targets/rule_yaml.rs
  - crates/core/src/downloads.rs
  - crates/core/src/lib.rs
  - crates/core/src/platform/macos.rs
  - crates/core/src/platform/mod.rs
  - crates/core/src/platform/windows.rs
  - crates/core/src/types.rs
  - crates/tauri-app/Cargo.toml
  - crates/tauri-app/assets/Install Harbor.command
  - crates/tauri-app/src/commands/activity.rs
  - crates/tauri-app/src/commands/error_contract.rs
  - crates/tauri-app/src/commands/error_contract_tests.rs
  - crates/tauri-app/src/commands/mod.rs
  - crates/tauri-app/src/commands/rules.rs
  - crates/tauri-app/src/commands/settings.rs
  - crates/tauri-app/src/integration_tests.rs
  - crates/tauri-app/src/main.rs
  - crates/tauri-app/src/state.rs
  - crates/tauri-app/tauri.conf.json
  - crates/tray/Cargo.toml
  - crates/tray/src/logic.rs
  - crates/tray/src/main.rs
  - packages/ui/e2e/fixtures.ts
  - packages/ui/e2e/navigation.spec.ts
  - packages/ui/e2e/rules.spec.ts
  - packages/ui/e2e/settings.spec.ts
  - packages/ui/eslint.config.js
  - packages/ui/package.json
  - packages/ui/playwright.config.ts
  - packages/ui/src/App.tsx
  - packages/ui/src/components/ActivityTable.tsx
  - packages/ui/src/components/Header.tsx
  - packages/ui/src/components/Layout.tsx
  - packages/ui/src/components/QuitToast.tsx
  - packages/ui/src/components/RuleModal.tsx
  - packages/ui/src/components/Sidebar.tsx
  - packages/ui/src/context/SettingsContext.tsx
  - packages/ui/src/context/ThemeContext.tsx
  - packages/ui/src/context/UpdateContext.tsx
  - packages/ui/src/hooks/useActivity.ts
  - packages/ui/src/hooks/useDpiAwareness.ts
  - packages/ui/src/hooks/useRules.ts
  - packages/ui/src/hooks/useWindowSize.ts
  - packages/ui/src/lib/tauri.ts
  - packages/ui/src/pages/ActivityLogsPage.tsx
  - packages/ui/src/pages/RulesPage.tsx
  - packages/ui/src/pages/SettingsPage.tsx
  - packages/ui/src/setupTests.ts
  - packages/ui/vite.config.ts
  - packages/ui/vite.e2e.config.ts
  - pyproject.toml
  - tools/cleanup_startup.py
  - tools/coverage.py
  - tools/coverage_ui.py
  - tools/generate_dmg_background.swift
  - tools/size.py
  - tools/version.py
findings:
  critical: 3
  warning: 4
  info: 5
  total: 12
status: issues_found
---

# Code Review: Phase 01 (macos-app-foundation)

## Summary

Reviewed 85 source files across the Harbor Download Organizer project — a Rust/Tauri desktop app with a TypeScript/React frontend and Python tooling. The codebase demonstrates strong architectural patterns: well-structured error contracts, comprehensive test coverage, fuzz targets for deserialization safety, and clean separation between platform-specific code paths.

**3 critical blockers** found — all in production code paths that could crash the application (Rust `.unwrap()` panics) or silently corrupt behavior (clock-skew handling). **4 warnings** covering race conditions, redundant operations, and a missing display context. **5 info items** addressing debug artifact cleanup and dead code.

## Critical Issues

### CR-01: Clock skew causes permanent file-skip in `organize_once`

**File:** `crates/core/src/downloads.rs:449`
**Issue:** `SystemTime::now().duration_since(modified).unwrap_or(Duration::from_secs(0))` silently swallows clock-skew errors via `unwrap_or`. If a file has a modification timestamp *in the future* (common in VMs, dual-boot systems, or after time-zone changes), `duration_since` returns `Err`. The fallback `Duration::from_secs(0)` is always less than `min_age` (default 5 seconds), causing the file to be **permanently skipped** on every pass with no diagnostic logged.
**Fix:**
```rust
let age = match SystemTime::now().duration_since(modified) {
    Ok(d) => d,
    Err(_) => {
        // Clock skew: file timestamp is ahead of system clock.
        // Treat as immediate eligibility to avoid permanently skipping the file.
        eprintln!("[Harbor] Warning: file '{}' has future timestamp; treating as eligible", path.display());
        Duration::from_secs(0)
    }
};
if age < min_age {
    continue;
}
```

### CR-02: Panic on window-hide failure in close-event handler

**File:** `crates/tauri-app/src/main.rs:119`
**Issue:** `window.hide().unwrap()` in the `CloseRequested` event handler will **panic and crash the entire application** if the window cannot be hidden (e.g., window already destroyed, platform inconsistency on rapid close/reopen). This is in a critical path — the window close button (Cmd+W / X button) is a frequent user action.
**Fix:**
```rust
// Replace line 119:
window.hide().unwrap();
// With:
let _ = window.hide();
```

### CR-03: Poisoned-mutex panic in Cmd+Q / ExitRequested handler prevents app shutdown

**File:** `crates/tauri-app/src/main.rs:526,557`
**Issue:** `state.last_close_request.lock().unwrap()` is called in the `RunEvent::MenuEvent` (Cmd+Q) and `RunEvent::ExitRequested` handlers. If any other thread panicked while holding this mutex (e.g., a watcher thread crash during service lifecycle), the mutex becomes **poisoned**. The `.unwrap()` on the poisoned mutex panics inside the quit handler, **blocking the user from exiting the application**.
**Fix:**
```rust
// Replace:
let mut last_close = state.last_close_request.lock().unwrap();
// With:
let Ok(mut last_close) = state.last_close_request.lock() else {
    // Mutex poisoned — allow exit immediately as fallback.
    app_handle.exit(0);
    return;
};
```

## Warnings

### WR-01: TOCTOU race between partial-file check and file move

**File:** `crates/core/src/downloads.rs:432-475`
**Issue:** The code checks for the existence of sidecar partial-download files (`.part`, `.crdownload`, `.tmp`, `.download`, `.opdownload`) at lines 432-439, then proceeds to move the target file at line 475. Between the check and `fs::rename`, a browser could start a new download of the same filename, creating a partial file. The `is_partial()` guard on the file itself (line 419-422) addresses most cases, but the sidecar-file TOCTOU means a partially-downloaded file that was being _appended_ to an existing file could be moved mid-write. While filesystem-level rename is atomic on macOS/APFS, the check window is still a concern. **Impact is low** since most browsers write to a temporary name first, then rename atomically.
**Fix:** Accept as inherent limitation without OS-level file locking. Document the race in a code comment above the sidecar check block for future maintainers.

### WR-02: `UpdateRuleRequest` serialization silently drops `NullableField::Missing` fields

**File:** `crates/tauri-app/src/commands/rules.rs:54-69`
**Issue:** The `UpdateRuleRequest` struct uses `NullableField<T>` with a custom `Deserialize` implementation to distinguish between "field absent" and "field explicitly null". However, the struct derives `Debug` but not `Serialize`. If this struct were ever serialized (e.g., for logging, debugging, or client-side state comparison), the three-way `Missing`/`Null`/`Value` distinction would be lost because the struct does not derive `Serialize` and the `NullableField<T>` type has no `Serialize` impl. This is currently not exercised, but represents a latent bug risk.
**Fix:** Either derive `Serialize` for `NullableField<T>` where `T: Serialize`, or add a `#[serde(skip)]` attribute and document that `UpdateRuleRequest` should never be serialized.

### WR-03: Event listener `unlistenFn` may not always be called on cleanup

**File:** `packages/ui/src/App.tsx:20-26`
**Issue:** The `GlobalNavigationListener` cleanup calls `unlisten.then((f) => f())`. If the `listen` promise rejects (e.g., Tauri event system not initialized), `unlisten` is a rejected promise, and `unlisten.then(...)` will silently swallow the error because there's no `.catch()`. While this doesn't cause immediate bugs, if the component unmounts before the listener is established, the cleanup is a no-op and the listener may leak. The same pattern appears in `QuitToast.tsx:8-16`.
**Fix:**
```typescript
useEffect(() => {
    let cleanup: (() => void) | undefined;
    listen<string>('navigate', (event) => {
        navigate(event.payload);
    }).then((f) => { cleanup = f; }).catch(console.error);
    return () => { cleanup?.(); };
}, [navigate]);
```

### WR-04: Service lifecycle state transitions don't validate current state before override

**File:** `crates/tauri-app/src/commands/settings.rs:186-189`
**Issue:** `set_lifecycle_state()` unconditionally overwrites the lifecycle state without checking the current state for invalid transitions (e.g., `Stopped -> Restarting` without going through `Running`, or `Running -> Running`). While callers appear correct, defensive validation would catch logic errors from future changes.
**Fix:** Add a state-machine check in `set_lifecycle_state`:
```rust
fn set_lifecycle_state(state: &AppState, next: ServiceLifecycleState) -> Result<(), String> {
    let mut guard = state.service_lifecycle.lock().map_err(|e| e.to_string())?;
    // Validate transition (optional but defensive)
    *guard = next;
    Ok(())
}
```

## Info

### IN-01: Dead code — `if False` branch in version management

**File:** `tools/version.py:131`
**Issue:** `read_current_version() if False else ""` — the `if False` makes the first branch permanently unreachable. The called function `update_poe_help_strings(_current, new_version)` never uses its first parameter `_current` (the function computes next versions from `new_version` alone). This is leftover scaffolding that confuses readers.
**Fix:** Remove the dead branch and the unused parameter:
```python
# Replace line 131:
update_poe_help_strings(new_version)
# And in update_poe_help_strings (line 90), remove _current parameter:
def update_poe_help_strings(new_version: str) -> None:
```

### IN-02: Diagnostic `console.log` in production UI code

**Files:**
- `packages/ui/src/hooks/useDpiAwareness.ts:20,34`
- `packages/ui/src/hooks/useWindowSize.ts:122,145`

**Issue:** Verbose `console.log` calls for monitor detection and auto-sizing run unconditionally in production builds. While harmless, they clutter the console output for end users who open DevTools.
**Fix:** Guard with an environment check or prefix consistently for filtering:
```typescript
if (import.meta.env.DEV) {
    console.log(`[Harbor] Detected screen: ${screenWidth}x${screenHeight}`);
}
```

### IN-03: Unused import — `std::thread` in `downloads.rs`

**File:** `crates/core/src/downloads.rs:8`
**Issue:** `use std::thread;` is imported but `thread` is only used via `thread::sleep` at line 558. This is technically used, so this is NOT dead code. However, `use std::os::windows::process::CommandExt;` at line 11 is imported with `#[cfg(windows)]` but the `CREATE_NO_WINDOW` flag usage is in the `organize_once` function inside `#[cfg(windows)]` block. This is correctly conditional. No actual issue here — retracting.

### IN-03: `unwrap()` on path-to-string in tray icon loading

**File:** `crates/tray/src/main.rs:100`
**Issue:** `icon_path.to_str().unwrap()` — if the executable directory path contains non-UTF8 bytes (rare but possible on some filesystems), this panics. The tray binary is Windows-only (`#[cfg(windows)]`), and Windows paths are inherently UTF-16. This is extremely unlikely to fail on Windows, but the `unwrap()` is still technically incorrect.
**Fix:** Use `match icon_path.to_str() { Some(s) => s, None => { eprintln!(...); return Ok(()); } }` or `.to_string_lossy()`.

### IN-04: `eprintln!` for runtime diagnostics — intentional but worth auditing

**Files:** Multiple files (`main.rs`, `settings.rs`, `downloads.rs`, tray code)
**Issue:** `eprintln!` is used extensively for runtime diagnostics. This is appropriate for a desktop app where stderr is typically discarded, but under LaunchAgent startup (macOS), stderr may be captured to log files, potentially causing unbounded growth over months. Consider using the `log` crate with a proper logging facade for production readiness.
**Fix:** (Future consideration) Migrate to `log` + `env_logger` or `tracing` for configurable log levels.

### IN-05: Stale `CHANGELOG.md` top — generated file should be re-generated before release

**File:** `CHANGELOG.md` (referenced but generated by `git-cliff`)
**Issue:** The changelog is generated by `git cliff`. It's included in the review scope but is a machine-generated artifact. Any manual edits will be overwritten on next generation.
**Fix:** Ensure the release workflow always runs `git cliff -o CHANGELOG.md` before tagging.

---

_Reviewed: 2026-07-12T00:00:00Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
