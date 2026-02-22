# Changelog

All notable changes to Harbor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Cross-platform support (Linux, macOS)
- GUI for editing rules
- Log viewer with search and filters
- Dry-run mode for testing rules
## [1.1.4] - 2026-02-15

### Fixed
- **UI Padding & Layout**:
  - Increased `Header` top padding to `pt-10` and minimum height to `6rem` to prevent conflict with window controls.
  - Aligned Sidebar logo padding (`pt-10`) to match the new Header layout.
  - Adjusted content padding on `Settings`, `Rules`, `Activity`, and `Info` pages.
- **Button Interaction**: Added `cursor: pointer` to all buttons, Sidebar links, and Rule action buttons.
- **Theme Selection**: Fixed deformed checkmark circle in Settings page.
- **Version Sync**: access to `tauri.conf.json` is now synchronized with `Cargo.toml` and `pyproject.toml` during version bumps.

### Added
- **Release Automation**:
  - New `poe git-release` command to automatically tag and push releases.
  - Dynamic `poe` help strings in `pyproject.toml` that reflect the current version state.
- **Documentation**: Updated repository URLs to `eduard-lt/Harbor`.

## [1.1.0] - 2025-02-10
- Initial UI release.

## [0.6.0] - 2025-01-20

### Added
- Complete downloads organization system
- System tray application for Windows
- Command-line interface with multiple commands
- YAML-based configuration system
- Automatic file categorization by extension
- Regex pattern matching for filenames
- File size filtering (min/max)
- Symlink creation support (requires Developer Mode)
- Activity logging to `recent_moves.log`
- Conflict handling with automatic file renaming
- Partial download detection (skips .crdownload, .part, .tmp)
- Auto-start on Windows login
- MSI installer for easy installation
- Single instance enforcement (prevents multiple Harbor processes)

### Features
- **CLI Commands**:
  - `downloads-init` - Create sample configuration
  - `downloads-organize` - Organize files once
  - `downloads-watch` - Watch for new downloads continuously
  - `tray-install` - Install tray app to startup
  - `tray-uninstall` - Remove from startup
  - `validate` - Validate configuration files
  - `init` - Initialize workspace config
  - `up` - Start orchestrated services
  - `down` - Stop orchestrated services
  - `status` - Check service status
  - `logs` - View service logs

- **Tray Menu**:
  - Start/Stop watching
  - Organize now
  - Open Downloads folder
  - Open configuration file
  - Open recent moves log
  - Exit

- **Configuration Options**:
  - Custom download directory
  - Minimum file age before organizing
  - Multiple organization rules
  - Extension-based filtering
  - Pattern-based filename matching
  - Size-based filtering
  - Custom target directories
  - Environment variable expansion

### Technical
- Rust workspace with three crates: `core`, `cli`, `tray`
- Native Windows GUI integration
- WiX-based MSI installer
- Poe the Poet task automation
- Version management scripts
- Local installation update tooling

## [0.5.0] and earlier

Initial development versions focused on core functionality and project setup.

---

## Release Notes

### How to Upgrade

**From 0.5.x to 0.6.0:**
1. Download the new MSI installer
2. Uninstall the old version (optional, MSI will upgrade)
3. Run the new installer
4. Your configuration files will be preserved

**From portable executables:**
1. Download new `harbor-tray.exe` and `harbor-cli.exe`
2. Replace the old files
3. Restart Harbor

### Breaking Changes

None in 0.6.0 - this is the first stable release.

### Known Issues

- Symlinks require Windows Developer Mode or Administrator privileges
- Only Windows is currently supported
- Large files may trigger organization before download completes if `min_age_secs` is too low

### Migration Guide

If you're using a custom configuration, ensure it follows the new schema:

```yaml
download_dir: "%USERPROFILE%\\Downloads"
min_age_secs: 5
rules:
  - name: rule_name
    extensions: ["ext1", "ext2"]
    pattern: "optional_regex"
    min_size_bytes: 1024  # optional
    max_size_bytes: 10485760  # optional
    target_dir: "%USERPROFILE%\\Downloads\\Category"
    create_symlink: false  # optional
```

[Unreleased]: https://github.com/eduard-lt/Harbor-Download-Organizer/compare/v1.1.4...HEAD
[1.1.4]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.1.4
[0.6.0]: https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v0.6.0
