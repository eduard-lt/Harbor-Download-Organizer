# Contributing to Harbor

Thank you for considering contributing to Harbor! This guide covers everything you need to get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project follows a simple principle: **Be kind and respectful**. We're all here to build something useful together.

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what's best for the community
- Show empathy towards other community members

---

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:
1. Check the [existing issues](https://github.com/eduard-lt/Harbor-Download-Organizer/issues) to avoid duplicates
2. Collect information:
   - Harbor version (see the Settings page, or `harbor-cli --version`)
   - OS and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or `recent_moves.log` contents
   - Your rule configuration (remove sensitive paths)

**Submit bugs via [GitHub Issues](https://github.com/eduard-lt/Harbor-Download-Organizer/issues/new)** with the "bug" label.

### Suggesting Features

- Check if it's already in the [Roadmap](README.md#roadmap) or [TODO list](docs/TODO.md)
- Search existing feature requests
- Consider if it fits Harbor's core purpose

Include in your suggestion:
- Clear use case and motivation
- How it would work
- Any alternatives you've considered
- Whether you'd be willing to implement it

### Improving Documentation

Documentation improvements are always welcome — typos, clarifications, examples, tutorials, or better installation instructions.

---

## Development Setup

### Prerequisites

- **Rust** (latest stable) — [rustup.rs](https://rustup.rs/)
- **Node.js 20+** — for the React frontend
- **Python 3.10+** — for Poe task runner and tool scripts
- **uv** — Python package manager ([install](https://docs.astral.sh/uv/))
- **Poe the Poet** — `uv tool install poethepoet`
- **WiX Toolset v3** (Windows only) — for building MSI installers

### Clone and Build

```bash
git clone https://github.com/eduard-lt/Harbor-Download-Organizer.git
cd Harbor-Download-Organizer

# Install frontend dependencies
cd packages/ui && npm install && cd ../..

# Build the Tauri app
poe build

# Or build just the Rust crates
cargo build
```

### Development Mode

```bash
# Start the Tauri dev server (hot reload for frontend)
poe dev

# Or just the Rust side
cargo build
```

### Install Development Tools (Optional)

```bash
cargo install cargo-watch        # Auto-rebuild on changes
cargo install cargo-llvm-cov     # Code coverage
cargo install cargo-fuzz         # Fuzz testing
cargo install git-cliff          # Changelog generation
```

---

## Project Structure

```
Harbor-Download-Organizer/
├── crates/
│   ├── core/                    # Core library (business logic)
│   │   └── src/
│   │       ├── types.rs         # Rule data model
│   │       ├── downloads.rs     # Config, organize, polling, logging
│   │       └── platform/        # Cross-platform path resolution
│   ├── cli/                     # CLI (init, organize, watch)
│   ├── tray/                    # Windows system tray app (legacy)
│   └── tauri-app/               # Tauri v2 desktop app (primary UI)
│       └── src/
│           ├── main.rs          # App bootstrap, tray menu
│           ├── state.rs         # Service lifecycle state machine
│           └── commands/        # Tauri IPC handlers
│               ├── rules.rs     # Rule CRUD
│               ├── activity.rs  # Activity log + stats
│               ├── settings.rs  # Service control, startup, organize
│               └── error_contract.rs
├── packages/ui/                 # React frontend
│   └── src/
│       ├── components/          # Reusable UI components
│       ├── pages/               # Rules, Activity, Settings, Info
│       └── context/             # React contexts (theme, settings, updates)
├── tools/                       # Python utility scripts
│   ├── version.py               # Version bump + git release
│   ├── coverage.py              # Backend coverage orchestration
│   ├── cleanup_startup.py       # Ghost startup entry removal
│   └── size.py                  # Binary size reporting
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # Crate layout and key abstractions
│   ├── TODO.md                  # Planned features and improvements
│   ├── POE_TASKS.md             # Poe task reference
│   ├── WINDOW_MANAGEMENT.md     # Tauri window visibility guide
│   └── testing/                 # Testing docs (coverage policy, etc.)
├── assets/                      # Icons and resources
├── Cargo.toml                   # Rust workspace
├── pyproject.toml               # Poe tasks + project metadata
└── cliff.toml                   # git-cliff changelog config
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed breakdown of crate responsibilities and data flow.

---

## Development Workflow

### Common Commands

| Task | Command |
|---|---|
| Run all tests | `poe test-all` |
| Run Rust tests | `poe test` |
| Run frontend tests | `poe test-ui` |
| Run all linters | `poe lint-all` |
| Rust lints (Clippy) | `poe lint` |
| Frontend lints (ESLint) | `poe lint-ui` |
| Build release | `poe build` |
| Dev server (hot reload) | `poe dev` |
| Clean build artifacts | `poe clean` |
| Backend coverage | `poe coverage` |
| Frontend coverage | `poe coverage-ui` |
| Version bump (patch) | `poe bump-patch` |
| Version bump (minor) | `poe bump-minor` |
| Generate changelog | `poe changelog` |

Full list: `poe` or see [POE_TASKS.md](docs/POE_TASKS.md).

### Before Submitting

Always run these before opening a PR:

```bash
poe lint-all     # Clippy + ESLint
poe test-all     # Rust + React tests
```

If your changes touch the service lifecycle or organize pipeline, also run:

```bash
cargo test -p harbor-tauri-app   # Integration tests for service orchestration
```

---

## Coding Standards

### Rust

Follow standard Rust conventions. We use `rustfmt` defaults and require zero Clippy warnings:

```bash
cargo fmt
cargo clippy -- -D warnings
```

**Guidelines:**
- One module per file
- Public APIs must have doc comments (`///`)
- Use `anyhow::Result` for application code, `thiserror` for libraries
- Provide context on errors: `.with_context(|| format!("..."))?`
- Descriptive names: `organize_downloads()` not `org_dl()`

**Error handling:**

```rust
// Good: Provide context
fs::read_to_string(path)
    .with_context(|| format!("Failed to read config from {}", path.display()))?;

// Good: Return descriptive errors
if !path.exists() {
    bail!("Config file not found: {}", path.display());
}
```

### TypeScript / React

- ESLint and Prettier for formatting
- One component per file
- Tests live alongside components in `*.test.tsx` files
- Use Tauri's `invoke()` for all backend communication

---

## Testing

### Running Tests

```bash
# All tests
poe test-all

# Specific Rust crate
cargo test -p harbor-core

# Specific test
cargo test test_rule_matching

# With output
cargo test -- --nocapture

# Frontend tests in watch mode
cd packages/ui && npm run test
```

### Writing Tests

#### Rust Unit Tests

Place tests in the same file as the code using `#[cfg(test)] mod tests`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_organize_moves_matching_file() {
        let tmp = TempDir::new().unwrap();
        // ... create files + config, call organize_once, assert
    }
}
```

#### Frontend Tests

Use Vitest. Place test files alongside components:

```tsx
// components/StatCard.test.tsx
import { render, screen } from '@testing-library/react';
import { StatCard } from './StatCard';

test('renders value and label', () => {
  render(<StatCard value={42} label="Files" />);
  expect(screen.getByText('42')).toBeInTheDocument();
  expect(screen.getByText('Files')).toBeInTheDocument();
});
```

#### Integration Tests

Tauri app orchestration tests live in `crates/tauri-app/src/integration_tests.rs`. These exercise the service lifecycle (start, stop, degrade, restart) and organize pipelines.

### Test Guidelines

- **Test public APIs**, not internal implementation
- **Use descriptive test names**: `test_symlink_creation_requires_permissions`
- **Use `tempfile::TempDir` for file system tests** to avoid side effects
- **Mock external dependencies** when possible

---

## Submitting Changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dry-run mode for testing rules
fix: prevent organizing partial downloads
docs: update configuration examples
test: add tests for symlink creation
refactor: simplify rule matching logic
chore: update dependencies
```

### Pull Request Process

1. **Fork the repository** and create a branch:
   ```bash
   git checkout -b feature/my-amazing-feature
   ```

2. **Make your changes**:
   - Write tests for new functionality
   - Update documentation if needed
   - Run `poe lint-all` and `poe test-all`

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: add my amazing feature"
   git push origin feature/my-amazing-feature
   ```

4. **Open a Pull Request**:
   - Clear title and description
   - Reference related issues
   - Explain what changed and why
   - Include screenshots for UI changes
   - List any breaking changes

### PR Checklist

- [ ] Code follows style guidelines (`poe lint-all` passes)
- [ ] Tests pass (`poe test-all` passes)
- [ ] New functionality has tests
- [ ] Documentation is updated (if needed)
- [ ] Commit messages follow conventions

---

## Release Process

(For maintainers)

### Version Bumping

```bash
poe bump-patch   # 2.0.0 → 2.0.1
poe bump-minor   # 2.0.0 → 2.1.0
poe bump-major   # 2.0.0 → 3.0.0
```

### Creating a Release

1. **Update CHANGELOG.md**:
   ```bash
   poe changelog     # Generate from git history via git-cliff
   ```

2. **Bump version**:
   ```bash
   poe bump-minor    # or bump-patch
   ```

3. **Commit and tag**:
   ```bash
   git add .
   git commit -m "chore: release v2.1.0"
   git tag v2.1.0
   git push origin main --tags
   ```

4. **GitHub Actions** will build binaries, create the MSI/DMG, and attach them to a GitHub release.

---

## Questions?

- 💬 Open a [Discussion](https://github.com/eduard-lt/Harbor-Download-Organizer/discussions)
- 🐛 Report bugs via [Issues](https://github.com/eduard-lt/Harbor-Download-Organizer/issues)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Harbor! ⚓**
