# Window Size Auto-Selection Examples

This document shows how Harbor automatically selects the optimal window size based on your screen resolution.

## How It Works

Harbor detects your screen resolution on first launch and automatically chooses the best window size:

```
Screen Resolution          → Auto-Selected Size
─────────────────────────────────────────────────
≤ 1366x768 (Small Laptop)  → Compact (1000x700)
≤ 1920x1080 (Standard)     → Medium (1400x900)  
> 1920x1080 (Large/4K)     → Large (1600x1000)
```

## Example Scenarios

### Scenario 1: Small Laptop (1366x768)
```
Screen: 1366x768
DPI: 100%
Result: Compact size (1000x700)
```
✅ Window fits comfortably
✅ No scrolling needed
✅ Still has space for other windows

### Scenario 2: Standard Laptop at 150% Scaling (1920x1080 @ 150%)
```
Screen: 1920x1080
DPI: 150%
Effective: ~1280x720 logical pixels
Result: Medium size (1400x900)
```
⚠️ Wait - this seems too big!
✅ **But it works!** Tauri uses LogicalSize which accounts for DPI
✅ The 1400x900 is scaled down to fit the effective space
✅ UI remains crisp and readable

### Scenario 3: Desktop Monitor (1920x1080 @ 100%)
```
Screen: 1920x1080
DPI: 100%
Result: Medium size (1400x900)
```
✅ Uses ~73% of screen width
✅ Leaves room for side-by-side windows
✅ Optimal for productivity

### Scenario 4: 4K Display (3840x2160)
```
Screen: 3840x2160
DPI: 100% or 150%
Result: Large size (1600x1000)
```
✅ Takes advantage of large screen
✅ More content visible
✅ Still comfortable to view

### Scenario 5: 4K at 200% Scaling (3840x2160 @ 200%)
```
Screen: 3840x2160
DPI: 200%
Effective: 1920x1080 logical pixels
Result: Medium size (1400x900)
```
✅ Detects effective resolution, not physical
✅ Auto-selects Medium (perfect for scaled 4K)
✅ Text and icons are large and readable

## What About My Saved Preference?

Once you manually resize the window or select a different size in settings:
- Your choice is **saved to localStorage**
- Harbor will use your preference on next launch
- Auto-detection only runs on **first launch** (no saved preference)

## Manual Override

You can always change the window size:
1. **Resize manually**: Just drag the window edges
2. **Settings presets**: Go to Settings → Choose Compact/Medium/Large
3. **Clear preference**: Delete localStorage to trigger auto-detection again

## Technical Details

### Why LogicalSize?

LogicalSize is device-independent:
- **Logical pixel** = what you specify (e.g., 1400x900)
- **Physical pixel** = actual screen pixels (adjusted by DPI)
- OS handles the conversion automatically

Example:
```
Logical: 1400x900
DPI: 150%
Physical: 2100x1350 actual pixels rendered
```

Harbor sees 1400x900, Windows renders 2100x1350, everything looks perfect! ✨

### Detection Algorithm

```typescript
1. Get physical screen resolution (e.g., 1920x1080)
2. Check against size thresholds:
   - Small: ≤ 1366 OR ≤ 768 height
   - Medium: ≤ 1920 AND ≤ 1080
   - Large: > 1920 OR > 1080
3. Also ensure preset ≤ 70% of screen size
4. Select largest preset that fits
```

## Testing Auto-Selection

To test the auto-selection logic:

1. **Clear saved preference**:
   ```javascript
   // In browser console (F12)
   localStorage.removeItem('harbor-window-size');
   ```

2. **Restart Harbor** - it will auto-detect again

3. **Check console** for detection log:
   ```
   [Harbor] Detected screen: 1920x1080
   [Harbor] Auto-selected size: Medium (1400x900)
   ```

## Common Questions

**Q: Why doesn't it use 100% of my screen?**  
A: Using 70-80% is more comfortable and allows multitasking.

**Q: Can I make it fullscreen?**  
A: You can manually resize to any size you want! The auto-selection is just a smart default.

**Q: What if I have multiple monitors?**  
A: Harbor detects the current monitor where it opens. Move it to another monitor and resize as needed.

**Q: Does it remember my size if I resize?**  
A: Yes! Manual resizes are automatically saved.
