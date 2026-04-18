use crate::state::{AppState, ServiceLifecycleState};
use crate::commands::error_contract::{map_legacy_organize_error, AppError, AppErrorDto};
use harbor_core::downloads::{load_downloads_config, organize_once, watch_polling, OrganizeResult};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::State;

#[cfg(windows)]
use winreg::enums::*;
#[cfg(windows)]
use winreg::RegKey;

/// Maximum number of lines kept in the activity log before it is trimmed.
const LOG_MAX_LINES: usize = 10_000;
/// Trim the log when it exceeds this file-size threshold to avoid reading the
/// file on every single append.
const LOG_ROTATION_THRESHOLD_BYTES: u64 = 1_024 * 1_024; // 1 MiB
/// Coalescing window for rapid restart requests triggered by bursty rule edits.
pub const RESTART_DEBOUNCE_WINDOW: Duration = Duration::from_millis(500);

/// Serializes the current config state to disk.
fn save_config_to_disk(state: &AppState) -> Result<(), String> {
    let config = state.config.read().map_err(|e| e.to_string())?;
    let yaml = serde_yaml::to_string(&*config).map_err(|e| e.to_string())?;
    std::fs::write(&state.config_path, yaml).map_err(|e| e.to_string())
}

/// Service status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub running: bool,
    pub uptime_seconds: Option<u64>,
    pub degraded: bool,
    pub degraded_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OrganizeFailureGroupDto {
    pub code: String,
    pub message: String,
    pub count: usize,
    pub failures: Vec<AppErrorDto>,
    pub legacy_errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OrganizeNowResponse {
    pub status: String,
    pub message: String,
    pub moved_count: usize,
    /// Compatibility field for existing consumers that expect a simple count.
    pub moved: usize,
    pub total_failures: usize,
    /// Compatibility field preserving legacy string-based errors.
    pub errors: Vec<String>,
    pub failure_groups: Vec<OrganizeFailureGroupDto>,
}

fn append_to_log(log_path: &PathBuf, actions: &[OrganizeResult]) {
    if actions.is_empty() {
        return;
    }

    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut buf = String::new();
    for result in actions {
        let symlink_msg = result.symlink_info.as_deref().unwrap_or("");
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
        buf.push_str(&format!(
            "[{}] {} -> {} ({}) {}\n",
            timestamp,
            result.source.display(),
            result.destination.display(),
            result.rule_name,
            symlink_msg
        ));
    }

    if let Ok(mut file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        let _ = file.write_all(buf.as_bytes());
    }

    rotate_log_if_needed(log_path);
}

/// Trims the log file to the last [`LOG_MAX_LINES`] lines when it grows beyond
/// [`LOG_ROTATION_THRESHOLD_BYTES`]. This keeps memory usage bounded without
/// paying the cost of reading the file on every append.
fn rotate_log_if_needed(log_path: &PathBuf) {
    let size = fs::metadata(log_path).map(|m| m.len()).unwrap_or(0);
    if size <= LOG_ROTATION_THRESHOLD_BYTES {
        return;
    }

    let Ok(content) = fs::read_to_string(log_path) else {
        return;
    };

    let lines: Vec<&str> = content.lines().collect();
    if lines.len() <= LOG_MAX_LINES {
        return;
    }

    let trimmed = lines[lines.len() - LOG_MAX_LINES..].join("\n") + "\n";
    let _ = fs::write(log_path, trimmed);
}

#[tauri::command]
pub async fn get_service_status(state: State<'_, AppState>) -> Result<ServiceStatus, String> {
    let flag_guard = state.watcher_flag.lock().map_err(|e| e.to_string())?;
    let running = flag_guard.is_some();
    drop(flag_guard); // Release lock early

    let uptime_seconds = if running {
        let start_time = state.service_start_time.lock().map_err(|e| e.to_string())?;
        start_time.map(|t| t.elapsed().as_secs())
    } else {
        None
    };

    let degraded_reason = state
        .degraded_reason
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    Ok(ServiceStatus {
        running,
        uptime_seconds,
        degraded: degraded_reason.is_some(),
        degraded_reason,
    })
}

fn set_lifecycle_state(state: &AppState, lifecycle: ServiceLifecycleState) -> Result<(), String> {
    let mut guard = state.service_lifecycle.lock().map_err(|e| e.to_string())?;
    *guard = lifecycle;
    Ok(())
}

fn set_degraded_reason(state: &AppState, reason: Option<String>) -> Result<(), String> {
    let mut guard = state.degraded_reason.lock().map_err(|e| e.to_string())?;
    *guard = reason;
    Ok(())
}

pub fn internal_start_service(state: &AppState) -> Result<(), String> {
    let mut flag_guard = state.watcher_flag.lock().map_err(|e| e.to_string())?;

    // If already running, do nothing
    if let Some(flag) = flag_guard.as_ref() {
        if flag.load(Ordering::SeqCst) {
            return Ok(());
        }
    }

    // Create a new flag for this new thread
    let new_flag = Arc::new(std::sync::atomic::AtomicBool::new(true));
    *flag_guard = Some(new_flag.clone());

    let config = state.config.read().map_err(|e| e.to_string())?.clone();
    let log_path = state.recent_log_path();

    // Use the *new* flag for the thread
    let thread_flag = new_flag.clone();
    let handle = thread::spawn(move || {
        let _ = watch_polling(&config, 5, &thread_flag, |actions| {
            append_to_log(&log_path, actions);
        });
    });

    let mut guard = state.watcher_handle.lock().map_err(|e| e.to_string())?;
    *guard = Some(handle);

    // Set start time
    let mut time_guard = state.service_start_time.lock().map_err(|e| e.to_string())?;
    *time_guard = Some(std::time::Instant::now());

    set_degraded_reason(state, None)?;
    set_lifecycle_state(state, ServiceLifecycleState::Running)?;

    Ok(())
}

pub fn internal_stop_service(state: &AppState) -> Result<(), String> {
    let mut flag_guard = state.watcher_flag.lock().map_err(|e| e.to_string())?;

    if let Some(flag) = flag_guard.take() {
        // Signal the thread to stop
        flag.store(false, Ordering::SeqCst);
    }

    let mut guard = state.watcher_handle.lock().map_err(|e| e.to_string())?;
    let handle = guard.take();
    drop(guard);

    if let Some(handle) = handle {
        handle
            .join()
            .map_err(|_| "Failed to join watcher thread during shutdown".to_string())?;
    }

    let mut time_guard = state.service_start_time.lock().map_err(|e| e.to_string())?;
    *time_guard = None;
    set_lifecycle_state(state, ServiceLifecycleState::Stopped)?;

    Ok(())
}

fn mark_service_degraded(state: &AppState, reason: impl Into<String>) -> Result<(), String> {
    let reason = reason.into();
    set_degraded_reason(state, Some(reason))?;
    set_lifecycle_state(state, ServiceLifecycleState::Degraded)
}

pub fn restart_service_if_running(state: &AppState) -> Result<(), String> {
    let flag_guard = state.watcher_flag.lock().map_err(|e| e.to_string())?;
    let is_running = flag_guard.is_some();
    drop(flag_guard);

    if !is_running {
        return Ok(());
    }

    let now = std::time::Instant::now();
    {
        let mut last_restart = state
            .last_restart_request
            .lock()
            .map_err(|e| e.to_string())?;
        if let Some(previous) = *last_restart {
            if now.duration_since(previous) < RESTART_DEBOUNCE_WINDOW {
                return Ok(());
            }
        }
        *last_restart = Some(now);
    }

    {
        let mut restart_guard = state
            .restart_in_progress
            .lock()
            .map_err(|e| e.to_string())?;
        if *restart_guard {
            return Ok(());
        }
        *restart_guard = true;
    }

    let restart_result = (|| -> Result<(), String> {
        set_lifecycle_state(state, ServiceLifecycleState::Restarting)?;
        internal_stop_service(state)?;
        internal_start_service(state)?;
        set_lifecycle_state(state, ServiceLifecycleState::Running)?;
        Ok(())
    })();

    let mut restart_guard = state
        .restart_in_progress
        .lock()
        .map_err(|e| e.to_string())?;
    *restart_guard = false;
    drop(restart_guard);

    if let Err(error) = restart_result {
        mark_service_degraded(
            state,
            format!("Restart failed after configuration update: {error}"),
        )?;
        return Err(error);
    }

    Ok(())
}

pub fn impl_retry_service_restart(state: &AppState) -> Result<(), String> {
    set_lifecycle_state(state, ServiceLifecycleState::Restarting)?;
    let restart_result = restart_service_if_running(state);

    match restart_result {
        Ok(()) => {
            let running = state
                .watcher_flag
                .lock()
                .map_err(|e| e.to_string())?
                .is_some();
            if !running {
                internal_start_service(state)?;
            }
            set_degraded_reason(state, None)?;
            set_lifecycle_state(state, ServiceLifecycleState::Running)?;
            Ok(())
        }
        Err(error) => {
            mark_service_degraded(state, format!("Retry restart failed: {error}"))?;
            Err(error)
        }
    }
}

pub fn persist_service_state(state: &AppState, enabled: bool) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;
        config.service_enabled = Some(enabled);
    }
    save_config_to_disk(state)
}

