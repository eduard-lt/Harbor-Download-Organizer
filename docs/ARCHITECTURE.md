# Harbor Architecture

## Project Layout

```
Harbor/
├── crates/
│   ├── core/               ← harbor-core library
│   ├── cli/                ← harbor-cli binary
│   ├── tray/               ← harbor-tray binary (Windows only)
│   ├── tauri-app/          ← harbor-tauri-app binary (Tauri v2 desktop app)
│       └── src/commands/   ← Tauri IPC commands (rules, activity, settings)
├── packages/ui/            ← React frontend (Tauri webview)
├── tools/                  ← Python scripts (versioning, coverage, cleanup, etc.)
├── docs/                   ← Project documentation
├── assets/                 ← Icons and resources
├── examples/               ← Example configurations
├── Cargo.toml              ← Rust workspace manifest
├── pyproject.toml          ← Poe task runner definitions
└── cliff.toml              ← git-cliff changelog config
```

## Crate Map

| Crate | Type | Platform | Purpose |
|---|---|---|---|
| `harbor-core` | Library | Cross-platform | Business logic: config parsing, file organization, polling, logging |
| `harbor-cli` | Binary | Cross-platform | CLI with `init`/`organize`/`watch`/`tray-install` subcommands |
| `harbor-tray` | Binary | Windows only | Legacy system tray app using `native-windows-gui` |
| `harbor-tauri-app` | Binary | Cross-platform | Tauri v2 desktop app with React UI; primary user-facing binary |

## Core Library (`harbor-core`)

### Module Map

```
src/
├── lib.rs             ← Re-exports: downloads, platform, types
├── types.rs           ← Rule + serde defaults
├── downloads.rs       ← Config, organize_once, watch_polling, logging, env expansion
└── platform/
    ├── mod.rs         ← Public API dispatch: app_data_dir, downloads_dir, home_dir
    ├── macos.rs       ← macOS path resolution
    └── windows.rs     ← Windows path resolution
```

### Key Abstractions

#### `Rule`

Core data model for a file-matching rule. Each rule has:
- **id** (`String`) — Stable UUID, auto-generated for backward compatibility with old configs
- **name** (`String`) — Display name
- **extensions** (`Option<Vec<String>>`) — File extensions to match
- **pattern** (`Option<String>`) — Regex pattern matched against filename
- **min_size_bytes** / **max_size_bytes** (`Option<u64>`) — Size constraints
- **target_dir** (`String`) — Destination folder
- **create_symlink** (`bool`) — Whether to leave a hidden symlink behind
- **enabled** (`bool`) — Whether the rule is active

**Rule priority:** Rules are sorted by a scoring system that gives more specific rules (with regex or size constraints) higher priority. A regex-only rule at index 4 beats an extension-only rule at index 0.

#### `DownloadsConfig`

Serializable configuration loaded from YAML:
- `download_dir` — Watched directory
- `rules` — Ordered list of `Rule`
- `min_age_secs` — Minimum file age before moving (defaults to 5)
- `service_enabled` / `tutorial_completed` / `check_updates` / `last_notified_version` — App state

#### Organize Pipeline

`organize_once(cfg)` runs a single pass:

1. **Compile rules** — Pre-compile all regex patterns, sort by priority
2. **Scan directory** — Read `download_dir` entries
3. **Filter files** — Skip:
   - Symlinks and directories
   - Partial downloads (`.crdownload`, `.part`, `.tmp`, `.download`, `.opdownload`)
   - Files with a corresponding partial-download placeholder
   - Zero-byte files (browser placeholders)
   - Files younger than `min_age_secs`
4. **Match rules** — For each surviving file, run the first matching rule (extension → pattern → size, in priority order)
5. **Move & rename** — Moves the file, with automatic renaming on conflict (`"file (1).txt"`, etc.)
6. **Optional symlink** — Creates a symlink back if the rule has `create_symlink`
7. **Return summary** — `OrganizeSummary` with `moved` results and `errors`

#### `watch_polling`

Calls `organize_once` in a loop, sleeping between iterations in 500ms chunks for responsive shutdown. Takes an `AtomicBool` flag and a callback invoked when files are moved.

#### App Data & Portability

Platform paths via `harbor_core::platform`:

| Function | macOS | Windows |
|---|---|---|
| `app_data_dir()` | `~/Library/Application Support/Harbor` | `%LOCALAPPDATA%\Harbor` |
| `downloads_dir()` | `~/Downloads` | `%USERPROFILE%\Downloads` |
| `home_dir()` | `$HOME` | `%USERPROFILE%` |

## CLI (`harbor-cli`)

Thin wrapper around `harbor-core` using `clap`:

| Command | Behavior |
|---|---|
| `downloads-init` | Writes a sample YAML config |
| `downloads-organize` | Runs `organize_once` once, prints results |
| `downloads-watch` | Runs polling loop with customizable interval |
| `tray-install` | Copies `harbor-tray.exe` to `%LOCALAPPDATA%\Harbor`, adds autorun key (Windows) |
| `tray-uninstall` | Removes autorun key |

