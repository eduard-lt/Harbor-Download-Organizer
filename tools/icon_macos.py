"""Regenerate Harbor's bundled macOS icon catalog with Apple's asset compiler."""

from pathlib import Path
import platform
import shutil
import subprocess
import tempfile


def main() -> None:
    if platform.system() != "Darwin":
        raise SystemExit("The macOS icon must be compiled on macOS with Xcode 26 or later.")

    root = Path(__file__).resolve().parents[1]
    destination = root / "assets" / "macos" / "Assets.car"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="harbor-icon-") as directory:
        output = Path(directory)
        subprocess.run(
            [
                "xcrun", "actool", str(root / "assets" / "Harbor.icon"),
                "--compile", str(output),
                "--output-format", "human-readable-text",
                "--app-icon", "Harbor",
                "--output-partial-info-plist", str(output / "info.plist"),
                "--target-device", "mac",
                "--minimum-deployment-target", "26.0",
                "--platform", "macosx",
            ],
            check=True,
        )
        # A compiler failure must leave the previously verified catalog intact.
        with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as staging:
            staged = Path(staging.name)
        try:
            shutil.copyfile(output / "Assets.car", staged)
            staged.replace(destination)
        finally:
            staged.unlink(missing_ok=True)
    print(f"Updated {destination.relative_to(root)}")


if __name__ == "__main__":
    main()
