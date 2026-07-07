# Poe Tasks Reference

Harbor uses [Poe the Poet](https://github.com/nat-n/poethepoet) for task automation. Run `poe` to list all available tasks.

## Build & Release

| Task | Description |
|------|-------------|
| `poe build` | Build release binaries + installer (via Tauri) |
| `poe build-debug` | Build debug binaries |
| `poe clean` | Remove all build artifacts (`cargo clean`) |
| `poe clean-startup` | Remove ghost macOS startup entries from debug builds |
| `poe unquarantine` | Remove macOS quarantine attribute from built `.app` |
| `poe msi` | Alias for `build` |
| `poe release` | Alias for `build` |

## Development

| Task | Description |
|------|-------------|
| `poe dev` | Start Tauri dev server with hot reload |

## Testing

| Task | Description |
|------|-------------|
| `poe test` | Run all Rust unit tests (`cargo test`) |
| `poe test-ui` | Run frontend tests (Vitest) |
| `poe test-e2e` | Run E2E tests (Playwright) |
| `poe test-e2e-ui` | Run E2E tests with Playwright UI |
| `poe test-all` | Full suite: lint → lint-ui → test → test-ui → test-e2e |
| `poe install-e2e-tools` | Install Playwright browsers |

## Linting

| Task | Description |
|------|-------------|
| `poe lint` | Run Clippy (`cargo clippy --workspace -- -D warnings`) |
| `poe lint-ui` | Run ESLint on frontend |
| `poe lint-all` | Run both Clippy and ESLint |

## Coverage

| Task | Description |
|------|-------------|
| `poe coverage` | Backend coverage report (70% warning threshold) |
| `poe coverage-ui` | Frontend coverage report (Vitest) |
| `poe coverage-full` | Full workspace coverage via `cargo llvm-cov` |
| `poe install-coverage-tools` | Install `cargo-llvm-cov` |

## Fuzz Testing

| Task | Description |
|------|-------------|
| `poe fuzz-config` | Fuzz the YAML config parser (30s) |
| `poe fuzz-rule` | Fuzz rule YAML/JSON deserialization (30s) |
| `poe fuzz-all` | Run both fuzz targets |
| `poe fuzz-ci` | Short regression fuzz run (10s each, 1GB RSS limit) |
| `poe install-fuzz-tools` | Install `cargo-fuzz` |

## Version Management

| Task | Description |
|------|-------------|
| `poe version` | Show current version |
| `poe bump-patch` | Bump patch (e.g. 2.0.2 → 2.0.3) |
| `poe bump-minor` | Bump minor (e.g. 2.0.2 → 2.1.0) |
| `poe bump-major` | Bump major (e.g. 2.0.2 → 3.0.0) |
| `poe git-release` | Create git tag and push for current version |

## Changelog

| Task | Description |
|------|-------------|
| `poe changelog` | Generate `CHANGELOG.md` from git history |
| `poe changelog-preview` | Preview next release notes |
| `poe install-changelog-tools` | Install `git-cliff` |

## Dependencies

| Task | Description |
|------|-------------|
| `poe deps-update` | Update Rust dependencies (`cargo update`) |
| `poe deps-outdated` | Check for outdated dependencies |
| `poe deps-tree` | Show dependency tree |

## Utilities

| Task | Description |
|------|-------------|
| `poe size` | Show binary sizes |
| `poe list` | List all available tasks |
| `poe install-dev-tools` | Install `cargo-watch`, `cargo-outdated`, npm deps |
