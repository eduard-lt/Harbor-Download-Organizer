---
phase: 01
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - crates/core/src/downloads.rs
  - crates/core/src/platform/mod.rs
  - crates/core/src/platform/macos.rs
  - crates/core/src/platform/windows.rs
  - crates/tauri-app/src/main.rs
  - crates/tauri-app/Cargo.toml
  - crates/tauri-app/tauri.conf.json
  - crates/cli/Cargo.toml
  - crates/cli/src/main.rs
  - crates/tray/Cargo.toml
  - Cargo.toml
  - pyproject.toml
  - tools/version.py
  - tools/size.py
  - tools/coverage.py
  - tools/coverage_ui.py
  - tools/cleanup_startup.py
  - assets/icon_h_template.png
  - .github/workflows/ci.yml
autonomous: false
requirements:
  - PLAT-01
  - PLAT-02
---

# Plan 01-01: macOS Build Foundation

<objective>
Make Harbor compile, build, and run as an unsigned macOS `.app` that opens to the main window. This plan migrates all Windows-only paths, scripts, and dependencies to cross-platform equivalents and adds macOS packaging targets.
</objective>

<threat_model>
**ASVS Level 1 Assessment — Phase 01: macOS Build Foundation**

| Threat | Severity | Mitigation | Status |
|--------|----------|------------|--------|
| `winreg` crate compiled on macOS leaks Windows registry access patterns | LOW | Gate `winreg` dependency with `#[cfg(windows)]` — no registry code runs on macOS | PENDING |
| `harbor-tray` crate (native-windows-gui) compiled on macOS triggers native Windows GUI initialization | LOW | Exclude `harbor-tray` from macOS workspace members or gate entire crate with `#[cfg(windows)]` | PENDING |
| Symlink creation on macOS follows symbolic links outside app scope | LOW | Existing `#[cfg(unix)]` symlink code respects `target` path — no escalation beyond filesystem operations already authorized | PENDING |
| Tauri `fs:scope` for app data directory exposes config to unauthorized read/write | LOW | App data directory is user-scoped (`~/Library/Application Support/Harbor`) — only the running user can access | PENDING |

**Overall risk:** LOW — Phase 1 is build infrastructure only, no new attack surface beyond existing Tauri security model.
</threat_model>

<tasks>

### Wave 1 — Foundation (no dependencies, can run in parallel)

#### Task 1.1: Create `core::platform` module

<read_first>
- crates/core/src/downloads.rs (current harbir_app_dir and default_config)
- crates/core/src/lib.rs (module declarations)
- .planning/phases/01-macos-app-foundation/01-RESEARCH.md (Section 1: App Data Directory Resolution)
</read_first>

<action>
Create `crates/core/src/platform/mod.rs` with public functions: `app_data_dir() -> PathBuf`, `downloads_dir() -> PathBuf`, `home_dir() -> PathBuf`.

Each function dispatches via `#[cfg(target_os)]`:
- macOS: `HOME` env var → `$HOME/Library/Application Support/Harbor`, `$HOME/Downloads`
- Windows: `LOCALAPPDATA` → `%LOCALAPPDATA%\Harbor`, `USERPROFILE` → `%USERPROFILE%\Downloads`

Create `crates/core/src/platform/macos.rs` implementing `app_data_dir()` returning `$HOME/.join("Library/Application Support/Harbor")`, `downloads_dir()` returning `$HOME/.join("Downloads")`.

Create `crates/core/src/platform/windows.rs` implementing the same API with current Windows paths.

Add `pub mod platform;` to `crates/core/src/lib.rs`.

Test: `cargo test -p harbor-core platform` must pass with tests verifying correct paths on host OS.
</action>

<acceptance_criteria>
- `crates/core/src/platform/mod.rs` compiles with `pub fn app_data_dir()` and `pub fn downloads_dir()`
- `cargo test -p harbor-core` passes (existing tests + new platform tests)
- `cargo check --workspace` passes on macOS (no Windows-only path assumptions leak)
</acceptance_criteria>

#### Task 1.2: Update `harbor_app_dir()` and `default_config()`

<read_first>
- crates/core/src/downloads.rs (lines 16-20: harbir_app_dir, lines 85: default_config)
- crates/core/src/platform/mod.rs (created in Task 1.1)
</read_first>

<action>
Replace `std::env::var("LOCALAPPDATA")` in `harbor_app_dir()` with `platform::app_data_dir()`.
Replace `harbor_log_path()` to use `platform::app_data_dir()`.
In `default_config()`, replace `std::env::var("USERPROFILE")` with `platform::downloads_dir()` for the Downloads paths in generated default rules.
Ensure all generated YAML paths use forward slashes (already handled by PathBuf on macOS).
</action>

