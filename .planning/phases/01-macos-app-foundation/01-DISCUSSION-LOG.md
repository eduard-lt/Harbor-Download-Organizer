# Phase 1: macOS App Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 1-macOS App Foundation
**Areas discussed:** Poe Task Runner Compatibility, Tauri Tray Icon Format, System File Opening Command & Paths, Gatekeeper Bypassing & Developer Packaging

---

## Poe Task Runner Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite tasks to use cross-platform Python scripts | Migrate .ps1 and PowerShell command blocks to Python scripts so they run natively on both macOS and Windows without requiring PowerShell. | ✓ |
| Separate shell commands in pyproject.toml | Use standard POSIX/Bash commands for macOS and keep PowerShell commands for Windows by conditionally switching tasks or shells. | |
| You decide | Choose the cleanest implementation during planning. | |

**User's choice:** Python-based cross-platform scripts managed and executed via **`uv`**.
**Notes:** The user raised a concern about Python adding complexity/bloat to the final app bundle size. After clarifying that Python/uv are strictly developer-facing utilities (zero impact on the final Rust-compiled binary size), the user fully approved Python with a strong directive to use `uv` for all python-related setups.

### Dependencies for Python Developer Scripts
* **Selected:** Pure Python Standard Library (json, subprocess, pathlib, argparse, sys) so that `uv run` executes instantly without installing any external packages.

### Size task adaptation for macOS
* **Selected:** Measure both macOS binaries and the packaged `.app` bundle.

### Behavior of clean-startup on macOS
* **Selected:** Clean macOS LaunchAgents by removing legacy or debug plist files matching Harbor under `~/Library/LaunchAgents/`.

---

## Tauri Tray Icon Format

| Option | Description | Selected |
|--------|-------------|----------|
| Use a macOS Template PNG Image | On macOS, load a PNG icon (e.g. icon_h_template.png) and configure it as a 'template' image so macOS automatically colors it black or white to match the light/dark menu bar. | ✓ |
| Static platform-agnostic PNG icon | Load a colorful or neutral-toned PNG icon that is visible on both dark and light backgrounds without using OS-level template features. | |
| You decide | The agent will select the cleanest technique to ensure tray icon visibility in both macOS theme modes. | |

**User's choice:** Use a macOS Template PNG Image.
**Notes:** Centralized asset storage requested inside the root `assets/` directory (stored as `assets/icon_h_template.png`). In main.rs, platform-specific icon loading will be handled using Rust compile-time conditional compilation `#[cfg]`.

---

## System File Opening Command & Paths

| Option | Description | Selected |
|--------|-------------|----------|
| Conditional compilation #[cfg] for macOS 'open' | Add a dedicated #[cfg(target_os = "macos")] block that calls the native macOS 'open' shell command, keeping implementation standard-library-only. | ✓ |
| Integrate the 'open' Rust crate | Add the 'open' crate to Cargo.toml as a dependency and use it to replace manual platform-specific shell spawns entirely. | |
| You decide | Choose the cleanest, most robust approach during planning. | |

**User's choice:** Conditional compilation `#[cfg]` for macOS 'open'.
**Notes:** 
* Standard application data directory on macOS will map to standard paths (`~/Library/Application Support/Harbor`) using compile-time `#[cfg]` decorators.
* Environment variable expansion will be extended to support both `%VAR%` (Windows) and POSIX-style `$VAR` and tilde (`~/`) on macOS for smooth cross-platform config migration.

---

## Gatekeeper Bypassing & Developer Packaging

| Option | Description | Selected |
|--------|-------------|----------|
| Automated quarantine-removal script | Provide a poe task (e.g. poe disable-quarantine or as part of the build step) that automatically runs `xattr -d com.apple.quarantine` on the built .app bundle to make it instantly runnable on the developer's machine. | ✓ |
| Documentation-only guidance | Explain the manual bypass methods in the project's README/documentation. | |
| You decide | Choose the smoothest development workflow during planning. | |

**User's choice:** Automated quarantine-removal script via Poe task.
**Notes:** The build process will configure `tauri.conf.json` packaging targets to produce both the raw `.app` bundle (for local execution) and a packaged `.dmg` disk image on macOS.

---

## the agent's Discretion

- Standard library Python scripts implementation details for version bumping.

## Deferred Ideas

- None.
