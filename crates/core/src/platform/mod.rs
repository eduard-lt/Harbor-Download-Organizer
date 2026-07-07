//! Cross-platform path resolution for Harbor.
//!
//! Dispatch to OS-specific implementations via `#[cfg(target_os)]`.

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

use std::path::PathBuf;

/// Returns the Harbor application data directory (config, logs, state).
pub fn app_data_dir() -> PathBuf {
    os::app_data_dir()
}

/// Returns the user's Downloads directory.
pub fn downloads_dir() -> PathBuf {
    os::downloads_dir()
}

/// Returns the user's home directory.
pub fn home_dir() -> PathBuf {
    os::home_dir()
}

// Platform-specific module selected at compile time.
#[cfg(target_os = "macos")]
mod os {
    pub use super::macos::*;
}
#[cfg(target_os = "windows")]
mod os {
    pub use super::windows::*;
}
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
mod os {
    use std::path::PathBuf;
    pub fn app_data_dir() -> PathBuf {
        dirs_next().unwrap_or_else(|| PathBuf::from("."))
    }
    pub fn downloads_dir() -> PathBuf {
        dirs_next().unwrap_or_else(|| PathBuf::from("."))
    }
    pub fn home_dir() -> PathBuf {
        dirs_next().unwrap_or_else(|| PathBuf::from("."))
    }
    fn dirs_next() -> Option<PathBuf> {
        #[cfg(unix)]
        {
            std::env::var("HOME").ok().map(PathBuf::from)
        }
        #[cfg(not(unix))]
        {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_data_dir_is_absolute() {
        let dir = app_data_dir();
        assert!(
            dir.is_absolute(),
            "app_data_dir should be absolute: {dir:?}"
        );
    }

    #[test]
    fn downloads_dir_is_absolute() {
        let dir = downloads_dir();
        assert!(
            dir.is_absolute(),
            "downloads_dir should be absolute: {dir:?}"
        );
    }

    #[test]
    fn home_dir_is_absolute() {
        let dir = home_dir();
        assert!(dir.is_absolute(), "home_dir should be absolute: {dir:?}");
    }
}