<acceptance_criteria>
- `harbor_app_dir()` source no longer contains string literal `"LOCALAPPDATA"`
- `harbor_app_dir()` on macOS returns path ending in `Library/Application Support/Harbor`
- `default_config()` source no longer contains string literal `"USERPROFILE"`
- `cargo test -p harbor-core` passes
</acceptance_criteria>

#### Task 1.3: Extend `expand_env()` for POSIX variables

<read_first>
- crates/core/src/downloads.rs (lines 540+: expand_env function — char-by-char parser for `%VAR%`)
</read_first>

<action>
Extend the `expand_env()` char-by-char parser to handle three patterns in addition to existing `%VAR%`:
1. `$VAR` — when `$` followed by an ASCII alphabetic or `_` char, consume until non-alphanumeric/underscore, expand via `std::env::var`
2. `${VAR}` — when `$` followed by `{`, consume until `}`, expand via `std::env::var`
3. `~/` — when `~` followed by `/` or end-of-string, replace with `HOME` env var

The existing `%VAR%` parser must be preserved for Windows config backward compatibility. POSIX expansion should be unconditional (works on all platforms — PATH-style variables exist everywhere).
Add unit tests for: `$HOME`, `${HOME}`, `~/Documents`, `%USERPROFILE%` (existing), mixed `$HOME/%VAR%`.
</action>

<acceptance_criteria>
- `crates/core/src/downloads.rs` contains `fn expand_env` that handles `$`, `${`, `~`, and `%` patterns
- `cargo test -p harbor-core` passes including new POSIX expansion tests
- Test coverage: `$HOME` resolves to current user's home, `~/Downloads` resolves to `$HOME/Downloads`, `%HOME%` resolves on Windows
</acceptance_criteria>

#### Task 1.4: Gate Windows-only dependencies for macOS compilation

<read_first>
- crates/tauri-app/Cargo.toml (winreg dependency — unconditional)
- crates/cli/Cargo.toml (winreg dependency — unconditional)
- crates/tray/Cargo.toml (native-windows-gui, windows crate — unconditional)
- Cargo.toml (workspace members)
- crates/tauri-app/src/main.rs (any `use winreg` imports)
- crates/cli/src/main.rs (any `use winreg` imports, tray-install/tray-uninstall commands)
</read_first>

<action>
In `crates/tauri-app/Cargo.toml`: move `winreg = "0.55"` from `[dependencies]` to `[target.'cfg(windows)'.dependencies]`.
In `crates/cli/Cargo.toml`: move `winreg = "0.55"` from `[dependencies]` to `[target.'cfg(windows)'.dependencies]`.
In `crates/cli/src/main.rs`: gate `tray-install` and `tray-uninstall` subcommands with `#[cfg(windows)]`.
In `crates/tray/Cargo.toml`: move all `windows` and `native-windows-gui` deps to `[target.'cfg(windows)'.dependencies]`.
In root `Cargo.toml`: exclude `crates/tray` from `default-members` when not on Windows — add `default-members = ["crates/core", "crates/cli", "crates/tauri-app"]` leaving tray as an explicit member only.
Gate all `use winreg::*` statements in `main.rs` files with `#[cfg(windows)]`.
Verify: `cargo check --workspace` must pass on macOS without errors from Windows-only crates.
</action>

<acceptance_criteria>
- `cargo check --workspace` passes on macOS (no `winreg` or `native-windows-gui` compile errors)
- `crates/tauri-app/Cargo.toml` has `winreg` in `[target.'cfg(windows)'.dependencies]`
- `crates/cli/Cargo.toml` has `winreg` in `[target.'cfg(windows)'.dependencies]`
- `crates/tray/Cargo.toml` has all Windows-only deps in `[target.'cfg(windows)'.dependencies]`
</acceptance_criteria>

#### Task 1.5: Create macOS tray icon template PNG

<read_first>
- assets/icon_h.ico (current tray icon — reference for silhouette shape)
- assets/harbor_h.svg (vector source for "H" logo)
</read_first>

