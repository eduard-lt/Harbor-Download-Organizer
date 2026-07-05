#!/bin/bash
# ┌─────────────────────────────────────────────────┐
# │          Harbor — One-Click Installer           │
# │  Copies the app to /Applications and removes    │
# │  the Gatekeeper quarantine flag so it opens.    │
# └─────────────────────────────────────────────────┘

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_SOURCE="$SCRIPT_DIR/Harbor.app"
APP_TARGET="/Applications/Harbor.app"

echo "╔══════════════════════════════════════════╗"
echo "║       Harbor — Installer                ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Check that Harbor.app is next to this script ──
if [ ! -d "$APP_SOURCE" ]; then
    echo "❌  Harbor.app not found next to this script."
    echo "   Make sure you copied both files from the DMG."
    exit 1
fi

# ── Replace existing installation ──
if [ -d "$APP_TARGET" ]; then
    echo "📦  Removing existing installation..."
    rm -rf "$APP_TARGET"
fi

# ── Copy to /Applications ──
echo "📦  Copying Harbor to /Applications..."
cp -R "$APP_SOURCE" "$APP_TARGET"

# ── Remove quarantine flag ──
echo "🔓  Removing Gatekeeper quarantine..."
xattr -cr "$APP_TARGET"

# ── Launch ──
echo "🚀  Launching Harbor..."
open "$APP_TARGET"

echo ""
echo "✅  Harbor installed and launched!"
echo "   You can close this window now."
