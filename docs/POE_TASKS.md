# Poe Tasks Reference

Harbor uses [Poe the Poet](https://github.com/nat-n/poethepoet) for task automation. This document provides a quick reference for all available tasks.

## 📋 Quick Reference

View all available tasks:
```powershell
poe list
# or just
poe
```

## 🏗️ Build & Release Tasks

| Command | Description |
|---------|-------------|
| `poe build` | Build release binaries & Installer (via Tauri) |
| `poe build-debug` | Build debug binaries (via Tauri) |
| `poe clean` | Remove build artifacts |

**Examples:**
```powershell
# Build optimized release binaries + MSI Installer
poe build

# Build debug binaries (faster compilation)
poe build-debug

# Clean all build artifacts
poe clean
```

---

## 🔧 Development Tasks

| Command | Description |
|---------|-------------|
| `poe dev` | Start Development Server (Hot Reload) |
| `poe update-local` | Copy built binaries to local install location |

**Examples:**
```powershell
# Start React + Tauri Dev Server
poe dev

# Copy manually built binaries for local testing
poe update-local
```

---

## ✨ Code Quality Tasks (Backend)

| Command | Description |
|---------|-------------|
| `poe fmt` | Format code with rustfmt |
| `poe clippy` | Run clippy linter |
| `poe check` | Run all checks (fmt, clippy, test) |

**Examples:**
```powershell
# Run ALL quality checks before committing
poe check
```

---

## 🧪 Testing Tasks (Backend)

| Command | Description |
|---------|-------------|
| `poe test` | Run all Rust tests |
| `poe test-unit` | Run unit tests only |
| `poe test-watch` | Watch and run tests automatically |

---

## 🏷️ Version Management Tasks

| Command | Description |
|---------|-------------|
| `poe version` | Show current version |
| `poe bump-patch` | Bump patch (0.6.0 → 0.6.1) |
| `poe bump-minor` | Bump minor (0.6.0 → 0.7.0) |
| `poe bump-major` | Bump major (0.6.0 → 1.0.0) |

**Examples:**
```powershell
# Check current version
poe version

# New feature release
poe bump-minor
```

---

## 📦 Dependency Management Tasks

| Command | Description |
|---------|-------------|
| `poe deps-update` | Update Rust dependencies |
| `poe deps-tree` | Show dependency tree |

---

## 🛠️ Utility Tasks

| Command | Description |
|---------|-------------|
| `poe install-dev-tools` | Install dev tools (cargo-watch, etc.) |
| `poe size` | Show binary sizes |

