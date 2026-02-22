# Harbor Tools

This directory contains Python scripts and utilities for managing the Harbor project.

## Version Management (`version.py`)

Utilities for managing version numbers across the project.

### Functions:
- `show_version()` - Display current version
- `get_version()` - Get version programmatically
- `set_version(new_version)` - Set version in all files
- `bump_version(bump_type)` - Bump version (major/minor/patch)

### Usage with Poe:
```bash
poe version        # Show current version
poe bump-patch     # Increment patch (0.5.1 -> 0.5.2)
poe bump-minor     # Increment minor (0.5.1 -> 0.6.0)
poe bump-major     # Increment major (0.5.1 -> 1.0.0)
```

### Direct Python Usage:
```bash
python -c "import sys; sys.path.insert(0, 'tools'); from version import show_version; show_version()"
```

## Requirements

- Python 3.7+
- poethepoet (optional, for `poe` commands): `pip install poethepoet`
