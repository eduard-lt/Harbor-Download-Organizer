#!/bin/bash
# Checks a built Harbor .dmg the way a downloaded copy is judged on a Mac:
# the signature must verify, and XProtect must not flag any file. Without a
# Developer ID, syspolicy_check always reports "ad-hoc" and "notary ticket
# missing"; those still allow Privacy & Security > Open Anyway. An XProtect
# finding does not: macOS then calls the app damaged and offers only the Bin.
set -euo pipefail
DMG="${1:?usage: check_macos_gatekeeper.sh <path-to-dmg>}"
MNT="$(mktemp -d)/dmg"
WORK="$(mktemp -d)"
hdiutil attach -nobrowse -readonly "$DMG" -mountpoint "$MNT" >/dev/null
cp -R "$MNT/Harbor.app" "$WORK/Harbor.app"
hdiutil detach "$MNT" >/dev/null
APP="$WORK/Harbor.app"

echo "Bundle contents:"; find "$APP/Contents" -maxdepth 2 | sed "s|$APP/||"
codesign --verify --deep --strict --verbose=2 "$APP"

xattr -w com.apple.quarantine "0081;$(printf %x "$(date +%s)");Safari;" "$APP"
report="$(syspolicy_check distribution "$APP" 2>&1 || true)"
echo "$report"
if grep -qi "xprotect" <<<"$report"; then
  echo "::error::XProtect flagged a file in Harbor.app; macOS will call it damaged."
  exit 1
fi
echo "Gatekeeper check passed: valid signature and no XProtect findings."
