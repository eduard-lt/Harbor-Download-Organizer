# Contributing to Harbor

Thank you for considering contributing to Harbor! We appreciate your time and effort. This guide will help you get started with contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

---

## Code of Conduct

This project follows a simple principle: **Be kind and respectful**. We're all here to build something useful together.

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what's best for the community
- Show empathy towards other community members

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Before submitting a bug report:
1. Check the [existing issues](https://github.com/eduard-lt/Harbor-Download-Organizer/issues) to avoid duplicates
2. Collect information about the bug:
   - Harbor version (`harbor-cli --version`)
   - Windows version
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs from `recent_moves.log`
   - Your configuration (remove sensitive paths if any)

**Submit bugs using our [GitHub Issues](https://github.com/eduard-lt/Harbor-Download-Organizer/issues/new)** with the "bug" label.

### 💡 Suggesting Features

We love new ideas! Before suggesting:
1. Check if it's already in the [Roadmap](README.md#️-roadmap)
2. Search existing feature requests
3. Consider if it fits Harbor's core purpose

Include in your suggestion:
- Clear use case and motivation
- How it would work (mock-ups welcome!)
- Any alternatives you've considered
- Whether you'd be willing to implement it

### 📝 Improving Documentation

Documentation improvements are always welcome:
- Fix typos or clarify confusing sections
- Add examples or use cases
- Improve installation instructions
- Write tutorials or guides

### 💻 Contributing Code

See the sections below for development setup and workflow.

---

## Development Setup

### Prerequisites

1. **Rust** (latest stable)
   ```powershell
   # Install via rustup
   winget install Rustlang.Rustup
   # Or visit https://rustup.rs/
   ```

2. **WiX Toolset v3** (for building installers)
   ```powershell
   winget install WiXToolset.WiXToolset
   ```

3. **Python** (for poe tasks, optional but recommended)
   ```powershell
   winget install Python.Python.3.12
   ```

4. **Poe the Poet** (task runner)
   ```powershell
   pip install poethepoet
   ```

### Clone and Build

```powershell
# Clone the repository
git clone https://github.com/eduard-lt/Harbor-Download-Organizer.git
cd Harbor

# Build all crates
cargo build --release

# Or use poe
poe build
```

### Install Development Tools (Optional)

```powershell
# For watching file changes during development
cargo install cargo-watch

# For code coverage
cargo install cargo-tarpaulin
```

---

## Project Structure

```
Harbor/
├── crates/
│   ├── core/           # Core library (downloads, orchestrator, config)
│   │   ├── src/
│   │   │   ├── config.rs
│   │   │   ├── downloads.rs
│   │   │   ├── health.rs
│   │   │   ├── orchestrator.rs
│   │   │   └── ...
│   │   └── tests/      # Unit tests
│   ├── cli/            # Command-line interface
│   │   └── src/main.rs
│   └── tray/           # System tray application
│       └── src/main.rs
├── examples/           # Example configurations
├── tools/              # Development scripts
├── wix/                # MSI installer configuration
├── assets/             # Icons and resources
└── pyproject.toml      # Poe task definitions
```

### Crate Responsibilities

- **`harbor-core`**: Business logic, file operations, configuration parsing
- **`harbor-cli`**: CLI commands and argument parsing
- **`harbor-tray`**: Windows system tray GUI and file watcher

---

## Development Workflow

### Daily Development

```powershell
# Run tests
poe test

# Format code
cargo fmt

# Check for issues
cargo clippy

# Build and update local installation
poe update-local

# Watch for changes and run tests
cargo watch -x test
```

### Using Poe Tasks

We use [Poe the Poet](https://github.com/nat-n/poethepoet) for common tasks:

```powershell
poe build              # Build release binaries
poe test               # Run all tests
poe clean              # Clean build artifacts
poe msi                # Build MSI installer
poe update-local       # Install to %LOCALAPPDATA%\Harbor for testing
poe version            # Show current version
poe bump-patch         # Bump version (0.6.0 -> 0.6.1)
poe bump-minor         # Bump version (0.6.0 -> 0.7.0)
poe release            # Build binaries + MSI
```

### Testing Your Changes

1. **Build locally**:
   ```powershell
   cargo build --release
   ```

2. **Install locally for testing**:
   ```powershell
   poe update-local
   # Or manually:
   .\tools\update-local-install.ps1
   ```

3. **Test the tray app**:
   - Check system tray for Harbor icon
   - Test all menu items
   - Verify file organization works
   - Check `recent_moves.log`

4. **Test CLI**:
   ```powershell
   harbor-cli downloads-organize
   harbor-cli downloads-watch --interval-secs 5
   ```

---

## Coding Standards

### Rust Style

We follow standard Rust conventions:

```rust
// Use rustfmt defaults
cargo fmt

// Pass clippy with no warnings
cargo clippy -- -D warnings
```

### Code Organization

- **One module per file** in `core/src/`
- **Public APIs should have doc comments**:
  ```rust
  /// Organizes files in the downloads folder once.
  ///
  /// # Arguments
  ///
  /// * `cfg` - The downloads configuration
  ///
  /// # Returns
  ///
  /// A vector of tuples containing (source, destination, rule_name, symlink_info)
  pub fn organize_once(cfg: &DownloadsConfig) -> Result<Vec<(PathBuf, PathBuf, String, Option<String>)>> {
      // ...
  }
  ```

- **Use `Result<T>` for operations that can fail**
- **Prefer `anyhow::Result` for applications, `thiserror` for libraries**

### Error Handling

```rust
// Good: Provide context
fs::read_to_string(path)
    .with_context(|| format!("Failed to read config from {}", path.display()))?;

// Good: Return descriptive errors
if !path.exists() {
    bail!("Config file not found: {}", path.display());
}
```

### Naming Conventions

- **Functions**: `snake_case`
- **Types**: `PascalCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Be descriptive**: `organize_downloads()` not `org_dl()`

---

## Testing

### Running Tests

```powershell
# All tests
cargo test

# Specific crate
cargo test -p harbor-core

# Specific test
cargo test test_rule_matching

# With output
cargo test -- --nocapture
```

### Writing Tests

#### Unit Tests

Place tests in the same file as the code:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rule_matches_extension() {
        let rule = Rule {
            name: "images".to_string(),
            extensions: Some(vec!["jpg".to_string(), "png".to_string()]),
            pattern: None,
            target_dir: "test".to_string(),
            ..Default::default()
        };
        
        assert!(rule.matches("photo.jpg"));
        assert!(!rule.matches("video.mp4"));
    }
}
```

#### Integration Tests

Create files in `crates/core/tests/`:

```rust
// tests/downloads_integration.rs
use harbor_core::downloads::*;
use tempfile::TempDir;

#[test]
fn test_organize_with_real_files() {
    let tmp = TempDir::new().unwrap();
    // ... test with actual files
}
```

### Test Guidelines

- **Test public APIs**, not internal implementation
- **Use descriptive test names**: `test_symlink_creation_requires_permissions`
- **One assertion per test** when possible
- **Use `tempfile` for file system tests** to avoid side effects
- **Mock external dependencies** (file system, network)

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
   ```powershell
   git checkout -b feature/my-amazing-feature
   ```

2. **Make your changes**:
   - Write tests for new functionality
   - Update documentation if needed
   - Run `cargo fmt` and `cargo clippy`
   - Ensure all tests pass

3. **Commit your changes**:
   ```powershell
   git add .
   git commit -m "feat: add my amazing feature"
   ```

4. **Push to your fork**:
   ```powershell
   git push origin feature/my-amazing-feature
   ```

5. **Open a Pull Request**:
   - Use a clear title and description
   - Reference related issues
   - Explain what changed and why
   - Include screenshots for UI changes
   - List any breaking changes

### PR Checklist

Before submitting, ensure:

- [ ] Code follows style guidelines (`cargo fmt`, `cargo clippy`)
- [ ] Tests pass (`cargo test`)
- [ ] New functionality has tests
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated (for significant changes)
- [ ] Commit messages follow conventions
- [ ] No merge conflicts with main

---

## Release Process

(For maintainers)

### Version Bumping

```powershell
# Patch release (0.6.0 -> 0.6.1)
poe bump-patch

# Minor release (0.6.0 -> 0.7.0)
poe bump-minor

# Major release (0.6.0 -> 1.0.0)
poe bump-major
```

### Creating a Release

1. **Update CHANGELOG.md**:
   - Move items from `[Unreleased]` to new version section
   - Add release date
   - Update comparison links

2. **Bump version**:
   ```powershell
   poe bump-minor  # or bump-patch
   ```

3. **Commit and tag**:
   ```powershell
   git add .
   git commit -m "chore: release v0.7.0"
   git tag v0.7.0
   git push origin main --tags
   ```

4. **GitHub Actions will**:
   - Build binaries
   - Create MSI installer
   - Create GitHub release
   - Attach artifacts

5. **Update release notes** on GitHub with highlights from CHANGELOG

---

## Questions?

- 💬 Open a [Discussion](https://github.com/eduard-lt/Harbor-Download-Organizer/discussions)
- 🐛 Report bugs via [Issues](https://github.com/eduard-lt/Harbor-Download-Organizer/issues)
- 📧 Contact: [Your contact method]

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Harbor! ⚓**
