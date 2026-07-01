"""Cross-platform binary size reporter for Harbor.

Usage:
    python tools/size.py

Measures compiled binaries and (on macOS) the .app bundle size.
"""

import os
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RELEASE = ROOT / "target" / "release"


def format_bytes(size_bytes: int) -> str:
    """Format bytes as human-readable string."""
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    elif size_bytes >= 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes} B"


def measure_binary(name: str) -> tuple[bool, str]:
    """Try to measure a binary. Returns (found, formatted_string)."""
    suffix = ".exe" if platform.system() == "Windows" else ""
    path = RELEASE / f"{name}{suffix}"
    if path.exists():
        size = path.stat().st_size
        return True, f"{path.name}: {format_bytes(size)}"
    return False, f"{path.name}: not found"


def measure_app_bundle() -> tuple[bool, str]:
    """On macOS, measure the .app bundle size."""
    app_path = RELEASE / "bundle" / "macos" / "Harbor.app"
    if not app_path.exists():
        return False, "Harbor.app: not found"

    try:
        result = subprocess.run(
            ["du", "-sh", str(app_path)],
            capture_output=True,
            text=True,
        )
        size_str = result.stdout.split()[0] if result.stdout else "unknown"
        return True, f"Harbor.app: {size_str}"
    except FileNotFoundError:
        # du not available, fall back to walking
        total = sum(f.stat().st_size for f in app_path.rglob("*") if f.is_file())
        return True, f"Harbor.app: {format_bytes(total)}"


def main() -> None:
    print(f"{'File':<25} {'Size':>12}")
    print("-" * 38)

    binaries = ["harbor-cli", "harbor-tauri-app"]
    # harbor-tray is Windows-only — check if it exists
    if platform.system() == "Windows":
        binaries.append("harbor-tray")

    for name in binaries:
        _, line = measure_binary(name)
        print(f"  {line}")

    if platform.system() == "Darwin":
        _, line = measure_app_bundle()
        print(f"  {line}")

    print()


if __name__ == "__main__":
    main()
