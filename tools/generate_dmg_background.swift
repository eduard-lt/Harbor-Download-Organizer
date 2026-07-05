#!/usr/bin/env swift
import AppKit
import Foundation

// ── DMG Background Generator for Harbor ──
// Creates a clean drag-to-Applications background with instructions
// for first-time users on how to bypass Gatekeeper.

let width = 660
let height = 400

let image = NSImage(size: NSSize(width: width, height: height))
image.lockFocus()

// ── Background gradient (subtle dark blue) ──
let bg = NSGradient(
    starting: NSColor(red: 0.06, green: 0.08, blue: 0.16, alpha: 1.0),
    ending: NSColor(red: 0.10, green: 0.14, blue: 0.26, alpha: 1.0)
)
bg?.draw(in: NSRect(x: 0, y: 0, width: width, height: height), angle: -45)

// ── Title ──
let titleStyle = NSMutableParagraphStyle()
titleStyle.alignment = .center
let titleAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.boldSystemFont(ofSize: 24),
    .foregroundColor: NSColor.white,
    .paragraphStyle: titleStyle,
]
("Harbor").draw(in: NSRect(x: 0, y: height - 70, width: width, height: 30), withAttributes: titleAttrs)

// ── Subtitle ──
let subAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 13),
    .foregroundColor: NSColor(white: 0.6, alpha: 1.0),
    .paragraphStyle: titleStyle,
]
("Drag Harbor to the Applications folder").draw(
    in: NSRect(x: 0, y: height - 95, width: width, height: 20),
    withAttributes: subAttrs
)

// ── Instructions at bottom ──
let instrStyle = NSMutableParagraphStyle()
instrStyle.alignment = .center
let instrAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 11),
    .foregroundColor: NSColor(white: 0.5, alpha: 1.0),
    .paragraphStyle: instrStyle,
]
("First launch?  Run \"Install Harbor.command\" — it handles Gatekeeper automatically.")
    .draw(in: NSRect(x: 20, y: 20, width: width - 40, height: 18), withAttributes: instrAttrs)

// ── Arrow between icons (drawn as a Unicode char, or simple shape) ──
let arrowAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 36),
    .foregroundColor: NSColor(white: 0.4, alpha: 1.0),
    .paragraphStyle: titleStyle,
]
("→").draw(in: NSRect(x: 0, y: height / 2 - 25, width: width, height: 50), withAttributes: arrowAttrs)

image.unlockFocus()

// ── Save as PNG ──
guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    print("ERROR: Failed to encode PNG")
    exit(1)
}

let path = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "target/release/bundle/macos/dmg_background.png"

let url = URL(fileURLWithPath: path)
try png.write(to: url)
print("✅ DMG background saved to \(path)")
