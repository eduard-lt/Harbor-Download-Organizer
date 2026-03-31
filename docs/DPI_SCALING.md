# DPI Scaling Fixes

This document explains the DPI scaling improvements made to Harbor to ensure proper display on high-DPI monitors and scaled displays (125%, 150%, 200%, etc.).

## Problems Solved

1. **Fixed window size** - Previous hardcoded 1920x1080 size didn't account for DPI scaling
2. **Non-resizable window** - Users couldn't adjust if UI didn't fit their display
3. **High minimum sizes** - 1200x800 was too large for laptops at 150% scaling

## Changes Made

### 1. Window Configuration (`tauri.conf.json`)
- Changed default size from 1920x1080 to 1400x900 (more laptop-friendly)
- Reduced minimum size from 1200x800 to 1000x700
- Made window **resizable** so users can adjust as needed
- Removed maxHeight restriction

### 2. Smart Window Sizing (`useWindowSize.ts`)
- Now detects screen size and scale factor automatically
- Chooses appropriate preset size based on available screen space (80% max)
- Updated presets:
  - **Compact**: 1000x700 (for small laptops)
  - **Medium**: 1400x900 (default, good for most displays)
  - **Large**: 1600x1000 (for larger displays)
- Uses `LogicalSize` which Tauri automatically scales for DPI
- Properly centers window after resize

### 3. DPI Awareness Hook (`useDpiAwareness.ts`)
- New hook to detect and log DPI scale factor
- Helps debug scaling issues
- Can be used to adjust UI elements if needed

### 4. Tauri Built-in DPI Support
- **Tauri 2 has Per-Monitor V2 DPI awareness built-in**
- No manual manifest configuration needed
- Automatically handles mixed DPI scenarios
- Works on Windows 10 1703+ with fallback support

## How It Works

1. **On First Launch**: App detects screen resolution and automatically selects optimal size:
   - **Small screens** (≤ 1366x768): Uses **Compact** size (1000x700)
   - **Medium screens** (≤ 1920x1080): Uses **Medium** size (1400x900)
   - **Large screens** (> 1920x1080): Uses **Large** size (1600x1000)
2. **DPI Handling**: Tauri + Windows scale the logical coordinates automatically
3. **User Control**: Users can manually resize window or choose different presets in settings
4. **Persistence**: Window size preference is saved to localStorage for next launch

## Testing

To test DPI scaling:
1. Right-click desktop → Display Settings
2. Change "Scale and layout" to 125%, 150%, or 175%
3. Launch Harbor
4. Verify:
   - Window fits on screen
   - UI is crisp and readable
   - Text isn't blurry
   - Controls are properly sized
   - Window is resizable

## Technical Details

### LogicalSize vs PhysicalSize

- **LogicalSize**: Device-independent pixels (DIPs) - automatically scaled by OS
- **PhysicalSize**: Actual screen pixels - requires manual DPI calculation

We use `LogicalSize` throughout to let Tauri/Windows handle scaling.

### Screen Detection

```typescript
// Smart preset selection based on screen resolution
const screenWidth = monitor.size.width;
const screenHeight = monitor.size.height;

// Automatic size selection:
if (screenWidth <= 1366 || screenHeight <= 768) {
    selectedPreset = 'Compact';  // 1000x700
} else if (screenWidth <= 1920 && screenHeight <= 1080) {
    selectedPreset = 'Medium';   // 1400x900
} else {
    selectedPreset = 'Large';    // 1600x1000
}
```

This ensures the app:
- Never opens larger than comfortable (70% of screen size)
- Automatically adapts to laptop vs desktop monitors
- Works well with DPI scaling (150%, 200%, etc.)

## Future Improvements

Potential enhancements:
- Add zoom controls (Ctrl+/Ctrl-) for in-app UI scaling
- Detect very high DPI (>200%) and adjust font sizes
- Save window position across launches
- Support multiple monitors with different DPI settings
- Add "Fit to Screen" button in settings

## Resources

- [Tauri Window API](https://tauri.app/v1/api/js/window)
- [Tauri DPI Documentation](https://tauri.app/v1/guides/features/window-customization#dpi-awareness)
- [Windows DPI Awareness](https://learn.microsoft.com/en-us/windows/win32/hidpi/high-dpi-desktop-application-development-on-windows)

