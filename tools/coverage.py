"""Cross-platform coverage runner for Harbor.

Usage:
    python tools/coverage.py [--blocking]

Runs:
    1. Rust coverage via cargo llvm-cov (requires cargo-llvm-cov)
    2. Frontend coverage via npm test (optional)

By default, exits 0 even if coverage threshold is not met (non-blocking warning).
With --blocking, exits non-zero when coverage is below the 70% threshold.
"""

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_cmd(cmd: list[str], cwd: Path | None = None) -> tuple[int, str, str]:
    """Run a command and return (exit_code, stdout, stderr)."""
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=cwd)
    return result.returncode, result.stdout, result.stderr


def main() -> None:
    parser = argparse.ArgumentParser(description="Harbor coverage runner")
    parser.add_argument(
        "--blocking",
        action="store_true",
        help="Exit non-zero if coverage is below threshold (for CI use)",
    )
    args = parser.parse_args()

    coverage_failed = False

    # --- Rust backend coverage ---
    print("=" * 60)
    print("Rust backend coverage (cargo llvm-cov)")
    print("=" * 60)
    code, stdout, stderr = run_cmd([
        "cargo", "llvm-cov", "--workspace",
        "--ignore-filename-regex", r"main\.rs",
        "--summary-only",
        "--fail-under-lines", "70",
    ])

    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)

    if code != 0:
        msg = (
            "\nWARNING: Backend coverage is below the 70% target."
        )
        if args.blocking:
            print(f"{msg} Failing build.", file=sys.stderr)
            coverage_failed = True
        else:
            print(f"{msg} (non-blocking in this phase).", file=sys.stderr)

    # --- Frontend coverage (only if npm test is available) ---
    ui_dir = ROOT / "packages" / "ui"
    if (ui_dir / "package.json").exists():
        print("\n" + "=" * 60)
        print("Frontend coverage (npm)")
        print("=" * 60)
        code, stdout, stderr = run_cmd(
            ["npm", "run", "coverage"],
            cwd=ui_dir,
        )
        if stdout:
            print(stdout)
        if stderr:
            print(stderr, file=sys.stderr)
        if code != 0:
            print("\nWARNING: Frontend coverage command failed.", file=sys.stderr)

    if coverage_failed:
        sys.exit(1)
    else:
        print("\nCoverage run complete.")


if __name__ == "__main__":
    main()
