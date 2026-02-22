use harbor_core::downloads::DownloadsConfig;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, RwLock};
use std::thread::JoinHandle;

/// Application state managed by Tauri
pub struct AppState {
    /// Path to the configuration file
    pub config_path: PathBuf,
    /// Valid flag for the *current* watcher thread.
    /// When the service stops or restarts, we set the old flag to false
    /// and create a new one for the new thread.
    pub watcher_flag: Arc<Mutex<Option<Arc<AtomicBool>>>>,
    /// Current configuration (cached)
    pub config: Arc<RwLock<DownloadsConfig>>,
    /// Handle to the watcher thread
    pub watcher_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
    /// Timestamp when the service was started
    pub service_start_time: Arc<Mutex<Option<std::time::Instant>>>,
}

impl AppState {
    pub fn new(config_path: PathBuf, config: DownloadsConfig) -> Self {
        Self {
            config_path,
            watcher_flag: Arc::new(Mutex::new(None)),
            config: Arc::new(RwLock::new(config)),
            watcher_handle: Arc::new(Mutex::new(None)),
            service_start_time: Arc::new(Mutex::new(None)),
        }
    }

    /// Get the path to the recent moves log
    pub fn recent_log_path(&self) -> PathBuf {
        self.config_path
            .parent()
            .unwrap_or(&self.config_path)
            .join("recent_moves.log")
    }
}
