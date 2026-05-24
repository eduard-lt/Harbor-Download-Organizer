# Architecture Research

**Domain:** Desktop download organizer (macOS support for existing Windows app)  
**Researched:** 2026-05-24  
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
+--------------------------------------------------------------+
| User Interaction Layer                                       |
| - React UI (Tauri window)                                    |
| - Tray Menu (Tauri tray)                                     |
| - CLI (harbor)                                               |
+--------------------------------------------------------------+
| App/Command Orchestration                                    |
| - Tauri backend commands (rules/settings/service control)    |
| - Harbor core (organize/watch rules engine)                  |
+--------------------------------------------------------------+
| OS and Data Integration                                      |
| - File system (Downloads)                                    |
| - Auto-start (LaunchAgent)                                   |
| - Open/Tray/Notify (Finder + tray icon)                      |
| - YAML config                                                |
| - Activity log (recent_moves.log)                            |
+--------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| React UI | Rules editor, settings, activity view | Tauri window + React router (packages/ui) |
| Tauri commands | UI to core bridge, service lifecycle | `crates/tauri-app/src/commands/*` |
| Tray UI | Quick control and navigation | Tauri tray icon/menu in `crates/tauri-app/src/main.rs` |
| Core organizer | Rules engine, file operations, polling watcher | `crates/core/src/downloads.rs` |
| Platform adapters | OS-specific paths and open commands | New `core::platform` + `tauri-app::platform` |
| Auto-start | LaunchAgent integration | `tauri_plugin_autostart` in Tauri app |
| Storage | Config plus activity log | YAML in app data dir, log file in same dir |

## Recommended Project Structure

```
crates/
├── core/
│   ├── downloads.rs          # Rules engine + organizer (platform-agnostic)
│   ├── platform/             # NEW: OS-specific paths + env expansion
│   │   ├── mod.rs             # Public API (app_dir, downloads_dir, expand_path)
│   │   ├── macos.rs           # ~/Library/Application Support, ~/Downloads, open
│   │   └── windows.rs         # LOCALAPPDATA, USERPROFILE, explorer/cmd
│   └── types.rs
├── tauri-app/
│   ├── main.rs                # Tray + autostart + command registration
│   ├── commands/
│   │   ├── settings.rs        # Start/stop watcher + autostart toggles
│   │   └── rules.rs
│   └── platform/              # NEW: tray icon + open handlers (mac vs windows)
├── tray/                      # Windows-only (native_windows_gui)
└── cli/                       # Cross-platform CLI (uses core)
packages/
└── ui/                        # React front-end
```

### Structure Rationale

- `core/platform`: isolate macOS-specific paths (`~/Library/Application Support/Harbor`) and path expansion so core logic remains portable.
- `tauri-app/platform`: keep UI OS specifics (tray icon asset, open command) separate from command logic.

## Architectural Patterns

### Pattern 1: Platform Adapter Module (OS-specific boundary)

**What:** A thin module exposing `app_data_dir()`, `downloads_dir()`, `expand_path()`, and `open_path()` with `cfg(target_os)` implementations.  
**When to use:** Any time the core needs OS-specific paths or shell commands.  
**Trade-offs:** Slight indirection, but prevents OS branching from spreading across core and commands.

**Example:**
```rust
// crates/core/src/platform/mod.rs
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

pub fn app_data_dir() -> std::path::PathBuf { platform::app_data_dir() }
```

### Pattern 2: Background Watcher Thread with Atomic Flag

**What:** Spawn a watcher thread with a shared `AtomicBool`, stop via flag and join timeout.  
**When to use:** Long-running file monitoring that must be toggled from tray/UI.  
**Trade-offs:** Polling is simple but less efficient; can be swapped later with an evented watcher.

**Example:**
```rust
let flag = Arc::new(AtomicBool::new(true));
thread::spawn(move || watch_polling(&config, 5, &flag, |actions| { ... }));
```

### Pattern 3: Command Facade for UI to Core

**What:** Tauri commands validate, persist config, and call core operations (organize/watch).  
**When to use:** UI needs safe backend operations without embedding OS calls in React.  
**Trade-offs:** More boilerplate, but preserves boundary and allows platform-specific backend logic.

## Data Flow

### Request Flow

```
[User action in tray or UI]
    |
    v
[Tauri command handler] -> [AppState] -> [core::downloads]
    |
    v
[OS filesystem ops]      [activity log append]
```

### Key Data Flows

1. **Service start (macOS):** UI/Tray -> `commands::settings::start_service` -> spawn watcher thread -> `watch_polling` -> moves + log append.
2. **Open config/downloads:** UI/Tray -> `commands::open_*` -> platform open command (`open` on macOS).
3. **Config load on startup:** Tauri app -> `harbor_app_dir()` -> YAML load -> `AppState`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|---------------------------|
| 0-1k users | Polling watcher is fine; keep monolith. |
| 1k-100k users | Add evented FS watcher for efficiency (macOS FSEvents via notify). |
| 100k+ users | Not a realistic target for a local desktop utility. |

### Scaling Priorities

1. First bottleneck: polling CPU wakeups -> switch to FSEvents on macOS.
2. Second bottleneck: log file growth -> rotation already exists in settings.rs.

## Anti-Patterns

### Anti-Pattern 1: Hardcoding Windows paths in core
**What people do:** Use `LOCALAPPDATA` and `USERPROFILE` in core defaults.  
**Why it's wrong:** Breaks macOS config discovery and default downloads directory.  
**Do this instead:** OS-aware directory resolver in `core::platform`.

### Anti-Pattern 2: Using `xdg-open` for macOS
**What people do:** Treat all non-Windows as Linux.  
**Why it's wrong:** `xdg-open` is not available on macOS.  
**Do this instead:** `open` on macOS, `xdg-open` on Linux, `explorer`/`cmd` on Windows.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| macOS LaunchAgent | `tauri_plugin_autostart` | Wired in `main.rs` using `MacosLauncher::LaunchAgent`. |
| Finder (open paths) | `open` command | Replace `xdg-open` for macOS. |
| File system events | Polling (current) or FSEvents (future) | Polling is current; FSEvents optional for perf. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI to Tauri commands | Tauri invoke + events | `commands/*` + `emit` |
| Tauri to Core | Direct function calls | Keep core platform-agnostic |
| Core to OS paths | `core::platform` API | New module for macOS directories |

## Build Order (macOS Integration)

1. **Core path/platform layer**  
   - Add `core::platform` for app data dir, downloads dir, and env/path expansion.  
   - Update `harbor_app_dir`, `harbor_log_path`, and `default_config` to use it.

2. **Command-level OS fixes (Tauri)**  
   - Update `open_config_file`/`open_downloads_folder` to use macOS `open`.  
   - Ensure config load uses new core paths.

3. **Tray integration adjustments**  
   - Use macOS tray icon asset (`.icns` or `.png`) instead of `.ico`.  
   - Confirm tray menu actions call the same commands as Windows.

4. **Auto-start wiring**  
   - Verify `tauri_plugin_autostart` works with LaunchAgent.  
   - Keep registry cleanup as Windows-only.

5. **Packaging/build target**  
   - Update `tauri.conf.json` bundle targets to allow macOS `.app` builds for dev.

## Sources

- `.planning/PROJECT.md`
- `crates/core/src/downloads.rs`
- `crates/tauri-app/src/main.rs`
- `crates/tauri-app/src/commands/settings.rs`
- `crates/tray/src/main.rs`
- `crates/tauri-app/tauri.conf.json`

---
*Architecture research for: Harbor macOS support*  
*Researched: 2026-05-24*
