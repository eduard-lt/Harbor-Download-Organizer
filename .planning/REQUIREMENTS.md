# Requirements: Harbor

**Defined:** 2026-05-24  
**Core Value:** Keep downloads organized automatically with minimal user effort.

## v1 Requirements

Requirements for initial macOS parity release. Each maps to roadmap phases.

### Platform

- [ ] **PLAT-01**: User can build Harbor into a runnable macOS `.app` (unsigned dev build).
- [ ] **PLAT-02**: User can launch Harbor on macOS 26.5+ and reach the main window.

### Tray & Controls

- [ ] **TRAY-01**: User can start monitoring from the menu bar.
- [ ] **TRAY-02**: User can stop monitoring from the menu bar.
- [ ] **TRAY-03**: User can run "Organize now" from the menu bar.
- [ ] **TRAY-04**: User can open the Harbor window (rules UI) from the menu bar.
- [ ] **TRAY-05**: User can open the Downloads folder from the menu bar.
- [ ] **TRAY-06**: User can open the configuration file from the menu bar.
- [ ] **TRAY-07**: User can snooze monitoring for a chosen duration and it auto-resumes.

### Rules & Config

- [ ] **RULE-01**: User can create, edit, and delete rules in the UI on macOS, and changes persist.
- [ ] **RULE-02**: User can edit rules in the YAML config on macOS and Harbor uses the updated config.

### Monitoring & File Operations

- [ ] **MON-01**: When monitoring is enabled, Harbor watches the macOS Downloads folder and moves files according to rules.
- [ ] **MON-02**: Harbor skips in-progress downloads (including macOS temp extensions like `.download` and browser partials).
- [ ] **MON-03**: If a destination file exists, Harbor renames the incoming file to avoid conflicts on macOS.
- [ ] **MON-04**: If enabled, Harbor creates symlinks after moving files on macOS.
- [ ] **MON-05**: Harbor records file moves in `recent_moves.log` on macOS.

### Autostart

- [ ] **AUTO-01**: User can enable auto-start on macOS so Harbor launches at login.
- [ ] **AUTO-02**: User can disable auto-start on macOS so Harbor stops launching at login.

### Permissions & Guidance

- [ ] **PERM-01**: If macOS blocks Downloads access, Harbor shows clear guidance to grant access and resumes once allowed.

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Notifications

- **NOTIF-01**: User receives move notifications with an "Undo" action.

### Paths & Integration

- **PATH-01**: Harbor can auto-detect non-standard Downloads paths (iCloud/external) and prompt to update.
- **FIND-01**: User can trigger "Organize Downloads" from the Finder context menu.

## Out of Scope

Explicitly excluded for this milestone.

| Feature | Reason |
|---------|--------|
| Signed + notarized macOS releases | Dev builds only for v1.2.0 |
| macOS versions below 26.5 | Cannot test |
| Linux support | Deferred |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| TRAY-01 | Phase 3 | Pending |
| TRAY-02 | Phase 3 | Pending |
| TRAY-03 | Phase 3 | Pending |
| TRAY-04 | Phase 2 | Pending |
| TRAY-05 | Phase 2 | Pending |
| TRAY-06 | Phase 2 | Pending |
| TRAY-07 | Phase 3 | Pending |
| RULE-01 | Phase 2 | Pending |
| RULE-02 | Phase 2 | Pending |
| MON-01 | Phase 3 | Pending |
| MON-02 | Phase 3 | Pending |
| MON-03 | Phase 3 | Pending |
| MON-04 | Phase 3 | Pending |
| MON-05 | Phase 3 | Pending |
| AUTO-01 | Phase 4 | Pending |
| AUTO-02 | Phase 4 | Pending |
| PERM-01 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-24*  
*Last updated: 2026-05-24 after initial definition*
