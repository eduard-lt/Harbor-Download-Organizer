# Phase 1: macOS App Foundation - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Establishing a runnable local development environment and building an unsigned macOS app bundle (`.app`) that opens to the main window. This anchors the core platform translation for Harbor from Windows to macOS.

</domain>

<decisions>
## Implementation Decisions

### Poe Task Runner Compatibility
- **D-01 (Python Task Migration):** Migrate all Windows-only PowerShell commands and `.ps1` helper scripts (such as coverage, size, and version bumping tasks) to cross-platform Python scripts.
- **D-02 (uv Task Management):** Use `uv` for all Python tasks and environments (e.g. running scripts with `uv run` and tasks using `uv run poe`).
- **D-03 (Zero Dependencies):** Restrict the new Python scripts to the native Python standard library only, ensuring instant execution without external package installation.
- **D-04 (Size Measuring):** Adapt the `size` task on macOS to measure both compiled macOS binaries (`harbor-cli` and `harbor-tray` in `target/release/`) and the total packaged `Harbor.app` bundle size.
- **D-05 (LaunchAgents Cleanup):** Implement a `clean-startup` script that automatically targets and removes debug/legacy LaunchAgents plist files (e.g. `com.harbor.app.plist`) under `~/Library/LaunchAgents/` on macOS.

### Tauri Tray Icon Format
- **D-06 (macOS Template PNG):** Use a black-and-transparent template PNG icon (`icon_h_template.png`) for the macOS menu bar, enabling macOS to automatically recolor the tray icon between light/dark themes.
- **D-07 (Rust Conditional Compilation):** Separate platform-specific loading in Rust using `#[cfg(target_os = "macos")]` to load the template PNG, and `#[cfg(target_os = "windows")]` to load the existing `.ico` file in `main.rs`.
- **D-08 (Branding Asset Location):** Store the new raw asset in the central root assets folder (`assets/icon_h_template.png`).

### System File Opening & Path Resolution
- **D-09 (Native Open Command):** Add a dedicated conditional compilation block in Rust that spawns macOS's native `open` command for settings file/downloads folder operations, avoiding `xdg-open` crashes on macOS.
- **D-10 (macOS Standard AppData Directories):** Resolve the default application data directory dynamically using `#[cfg(target_os = "macos")]` to the standard macOS location (`~/Library/Application Support/Harbor`).
- **D-11 (Extended Environment Variable Parsing):** Enhance `expand_env` in the core module to support both Windows-style (`%VAR%`) and macOS/POSIX-style (`$VAR` and tilde `~/`) variables for cross-platform configuration compatibility.

### Developer Packaging & Gatekeeper
- **D-12 (Automated Quarantine Removal):** Provide a `poe` task (or run it automatically as part of the build process) to run `xattr -d com.apple.quarantine` on the built `.app` bundle to make it instantly executable locally.
- **D-13 (Packaging Output):** Configure `tauri.conf.json` packaging targets on macOS to produce both the raw `.app` bundle and a packaged `.dmg` disk image.

### the agent's Discretion
- The agent has full discretion on how the version bumper standard-library Python scripts are implemented, provided they cleanly update versions in `Cargo.toml`, `tauri.conf.json`, `package.json`, and `pyproject.toml`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specifications & Roadmap
- [.planning/ROADMAP.md](file:///Users/eduard/Dev/Harbor-Download-Organizer/.planning/ROADMAP.md) — Phase 1: macOS App Foundation scope and success criteria definition.
- [.planning/REQUIREMENTS.md](file:///Users/eduard/Dev/Harbor-Download-Organizer/.planning/REQUIREMENTS.md) — Platform-level requirements (PLAT-01, PLAT-02) mapping.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- [crates/tauri-app/src/main.rs](file:///Users/eduard/Dev/Harbor-Download-Organizer/crates/tauri-app/src/main.rs): Core Tauri application builder, commands, and window/event handling logic to be adapted for macOS compatibility.
- [crates/core/src/downloads.rs](file:///Users/eduard/Dev/Harbor-Download-Organizer/crates/core/src/downloads.rs): Core configuration loader, default YAML settings, and environment resolvers to be modified.

### Established Patterns
- Poe task runner configuration in [pyproject.toml](file:///Users/eduard/Dev/Harbor-Download-Organizer/pyproject.toml) using platform-specific script hooks.
- Compile-time platform checks using Rust's `#[cfg]` decorators.

### Integration Points
- Tauri's configuration file [crates/tauri-app/tauri.conf.json](file:///Users/eduard/Dev/Harbor-Download-Organizer/crates/tauri-app/tauri.conf.json) build and bundle configurations.
- Core environment directory functions (`harbor_app_dir()`).

</code_context>

<specifics>
## Specific Ideas

- High-performance, lightweight local compilation with `uv` for developer script execution.
- Automated gatekeeper bypass script so local runs execute cleanly and smoothly.

</specifics>

<deferred>
## Deferred Ideas

- None — all discussed concepts are locked inside Phase 1's boundary.

</deferred>

---

*Phase: 01-macOS App Foundation*
*Context gathered: 2026-05-24*
