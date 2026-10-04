# Contributing to Harbor

Use Node.js 22+, stable Rust, Python 3.10+ and the platform's native build tools
(MSVC C++ tools on Windows, Xcode on macOS). `uv` and Poe are optional task helpers.
On PowerShell with scripts disabled, use `npm.cmd`/`npx.cmd`.

## Build and check

```sh
npm ci --prefix packages/ui
npm run build --prefix packages/ui
cargo test --workspace --locked
cargo clippy --workspace --all-targets --all-features --locked -- -D warnings
cargo fmt --all -- --check
npm run lint --prefix packages/ui
npm run coverage --prefix packages/ui
cd packages/ui
npx playwright install chromium
npm run e2e
npm run tauri:build
```

For development use `npm run tauri:dev --prefix packages/ui`. `uv run poe` lists
optional tasks. Commit `Cargo.lock` and `packages/ui/package-lock.json`; use locked
Rust commands and `npm ci` in clean builds. Use Conventional Commits. Never commit
credentials, runtime data, build outputs, coverage or generated test reports.

Rust tests cover the core engine, persistence, service orchestration and IPC helpers.
Browser tests use mocked Tauri APIs and do not prove native filesystem, registry,
tray or installer behavior. Frontend coverage gates are 70% for statements, lines,
branches and functions. Fuzz targets are under `crates/core/fuzz` and require nightly
Rust and cargo-fuzz. Use isolated temporary directories in filesystem tests.

Before a release, follow [docs/RELEASE.md](docs/RELEASE.md). The workflow reuses CI
and prepares draft prereleases only; publishing remains a deliberate action.

## Icons

The editable shared H artwork is `assets/Harbor.icon/Assets/harbor_h.svg` and belongs
to this MIT-licensed repository. `uv run poe icon-windows` renders its color/scale
into `assets/windows` and the multi-size Windows ICO used by the app, window and
tray. Windows uses a static treatment of the macOS artwork, not Apple's glass renderer.

On macOS, open `assets/Harbor.icon` in Icon Composer (Xcode 26+), save and close it,
then run `uv run poe icon-macos`. Commit source and `assets/macos/Assets.car`.
The ICNS remains a compatibility fallback. No artwork-generation step is required
in release packaging because the exported assets are checked in.

## Versioning

`uv run python tools/version.py bump minor` updates manifests and npm root lock
metadata and refreshes the Rust lockfile. `python tools/version.py check` verifies
agreement. Info displays the package version directly. `git-release` refuses a dirty
worktree; only run it when a reviewed release is intended.
