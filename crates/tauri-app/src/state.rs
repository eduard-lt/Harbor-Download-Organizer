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
    pub work: Arc<crate::operations::Work>,
    pub lifecycle_operation: Mutex<()>,
    pub configuration_error: Mutex<Option<String>>,
    pub scan_error: Arc<Mutex<Option<String>>>,
    pub shutdown_requested: AtomicBool,
    pub shutdown_complete: AtomicBool,
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
    /// True while a timed-out stop keeps a background join waiter owning shutdown completion.
    pub watcher_join_pending: Arc<Mutex<bool>>,
    /// Timestamp of the last Cmd+Q / close request. Used for double-press-to-quit.
    pub last_close_request: Arc<Mutex<Option<Instant>>>,
    /// Set to true when tray "Quit" is pressed, to bypass double-press logic.
    pub tray_quit_requested: Arc<AtomicBool>,
}

impl AppState {
    pub fn new(config_path: PathBuf, config: DownloadsConfig) -> Self {
        Self {
            work: Arc::new(crate::operations::Work::new(
                config_path.parent().unwrap_or(std::path::Path::new(".")),
            )),
            lifecycle_operation: Mutex::new(()),
            configuration_error: Mutex::new(None),
            scan_error: Arc::new(Mutex::new(None)),
            shutdown_requested: AtomicBool::new(false),
            shutdown_complete: AtomicBool::new(false),
            config_path,
            watcher_flag: Arc::new(Mutex::new(None)),
            config: Arc::new(RwLock::new(config)),
            watcher_handle: Arc::new(Mutex::new(None)),
            service_start_time: Arc::new(Mutex::new(None)),
            service_lifecycle: Arc::new(Mutex::new(ServiceLifecycleState::Stopped)),
            degraded_reason: Arc::new(Mutex::new(None)),
            last_restart_request: Arc::new(Mutex::new(None)),
            restart_in_progress: Arc::new(Mutex::new(false)),
            watcher_join_pending: Arc::new(Mutex::new(false)),
            last_close_request: Arc::new(Mutex::new(None)),
            tray_quit_requested: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Get the path to the recent moves log
    pub fn recent_log_path(&self) -> PathBuf {
        self.config_path
            .parent()
            .unwrap_or(std::path::Path::new("."))
            .join("recent_moves.log")
    }

    pub fn begin_config_update(&self) -> Result<ConfigUpdate<'_>, String> {
        if let Some(error) = self
            .configuration_error
            .lock()
            .map_err(|e| e.to_string())?
            .as_ref()
        {
            return Err(format!("Configuration needs recovery: {error}. Reload a repaired file or reset explicitly."));
        }
        let live = self.config.write().map_err(|e| e.to_string())?;
        Ok(ConfigUpdate {
            candidate: live.clone(),
            live,
            path: &self.config_path,
        })
    }

    pub fn update_config(&self, update: impl FnOnce(&mut DownloadsConfig)) -> Result<(), String> {
        let mut transaction = self.begin_config_update()?;
        update(&mut transaction);
        transaction.commit()
    }
}

pub struct ConfigUpdate<'a> {
    live: std::sync::RwLockWriteGuard<'a, DownloadsConfig>,
    candidate: DownloadsConfig,
    path: &'a std::path::Path,
}
impl std::ops::Deref for ConfigUpdate<'_> {
    type Target = DownloadsConfig;
    fn deref(&self) -> &Self::Target {
        &self.candidate
    }
}
impl std::ops::DerefMut for ConfigUpdate<'_> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.candidate
    }
}
impl ConfigUpdate<'_> {
    pub fn commit(mut self) -> Result<(), String> {
        harbor_core::config::save(self.path, &self.candidate).map_err(|e| format!("{e:#}"))?;
        *self.live = self.candidate;
        Ok(())
    }
}
