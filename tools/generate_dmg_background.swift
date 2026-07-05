#!/usr/bin/env swift
import AppKit
import Foundation

// ── DMG Background Generator for Harbor ──
// Always uses 2× offscreen bitmap for consistent sharp output everywhere
// (lockFocus depends on display DPI — non-Retina CI runners produce blurry 1× images).
// The DMG window is 660×480 points; output is 1320×960 pixels @2×.

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

    // ── First-time launch instructions ──
    let noteStyle = NSMutableParagraphStyle()
    noteStyle.alignment = .center

    let noteTitleAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.boldSystemFont(ofSize: 12),
        .foregroundColor: NSColor(red: 0.8, green: 0.3, blue: 0.15, alpha: 1.0),
        .paragraphStyle: noteStyle,
    ]
    ("⚠️  First-time launch — important!")
        .draw(in: NSRect(x: 0, y: lineY - 22, width: width, height: 18), withAttributes: noteTitleAttrs)

    let stepAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 11),
        .foregroundColor: NSColor(white: 0.35, alpha: 1.0),
        .paragraphStyle: noteStyle,
    ]
    ("1. Drag Harbor into the Applications folder")
        .draw(in: NSRect(x: 20, y: lineY - 42, width: width - 40, height: 16), withAttributes: stepAttrs)

    ("2. Open Terminal and run:")
        .draw(in: NSRect(x: 20, y: lineY - 60, width: width - 40, height: 16), withAttributes: stepAttrs)

    let cmdAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.monospacedSystemFont(ofSize: 11, weight: .bold),
        .foregroundColor: NSColor(white: 0.2, alpha: 1.0),
        .paragraphStyle: noteStyle,
    ]
    ("   xattr -cr /Applications/Harbor.app")
        .draw(in: NSRect(x: 20, y: lineY - 78, width: width - 40, height: 16), withAttributes: cmdAttrs)
}

func encodePNG(from imageRep: NSBitmapImageRep) -> Data? {
    return imageRep.representation(using: .png, properties: [:])
}

let path = CommandLine.arguments.count > 1
    ? CommandLine.arguments[1]
    : "crates/tauri-app/dmg_background.png"

// 2× offscreen bitmap — consistent sharp output regardless of display DPI
let scale = 2
let pixelW = width * scale
let pixelH = height * scale

guard let imageRep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: pixelW,
    pixelsHigh: pixelH,
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
render(into: NSGraphicsContext.current)
NSGraphicsContext.restoreGraphicsState()

if let png = encodePNG(from: imageRep) {
    try png.write(to: URL(fileURLWithPath: path))
    print("✅ DMG background saved to \(path) (\(pixelW)×\(pixelH))")
} else {
    print("ERROR: Failed to encode PNG")
    exit(1)
}
