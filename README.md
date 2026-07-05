<div align="center">

# Harbor
**Download Organizer & File Manager**

<img src="assets/harbor_h.png" alt="Harbor Logo" width="200">

*Keep your workspace clean, automatically.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Windows](https://img.shields.io/badge/platform-Windows-blue.svg)](https://github.com/eduard-lt/Harbor-Download-Organizer/releases)
[![macOS](https://img.shields.io/badge/platform-macOS-black.svg)](https://github.com/eduard-lt/Harbor-Download-Organizer/releases)
[![Rust](https://img.shields.io/badge/language-Rust-orange.svg)](https://www.rust-lang.org/)

---

**Harbor** monitors your downloads folder and moves files to categorized destinations based on custom rules. Works on Windows (native MSI) and macOS (DMG).

<img src="assets/UI/rules_mangement.png" alt="Harbor Rules Management UI" width="850" style="border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">

</div>

---

## Features

- **Auto-Organization** — Sorts downloads by file type (images, videos, documents, etc.)
- **System Tray Interface** — Start/stop monitoring, organize now, or view recent activity
- **No Admin Required** — Installs and runs with user permissions only
- **Smart Symlinks** — Optionally leave hidden shortcuts so browsers don't "lose" tracked files
- **Activity Log** — Track what was moved and when in `recent_moves.log`
- **Customizable Rules** — Edit rules via the UI or directly in the YAML config
- **Auto-Start** — Launches automatically on system startup
- **Safe Moves** — Skips partial downloads (`.crdownload`, `.part`, `.tmp`)
- **Conflict Handling** — Automatically renames files if the destination path already exists

---

## Quick Start

### Windows

1. Download the latest `.msi` from [Releases](https://github.com/eduard-lt/Harbor-Download-Organizer/releases).
2. Run the installer and launch Harbor from the system tray.
3. Configure rules in the **Rules Management** dashboard.
4. Enable **Active Monitoring** and let Harbor handle the rest.

### macOS

1. Download the latest `.dmg` from [Releases](https://github.com/eduard-lt/Harbor-Download-Organizer/releases).
2. Drag **Harbor.app** to the **Applications** folder.
3. Run the following command in Terminal to bypass Gatekeeper (I do not have an Apple Developer license to sign the app):

   ```bash
   xattr -cr /Applications/Harbor.app
   ```
4. Launch Harbor from Applications.

> [!NOTE]
> I do not have an Apple Developer license, so the macOS build is ad-hoc signed. The `xattr` command removes quarantine attributes placed by Gatekeeper. You only need to run it once after first install. See [Apple Developer ID](https://developer.apple.com/support/developer-id/) for more context.

---

## Roadmap

- [x] macOS Support (ad-hoc signed DMG)
- [x] Accurate changelog and task documentation
- [ ] macOS code signing (remove `xattr` workaround)
- [ ] Linux Support
- [ ] Multi-Folder Monitoring
- [ ] Custom Notifications
- [ ] Dry-run mode

See the full [TODO list](docs/TODO.md) for more details.

---

## Contributing

- **Found a bug?** [Open an issue](https://github.com/eduard-lt/Harbor-Download-Organizer/issues)
- **Have an idea?** [Submit a feature request](https://github.com/eduard-lt/Harbor-Download-Organizer/issues)
- **Want something to work on?** Check the [TODO list](docs/TODO.md) for open items.
- **Want to help?** PRs are welcome. See [Building from Source](#building-from-source) below.

---

## Building from Source

Harbor is a **Tauri v2** application (React + Rust).

**Prerequisites:** Node.js 20+, Rust (stable), WiX Toolset v3 (Windows only), Python 3.10+, and [Poe the Poet](https://poethepoet.natn.io/installation.html).

```bash
# Install UI dependencies
cd packages/ui && npm install

# Development mode
poe dev

# Build distributable
poe build
```

### Tests & Coverage

| Command | What it does |
|---|---|
| `poe test` | Backend (Rust) tests |
| `poe test-ui` | Frontend (React) tests |
| `poe test-all` | All tests |
| `poe coverage` | Backend coverage report (non-blocking) |
| `poe coverage-ui` | Frontend coverage report |

Coverage targets and developer tasks are documented in:
- [Coverage policy](docs/testing/coverage-policy.md) — 70% threshold on high-risk paths
- [Poe tasks reference](docs/POE_TASKS.md) — all automation commands
- [TODO](docs/TODO.md) — planned features and improvements

---

## License

MIT. See [LICENSE](LICENSE) for details.

---

<div align="center">

If Harbor is useful to you, consider starring the repository.

[![Buy Me A Coffee](https://shields.io/badge/kofi-Buy_a_coffee-ff5f5f?logo=ko-fi&style=for-the-badge)](https://ko-fi.com/eduardolteanu)

</div>
