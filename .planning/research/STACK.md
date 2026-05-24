# Stack Research

**Domain:** macOS support for Harbor (Tauri v2 desktop utility)  
**Researched:** 2026-05-24  
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tauri | 2.9.x (keep on latest 2.x) | Core desktop runtime for Rust + React UI | Tauri v2 has native tray APIs and macOS-specific tray icon support (template icons) required for menu bar parity. |
| tauri-plugin-autostart (Rust) | 2.x (match Tauri v2) | macOS auto-start via LaunchAgent | Official Tauri v2 plugin supports macOS LaunchAgent via `MacosLauncher::LaunchAgent` and provides JS APIs to enable/disable. |
| directories (Rust) | 5.x (latest stable; verify before pinning) | Cross-platform user directories (Downloads, Documents, etc.) | `UserDirs::download_dir()` resolves Downloads correctly on macOS, avoiding Windows-only `%USERPROFILE%` defaults in `harbor-core::default_config()`. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tauri-apps/plugin-autostart | 2.5.1 | JS API for enable/disable autostart | Needed if the UI exposes a toggle for auto-start on macOS. |
| tauri-plugin-shell | 2.x (already in Rust + JS) | Open Finder / open config file | Use for macOS open actions (`open` command) instead of Windows-only `explorer` logic. |
| tauri-plugin-notification | 2.x (already in JS) | Notify users about auto-start or rules changes | Use if parity requires macOS native notifications. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Xcode Command Line Tools | Required for macOS builds/bundling | Needed for Tauri build/bundle on macOS. |
| @tauri-apps/cli | ^2.x (already) | Build/bundle macOS app | Use `tauri bundle --bundles app,dmg` when packaging on macOS per Tauri docs. |

## Installation

```bash
# Rust (core additions)
cargo add directories

# JS (if UI exposes autostart toggle)
npm install @tauri-apps/plugin-autostart@2.5.1
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| tauri-plugin-autostart | Manual LaunchAgent .plist + launchctl scripting | Only if you need bespoke LaunchAgent behaviors beyond plugin support. |
| directories | Hard-coded $HOME/Downloads | Only for very small utilities; breaks on custom Downloads locations. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| native-windows-gui (for tray) | Windows-only; will not build on macOS | Tauri tray API (`tray-icon` feature + `iconAsTemplate`). |
| winreg on macOS | Windows registry access causes build failures on macOS | Gate with `cfg(windows)` and use LaunchAgent via plugin. |
| npm auto-launch libraries | Electron-centric and redundant | Tauri autostart plugin (Rust + JS). |

## Stack Patterns by Variant

**If staying with polling watcher (current behavior):**
- No new watcher crate needed.
- Keep existing `watch_polling` loop to preserve parity.

**If switching to event-based file monitoring on macOS later:**
- Add `notify` and use FSEvents-backed watcher on macOS.
- Keep polling fallback for unsupported filesystems.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| tauri@2.9.x | @tauri-apps/api@2.x | Keep core runtime and JS API on the same major version. |
| tauri-plugin-autostart@2.x | @tauri-apps/plugin-autostart@2.5.1 | Plugin Rust + JS package should stay on the same major version. |
| tauri (features: tray-icon, image-png) | Tray icon template APIs | Required for macOS menu bar template icons (`iconAsTemplate`). |

## Sources

- https://v2.tauri.app/reference/javascript/api/namespacetray
- https://v2.tauri.app/plugin/autostart
- https://v2.tauri.app/reference/config
- https://v2.tauri.app/distribute
- https://github.com/dirs/directories-rs/blob/main/README.md

---
*Stack research for: macOS support (tray UI, file monitoring, autostart)*
*Researched: 2026-05-24*
