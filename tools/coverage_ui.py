"""Cross-platform coverage report opener for Harbor.

Usage:
    python tools/coverage_ui.py

Opens the frontend coverage report in the system browser.
- macOS:  'open'
- Windows: 'start'
- Linux:  'xdg-open'
"""

import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COVERAGE_HTML = ROOT / "packages" / "ui" / "coverage" / "index.html"


def main() -> None:
    if not COVERAGE_HTML.exists():
        print(f"Coverage report not found: {COVERAGE_HTML}", file=sys.stderr)
        print("Run 'uv run poe coverage' first.", file=sys.stderr)
        sys.exit(1)

    path_str = str(COVERAGE_HTML)

    system = platform.system()
    if system == "Darwin":
        cmd = ["open", path_str]
    elif system == "Windows":
        cmd = ["cmd", "/c", "start", "", path_str]
    else:
        cmd = ["xdg-open", path_str]

    subprocess.run(cmd)
    print(f"Opened coverage report: {path_str}")


if __name__ == "__main__":
    main()