#[tauri::command]
pub async fn start_service(state: State<'_, AppState>) -> Result<(), String> {
    persist_service_state(&state, true)?;
    internal_start_service(&state)
}

#[tauri::command]
pub async fn stop_service(state: State<'_, AppState>) -> Result<(), String> {
    persist_service_state(&state, false)?;
    internal_stop_service(&state)
}

#[tauri::command]
pub async fn retry_service_restart(state: State<'_, AppState>) -> Result<(), String> {
    impl_retry_service_restart(&state)
}

#[tauri::command]
pub async fn trigger_organize_now(
    state: State<'_, AppState>,
) -> Result<OrganizeNowResponse, String> {
    Ok(impl_trigger_organize_now(&state).await)
}

pub async fn impl_trigger_organize_now(state: &AppState) -> OrganizeNowResponse {
    let config = match state.config.read() {
        Ok(guard) => guard.clone(),
        Err(e) => {
            return organize_now_failure_response(
                AppError::Internal {
                    message: "Failed to read app state configuration".to_string(),
                    remediation_hint:
                        "Retry the operation. If this persists, restart Harbor.".to_string(),
                    legacy_error: e.to_string(),
                },
                Path::new(""),
            );
        }
    };

    if config.download_dir.trim().is_empty() {
        return organize_now_failure_response(
            AppError::Validation {
                field: "download_dir".to_string(),
                message: "Download directory is required".to_string(),
                remediation_hint: "Set a valid download directory in Settings before organizing."
                    .to_string(),
                legacy_error: "Download directory is required".to_string(),
            },
            Path::new(""),
        );
    }

    let download_dir = Path::new(&config.download_dir);
    let log_path = state.recent_log_path();

    let summary = match organize_once(&config) {
        Ok(summary) => summary,
        Err(e) => {
            let legacy = format!("Organize failed: {}", e);
            eprintln!("[Harbor] {legacy}");
            return organize_now_failure_response(
                map_legacy_organize_error(&legacy),
                download_dir,
            );
        }
    };

    for err in &summary.errors {
        eprintln!("[Harbor] {err}");
    }

    append_to_log(&log_path, &summary.moved);

    map_organize_summary_to_response(summary, download_dir)
}

