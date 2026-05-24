## Harbor Codebase Overview

**Purpose**: A modern download organizer and file manager for Windows, automatically sorting downloads into categorized folders based on custom rules.

**Key Features**:
- Auto-organization of downloads
- Tray interface for control
- Customizable rules via UI or YAML config
- Activity logging
- Support for symlinks
- Conflict resolution during file moves

**Technology Stack**:
- **Backend**: Rust (Tauri v2 framework)
- **Frontend**: React
- **Build Tool**: `poe` (Python-based task runner)
- **Dependency Management**: Cargo (Rust) and NPM (JavaScript)

**Project Structure**:
- `crates/`: Rust workspaces for core logic, CLI, tray app, and Tauri integration
- `packages/ui`: React frontend
- `tools/`: PowerShell scripts for development tasks
- `.github/workflows/`: CI/CD configurations

**Roadmap**:
- Cross-platform support (Linux/macOS)
- Multi-folder monitoring
- Enhanced notification system