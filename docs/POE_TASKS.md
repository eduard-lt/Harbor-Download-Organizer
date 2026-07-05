# Poe Tasks Reference

Harbor uses [Poe the Poet](https://github.com/nat-n/poethepoet) for task automation.

```bash
poe           # List all available tasks
```

## Build & Release

| Task | Description |
|------|-------------|
| `poe build` | Build release binaries + installer (via Tauri) |
| `poe build-debug` | Build debug binaries |
| `poe clean` | Remove build artifacts |
| `poe clean-startup` | Remove ghost startup entries (e.g. from debug builds) |
| `poe unquarantine` | Remove macOS quarantine attribute from built .app bundle |

## Development

| Task | Description |
|------|-------------|
| `poe dev` | Start development server with hot reload |

## Testing

| Task | Description |
|------|-------------|
| `poe test` | Run all Rust tests |
| `poe test-ui` | Run all frontend tests |
| `poe test-all` | Run both backend and frontend tests |
| `poe coverage` | Backend coverage report (70% warning threshold) |
| `poe coverage-ui` | Frontend coverage report |
| `poe install-coverage-tools` | Install `cargo-llvm-cov` |

## Linting

| Task | Description |
|------|-------------|
| `poe lint` | Run Clippy (Rust lints) |
| `poe lint-ui` | Run ESLint (frontend) |
| `poe lint-all` | Run both Clippy and ESLint |

## Version Management

| Task | Description |
|------|-------------|
| `poe version` | Show current version |
| `poe bump-patch` | Bump patch (e.g. 2.0.2 → 2.0.3) |
| `poe bump-minor` | Bump minor (e.g. 2.0.2 → 2.1.0) |
| `poe bump-major` | Bump major (e.g. 2.0.2 → 3.0.0) |
| `poe git-release` | Create git tag and push for current version |

## Dependencies

| Task | Description |
|------|-------------|
| `poe deps-update` | Update Rust dependencies |
| `poe deps-outdated` | Check for outdated dependencies |
| `poe deps-tree` | Show dependency tree |

## Utilities

| Task | Description |
|------|-------------|
| `poe size` | Show binary sizes |
| `poe install-dev-tools` | Install `cargo-watch`, `cargo-outdated`, npm deps |