fn group_errors_by_code(errors: &[AppErrorDto]) -> Vec<OrganizeFailureGroupDto> {
    let mut groups: Vec<OrganizeFailureGroupDto> = Vec::new();
    for error in errors {
        if let Some(existing) = groups
            .iter_mut()
            .find(|group| group.code == error.code && group.message == error.message)
        {
            existing.count += 1;
            existing.legacy_errors.push(error.legacy_error.clone());
            existing.failures.push(error.clone());
            continue;
        }

        groups.push(OrganizeFailureGroupDto {
            code: error.code.clone(),
            message: error.message.clone(),
            count: 1,
            failures: vec![error.clone()],
            legacy_errors: vec![error.legacy_error.clone()],
        });
    }
    groups
}

fn derive_status(moved_count: usize, failure_count: usize) -> String {
    if failure_count == 0 {
        "success".to_string()
    } else if moved_count > 0 {
        "partial_failure".to_string()
    } else {
        "failed".to_string()
    }
}

fn response_message(moved_count: usize, failure_count: usize) -> String {
    if failure_count == 0 {
        format!("Organize complete: moved {} file(s).", moved_count)
    } else {
        format!(
            "Organize finished with {} move(s) and {} failure(s).",
            moved_count, failure_count
        )
    }
}

fn map_organize_summary_to_response(summary: harbor_core::downloads::OrganizeSummary, download_dir: &Path) -> OrganizeNowResponse {
    let structured_failures: Vec<AppErrorDto> = summary
        .errors
        .iter()
        .map(|error| map_legacy_organize_error(error).to_dto(Some(download_dir)))
        .collect();
    let failure_groups = group_errors_by_code(&structured_failures);
    let moved_count = summary.moved.len();
    let failure_count = structured_failures.len();

    OrganizeNowResponse {
        status: derive_status(moved_count, failure_count),
        message: response_message(moved_count, failure_count),
        moved_count,
        moved: moved_count,
        total_failures: failure_count,
        errors: summary.errors,
        failure_groups,
    }
}

