"""Cross-platform startup cleanup for Harbor.

Usage:
    python tools/cleanup_startup.py

On macOS: removes Harbor LaunchAgent plist files from ~/Library/LaunchAgents/
On Windows: delegates to PowerShell cleanup for registry entries.
"""

import os
import platform
import subprocess
import sys
from pathlib import Path


def cleanup_macos() -> None:
    """Remove com.harbor.*.plist files from ~/Library/LaunchAgents/."""
    agents_dir = Path.home() / "Library" / "LaunchAgents"
    if not agents_dir.exists():
        print("No LaunchAgents directory found.")
        return

    found = False
    for plist in agents_dir.glob("com.harbor.*.plist"):
        found = True
        print(f"Found legacy LaunchAgent: {plist.name}")
        try:
            plist.unlink()
            print(f"  [REMOVED] {plist}")
        except OSError as e:
            print(f"  [ERROR] Failed to remove {plist}: {e}", file=sys.stderr)

    if not found:
        print("No Harbor LaunchAgents found.")


def cleanup_windows() -> None:
    """Remove ghost startup entries on Windows via registry."""
    script = Path(__file__).resolve().parent / "cleanup.ps1"
    if not script.exists():
        print("Windows cleanup script not found.", file=sys.stderr)
        sys.exit(1)

    result = subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(script)],
        capture_output=True,
        text=True,
    )
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        sys.exit(result.returncode)


def main() -> None:
    system = platform.system()
    if system == "Darwin":
        cleanup_macos()
    elif system == "Windows":
        cleanup_windows()
    else:
        print(f"Startup cleanup not implemented for {system}")
        print("No action taken.")


if __name__ == "__main__":
    main()
