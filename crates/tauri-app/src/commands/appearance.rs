use tauri::{window::Color, WebviewWindow};

// Keep these opaque canvas colors aligned with --harbor-canvas in index.css.
#[tauri::command]
pub fn set_window_appearance(window: WebviewWindow, dark: bool) -> Result<(), String> {
    let color = if dark {
        Color(17, 27, 36, 255)
    } else {
        Color(223, 231, 232, 255)
    };
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
        let text: u32 = if dark { 0x00f6f3ed } else { 0x00493b24 };
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
