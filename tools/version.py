"""Version management utilities for Harbor project."""
import re
from pathlib import Path


def get_workspace_root():
    """Get the root directory of the workspace."""
    return Path(__file__).parent.parent


def get_version():
    """Get the current version from the workspace Cargo.toml."""
    cargo_toml = get_workspace_root() / "Cargo.toml"
    content = cargo_toml.read_text()
    
    # Look for version in [workspace.package] section
    match = re.search(r'^\s*version\s*=\s*"([^"]+)"', content, re.MULTILINE)
    if match:
        return match.group(1)
    raise ValueError("Version not found in Cargo.toml [workspace.package] section")


def set_version(new_version):
    """Set the version in both Cargo.toml and pyproject.toml."""
    root = get_workspace_root()
    
    # Update Cargo.toml
    cargo_toml = root / "Cargo.toml"
    content = cargo_toml.read_text()
    content = re.sub(
        r'(^\s*version\s*=\s*")[^"]+(")',
        rf'\g<1>{new_version}\g<2>',
        content,
        flags=re.MULTILINE
    )
    cargo_toml.write_text(content)
    
    # Update pyproject.toml
    pyproject = root / "pyproject.toml"
    content = pyproject.read_text()
    content = re.sub(
        r'(^\[project\].*?^\s*version\s*=\s*")[^"]+(")',
        rf'\g<1>{new_version}\g<2>',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    pyproject.write_text(content)
    
    print(f"✓ Updated version to {new_version}")
    print(f"  - Cargo.toml (workspace)")
    print(f"  - pyproject.toml")


def show_version():
    """Display the current version."""
    version = get_version()
    print(f"Current version: {version}")


def bump_version(bump_type):
    """
    Bump the version number.
    
    Args:
        bump_type: One of 'major', 'minor', or 'patch'
    """
    current = get_version()
    parts = current.split('.')
    
    if len(parts) != 3:
        raise ValueError(f"Invalid version format: {current}")
    
    major, minor, patch = map(int, parts)
    
    if bump_type == 'major':
        new_version = f"{major + 1}.0.0"
    elif bump_type == 'minor':
        new_version = f"{major}.{minor + 1}.0"
    elif bump_type == 'patch':
        new_version = f"{major}.{minor}.{patch + 1}"
    else:
        raise ValueError(f"Invalid bump type: {bump_type}. Use 'major', 'minor', or 'patch'")
    
    set_version(new_version)
    print(f"\n📋 Next steps:")
    print(f"  1. Review changes: git diff")
    print(f"  2. Commit: git commit -am 'chore: bump version to {new_version}'")
    print(f"  3. Tag: git tag v{new_version}")
    print(f"  4. Push: git push && git push --tags")