<action>
Create `assets/icon_h_template.png` — a 44x44px PNG with the Harbor "H" logo as a black silhouette (#000000) on a fully transparent background.

The icon must follow Apple's Menu Bar Extras guidelines:
- Black silhouette (macOS auto-colors for light/dark mode)
- No color other than black
- 44x44px @2x (renders as ~22x22pt in menu bar)
- Anti-aliased edges

Use the existing `harbor_h.svg` as the source shape. Convert via ImageMagick or any PNG editor: `convert -background none -resize 44x44 assets/harbor_h.svg assets/icon_h_template.png` then adjust to black only.
</action>

<acceptance_criteria>
- `assets/icon_h_template.png` exists and is 44x44px
- PNG is black (#000000 foreground) on transparent background
- File size is reasonable (~1-5 KB for a 44x44 template PNG)
</acceptance_criteria>

---

### Wave 2 — Tauri App macOS Wiring (depends on Wave 1)

#### Task 2.1: Gate tray icon loading for macOS

<read_first>
- crates/tauri-app/src/main.rs (line ~100: `include_bytes!("../../../assets/icon_h.ico")` — tray icon loading)
- assets/icon_h_template.png (created in Task 1.5)
</read_first>

<action>
In `crates/tauri-app/src/main.rs`, replace the single `include_bytes!` call with `cfg`-gated constants:
```rust
#[cfg(target_os = "macos")]
const TRAY_ICON_BYTES: &[u8] = include_bytes!("../../../assets/icon_h_template.png");
#[cfg(target_os = "windows")]
const TRAY_ICON_BYTES: &[u8] = include_bytes!("../../../assets/icon_h.ico");
```
Update the tray builder to use `TRAY_ICON_BYTES` instead of the bare `include_bytes!` call.

Configure tray for macOS template icon behavior: set `icon_as_template(true)` on the TrayIconBuilder for `cfg(target_os = "macos")`.
</action>

<acceptance_criteria>
- `crates/tauri-app/src/main.rs` has `TRAY_ICON_BYTES` const with `cfg(target_os = "macos")` loading `icon_h_template.png`
- `cargo check -p harbor-tauri-app` passes on macOS
- TrayIconBuilder has `icon_as_template(true)` call gated on `cfg(target_os = "macos")`
</acceptance_criteria>

#### Task 2.2: Add macOS `open` command for file/folder opening

<read_first>
- crates/tauri-app/src/main.rs (search for `open_config_file`, `open_downloads_folder` command handlers)
- crates/tauri-app/src/commands/settings.rs (command handler implementations)
</read_first>

<action>
Add a helper function `open_in_shell(path: &Path)` gated by `cfg`:
- `cfg(target_os = "macos")`: `Command::new("open").arg(path).spawn()`
- `cfg(target_os = "windows")`: existing `Command::new("explorer").arg(path).spawn()`

Replace direct `Command::new("explorer")` calls in `open_config_file` and `open_downloads_folder` with `open_in_shell(&path)`.

Also update the tray menu's "Open Downloads" and "Open Config" handlers in `main.rs` to use the same helper.
</action>

<acceptance_criteria>
- `crates/tauri-app/src/main.rs` contains `fn open_in_shell` with `cfg(target_os = "macos")` using `open` command
- No bare `Command::new("explorer")` calls remain — all use `open_in_shell`
- `cargo check -p harbor-tauri-app` passes
</acceptance_criteria>

#### Task 2.3: Update `tauri.conf.json` for macOS bundle targets

<read_first>
- crates/tauri-app/tauri.conf.json (current bundle section with targets `["msi", "nsis"]`)
</read_first>

<action>
In `crates/tauri-app/tauri.conf.json`, update the `bundle` section:
- Change `targets` from `["msi", "nsis"]` to include macOS targets: `["dmg", "app"]` 
  (if both platforms needed in same config, use `"all"` or keep platform-specific via build scripts)
- Ensure `icon` array includes `"assets/icon.icns"` for macOS
- Add `"macOS": { "minimumSystemVersion": "26.5" }` under bundle

If `tauri.conf.json` doesn't support platform-conditional targets, set to `"all"` and rely on the Tauri CLI on each platform to produce the right artifacts.
</action>

<acceptance_criteria>
- `crates/tauri-app/tauri.conf.json` bundle `targets` is not `["msi", "nsis"]` (must include macOS formats or `"all"`)
- `icon` array includes `"assets/icon.icns"`
- `cargo check -p harbor-tauri-app` passes
</acceptance_criteria>

---

### Wave 3 — Task Runner Migration (independent of Waves 1-2)

#### Task 3.1: Create `tools/version.py`

<read_first>
- tools/version.ps1 (current PowerShell version script)
- Cargo.toml (workspace version field)
- crates/tauri-app/tauri.conf.json (version field)
- packages/ui/package.json (version field)
- pyproject.toml (version field)
</read_first>

<action>
Create `tools/version.py` using Python 3 stdlib only (`re`, `pathlib`, `json`, `tomllib`/`tomli` if available, or manual parsing).

Implement subcommands:
- `python tools/version.py` (default): read and print current version from `Cargo.toml` workspace `[workspace.package] version`
- `python tools/version.py bump <major|minor|patch>`: increment version in all four files (`Cargo.toml`, `tauri.conf.json`, `package.json`, `pyproject.toml`) using semver
- `python tools/version.py set <version>`: set explicit version

Files to update and their version paths:
- `Cargo.toml`: `[workspace.package] version = "X.Y.Z"`
- `crates/tauri-app/tauri.conf.json`: `"version": "X.Y.Z"`
- `packages/ui/package.json`: `"version": "X.Y.Z"`
- `pyproject.toml`: `[project] version = "X.Y.Z"` or `[tool.poetry] version`

Use `re.sub` for TOML/JSON replacements with the pattern `(\d+\.\d+\.\d+)`.
</action>

<acceptance_criteria>
- `tools/version.py` exists and uses only Python stdlib imports
- `python tools/version.py` prints current version (e.g., `1.0.5`)
- `python tools/version.py bump patch` increments patch version in all four files
- All four files remain parseable after bump (valid TOML and JSON)
</acceptance_criteria>

#### Task 3.2: Create `tools/size.py` and `tools/coverage.py`

<read_first>
- pyproject.toml (current `size` and `coverage` task definitions with PowerShell)
- crates/tauri-app/tauri.conf.json (bundle output paths)
</read_first>

<action>
Create `tools/size.py`:
- On macOS: measure `target/release/harbor-cli`, `target/release/harbor-tauri-app` binary sizes, and the `Harbor.app` bundle total size using `du -sh`
- On Windows: measure `.exe` files (existing behavior)
- Print a table: | File | Size |

Create `tools/coverage.py`:
- Run `cargo llvm-cov` (or `cargo tarpaulin` if configured) for Rust coverage
- Run `npm run coverage --prefix packages/ui` for frontend coverage
- Exit with non-zero if any coverage command fails (replacing PowerShell `$LastExitCode` check)
- Print combined summary

Create `tools/coverage_ui.py`:
- On macOS: `open` the coverage HTML directory
- On Windows: `start` the coverage HTML (existing behavior)
- On Linux: `xdg-open` the coverage HTML
</action>

<acceptance_criteria>
- `tools/size.py` exists, uses only Python stdlib, runs on macOS without error
- `tools/coverage.py` exists, uses only Python stdlib, `uv run python tools/coverage.py` exits 0 when coverage passes
- `tools/coverage_ui.py` exists, uses only Python stdlib, opens coverage report on macOS
</acceptance_criteria>

#### Task 3.3: Create `tools/cleanup_startup.py`

<read_first>
- tools/cleanup.ps1 (current Windows cleanup script — reference for logic)
- .planning/phases/01-macos-app-foundation/01-CONTEXT.md (D-05: LaunchAgents cleanup)
</read_first>

<action>
Create `tools/cleanup_startup.py`:
- On macOS: find and remove LaunchAgent plist files matching `com.harbor.*.plist` under `~/Library/LaunchAgents/`
- On Windows: delegate to existing `tools/cleanup.ps1` logic (registry cleanup)
- Use `pathlib.Path.home() / "Library/LaunchAgents"` for the macOS LaunchAgents directory
- Print each file removed, or "No LaunchAgents found" if none exist
- Exit 0 even if no files found (clean state is valid)
</action>

<acceptance_criteria>
- `tools/cleanup_startup.py` exists and uses only Python stdlib imports
- On macOS: `python tools/cleanup_startup.py` removes `com.harbor.*.plist` files from `~/Library/LaunchAgents/`
- Script prints each removed file path
- Script exits 0 when no plist files exist (clean slate)
</acceptance_criteria>

#### Task 3.4: Update `pyproject.toml` tasks

<read_first>
- pyproject.toml (current task definitions with PowerShell scripts)
- All new Python scripts from Tasks 3.1-3.3
</read_first>

<action>
Update `pyproject.toml` `[tool.poe.tasks]`:
- `version`: change from `powershell ... tools/version.ps1` to `uv run python tools/version.py`
- `bump-patch`: change to `uv run python tools/version.py bump patch`
- `bump-minor`: change to `uv run python tools/version.py bump minor`
- `bump-major`: change to `uv run python tools/version.py bump major`
- `size`: change from PowerShell to `uv run python tools/size.py`
- `coverage`: change from PowerShell to `uv run python tools/coverage.py`
- `coverage-ui`: change from `start` to `uv run python tools/coverage_ui.py`
- `clean-startup`: change from `powershell ... tools/cleanup.ps1` to `uv run python tools/cleanup_startup.py`
- `git-release`: change from PowerShell to `uv run python tools/version.py` (if version.py handles git tagging) or remove if not migrated

Keep `--execution-policy bypass` or any Windows-specific args removed.
</action>

<acceptance_criteria>
- `pyproject.toml` contains no `powershell` references
- All migrated tasks use `uv run python tools/...`
- `uv run poe version` prints the current version
- `uv run poe size` runs and prints file sizes
</acceptance_criteria>

---

### Wave 4 — CI & Packaging (depends on Waves 1-3)

#### Task 4.1: Add macOS CI job

<read_first>
- .github/workflows/ci.yml (current CI — Windows-only)
</read_first>

<action>
Add a `macos-check` job to `.github/workflows/ci.yml`:
- `runs-on: macos-latest` (or `macos-15` for macOS 26.5+ when available)
- Steps:
  1. Checkout
  2. Install Rust stable with `dtolnay/rust-toolchain@stable`
  3. Install Node.js (for frontend type-check)
  4. Run `cargo check --workspace` (compile check — no full build, no bundling)
  5. Run `npm ci --prefix packages/ui && npm run build --prefix packages/ui`
  6. Run `cargo test --workspace` (unit tests)
- Keep existing `windows-test` job unchanged
- Job does NOT run `tauri build` (requires macOS GUI + Xcode, expensive in CI)
</action>

<acceptance_criteria>
- `.github/workflows/ci.yml` contains a `macos-check` job with `runs-on: macos-latest`
- Job runs `cargo check --workspace` — must pass (no Windows-only deps leak)
- Job runs `cargo test --workspace` — must pass
- Job runs `npm run build --prefix packages/ui` — must pass
</acceptance_criteria>

#### Task 4.2: Add quarantine removal Poe task

<read_first>
- crates/tauri-app/tauri.conf.json (bundle output path)
- .planning/phases/01-macos-app-foundation/01-CONTEXT.md (D-12: Automated Quarantine Removal)
</read_first>

<action>
Add a `unquarantine` task to `pyproject.toml`:
```toml
unquarantine = "xattr -d com.apple.quarantine crates/tauri-app/target/release/bundle/macos/Harbor.app"
```
This removes the quarantine attribute that macOS applies to unsigned apps downloaded/compiled locally.

Update the `build` and `build-debug` tasks to chain: `uv run poe build` → `uv run poe unquarantine` (via `build = ["... build command ...", "unquarantine"]` array form in poe).
</action>

<acceptance_criteria>
- `pyproject.toml` has `unquarantine` task with `xattr -d` command
- `unquarantine` task is chained after `build` task in poe task array
</acceptance_criteria>

</tasks>

<verification>
1. `cargo check --workspace` passes on macOS — no Windows-only dependency leaks
2. `cargo test --workspace` passes — all unit tests green
3. `npm test --prefix packages/ui` passes — frontend unchanged
4. `uv run poe version` prints version — task migration verified
5. `uv run poe size` runs without error — task migration verified
6. `uv run poe lint` passes — code quality maintained
7. Manual: `tauri build --bundles app` produces `Harbor.app` in `target/release/bundle/macos/`
8. Manual: `Harbor.app` launches and renders main window on macOS 26.5+
9. Manual: tray icon appears in macOS menu bar, left-click shows/focuses window
</verification>

<success_criteria>
- [ ] PLAT-01: `Harbor.app` builds successfully from source on macOS (`tauri build --bundles app`)
- [ ] PLAT-02: `Harbor.app` launches and displays the main window on macOS 26.5+
- [ ] `cargo check --workspace` passes on macOS (no platform-specific compilation errors)
- [ ] All Poe tasks execute on macOS without PowerShell dependency
- [ ] macOS CI job passes in GitHub Actions
</success_criteria>

<must_haves>
1. `cargo check --workspace` exits 0 on macOS — the workspace compiles without Windows-only crates leaking
2. `tauri build --bundles app` produces `Harbor.app` — PLAT-01 satisfied
3. `Harbor.app` launches to main window — PLAT-02 satisfied (manual verification)
4. `uv run poe version` prints version — task runner is cross-platform
</must_haves>
