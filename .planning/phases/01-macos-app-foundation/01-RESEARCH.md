# Phase 01: macOS App Foundation — Research

**Researched:** 2026-05-25
**Confidence:** HIGH
**Requirements Covered:** PLAT-01, PLAT-02

## Summary

Phase 1 delivers the first runnable macOS build of Harbor. The research confirms the Tauri v2 stack already supports macOS — the work is adapting platform-specific code, migrating PowerShell scripts to Python, and adding macOS packaging targets. No architectural rewrite is needed; the work is isolating existing Windows assumptions and adding macOS equivalents via `#[cfg(target_os)]` blocks and a lightweight `core::platform` module.

---

## What Must Change (Phase 1 Scope)

### 1. App Data Directory Resolution

**Current:** `harbor_app_dir()` in `crates/core/src/downloads.rs` returns `%LOCALAPPDATA%\Harbor` (Windows-only).
**macOS target:** `~/Library/Application Support/Harbor`

**Approach:** Replace the hard-coded Windows env-var lookup with a `cfg`-gated function using Rust's `std::env::consts::OS` and platform-appropriate base directories. No external crate needed — `std::env::var("HOME")` + `Library/Application Support/Harbor` is sufficient given the constraint of macOS 26.5+ only.

### 2. Default Config Paths

**Current:** `default_config()` in `downloads.rs` uses `USERPROFILE` and Windows-style backslash paths.
**macOS target:** Resolve Downloads via `$HOME/Downloads` and use forward-slash paths in generated YAML.

**Approach:** Gate the default path resolution inside `default_config()` on `cfg(target_os)`, using the same resolver as `harbor_app_dir()`.

### 3. Environment Variable Expansion

**Current:** `expand_env()` in `downloads.rs` only parses `%VAR%` style variables (Windows).
**macOS target:** Must also expand `$VAR`, `${VAR}`, and `~/` (tilde expansion).

**Approach:** Extend `expand_env()` with a second parser branch for POSIX-style variables, gated by `cfg(unix)` or handled unconditionally. The `%VAR%` parser is already a char-by-char scanner; add parallel handling for `$` and `~` tokens.

### 4. Tray Icon Loading

**Current:** `include_bytes!("../../../assets/icon_h.ico")` — Windows `.ico` format, unconditional.
**macOS target:** Load `assets/icon_h_template.png` (black-on-transparent template PNG) for the macOS menu bar.

**Approach:**
```rust
#[cfg(target_os = "macos")]
let icon_bytes = include_bytes!("../../../assets/icon_h_template.png");
#[cfg(target_os = "windows")]
let icon_bytes = include_bytes!("../../../assets/icon_h.ico");
```
The template PNG asset (`icon_h_template.png`) must be created — a black silhouette of the Harbor "H" on a transparent background, following Apple's menu bar icon guidelines (should be ~22x22pt @2x = 44x44px).

### 5. Native File/Folder Opening

**Current:** Uses `explorer` on Windows, `xdg-open` fallback.
**macOS target:** Spawn `open` command.

**Approach:** Add a `cfg`-gated helper:
```rust
#[cfg(target_os = "macos")]
fn open_path(path: &Path) { Command::new("open").arg(path).spawn()... }
```
Applied in `open_config_file` and `open_downloads_folder` command handlers.

### 6. Poe Task Migration (D-01 through D-05)

**Current:** PowerShell scripts for `version`, `bump-*`, `coverage`, `size`, `clean-startup`, `git-release`.
**macOS target:** Cross-platform Python scripts using only the standard library.

**Tasks to migrate:**
| Task | Current | New |
|------|---------|-----|
| `version` | `tools/version.ps1` | `tools/version.py` |
| `bump-*` | `tools/version.ps1 bump` | `tools/version.py bump` |
| `size` | PowerShell, checks `.exe` | Python, checks macOS binaries + `.app` |
| `clean-startup` | `tools/cleanup.ps1` (Windows registry) | Python, removes LaunchAgent plists |
| `coverage` | PowerShell (checks `$LastExitCode`) | Python (checks exit codes) |
| `coverage-ui` | `start` (Windows shell) | `open` on macOS, `xdg-open` on Linux |
| `git-release` | PowerShell | Python |

