## Development Tasks

**Core Commands**:
- `poe dev`: Start development server with hot reload
- `poe build`: Build release binaries and installer
- `poe test`: Run unit tests
- `poe test-ui`: Run frontend tests
- `poe coverage`: Backend coverage report (70% line target)
- `poe clean`: Remove build artifacts

**Version Management**:
- `poe version`: Show current version
- `poe bump-patch/minor/major`: Version increment
- `poe git-release`: Create git tag for current version

**Dependency Management**:
- `poe deps-update`: Update dependencies
- `poe deps-outdated`: Check outdated dependencies
- `poe deps-tree`: Show dependency tree

**Utility Tasks**:
- `poe install-dev-tools`: Install development tools (cargo-watch, eslint, etc.)
- `poe size`: Show binary sizes
- `poe lint`: Run Clippy lints
- `poe lint-ui`: Run ESLint for frontend