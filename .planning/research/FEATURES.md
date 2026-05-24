# Feature Research

**Domain:** macOS desktop download organizer (Harbor macOS parity)  
**Researched:** 2026-05-24  
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these makes the product feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Menu bar (tray) icon with core actions** (start/stop watching, organize now, open rules, quit) | macOS background utilities are typically menu bar first; users expect visibility/control without a Dock app | MEDIUM | Use Tauri TrayIcon API; left-click shows main window; depends on existing Windows tray controls |
| **Downloads folder watcher using macOS FSEvents** | macOS apps are expected to be low CPU and responsive; FSEvents is the native change notification mechanism | HIGH | Use OS-level watcher (Rust `notify` via FSEvents); debounce/merge events; depends on existing organizer engine |
| **Rules UI fully functional on macOS** (YAML + UI) | Parity with Windows is required; rule edits are core to the workflow | MEDIUM | Reuse existing React UI; ensure config paths and file access work on macOS |
| **Auto-start at login with user toggle** | Background organizers are expected to persist across reboots | MEDIUM | Use Tauri autostart plugin; on macOS this maps to LoginItems/LaunchAgents (SMAppService) |
| **Partial download protection** (skip .download, .crdownload, .part) | Users expect organizers not to move active downloads | MEDIUM | Extend existing "skip partial" logic with macOS-specific temp extensions |
| **Download folder access and permission guidance** | macOS privacy controls can block file access; users need clear recovery steps | MEDIUM | Detect access errors and show "how to grant access" instructions; avoids silent failure |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Menu bar Snooze (pause with auto-resume timer)** | Matches macOS utility patterns; reduces user friction | LOW/MEDIUM | Quick win once tray UI is stable |
| **Move notifications with Undo** | Builds trust in automation; quick recovery from mis-rule | MEDIUM/HIGH | Needs macOS notifications and rollback of last move |
| **Auto-detect non-standard Downloads path** | Handles iCloud/external/custom paths gracefully | MEDIUM | Scan common paths, prompt to update watch location |
| **Finder context menu "Organize Downloads"** | Native macOS feel and fast manual trigger | HIGH | Requires Finder extension or service integration |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Require Full Disk Access or admin privileges** | "Make sure it can read everything" | Reduces trust, triggers privacy concerns, complicates support | Limit to Downloads folder plus explicit user-chosen paths |
| **LaunchDaemon or root helper for monitoring** | "Always on" | Needs elevated install, fragile, unnecessary for Downloads | Use user-level LoginItem or LaunchAgent |
| **Move files immediately on any change** | "Instant organization" | Risks corrupting active downloads | Ignore temp extensions and require file stability |
| **Always-visible Dock app** | "Make it feel like a normal app" | Clutters Dock for background utility users | Menu bar first with optional window |

## Feature Dependencies

```
macOS Tray UI
    -> requires -> macOS build + Tauri TrayIcon API

Auto-start at login
    -> requires -> Tray app runs in background

Downloads watcher (FSEvents)
    -> requires -> Downloads folder access + watch path

Partial download protection -> enhances -> Downloads watcher
Permission guidance -> enhances -> Downloads watcher

Rules UI
    -> requires -> Config read/write on macOS filesystem
```

### Dependency Notes

- Auto-start requires tray/background mode: if the app cannot run headless, auto-start feels broken.
- Downloads watcher requires folder access: without TCC permissions, file events will not arrive.
- Partial download protection enhances watcher: prevents destructive moves during download.

## MVP Definition

### Launch With (v1)

Minimum viable macOS parity for v1.2.0.

- [ ] Menu bar (tray) controls
- [ ] Downloads watcher using FSEvents plus partial download protection
- [ ] Rules UI fully functional
- [ ] Auto-start at login
- [ ] Permission detection/guidance

### Add After Validation (v1.x)

- [ ] Snooze/pause with auto-resume
- [ ] Move notifications with undo

### Future Consideration (v2+)

- [ ] Finder context menu integration
- [ ] Advanced path auto-detection (iCloud/external)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Menu bar tray controls | HIGH | MEDIUM | P1 |
| Downloads watcher (FSEvents) | HIGH | HIGH | P1 |
| Partial download protection | HIGH | MEDIUM | P1 |
| Rules UI on macOS | HIGH | MEDIUM | P1 |
| Auto-start at login | HIGH | MEDIUM | P1 |
| Permission guidance | MEDIUM | MEDIUM | P1 |
| Snooze/pause timer | MEDIUM | LOW | P2 |
| Notifications + undo | MEDIUM | HIGH | P2 |
| Finder context menu | LOW/MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

LOW confidence - needs dedicated competitive research.

| Feature | Hazel (macOS) | Dropzone (macOS) | Our Approach |
|---------|---------------|------------------|--------------|
| Rule-based folder automation | Yes (rule-driven automation) | Not core | Use existing YAML rules + UI |
| Menu bar control | Unclear | Yes (menu bar first) | Tauri tray menu with start/stop |

## Sources

- https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/learn/system-tray.mdx
- https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/autostart/README.md
- https://docs.developer.apple.com/tutorials/data/documentation/servicemanagement/smappservice.md
- https://docs.developer.apple.com/tutorials/data/documentation/coreservices/file_system_events.md
- https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html

---
*Feature research for: macOS download organizer parity*  
*Researched: 2026-05-24*
