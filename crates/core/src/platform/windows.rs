use std::path::PathBuf;

/// Returns the Harbor application data directory on Windows:
/// `%LOCALAPPDATA%\Harbor`
pub fn app_data_dir() -> PathBuf {
    std::env::var("LOCALAPPDATA")
        .map(|p| PathBuf::from(p).join("Harbor"))
        .unwrap_or_else(|_| PathBuf::from("C:\\Harbor"))
}

/// Returns the user's Downloads directory on Windows:
/// `%USERPROFILE%\Downloads`
pub fn downloads_dir() -> PathBuf {
    use windows::Win32::{
        System::Com::CoTaskMemFree,
        UI::Shell::{FOLDERID_Downloads, SHGetKnownFolderPath, KF_FLAG_DEFAULT},
    };
    // The shell API accounts for redirected folders and returns a COM allocation.
    unsafe {
        if let Ok(path) = SHGetKnownFolderPath(&FOLDERID_Downloads, KF_FLAG_DEFAULT, None) {
            let text = path.to_string();
            CoTaskMemFree(Some(path.0.cast()));
            if let Ok(text) = text {
                return PathBuf::from(text);
            }
        }
    }
    home_dir().join("Downloads")
}

/// Returns the user's home directory from the `USERPROFILE` environment variable.
pub fn home_dir() -> PathBuf {
    std::env::var("USERPROFILE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("C:\\Users\\Public"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_data_dir_ends_with_harbor() {
        let dir = app_data_dir();
        let dir_str = dir.to_string_lossy();
        assert!(
            dir_str.ends_with("Harbor"),
            "Expected path ending with 'Harbor', got: {dir_str}"
        );
    }

    #[test]
    fn downloads_dir_is_absolute() {
        let dir = downloads_dir();
        let dir_str = dir.to_string_lossy();
        assert!(
            dir.is_absolute(),
            "Expected absolute Known Folder path, got: {dir_str}"
        );
    }
}
