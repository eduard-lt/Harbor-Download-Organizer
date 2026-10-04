# Harbor

Harbor is a Windows and macOS download organizer built with Tauri, Rust and React.
Create rules for extensions, filename patterns and sizes, choose a monitored folder,
and enable monitoring when you are ready. Rules with pattern/size modifiers take
priority; ordering breaks ties between equally specific rules.

## Using Harbor

- Close the window to keep Harbor in the tray/menu bar. Use **Quit** to exit.
- **Settings > Files and rules** selects the monitored folder, previews moves,
  imports/exports rules and undoes the last recorded nonempty batch.
- Changing the monitored folder, importing rules or undoing a batch pauses monitoring.
  Review the rules and switch monitoring back on explicitly.
- Preview is read-only and reflects the current files/rules. It is not a reservation;
  a later organization pass may differ.
- Undo checks file content and refuses changed files or occupied original locations.
  It is available only for batches recorded by this version, not historical text logs.
- Activity supports text search and status filters, including background failures.
- Partial downloads and young/empty files are skipped; name conflicts never overwrite
  an existing destination. Optional symlink creation on Windows may require Developer Mode.
- Startup launches Harbor minimized. Windows uses the current user's login entry;
  macOS may require approval in System Settings > General > Login Items.

## Installation and release status

Download candidates from [GitHub Releases](https://github.com/eduard-lt/Harbor-Download-Organizer/releases).
Windows uses one per-user NSIS `.exe` installer. MSI is discontinued; macOS packaging targets a universal
Intel/Apple Silicon application with macOS 15 as the configured minimum.

**2.2.0 is undergoing release validation.** Windows signing and
Apple Developer signing/notarization are not configured. Windows/macOS installed-app
and upgrade testing remain separate from automated tests. See [release status](docs/RELEASE.md).
No claim of verified macOS 15 compatibility is made until it is tested on that OS.

## Configuration and recovery

Harbor stores `harbor.downloads.yaml`, activity and the undo journal under
`%LOCALAPPDATA%\Harbor` on Windows and `~/Library/Application Support/Harbor` on macOS.
A successful configuration edit keeps the prior valid YAML in `.yaml.bak`.
Invalid configuration pauses operation and shows a recovery message; it is not
silently overwritten with defaults. Repair the file and use Config Reload, restore
the backup while Harbor is closed, or explicitly reset in Settings. Reset preserves
an invalid original as `harbor-corrupt-*.yaml`.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks and icon regeneration,
[architecture](docs/ARCHITECTURE.md) for implementation, and
[CHANGELOG.md](CHANGELOG.md) for changes. Legacy native tray/install tools have been
removed. The optional CLI retains only downloads init/organize/watch commands.

Licensed under [MIT](LICENSE).
