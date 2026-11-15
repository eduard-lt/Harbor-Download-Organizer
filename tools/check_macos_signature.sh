#!/bin/bash
# Verifies the signature of the Harbor.app inside a built .dmg, as copied out
# of the disk image. A bundle changed after signing fails here; on a user's Mac
# that shows up as "Harbor is damaged" with no Open Anyway option.
# XProtect cannot run on GitHub's headless macOS runners (every app, even an
# empty one, reports "Internal Xprotect Error"), so it is not checked here.
set -euo pipefail
DMG="${1:?usage: check_macos_signature.sh <path-to-dmg>}"
MNT="$(mktemp -d)/dmg"
WORK="$(mktemp -d)"
hdiutil attach -nobrowse -readonly "$DMG" -mountpoint "$MNT" >/dev/null
cp -R "$MNT/Harbor.app" "$WORK/Harbor.app"
hdiutil detach "$MNT" >/dev/null
APP="$WORK/Harbor.app"

echo "Bundle contents:"; find "$APP/Contents" -maxdepth 2 | sed "s|$APP/||"
codesign --verify --deep --strict --verbose=2 "$APP"
echo "Signature check passed."
