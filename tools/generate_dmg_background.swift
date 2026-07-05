#!/usr/bin/env swift
import AppKit
import Foundation

// ── DMG Background Generator for Harbor ──
// Works in both local and headless CI (uses offscreen bitmap, not screen-locked NSImage).
// Renders at 2x for Retina displays — macOS scales the background to fit the DMG window.

let scale = 2
let width = 660 * scale
let height = 480 * scale

guard let imageRep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: width,
    pixelsHigh: height,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
) else {
    print("ERROR: Failed to create bitmap")
    exit(1)
}
imageRep.size = NSSize(width: width, height: height)

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: imageRep)

// ── Solid white background ──
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()

// ── Title ──
let titleStyle = NSMutableParagraphStyle()
titleStyle.alignment = .center

let titleAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.boldSystemFont(ofSize: 28),
    .foregroundColor: NSColor(red: 0.15, green: 0.35, blue: 0.85, alpha: 1.0),
    .paragraphStyle: titleStyle,
]
("Harbor").draw(in: NSRect(x: 0, y: height - 80, width: width, height: 35), withAttributes: titleAttrs)

// ── Drag instruction ──
let subAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 14),
    .foregroundColor: NSColor(white: 0.4, alpha: 1.0),
    .paragraphStyle: titleStyle,
]
("Drag the Harbor icon into the Applications folder")
    .draw(in: NSRect(x: 0, y: height - 115, width: width, height: 22), withAttributes: subAttrs)

// ── Arrow ──
let arrowAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 40),
    .foregroundColor: NSColor(white: 0.5, alpha: 1.0),
    .paragraphStyle: titleStyle,
]
("→").draw(in: NSRect(x: 0, y: height / 2 - 25, width: width, height: 50), withAttributes: arrowAttrs)

// ── Separator line ──
let lineY = 110
NSColor(white: 0.85, alpha: 1.0).setStroke()
let linePath = NSBezierPath()
linePath.move(to: NSPoint(x: 40, y: lineY))
linePath.line(to: NSPoint(x: width - 40, y: lineY))
linePath.lineWidth = 1
linePath.stroke()

// ── Important note ──
let noteStyle = NSMutableParagraphStyle()
noteStyle.alignment = .center

let noteTitleAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.boldSystemFont(ofSize: 12),
    .foregroundColor: NSColor(red: 0.8, green: 0.3, blue: 0.15, alpha: 1.0),
    .paragraphStyle: noteStyle,
]
("⚠️  First-time launch — important!")
    .draw(in: NSRect(x: 0, y: lineY - 22, width: width, height: 18), withAttributes: noteTitleAttrs)

let noteAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 11),
    .foregroundColor: NSColor(white: 0.35, alpha: 1.0),
    .paragraphStyle: noteStyle,
]
("macOS blocks apps from unidentified developers.")
    .draw(in: NSRect(x: 20, y: lineY - 42, width: width - 40, height: 16), withAttributes: noteAttrs)

let instrAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.boldSystemFont(ofSize: 11),
    .foregroundColor: NSColor(white: 0.2, alpha: 1.0),
    .paragraphStyle: noteStyle,
]
("Right-click Harbor → Open, then click Open again.")
    .draw(in: NSRect(x: 20, y: lineY - 60, width: width - 40, height: 16), withAttributes: instrAttrs)

let extraAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 10),
    .foregroundColor: NSColor(white: 0.5, alpha: 1.0),
    .paragraphStyle: noteStyle,
]
("After the first launch, the app opens normally.")
    .draw(in: NSRect(x: 20, y: lineY - 78, width: width - 40, height: 16), withAttributes: extraAttrs)

let scriptAttrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 9),
    .foregroundColor: NSColor(white: 0.6, alpha: 1.0),
    .paragraphStyle: noteStyle,
]
("Tip: An auto-install script is inside Harbor.app → Right-click → Show Package Contents → Contents → Resources → assets")
    .draw(in: NSRect(x: 20, y: lineY - 95, width: width - 40, height: 14), withAttributes: scriptAttrs)

NSGraphicsContext.restoreGraphicsState()

// ── Save as PNG ──
guard let png = imageRep.representation(using: .png, properties: [:]) else {
    print("ERROR: Failed to encode PNG")
    exit(1)
}

let path = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "crates/tauri-app/dmg_background.png"

try png.write(to: URL(fileURLWithPath: path))
print("✅ DMG background saved to \(path)")
