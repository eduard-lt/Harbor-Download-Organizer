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