All scripts use `uv run python tools/...` in pyproject.toml.

### 7. Cargo Workspace macOS Compatibility

**Current issues preventing macOS compilation:**
- `crates/tray/Cargo.toml`: `native-windows-gui` and `windows` crate are unconditional — won't compile on macOS.
- `crates/tauri-app/Cargo.toml`: `winreg` dependency is unconditional — won't compile on macOS.

**Approach:**
- **harbor-tray**: Gate the entire crate behind `cfg(windows)` in the workspace's default members, or add `cfg` gating to its dependencies. Simplest: exclude it from macOS builds via workspace `default-members` or conditional compilation.
- **harbor-tauri-app**: Move `winreg` to `[target.'cfg(windows)'.dependencies]` and gate all `use winreg::*` in source with `#[cfg(windows)]`.
- **harbor-cli**: Gate `winreg` dependency and `tray-install`/`tray-uninstall` subcommands with `#[cfg(windows)]`.

### 8. Tauri Packaging Configuration

**Current:** `tauri.conf.json` bundle targets = `["msi", "nsis"]` (Windows only).
**macOS target:** `["dmg", "app"]` with existing `icon.icns` asset.

**Changes to `tauri.conf.json`:**
```json
"bundle": {
  "targets": ["dmg", "app"],
  "icon": [
    "assets/32x32.png",
    "assets/128x128.png",
    "assets/128x128@2x.png",
    "assets/icon.icns",
    "assets/icon.ico"
  ]
}
```
Target `app` produces the unsigned `.app` bundle for PLAT-01. Target `dmg` wraps it for distribution (D-13).

### 9. Quarantine Removal

**Requirement D-12:** Built `.app` must be instantly runnable without Gatekeeper blocking.

**Approach:** Add a Poe task `unquarantine` that runs `xattr -d com.apple.quarantine <app-bundle>` on the output. Can be chained after `build` automatically or run manually.

### 10. CI Considerations

**Current:** GitHub Actions CI only runs on `windows-latest`.
**For Phase 1:** Add a macOS CI job (`macos-latest` or `macos-15`) that runs `cargo check --workspace` (not full build — dev machines do the `.app` packaging). Ensures code compiles without Windows-only dependencies leaking.

---

## What Stays the Same

- **React frontend** (`packages/ui`) — fully platform-agnostic. No changes needed.
- **Core organizer logic** (`downloads.rs` — `organize_once`, `matches_rule`, `unique_target`, `cleanup_old_symlinks`) — already uses `#[cfg(unix)]` for symlinks.
- **Tauri command API** — commands stay identical; UI doesn't care about platform.
- **Tauri plugins** — `shell`, `dialog`, `notification`, `single-instance`, `autostart` — all cross-platform and already configured.
- **Config format** (YAML) and activity log format — unchanged.

---

## Validation Architecture

### Build Validation (PLAT-01)
- **Test:** `cargo check --workspace` passes on macOS (compile check without bundling)
- **Test:** `cargo build --release` produces `harbor-cli` and `harbor-tauri-app` binaries
- **Test:** `tauri build --bundles app` produces `Harbor.app` in `src-tauri/target/release/bundle/macos/`
- **Test:** `pyproject.toml` tasks (`build`, `dev`, `lint`) run without error on macOS

### Runtime Validation (PLAT-02)
- **Test:** `Harbor.app` launches and renders the main window (manual testing — no headless macOS)
- **Test:** Tray icon appears in macOS menu bar with correct menu items
- **Test:** Left-click on tray icon shows/focuses main window
- **Test:** Config file loads from `~/Library/Application Support/Harbor/harbor.downloads.yaml`
- **Test:** Default config is generated with correct macOS Downloads path

