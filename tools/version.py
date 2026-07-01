"""Cross-platform version management for Harbor.

Usage:
    python tools/version.py                  # Print current version
    python tools/version.py bump <major|minor|patch>
    python tools/version.py git-release      # Create and push git tag

Files updated by bump/set:
    Cargo.toml                       workspace version
    crates/tauri-app/tauri.conf.json  app version
    packages/ui/package.json          npm package version
    pyproject.toml                    project version
    packages/ui/src/pages/InfoPage.tsx display string
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FILES = [
    # (relative_path, regex_pattern, replacement_template)
    # Replacement uses \1 for prefix and \3 for suffix in most cases
    ("Cargo.toml", r'(version\s*=\s*")[^"]+(")', r'\1{version}\2'),
    ("crates/tauri-app/tauri.conf.json", r'("version"\s*:\s*")[^"]+(")', r'\1{version}\2'),
    ("packages/ui/package.json", r'("version"\s*:\s*")[^"]+(")', r'\1{version}\2'),
    ("pyproject.toml", r'(version\s*=\s*")[^"]+(")', r'\1{version}\2'),
]

INFOPAGE_REL = "packages/ui/src/pages/InfoPage.tsx"
INFOPAGE_RE = re.compile(r"Version \d+\.\d+\.\d+")


def read_current_version() -> str:
    """Read the workspace version from Cargo.toml."""
    cargo = ROOT / "Cargo.toml"
    text = cargo.read_text(encoding="utf-8")
    m = re.search(r'version\s*=\s*"(\d+\.\d+\.\d+)"', text)
    if not m:
        sys.exit("ERROR: version not found in Cargo.toml")
    return m.group(1)


def bump_version(current: str, component: str) -> str:
    """Bump major, minor, or patch."""
    parts = [int(x) for x in current.split(".")]
    if len(parts) != 3:
        sys.exit(f"ERROR: invalid version format: {current}")
    major, minor, patch = parts
    if component == "major":
        return f"{major + 1}.0.0"
    elif component == "minor":
        return f"{major}.{minor + 1}.0"
    elif component == "patch":
        return f"{major}.{minor}.{patch + 1}"
    else:
        sys.exit(f"ERROR: unknown bump component: {component}")


def replace_in_file(path: Path, pattern: str, replacement: str) -> None:
    """Replace version in a file using regex."""
    text = path.read_text(encoding="utf-8")
    new_text = re.sub(pattern, replacement, text)
    path.write_text(new_text, encoding="utf-8")


def update_info_page(new_version: str) -> bool:
    """Update Version X.Y.Z string in InfoPage.tsx. Returns True if found."""
    info = ROOT / INFOPAGE_REL
    if not info.exists():
        print(f"  ! {INFOPAGE_REL} not found")
        return False
    text = info.read_text(encoding="utf-8")
    if not INFOPAGE_RE.search(text):
        print(f"  ! Version string not found in {INFOPAGE_REL}")
        return False
    new_text = INFOPAGE_RE.sub(f"Version {new_version}", text)
    info.write_text(new_text, encoding="utf-8")
    print(f"  - {INFOPAGE_REL}")
    return True


def update_poe_help_strings(_current: str, new_version: str) -> None:
    """Update bump help strings in pyproject.toml."""
    parts = [int(x) for x in new_version.split(".")]
    next_patch = f"{parts[0]}.{parts[1]}.{parts[2] + 1}"
    next_minor = f"{parts[0]}.{parts[1] + 1}.0"
    next_major = f"{parts[0] + 1}.0.0"

    pyproject = ROOT / "pyproject.toml"
    text = pyproject.read_text(encoding="utf-8")

    text = re.sub(
        r'help = "Bump patch version \(.*?\)"',
        f'help = "Bump patch version ({new_version} -> {next_patch})"',
        text,
    )
    text = re.sub(
        r'help = "Bump minor version \(.*?\)"',
        f'help = "Bump minor version ({new_version} -> {next_minor})"',
        text,
    )
    text = re.sub(
        r'help = "Bump major version \(.*?\)"',
        f'help = "Bump major version ({new_version} -> {next_major})"',
        text,
    )
    pyproject.write_text(text, encoding="utf-8")
    print("  - pyproject.toml (updated help strings)")


def set_version(new_version: str) -> None:
    """Write the new version to all configured files."""
    for rel_path, pattern, template in FILES:
        target = ROOT / rel_path
        if not target.exists():
            print(f"  ! {rel_path} not found")
            continue
        replacement = template.format(version=new_version)
        replace_in_file(target, pattern, replacement)
        print(f"  - {rel_path}")

    update_info_page(new_version)
    update_poe_help_strings(read_current_version() if False else "", new_version)

    print(f"\nUpdated version to {new_version}")
    print("\nNext steps:")
    print("  1. Review changes: git diff")
    print(f'  2. Commit: git commit -am "chore: bump version to {new_version}"')
    print("  3. Release: uv run poe git-release")


def do_git_release() -> None:
    """Create and push a git tag for the current version."""
    version = read_current_version()
    tag = f"v{version}"

    print(f"Creating git tag: {tag}")
    result = subprocess.run(["git", "tag", tag], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Failed to create tag: {result.stderr.strip()}")
        sys.exit(1)

    print("Pushing tag to origin...")
    result = subprocess.run(["git", "push", "origin", tag], capture_output=True, text=True)
    if result.returncode == 0:
        print(f"Successfully pushed tag {tag}")
    else:
        print(f"Failed to push tag: {result.stderr.strip()}")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Harbor version management")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("show", help="Print current version")

    bump_parser = sub.add_parser("bump", help="Bump version")
    bump_parser.add_argument("component", choices=["major", "minor", "patch"])

    sub.add_parser("git-release", help="Create and push git tag")

    args = parser.parse_args()

    if args.command == "show" or args.command is None:
        print(read_current_version())
    elif args.command == "bump":
        current = read_current_version()
        new = bump_version(current, args.component)
        set_version(new)
    elif args.command == "git-release":
        do_git_release()
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