fn organize_now_failure_response(error: AppError, download_dir: &Path) -> OrganizeNowResponse {
    let failure = error.to_dto(Some(download_dir));
    let failure_groups = group_errors_by_code(std::slice::from_ref(&failure));

    OrganizeNowResponse {
        status: "failed".to_string(),
        message: "Organize failed before file moves could complete.".to_string(),
        moved_count: 0,
        moved: 0,
        total_failures: 1,
        errors: vec![failure.legacy_error.clone()],
        failure_groups,
    }
}

#[tauri::command]
pub async fn get_startup_enabled() -> Result<bool, String> {
    #[cfg(windows)]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let run_key = hkcu
            .open_subkey("SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run")
            .map_err(|e| format!("Failed to open registry key: {}", e))?;

        match run_key.get_value::<String, _>("Harbor") {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    #[cfg(not(windows))]
    {
        Ok(false)
    }
}

#[tauri::command]
pub async fn set_startup_enabled(enabled: bool) -> Result<(), String> {
    #[cfg(windows)]
    {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (run_key, _) = hkcu
            .create_subkey("SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run")
            .map_err(|e| format!("Failed to open registry key: {}", e))?;

        if enabled {
            // Get the path to the tray executable
            let exe_path = std::env::current_exe()
                .map_err(|e| format!("Failed to get executable path: {}", e))?;

            // Wrap the path in double-quotes so Windows correctly handles paths
            // that contain spaces (e.g. C:\Users\John Doe\AppData\...).
            let quoted = format!("\"{}\"", exe_path.to_string_lossy());

            run_key
                .set_value("Harbor", &quoted.as_str())
                .map_err(|e| format!("Failed to set registry value: {}", e))?;
        } else {
            // Remove the startup entry
            let _ = run_key.delete_value("Harbor");
        }

        Ok(())
    }

    #[cfg(not(windows))]
    {
        Err("Startup configuration not supported on this platform".to_string())
    }
}

#[tauri::command]
pub async fn reload_config(state: State<'_, AppState>) -> Result<(), String> {
    let new_config = load_downloads_config(&state.config_path)
        .map_err(|e| format!("Failed to reload config: {}", e))?;

    let mut config = state.config.write().map_err(|e| e.to_string())?;
    *config = new_config;

    Ok(())
}

#[tauri::command]
pub async fn open_config_file(state: State<'_, AppState>) -> Result<(), String> {
    let path = &state.config_path;

    #[cfg(windows)]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", path.to_string_lossy().as_ref()])
            .spawn()
            .map_err(|e| format!("Failed to open config file: {}", e))?;
    }

    #[cfg(not(windows))]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open config file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn open_downloads_folder(state: State<'_, AppState>) -> Result<(), String> {
    let config = state.config.read().map_err(|e| e.to_string())?;
    let path = &config.download_dir;

    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open downloads folder: {}", e))?;
    }

    #[cfg(not(windows))]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open downloads folder: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_config_path(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.config_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn reset_to_defaults(state: State<'_, AppState>) -> Result<(), String> {
    let config = harbor_core::downloads::default_config();

    {
        let mut state_config = state.config.write().map_err(|e| e.to_string())?;
        *state_config = config;
    }

    save_config_to_disk(&state)?;

    // Stop and start service to apply changes
    let _ = internal_stop_service(&state);
    let _ = internal_start_service(&state);

    Ok(())
}