### Nyquist Dimensions
1. **Path Resolution** — `harbor_app_dir()` returns macOS path; `default_config()` uses macOS defaults
2. **Tray Icon** — Template PNG loads and renders correctly in menu bar
3. **File Opening** — `open_config_file` and `open_downloads_folder` use `open` command
4. **Env Expansion** — `$HOME`, `~/`, and `%VAR%` all expand correctly
5. **Build Artifact** — `Harbor.app` bundle produced without signing
6. **Task Runner** — All Poe tasks execute on macOS without PowerShell dependency
7. **Compile Gate** — `cargo check --workspace` passes (no Windows-only deps leak)
8. **Quarantine** — `xattr -d` clears quarantine on built `.app`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `harbor-tray` crate blocks workspace compilation | HIGH | Build fails | Exclude from macOS default-members, gate deps |
| `winreg` blocks `harbor-tauri-app` compilation | HIGH | Build fails | Move to `cfg(windows)` dependency |
| Template PNG icon renders poorly in menu bar | MEDIUM | UI quality | Follow Apple HIG (44x44px, black silhouette, transparent bg) |
| `tauri build` fails due to missing Xcode CLT | MEDIUM | Can't produce .app | Document prerequisite: `xcode-select --install` |
| Quarantine still blocks after build | LOW | UX friction | `xattr -d` in build pipeline; test on fresh build |
| Python stdlib version scripts break edge cases | LOW | Build pipeline issues | Keep PowerShell scripts for Windows backward compat |

---

## Prerequisites (Developer Machine)

1. macOS 26.5+ (per project constraints)
2. Xcode Command Line Tools: `xcode-select --install`
3. Rust stable toolchain (already required for Tauri)
4. Node.js / npm (already required for frontend)
5. `uv` installed (for Poe task execution)

---

## File Change Inventory

| File | Change |
|------|--------|
| `crates/core/src/downloads.rs` | `harbor_app_dir()` → macOS path; `default_config()` → macOS defaults; `expand_env()` → POSIX support |
| `crates/core/src/platform/mod.rs` | NEW: platform adapter module |
| `crates/core/src/platform/macos.rs` | NEW: macOS path/env helpers |
| `crates/tauri-app/src/main.rs` | `cfg`-gated tray icon; `open_path()` helper; `cfg`-gate `winreg` usage |
| `crates/tauri-app/Cargo.toml` | Gate `winreg` with `cfg(windows)` |
| `crates/tauri-app/tauri.conf.json` | Bundle targets: `["dmg", "app"]` |
| `crates/cli/Cargo.toml` | Gate `winreg` with `cfg(windows)` |
| `crates/cli/src/main.rs` | Gate `tray-install`/`tray-uninstall` with `cfg(windows)` |
| `crates/tray/Cargo.toml` | Gate deps with `cfg(windows)` |
| `Cargo.toml` (root) | Exclude `harbor-tray` from macOS default-members (or gate) |
| `pyproject.toml` | Replace PowerShell script refs with `uv run python tools/...` |
| `tools/version.py` | NEW: cross-platform version bumper |
| `tools/size.py` | NEW: cross-platform size measurer |
| `tools/cleanup_startup.py` | NEW: macOS LaunchAgent cleanup |
| `tools/coverage.py` | NEW: cross-platform coverage runner |
| `tools/coverage_ui.py` | NEW: cross-platform coverage opener |
| `assets/icon_h_template.png` | NEW: macOS menu bar template icon |
| `.github/workflows/ci.yml` | Add macOS job |

---

## Sources

- **Primary:** `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, Phase 1 CONTEXT.md, codebase exploration (main.rs, downloads.rs, tauri.conf.json, pyproject.toml, Cargo.toml files)
- **Research:** `.planning/research/STACK.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md`
- **External:** Tauri v2 tray documentation, `directories` crate docs, Apple HIG (menu bar icons)

---
*Research complete for Phase 01: macOS App Foundation*
