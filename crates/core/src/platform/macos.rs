use std::path::PathBuf;

/// Returns the Harbor application data directory on macOS:
/// `$HOME/Library/Application Support/Harbor`
pub fn app_data_dir() -> PathBuf {
    home_dir().join("Library/Application Support/Harbor")
}

/// Returns the user's Downloads directory on macOS:
/// `$HOME/Downloads`
pub fn downloads_dir() -> PathBuf {
    home_dir().join("Downloads")
}

/// Returns the user's home directory from the `HOME` environment variable.
pub fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/Users/Shared"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_data_dir_ends_with_harbor() {
        let dir = app_data_dir();
        let dir_str = dir.to_string_lossy();
        assert!(
            dir_str.contains("Library/Application Support/Harbor"),
            "Expected path containing 'Library/Application Support/Harbor', got: {dir_str}"
        );
    }

    #[test]
    fn downloads_dir_ends_with_downloads() {
        let dir = downloads_dir();
        let dir_str = dir.to_string_lossy();
        assert!(
            dir_str.ends_with("Downloads"),
            "Expected path ending with 'Downloads', got: {dir_str}"
        );
    }
}
