# Harbor Documentation

**Download Organizer & File Manager** — Automatically sorts your downloads by file type based on customizable rules.

[GitHub](https://github.com/eduard-lt/Harbor-Download-Organizer) · [Releases](https://github.com/eduard-lt/Harbor-Download-Organizer/releases) · [Issues](https://github.com/eduard-lt/Harbor-Download-Organizer/issues)

---

## Quick Links

| Section | Description |
|---|---|
| [Architecture](ARCHITECTURE.md) | Crate layout, data flow, key abstractions |
| [Contributing](CONTRIBUTING.md) | Setup, workflow, coding standards, PR process |
| [Window Management](WINDOW_MANAGEMENT.md) | DPI awareness, sizing presets, persistence |
| [Poe Tasks](POE_TASKS.md) | Build, test, lint, and release automation commands |
| [Testing Policy](testing/coverage-policy.md) | Coverage thresholds and enforcement |
| [TODO](TODO.md) | Planned features, audit findings, roadmap |

---

## Overview

Harbor monitors your downloads folder and moves files to categorized destinations based on custom rules. Built with **Tauri v2** (Rust + React).

**Platforms:** Windows (MSI), macOS (DMG) · **License:** MIT

### Key Features

- **Auto-Organization** — Sorts downloads by file type (images, videos, documents, etc.)
- **System Tray** — Start/stop monitoring, organize now, quick access to settings
- **Custom Rules** — File extensions, regex patterns, size constraints, symlinks
- **Activity Log** — Track every file move with timestamps
- **Safe Moves** — Skips partial downloads, handles conflicts with auto-rename
- **Auto-Start** — Launch on system startup

### Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | [Tauri v2](https://tauri.app/) |
| Backend | Rust (workspace: core, cli, tray, tauri-app) |
| Frontend | React 19 + TypeScript + Tailwind CSS |
| Testing | Vitest (frontend), cargo-test (backend), Playwright (E2E), cargo-fuzz |
| CI/CD | GitHub Actions (Windows + macOS + Ubuntu) |
| Task Runner | [Poe the Poet](https://poethepoet.natn.io/) |

---

## Getting Started

### Users

Download from [Releases](https://github.com/eduard-lt/Harbor-Download-Organizer/releases):
- **Windows:** `.msi` installer
- **macOS:** `.dmg` (run `xattr -cr /Applications/Harbor.app` once after install)

### Developers

```bash
git clone https://github.com/eduard-lt/Harbor-Download-Organizer.git
cd Harbor-Download-Organizer
cd packages/ui && npm install && cd ../..
poe dev           # Hot-reload dev server
poe build         # Production build
poe test-all      # Full test suite
```

See [Contributing](CONTRIBUTING.md) for detailed setup instructions.

---

## Project Structure

```
Harbor-Download-Organizer/
├── crates/
│   ├── core/            ← Core library (rules, organize, polling)
│   ├── cli/             ← CLI binary
│   ├── tray/            ← Windows tray app (legacy, native-windows-gui)
│   └── tauri-app/       ← Tauri v2 desktop app (primary UI)
├── packages/ui/         ← React frontend
├── tools/               ← Python utilities (versioning, coverage, cleanup)
├── docs/                ← Documentation site (this folder)
├── assets/              ← Icons and resources
├── Cargo.toml           ← Rust workspace manifest
├── pyproject.toml       ← Poe task definitions
└── cliff.toml           ← Changelog generation config
```

---

## CI Pipeline

All CI checks run on every push to `main` and pull requests:

| Job | Platform | What it does |
|---|---|---|
| Format | Ubuntu | `cargo fmt --check` |
| Frontend Build | Ubuntu | `tsc + vite build` |
| Clippy | **Windows** | `cargo clippy -D warnings` |
| Frontend Tests | Ubuntu | Vitest (224 tests) |
| Rust Tests | **Windows** | `cargo test --all --all-features` |
| Release Build | **Windows** | Release-mode compilation check |
| Security Audit | Ubuntu | `cargo audit` |
| Fuzz Regression | Ubuntu | 15s fuzz runs (config + rules) |
| E2E Tests | Ubuntu | Playwright (22 tests) |
| Coverage | Ubuntu | Frontend coverage ≥70% |
| macOS Check | macOS | `cargo check + test + llvm-cov` |

All gated by a final `ci-success` job that requires every job to pass.

---

## License

MIT. See [LICENSE](https://github.com/eduard-lt/Harbor-Download-Organizer/blob/main/LICENSE).