#[tauri::command]
pub async fn get_tutorial_completed(state: State<'_, AppState>) -> Result<bool, String> {
    let config = state.config.read().map_err(|e| e.to_string())?;
    // If None, we treat it as completed (true) for existing users who upgrade,
    // but default_config sets it to Some(false) for new users.
    // However, if we just upgraded and it's missing from yaml, it will be None.
    Ok(config.tutorial_completed.unwrap_or(true))
}

#[tauri::command]
pub async fn set_tutorial_completed(
    state: State<'_, AppState>,
    completed: bool,
) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;
        config.tutorial_completed = Some(completed);
    }
    save_config_to_disk(&state)
}

#[tauri::command]
pub async fn get_check_updates(state: State<'_, AppState>) -> Result<bool, String> {
    let config = state.config.read().map_err(|e| e.to_string())?;
    // Default to true if not set
    Ok(config.check_updates.unwrap_or(true))
}

#[tauri::command]
pub async fn set_check_updates(state: State<'_, AppState>, enabled: bool) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;
        config.check_updates = Some(enabled);
    }
    save_config_to_disk(&state)
}

#[tauri::command]
pub async fn get_last_notified_version(
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let config = state.config.read().map_err(|e| e.to_string())?;
    Ok(config.last_notified_version.clone())
}

