## Architecture Overview

**Core Components**:
1. **Rust Workspaces**:
   - `crates/core`: Business logic and file operations
   - `crates/cli`: Command-line interface
   - `crates/tray`: System tray application
   - `crates/tauri-app`: Tauri-based desktop application

2. **Frontend**:
   - React-based UI in `packages/ui`
   - Communication with Rust backend via Tauri

**Key Patterns**:
- **Modular Crates**: Each major function (CLI, tray, app) is a separate crate
- **Tauri Integration**: Rust backend with React frontend
- **Configuration Management**: YAML files for rules and settings

**Development Tools**:
- `poe` for task automation
- `cargo` for Rust development
- `npm` for frontend dependencies

**Build Process**:
1. Frontend: `npm run tauri:build`
2. Backend: Cargo build tasks
3. Packaging: MSI installer via Tauri