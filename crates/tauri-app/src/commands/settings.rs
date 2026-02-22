use crate::state::AppState;
use harbor_core::downloads::{load_downloads_config, organize_once, watch_polling};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::thread;
use tauri::State;

#[cfg(windows)]
use winreg::enums::*;
#[cfg(windows)]
use winreg::RegKey;

/// Service status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub running: bool,
    pub uptime_seconds: Option<u64>,
}

fn append_to_log(log_path: &PathBuf, actions: &[(PathBuf, PathBuf, String, Option<String>)]) {
    if actions.is_empty() {
        return;
    }

    if let Some(parent) = log_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut buf = String::new();
    for (from, to, rule, symlink_info) in actions {
        let symlink_msg = symlink_info.as_deref().unwrap_or("");
        buf.push_str(&format!(
            "{} -> {} ({}) {}\n",
            from.display(),
            to.display(),
            rule,
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

    Ok(ServiceStatus {
        running,
        uptime_seconds,
    })
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

    Ok(())
}

pub fn internal_stop_service(state: &AppState) -> Result<(), String> {
    let mut flag_guard = state.watcher_flag.lock().map_err(|e| e.to_string())?;

    if let Some(flag) = flag_guard.take() {
        // Signal the thread to stop
        flag.store(false, Ordering::SeqCst);
    }

    // We don't join the thread here to avoid blocking the UI,
    // but since we've set its specific flag to false, it WILL exit
    // on its next loop iteration (within 5 seconds).

    let mut guard = state.watcher_handle.lock().map_err(|e| e.to_string())?;
    *guard = None;

    let mut time_guard = state.service_start_time.lock().map_err(|e| e.to_string())?;
    *time_guard = None;

    Ok(())
}

pub fn persist_service_state(state: &AppState, enabled: bool) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;
        config.service_enabled = Some(enabled);
    }
    // Save to disk
    let config = state.config.read().map_err(|e| e.to_string())?;
    if let Ok(yaml) = serde_yaml::to_string(&*config) {
        std::fs::write(&state.config_path, yaml)
            .map_err(|e| format!("Failed to write config: {}", e))?;
    }
    Ok(())
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
pub async fn trigger_organize_now(state: State<'_, AppState>) -> Result<usize, String> {
    let config = state.config.read().map_err(|e| e.to_string())?.clone();
    let log_path = state.recent_log_path();

    let actions = organize_once(&config).map_err(|e| format!("Organize failed: {}", e))?;

    append_to_log(&log_path, &actions);

    Ok(actions.len())
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

            run_key
                .set_value("Harbor", &exe_path.to_string_lossy().as_ref())
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

    // Save to disk
    if let Ok(yaml) = serde_yaml::to_string(&config) {
        std::fs::write(&state.config_path, yaml)
            .map_err(|e| format!("Failed to write config: {}", e))?;
    } else {
        return Err("Failed to serialize default config".to_string());
    }

    // Update state
    let mut state_config = state.config.write().map_err(|e| e.to_string())?;
    *state_config = config;

    // Restart service if running to pick up new config
    // We can just rely on internal_start_service logic which re-reads config if we stop/start?
    // Actually, internal_start_service reads from state.config via read lock.
    // But verify if the running thread picks up changes?
    // The running thread has a CLONE of the config at start.
    // So if service is running, we MUST restart it.

    // We can't access `internal_stop_service` easily if we are holding a write lock on config?
    // No, locks are separate. global `watcher_flag` and `watcher_handle` vs `config` RwLock.

    // But we are holding `state.config` write lock right now.
    // `internal_start_service` needs `state.config` read lock.
    // So we must drop our write lock before calling any service functions.
    drop(state_config);

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

    // Save to disk
    let config = state.config.read().map_err(|e| e.to_string())?;
    if let Ok(yaml) = serde_yaml::to_string(&*config) {
        std::fs::write(&state.config_path, yaml)
            .map_err(|e| format!("Failed to write config: {}", e))?;
    } else {
        return Err("Failed to serialize config".to_string());
    }

    Ok(())
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
    // Save to disk
    let config = state.config.read().map_err(|e| e.to_string())?;
    if let Ok(yaml) = serde_yaml::to_string(&*config) {
        std::fs::write(&state.config_path, yaml)
            .map_err(|e| format!("Failed to write config: {}", e))?;
    }
    Ok(())
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
    // Save to disk
    let config = state.config.read().map_err(|e| e.to_string())?;
    if let Ok(yaml) = serde_yaml::to_string(&*config) {
        std::fs::write(&state.config_path, yaml)
            .map_err(|e| format!("Failed to write config: {}", e))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use harbor_core::downloads::DownloadsConfig;
    use tempfile::tempdir;

    #[test]
    fn test_append_to_log_creates_and_writes() {
        let tmp = tempdir().unwrap();
        let log_path = tmp.path().join("logs").join("recent.log");

        let actions = vec![
            (
                PathBuf::from("src/a.txt"),
                PathBuf::from("dst/a.txt"),
                "Images".to_string(),
                None,
            ),
            (
                PathBuf::from("src/b.txt"),
                PathBuf::from("dst/b.txt"),
                "Docs".to_string(),
                Some("Symlinked".to_string()),
            ),
        ];

        append_to_log(&log_path, &actions);

        assert!(log_path.exists());
        let content = std::fs::read_to_string(&log_path).unwrap();
        assert!(content.contains("src/a.txt -> dst/a.txt (Images)"));
        assert!(content.contains("src/b.txt -> dst/b.txt (Docs) Symlinked"));
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
}