#[tauri::command]
pub async fn set_last_notified_version(
    state: State<'_, AppState>,
    version: String,
) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;
        config.last_notified_version = Some(version);
    }
    save_config_to_disk(&state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use harbor_core::downloads::{DownloadsConfig, OrganizeSummary};
    use tempfile::tempdir;

    #[test]
    fn test_append_to_log_creates_and_writes() {
        let tmp = tempdir().unwrap();
        let log_path = tmp.path().join("logs").join("recent.log");

        let actions = vec![
            OrganizeResult {
                source: PathBuf::from("src/a.txt"),
                destination: PathBuf::from("dst/a.txt"),
                rule_name: "Images".to_string(),
                symlink_info: None,
            },
            OrganizeResult {
                source: PathBuf::from("src/b.txt"),
                destination: PathBuf::from("dst/b.txt"),
                rule_name: "Docs".to_string(),
                symlink_info: Some("Symlinked".to_string()),
            },
        ];

        append_to_log(&log_path, &actions);

        assert!(log_path.exists());
        let content = std::fs::read_to_string(&log_path).unwrap();
        // Each line now carries a timestamp prefix: [YYYY-MM-DD HH:MM:SS]
        assert!(content.contains("src/a.txt -> dst/a.txt (Images)"));
        assert!(content.contains("src/b.txt -> dst/b.txt (Docs) Symlinked"));
        // Verify timestamp prefix is present on every non-empty line.
        for line in content.lines().filter(|l| !l.is_empty()) {
            assert!(
                line.starts_with('['),
                "expected timestamp prefix on: {line}"
            );
        }
    }

    #[test]
    fn test_append_to_log_empty() {
        let tmp = tempdir().unwrap();
        let log_path = tmp.path().join("empty.log");
        let actions = vec![];

        append_to_log(&log_path, &actions);

        assert!(!log_path.exists());
    }

    #[test]
    fn test_persist_service_state() {
        let tmp = tempdir().unwrap();
        let cfg_path = tmp.path().join("config.yaml");

        let initial_cfg = DownloadsConfig {
            download_dir: "DL".to_string(),
            rules: vec![],
            min_age_secs: None,
            tutorial_completed: None,
            service_enabled: Some(false),
            check_updates: None,
            last_notified_version: None,
        };
        let yaml = serde_yaml::to_string(&initial_cfg).unwrap();
        std::fs::write(&cfg_path, yaml).unwrap();

        let state = AppState::new(cfg_path.clone(), initial_cfg);

        // Enable
        let res = persist_service_state(&state, true);
        assert!(res.is_ok());

        let content = std::fs::read_to_string(&cfg_path).unwrap();
        assert!(content.contains("service_enabled: true"));

        // Disable
        let res = persist_service_state(&state, false);
        assert!(res.is_ok());

        let content = std::fs::read_to_string(&cfg_path).unwrap();
        assert!(content.contains("service_enabled: false"));
    }

    #[tokio::test]
    async fn test_persist_update_settings() {
        let tmp = tempdir().unwrap();
        let cfg_path = tmp.path().join("config.yaml");

        let initial_cfg = DownloadsConfig {
            download_dir: "DL".to_string(),
            rules: vec![],
            min_age_secs: None,
            tutorial_completed: None,
            service_enabled: None,
            check_updates: Some(true),
            last_notified_version: None,
        };
        let yaml = serde_yaml::to_string(&initial_cfg).unwrap();
        std::fs::write(&cfg_path, yaml).unwrap();

        let app_state = AppState::new(cfg_path.clone(), initial_cfg);
        // We can't easily mock tauri::State, so we'll test the logic by invoking the implementation functions directly
        // IF we could extract the logic.
        // OR we can rely on `tauri::State` implementing `Deref` to `AppState`.
        // BUT we need to pass `State<'_, AppState>` to commands.
        // `State` provides `inner()` to get reference.
        // We can't construct `State`.

        // Alternative: Refactor commands to take `&AppState` or `&RwLock<DownloadsConfig>`?
        // No, Tauri commands require `State`.

        // Workaround: Use `tauri::Manager` to manage state in test? Too complex.
        // Let's just test the `app_state` logic directly since that's what the commands do.

        // Manual verification of logic that commands perform:

        // 1. Verify initial state
        {
            let config = app_state.config.read().unwrap();
            assert_eq!(config.check_updates, Some(true));
        }

        // 2. Simulate set_check_updates
        {
            let mut config = app_state.config.write().unwrap();
            config.check_updates = Some(false);
        }
        // Save to disk (simulate command logic)
        {
            let config = app_state.config.read().unwrap();
            let yaml = serde_yaml::to_string(&*config).unwrap();
            std::fs::write(&app_state.config_path, yaml).unwrap();
        }

        // 3. Verify persistence
        let content = std::fs::read_to_string(&cfg_path).unwrap();
        assert!(content.contains("check_updates: false"));

        // 4. Simulate set_last_notified_version
        {
            let mut config = app_state.config.write().unwrap();
            config.last_notified_version = Some("v1.5.0".to_string());
        }
        // Save
        {
            let config = app_state.config.read().unwrap();
            let yaml = serde_yaml::to_string(&*config).unwrap();
            std::fs::write(&app_state.config_path, yaml).unwrap();
        }

        // 5. Verify persistence
        let content = std::fs::read_to_string(&cfg_path).unwrap();
        assert!(content.contains("last_notified_version: v1.5.0"));
    }

    #[test]
    fn trigger_organize_now_maps_summary_to_structured_response() {
        let summary = OrganizeSummary {
            moved: vec![OrganizeResult {
                source: PathBuf::from(r"C:\Users\Alice\Downloads\ok.txt"),
                destination: PathBuf::from(r"C:\Users\Alice\Downloads\Docs\ok.txt"),
                rule_name: "Docs".to_string(),
                symlink_info: None,
            }],
            errors: vec![format!(
                "Failed to move '{}' to '{}': Access denied",
                r"C:\Users\Alice\Downloads\locked.txt",
                r"C:\Users\Alice\Downloads\Docs\locked.txt"
            )],
        };

        let response =
            map_organize_summary_to_response(summary, std::path::Path::new(r"C:\Users\Alice\Downloads"));

        assert_eq!(response.status, "partial_failure");
        assert_eq!(response.moved_count, 1);
        assert_eq!(response.moved, 1);
        assert_eq!(response.failure_groups.len(), 1);
        assert_eq!(response.failure_groups[0].code, "filesystem_error");
        assert_eq!(
            response.failure_groups[0].failures[0]
                .details
                .source_path
                .as_deref(),
            Some("locked.txt")
        );
        assert!(response.failure_groups[0].failures[0]
            .details
            .remediation_hint
            .is_some());
    }

    #[test]
    fn trigger_organize_now_failure_response_keeps_legacy_compatibility_fields() {
        let response = organize_now_failure_response(
            AppError::Validation {
                field: "download_dir".to_string(),
                message: "Download directory is required".to_string(),
                remediation_hint: "Set a valid download directory in Settings.".to_string(),
                legacy_error: "Download directory is required".to_string(),
            },
            std::path::Path::new(r"C:\Users\Alice\Downloads"),
        );

        assert_eq!(response.status, "failed");
        assert_eq!(response.moved_count, 0);
        assert_eq!(response.moved, 0);
        assert_eq!(response.failure_groups[0].code, "validation_error");
        assert_eq!(response.failure_groups[0].legacy_errors.len(), 1);
        assert_eq!(
            response.failure_groups[0].legacy_errors[0],
            "Download directory is required"
        );
    }

    #[test]
    fn restart_service_if_running_marks_degraded_when_restart_fails() {
        let tmp = tempdir().unwrap();
        let cfg_path = tmp.path().join("config.yaml");
        let config = DownloadsConfig {
            download_dir: "DL".to_string(),
            rules: vec![],
            min_age_secs: Some(0),
            tutorial_completed: Some(false),
            service_enabled: Some(true),
            check_updates: Some(true),
            last_notified_version: None,
        };
        std::fs::write(&cfg_path, serde_yaml::to_string(&config).unwrap()).unwrap();
        let state = AppState::new(cfg_path, config);

        internal_start_service(&state).unwrap();

        let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            let _guard = state.config.write().unwrap();
            panic!("poison config lock");
        }));

        let result = restart_service_if_running(&state);
        assert!(result.is_err());

        let degraded_reason = state.degraded_reason.lock().unwrap().clone();
        assert!(degraded_reason.is_some());
        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Degraded
        );
    }

    #[test]
    fn retry_service_restart_recovers_from_degraded_state() {
        let tmp = tempdir().unwrap();
        let cfg_path = tmp.path().join("config.yaml");
        let config = DownloadsConfig {
            download_dir: "DL".to_string(),
            rules: vec![],
            min_age_secs: Some(0),
            tutorial_completed: Some(false),
            service_enabled: Some(true),
            check_updates: Some(true),
            last_notified_version: None,
        };
        std::fs::write(&cfg_path, serde_yaml::to_string(&config).unwrap()).unwrap();
        let state = AppState::new(cfg_path, config);

        mark_service_degraded(&state, "restart failed previously").unwrap();
        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Degraded
        );

        impl_retry_service_restart(&state).unwrap();

        let degraded_reason = state.degraded_reason.lock().unwrap().clone();
        assert!(degraded_reason.is_none());
        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Running
        );
        assert!(state.watcher_flag.lock().unwrap().is_some());

        internal_stop_service(&state).unwrap();
    }
}
