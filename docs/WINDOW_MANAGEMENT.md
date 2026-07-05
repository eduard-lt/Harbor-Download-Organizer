# Window Management

Harbor uses Tauri's built-in per-monitor DPI awareness (Windows 10 1703+, macOS, Linux). No manual configuration is needed.

## Default Window Size

On first launch, Harbor auto-selects a size based on screen resolution:

| Screen Resolution | Selected Preset |
|---|---|
| ≤ 1366×768 | Compact (1000×700) |
| ≤ 1920×1080 | Medium (1400×900) |
| > 1920×1080 | Large (1600×1000) |

The app uses `LogicalSize` (device-independent pixels), so DPI scaling is handled by the OS automatically.

## User Controls

- **Manual resize** — drag window edges; preference is saved to `localStorage`
- **Settings presets** — choose Compact / Medium / Large in Settings page
- **Clear preference** — delete `harbor-window-size` from `localStorage` to re-trigger auto-detection

## Technical Notes

- Minimum window size: 1000×700
- Window is resizable (no longer fixed-size)
- DPI scale factor is logged to console on startup for debugging