## Tray App (`harbor-tray`)

**Windows only.** Uses `native-windows-gui` for a lightweight system tray interface.

Key components:
- `TrayLogic` — Holds `DownloadsConfig`, manages the watch thread via `AtomicBool` flag
- `SingleInstance` — Windows mutex to prevent duplicate processes
- `on_file_change` — Appends organize results to the activity log
- `open_folder` / `open_config` — Shell out to `explorer`

## Tauri App (`harbor-tauri-app`)

The primary cross-platform application. Tauri v2 bridges a Rust backend to a React frontend.

### Backend (Rust)

```
src/
├── main.rs              ← App bootstrap, tray menu, IPC event wiring
├── state.rs             ← AppState: watcher lifecycle, service state machine
├── integration_tests.rs ← Orchestration-level tests
└── commands/
    ├── mod.rs           ← Re-exports
    ├── rules.rs         ← CRUD + reorder for rules
    ├── activity.rs      ← Read/clear activity logs + stats
    ├── settings.rs      ← Service start/stop/restart, startup management, organize-now
    ├── error_contract.rs ← Structured error types for IPC
    ├── error_contract_tests.rs
    └── ui_helpers.rs
```

#### `AppState` (Service Lifecycle)

Harbor's background organization service is a watched thread managed via `AppState`:

```
States: Stopped → Running ↔ Degraded
                    ↓
                 Stopped
```

- **`ServiceLifecycleState`** — Enum tracking the service state
- **`watcher_flag`** — `AtomicBool` used to signal the watch thread to stop
- **`watcher_handle`** — `JoinHandle` for the watch thread
- **`restart_in_progress`** — Guards against concurrent restart requests

The service can become `Degraded` when a restart fails; the UI surfaces the `degraded_reason`.

### Frontend (React)

```
packages/ui/src/
├── App.tsx             ← Router: Rules, Activity, Settings, Info pages
├── main.tsx            ← Entry point
├── components/         ← Header, Sidebar, RuleModal, ActivityTable, StatCard, ConfirmationModal, TutorialModal, Layout
├── pages/              ← RulesPage, ActivityLogsPage, SettingsPage, InfoPage
└── context/            ← SettingsContext, ThemeContext, UpdateContext
```

All backend communication goes through Tauri's `invoke` to the Rust command handlers. The frontend is built with Vite and styled with Tailwind CSS.

### Tray Menu

The Tauri tray's left-click opens a context menu; right-click shows the main window. Menu items:
- Service On / Off (checkable)
- Organize Now
- Open Downloads / Rules / Recent Moves / Settings
- Quit

The "Organize Now" action emits `harbor://tray-organize-outcome` for the frontend to display notifications.

## Data Flow

```
┌──────────────┐    invoke()     ┌─────────────────┐   organize_once()    ┌──────────────┐
│              │ ──────────────→ │                 │ ──────────────────→ │              │
│  React UI    │                 │  Tauri Commands │                     │  harbor-core │
│  (webview)   │ ←────────────── │  (Rust)         │ ←────────────────── │              │
│              │   responses     │                 │      results        │              │
└──────────────┘                 └─────────────────┘                     └──────┬───────┘
                                                                               │
                                                                     YAML config
                                                                     (load/save)

Activity log: written by both Tauri backend and tray app
              to ~/Library/Application Support/Harbor/recent_moves.log
```

## Configuration Model

Config is stored as `harbor.downloads.yaml` in the app data directory (see "App Data & Portability"). It supports environment variable expansion in both Windows (`%VAR%`) and POSIX (`$VAR`, `${VAR}`, `~/`) styles.

**Initialization flow:**
1. Check if `harbor.downloads.yaml` exists
2. If not, try to copy `harbor.downloads.yaml.default`
3. If neither exists, use the built-in `default_config()` (11 preset rules for common file types)
4. On first run, the Tauri app writes the default to disk

## Testing Strategy

| Layer | Tool | Location |
|---|---|---|
| Core unit tests | `cargo test` | Inline `#[cfg(test)]` in `downloads.rs`, `types.rs`, `platform/` |
| CLI tests | `cargo test -p harbor-cli` | Inline in `cli/src/main.rs` |
| Tray tests | `cargo test -p harbor-tray` | Inline in `tray/src/logic.rs` |
| Backend integration | `cargo test -p harbor-tauri-app` | `crates/tauri-app/src/integration_tests.rs` |
| Error contract tests | `cargo test` | `crates/tauri-app/src/commands/error_contract_tests.rs` |
| Frontend tests | `poe test-ui` | `packages/ui/src/**/*.test.tsx` (Vitest) |
| E2E tests | `poe test-e2e` | Playwright via `packages/ui` |
| Fuzz tests | `poe fuzz-*` | `crates/core/fuzz/` (cargo-fuzz) |
| Coverage | `poe coverage` / `poe coverage-ui` | Backend via cargo-llvm-cov, frontend via Vitest |
