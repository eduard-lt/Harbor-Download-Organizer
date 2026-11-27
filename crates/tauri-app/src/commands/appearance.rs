use tauri::{window::Color, WebviewWindow};

/// Caption, window border and window background share one colour per theme so
/// the native title bar flows into the app. Keep in sync with `--canvas` in
/// packages/ui/src/index.css (light #e9f1f0, dark #0b1c27).
pub fn caption_color(dark: bool) -> Color {
    if dark {
        Color(11, 28, 39, 255)
    } else {
        Color(233, 241, 240, 255)
    }
}

#[tauri::command]
pub fn set_window_appearance(window: WebviewWindow, dark: bool) -> Result<(), String> {
    let color = caption_color(dark);
    window
        .set_background_color(Some(color))
        .map_err(|error| error.to_string())?;

    #[cfg(windows)]
    {
        use windows::Win32::{
            Foundation::HWND,
            Graphics::Dwm::{
                DwmSetWindowAttribute, DWMWA_BORDER_COLOR, DWMWA_CAPTION_COLOR, DWMWA_TEXT_COLOR,
            },
        };
        let hwnd = HWND(window.hwnd().map_err(|error| error.to_string())?.0);
        let caption = u32::from(color.0) | (u32::from(color.1) << 8) | (u32::from(color.2) << 16);
        // COLORREF is 0x00BBGGRR: dark #eef3f2, light #14232b (the UI ink).
        let text: u32 = if dark { 0x00f2f3ee } else { 0x002b2314 };
        for (attribute, value) in [
            (DWMWA_CAPTION_COLOR, caption),
            (DWMWA_TEXT_COLOR, text),
            (DWMWA_BORDER_COLOR, caption),
        ] {
            // SAFETY: hwnd belongs to this live Tauri window; value points to a
            // COLORREF-sized integer valid for the synchronous DWM call.
            // Older Windows versions reject custom caption colors. Leave their
            // native theme intact rather than failing the appearance change.
            unsafe {
                let _ = DwmSetWindowAttribute(
                    hwnd,
                    attribute,
                    (&value as *const u32).cast(),
                    std::mem::size_of::<u32>() as u32,
                );
            }
        }
    }
    Ok(())
}

/// Resizes the window to a logical content size, centred on its screen, with
/// the native macOS frame animation. Returns false where there is no native
/// animation so the UI falls back to an instant resize.
#[tauri::command]
pub fn resize_window_animated(
    window: WebviewWindow,
    width: f64,
    height: f64,
) -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        use objc2_app_kit::NSWindow;
        use objc2_foundation::{NSPoint, NSRect, NSSize};
        // Raw pointers are not Send; AppKit is only touched on the main thread below.
        let ptr = window.ns_window().map_err(|error| error.to_string())? as usize;
        window
            .run_on_main_thread(move || {
                // SAFETY: ptr is this live Tauri window's NSWindow, used on the main thread.
                let ns_window = unsafe { &*(ptr as *const NSWindow) };
                let content = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(width, height));
                let mut frame = ns_window.frameRectForContentRect(content);
                if let Some(screen) = ns_window.screen() {
                    let area = screen.visibleFrame();
                    frame.origin.x =
                        (area.origin.x + (area.size.width - frame.size.width) / 2.0).round();
                    frame.origin.y =
                        (area.origin.y + (area.size.height - frame.size.height) / 2.0).round();
                } else {
                    frame.origin = ns_window.frame().origin;
                }
                ns_window.setFrame_display_animate(frame, true, true);
            })
            .map_err(|error| error.to_string())?;
        Ok(true)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, width, height);
        Ok(false)
    }
}

#[cfg(test)]
mod tests {
    use super::caption_color;

    #[test]
    fn caption_matches_the_ui_canvas() {
        let light = caption_color(false);
        let dark = caption_color(true);
        assert_eq!((light.0, light.1, light.2), (0xe9, 0xf1, 0xf0));
        assert_eq!((dark.0, dark.1, dark.2), (0x0b, 0x1c, 0x27));
    }
}
