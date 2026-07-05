#!/usr/bin/env swift
import AppKit
import Foundation

// ── DMG Background Generator for Harbor ──
// Tries lockFocus() first (sharpest), falls back to offscreen bitmap (CI-safe).
// The DMG window is 660×480 — the image must match exactly.

let width = 660
let height = 480

func render(into ctx: NSGraphicsContext?) {
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
    ("After the first launch, Harbor opens normally — no extra steps needed.")
        .draw(in: NSRect(x: 20, y: lineY - 78, width: width - 40, height: 16), withAttributes: extraAttrs)
}

func encodePNG(from image: NSImage) -> Data? {
    guard let tiff = image.tiffRepresentation,
          let bitmap = NSBitmapImageRep(data: tiff) else { return nil }
    return bitmap.representation(using: .png, properties: [:])
}

func encodePNG(from imageRep: NSBitmapImageRep) -> Data? {
    return imageRep.representation(using: .png, properties: [:])
}

let path = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "crates/tauri-app/dmg_background.png"

// Try screen-backed NSImage first (sharpest, works locally)
let image = NSImage(size: NSSize(width: width, height: height))
image.lockFocus()
render(into: NSGraphicsContext.current)
image.unlockFocus()

if let png = encodePNG(from: image) {
    try png.write(to: URL(fileURLWithPath: path))
    print("✅ DMG background saved to \(path) (screen-backed)")
    exit(0)
}

// Fallback: high-resolution offscreen bitmap for headless CI
// Render at 2x pixel density to match Retina screen-backed sharpness
print("⚠️  Screen-backed render failed, trying high-res offscreen bitmap...")
let scale = 2
let hiResW = width * scale
let hiResH = height * scale

guard let imageRep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: hiResW,
    pixelsHigh: hiResH,
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

// Render text and graphics at 2x pixel density
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: imageRep)
render(into: NSGraphicsContext.current)
NSGraphicsContext.restoreGraphicsState()

if let png = encodePNG(from: imageRep) {
    try png.write(to: URL(fileURLWithPath: path))
    print("✅ DMG background saved to \(path) (high-res offscreen bitmap)")
} else {
    print("ERROR: Failed to encode PNG")
    exit(1)
}
