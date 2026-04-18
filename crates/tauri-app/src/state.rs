use harbor_core::downloads::DownloadsConfig;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, RwLock};
use std::thread::JoinHandle;
use std::time::Instant;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ServiceLifecycleState {
    Stopped,
    Running,
    Restarting,
    Degraded,
}

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
    pub service_start_time: Arc<Mutex<Option<Instant>>>,
    /// Service lifecycle status for deterministic restart flows.
    pub service_lifecycle: Arc<Mutex<ServiceLifecycleState>>,
    /// Most recent degraded reason after a failed restart.
    pub degraded_reason: Arc<Mutex<Option<String>>>,
    /// Last successful restart request time used for deterministic debounce.
    pub last_restart_request: Arc<Mutex<Option<Instant>>>,
    /// Guards transactional restart so only one restart sequence runs at a time.
    pub restart_in_progress: Arc<Mutex<bool>>,
}

impl AppState {
    pub fn new(config_path: PathBuf, config: DownloadsConfig) -> Self {
        Self {
            config_path,
            watcher_flag: Arc::new(Mutex::new(None)),
            config: Arc::new(RwLock::new(config)),
            watcher_handle: Arc::new(Mutex::new(None)),
            service_start_time: Arc::new(Mutex::new(None)),
            service_lifecycle: Arc::new(Mutex::new(ServiceLifecycleState::Stopped)),
            degraded_reason: Arc::new(Mutex::new(None)),
            last_restart_request: Arc::new(Mutex::new(None)),
            restart_in_progress: Arc::new(Mutex::new(false)),
        }
    }

    /// Get the path to the recent moves log
    pub fn recent_log_path(&self) -> PathBuf {
        harbor_core::downloads::harbor_log_path()
    }
}
