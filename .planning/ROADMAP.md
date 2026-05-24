# Roadmap: Harbor

## Overview

Roadmap for milestone v1.2.0 (macos-release) to deliver macOS parity: a runnable app, rules management, monitoring with menu bar controls, and login autostart.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: macOS App Foundation** - Build and launch Harbor on macOS to the main window
- [ ] **Phase 2: Rules & Tray Access** - Manage rules and access key files from the menu bar
- [ ] **Phase 3: Monitoring & File Operations** - Menu bar controls drive monitoring with correct file handling
- [ ] **Phase 4: macOS Autostart** - Control launch-at-login behavior

## Phase Details

### Phase 1: macOS App Foundation
**Goal**: Users can build a runnable macOS app and launch to the main window  
**Depends on**: Nothing (first phase)  
**Requirements**: PLAT-01, PLAT-02  
**Success Criteria**:
1. User can build Harbor into an unsigned macOS `.app` and launch it.
2. User can open Harbor on macOS 26.5+ and reach the main window.
**Plans**: TBD

### Phase 2: Rules & Tray Access
**Goal**: Users can access the rules UI and key files from the menu bar on macOS  
**Depends on**: Phase 1  
**Requirements**: TRAY-04, TRAY-05, TRAY-06, RULE-01, RULE-02  
**Success Criteria**:
1. User can open the Harbor window (rules UI) from the menu bar.
2. User can create, edit, and delete rules in the UI and changes persist.
3. User can edit the YAML config directly and Harbor reflects updates in the rules UI.
4. User can open the Downloads folder and the configuration file from the menu bar.
**Plans**: TBD  
**UI hint**: yes

### Phase 3: Monitoring & File Operations
**Goal**: Users can control monitoring from the menu bar and Harbor moves downloads correctly on macOS  
**Depends on**: Phase 2  
**Requirements**: TRAY-01, TRAY-02, TRAY-03, TRAY-07, MON-01, MON-02, MON-03, MON-04, MON-05, PERM-01  
**Success Criteria**:
1. User can start monitoring, stop monitoring, run "Organize now," and snooze monitoring with auto-resume from the menu bar.
2. When monitoring is enabled, completed downloads are moved per rules, naming conflicts are resolved by renaming, and each move is logged in `recent_moves.log`.
3. In-progress downloads (e.g., `.download` or browser partials) are skipped until complete.
4. When symlink creation is enabled, Harbor creates a symlink after moving files.
5. If macOS blocks Downloads access, Harbor shows guidance to grant access and resumes once allowed.
**Plans**: TBD  
**UI hint**: yes

### Phase 4: macOS Autostart
**Goal**: Users can control Harbor auto-start at login on macOS  
**Depends on**: Phase 3  
**Requirements**: AUTO-01, AUTO-02  
**Success Criteria**:
1. User can enable auto-start and Harbor launches at login.
2. User can disable auto-start and Harbor stops launching at login.
**Plans**: TBD

## Progress

**Execution Order:**  
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. macOS App Foundation | 0/TBD | Not started | - |
| 2. Rules & Tray Access | 0/TBD | Not started | - |
| 3. Monitoring & File Operations | 0/TBD | Not started | - |
| 4. macOS Autostart | 0/TBD | Not started | - |
