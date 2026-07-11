#![cfg_attr(all(not(debug_assertions), windows), windows_subsystem = "windows")]

// Security: The CSP in tauri.conf.json uses 'unsafe-inline' for style-src.
// This is required by Tailwind CSS JIT, which injects <style> tags at runtime.
// Hashes/nonces are impractical because Tailwind generates styles dynamically.
// This is acceptable for a Tauri desktop app: all content is bundled locally,
// no remote untrusted HTML is loaded, and the CSP is defense-in-depth.

mod commands;
#[cfg(test)]
mod integration_tests;
mod state;

use harbor_core::downloads::load_or_initialize_config;
use serde::{Deserialize, Serialize};
use state::AppState;
#[cfg(target_os = "macos")]
use tauri::menu::ContextMenu;
use tauri::{Emitter, Listener, Manager};
use tauri_plugin_notification::NotificationExt;

#[derive(Debug, Clone, Serialize)]
struct TrayOrganizeOutcomeEvent {
    status: String,
    severity: String,
    code: Option<String>,
    message: String,
    remediation_summary: Option<String>,
    moved_count: usize,
    total_failures: usize,
}

#[derive(Debug, Clone, Deserialize)]
struct ServiceStatusEnvelope {
    status: commands::settings::ServiceStatus,
}

fn main() {
    let harbor_dir = harbor_core::downloads::harbor_app_dir();
    let _ = std::fs::create_dir_all(&harbor_dir);

    let cfg_path = harbor_dir.join("harbor.downloads.yaml");

    let config = load_or_initialize_config(&cfg_path).unwrap_or_else(|e| {
        eprintln!("[Harbor] Warning: failed to load config: {e}");
        harbor_core::downloads::default_config()
    });

    // Ensure a default config file exists on disk for first-run users.
    if !cfg_path.exists() {
        if let Ok(yaml) = serde_yaml::to_string(&config) {
            if let Err(e) = std::fs::write(&cfg_path, yaml) {
                eprintln!("[Harbor] Warning: failed to write default config to disk: {e}");
            }
        }
    }

    // Start service if enabled in config (Default: true for new users)
    let service_enabled = config.service_enabled.unwrap_or(false);

    let app_state = AppState::new(cfg_path, config);

    if service_enabled {
        let _ = commands::settings::internal_start_service(&app_state);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Rules commands
            commands::get_rules,
            commands::create_rule,
            commands::update_rule,
            commands::delete_rule,
            commands::toggle_rule,
            commands::reorder_rules,
            commands::get_download_dir,
            // Activity commands
            commands::get_activity_logs,
            commands::get_activity_stats,
            commands::clear_activity_logs,
            // Settings commands
            commands::get_service_status,
            commands::start_service,
            commands::stop_service,
            commands::retry_service_restart,
            commands::trigger_organize_now,
            commands::get_startup_enabled,
            commands::set_startup_enabled,
            commands::reload_config,
            commands::open_config_file,
            commands::open_downloads_folder,
            commands::get_config_path,
            commands::reset_to_defaults,
            commands::get_tutorial_completed,
            commands::set_tutorial_completed,
            commands::get_check_updates,
            commands::set_check_updates,
            commands::get_last_notified_version,
            commands::set_last_notified_version,
            commands::notify_update_available,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // X button / Cmd+W: hide window, remove from dock (macOS), keep in tray.
                window.hide().unwrap();
                api.prevent_close();
                #[cfg(target_os = "macos")]
                {
                    let _ = window
                        .app_handle()
                        .set_activation_policy(tauri::ActivationPolicy::Accessory);
                }
            }
        })
        .setup(move |app| {
            use tauri::image::Image;
            use tauri::menu::{CheckMenuItemBuilder, MenuBuilder, MenuItemBuilder};
            #[cfg(target_os = "macos")]
            use tauri::menu::{PredefinedMenuItem, SubmenuBuilder};
            use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
            if let Err(e) = commands::settings::reconcile_startup_authority(app.handle()) {
                eprintln!("[Harbor] Warning: failed to reconcile startup authority: {e}");
            }

            // --- Override macOS app menu Quit item to intercept Cmd+Q ---
            // NOTE: Using a custom macOS menu to intercept Cmd+Q before the system handles it.
            // This is more reliable than ExitRequested::prevent_exit() on macOS.
            // Also restores Cmd+W (Close Window) which is lost when replacing the default menus.
            #[cfg(target_os = "macos")]
            {
                let quit_item = MenuItemBuilder::with_id("harbor_quit", "Quit Harbor")
                    .accelerator("Cmd+Q")
                    .build(app)?;

                let close_window = MenuItemBuilder::with_id("close_window", "Close Window")
                    .accelerator("Cmd+W")
                    .build(app)?;

                let app_submenu = SubmenuBuilder::new(app, "Harbor")
                    .item(&PredefinedMenuItem::about(app, Some("About Harbor"), None)?)
                    .item(&PredefinedMenuItem::separator(app)?)
                    .item(&PredefinedMenuItem::services(app, None)?)
                    .item(&PredefinedMenuItem::separator(app)?)
                    .item(&PredefinedMenuItem::hide(app, None)?)
                    .item(&PredefinedMenuItem::hide_others(app, None)?)
                    .item(&PredefinedMenuItem::show_all(app, None)?)
                    .item(&PredefinedMenuItem::separator(app)?)
                    .item(&quit_item)
                    .build()?;

                let file_submenu = SubmenuBuilder::new(app, "File")
                    .item(&close_window)
                    .build()?;

                let edit_submenu = SubmenuBuilder::new(app, "Edit")
                    .item(&PredefinedMenuItem::undo(app, None)?)
                    .item(&PredefinedMenuItem::redo(app, None)?)
                    .item(&PredefinedMenuItem::separator(app)?)
                    .item(&PredefinedMenuItem::cut(app, None)?)
                    .item(&PredefinedMenuItem::copy(app, None)?)
                    .item(&PredefinedMenuItem::paste(app, None)?)
                    .item(&PredefinedMenuItem::select_all(app, None)?)
                    .build()?;

                let window_submenu = SubmenuBuilder::new(app, "Window")
                    .item(&PredefinedMenuItem::minimize(app, None)?)
                    .build()?;

                let menu = MenuBuilder::new(app)
                    .item(&app_submenu)
                    .item(&file_submenu)
                    .item(&edit_submenu)
                    .item(&window_submenu)
                    .build()?;

                app.set_menu(menu)?;
            }

            // --- Smart Visibility Logic ---
            let args: Vec<String> = std::env::args().collect();
            let is_minimized_launch = args.contains(&"--minimized".to_string());

            // Helper to show the main window and restore dock icon on macOS.
            #[cfg(target_os = "macos")]
            let show_main_window = |app: &tauri::AppHandle| {
                let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            };
            #[cfg(not(target_os = "macos"))]
            let show_main_window = |app: &tauri::AppHandle| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            };

            if let Some(window) = app.get_webview_window("main") {
                if is_minimized_launch {
                    let _ = window.hide();
                    #[cfg(target_os = "macos")]
                    {
                        let _ = app
                            .handle()
                            .set_activation_policy(tauri::ActivationPolicy::Accessory);
                    }
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            // Load tray icon — platform-specific format
            #[cfg(target_os = "macos")]
            let icon_bytes = include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../assets/harbor_h.png"
            ));
            #[cfg(target_os = "windows")]
            let icon_bytes = include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../assets/icon_h.ico"
            ));
            #[cfg(target_os = "linux")]
            let icon_bytes = include_bytes!(concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/../../assets/harbor_h.png"
            ));
            let tray_icon = Image::from_bytes(icon_bytes).expect("Failed to load tray icon");

            // Build Tray Menu
            let status_on = CheckMenuItemBuilder::new("Service On")
                .id("service_on")
                .checked(service_enabled) // Default is based on config
                .build(app)?;

            let status_off = CheckMenuItemBuilder::new("Service Off")
                .id("service_off")
                .checked(!service_enabled)
                .build(app)?;

            let organize_now = MenuItemBuilder::new("Organize Now")
                .id("organize")
                .build(app)?;

            let open_downloads = MenuItemBuilder::new("Open Downloads")
                .id("open_downloads")
                .build(app)?;
            let open_rules = MenuItemBuilder::new("Open Rules")
                .id("open_rules")
                .build(app)?; // Will open app at rules
            let open_activity = MenuItemBuilder::new("Open Recent Moves")
                .id("open_activity")
                .build(app)?;
            let open_settings = MenuItemBuilder::new("Settings")
                .id("open_settings")
                .build(app)?;

            let quit_i = MenuItemBuilder::new("Quit").id("quit").build(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[
                    &status_on,
                    &status_off,
                    &tauri::menu::PredefinedMenuItem::separator(app)?,
                    &organize_now,
                    &tauri::menu::PredefinedMenuItem::separator(app)?,
                    &open_downloads,
                    &open_rules,
                    &open_activity,
                    &open_settings,
                    &tauri::menu::PredefinedMenuItem::separator(app)?,
                    &quit_i,
                ])
                .build()?;

            let status_on_listener = status_on.clone();
            let status_off_listener = status_off.clone();
            app.listen("harbor://service-status", move |event| {
                let parsed = serde_json::from_str::<ServiceStatusEnvelope>(event.payload());
                match parsed {
                    Ok(payload) => {
                        let checked = payload.status.running;
                        let _ = status_on_listener.set_checked(checked);
                        let _ = status_off_listener.set_checked(!checked);
                    }
                    Err(e) => {
                        eprintln!("[Harbor] Failed to parse service status event payload: {e}");
                    }
                }
            });

            // macOS: manual popup on left-click (no bug here).
            // Windows: use Tauri's native menu management to avoid popup event
            // ordering bugs. Right-click shows menu, double left-click opens app.
            // Linux: stub — only used for CI compilation, not a runtime target.
            #[cfg(target_os = "macos")]
            let menu_for_tray = menu.clone();

            #[cfg(target_os = "windows")]
            let tray_builder = TrayIconBuilder::with_id("tray")
                .icon(tray_icon.clone())
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false);

            #[cfg(target_os = "macos")]
            let tray_builder = TrayIconBuilder::with_id("tray")
                .icon(tray_icon.clone())
                .icon_as_template(true);

            #[cfg(target_os = "linux")]
            let tray_builder = TrayIconBuilder::with_id("tray")
                .icon(tray_icon.clone())
                .icon_as_template(true)
                .menu(&menu);

            let _tray = tray_builder
                .on_tray_icon_event(move |tray, event| {
                    let app = tray.app_handle();
                    match event {
                        // macOS: left-click = show mini popup menu
                        #[cfg(target_os = "macos")]
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            ..
                        } => {
                            if let Some(webview) = app.get_webview_window("main") {
                                let _ = menu_for_tray.popup(webview.as_ref().window().clone());
                            }
                        }
                        // Double left-click: open main window (all platforms)
                        TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        } => {
                            show_main_window(app);
                        }
                        // macOS: right-click (two-finger) = open main window
                        #[cfg(target_os = "macos")]
                        TrayIconEvent::Click {
                            button: MouseButton::Right,
                            ..
                        } => {
                            show_main_window(app);
                        }
                        _ => {}
                    }
                })
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => {
                        // Bypass double-press logic for tray quit.
                        let state: tauri::State<AppState> = app.state();
                        state.tray_quit_requested.store(true, std::sync::atomic::Ordering::SeqCst);
                        app.exit(0);
                    }
                    "service_on" => {
                        let state: tauri::State<AppState> = app.state();
                        let start_result = commands::settings::impl_start_service_with_guards(&state);
                        let _ = commands::settings::emit_lifecycle_status_for_app(app, &state);
                        if let Err(error) = start_result {
                            eprintln!("[Harbor] Tray start blocked: {error}");
                        }
                    }
                    "service_off" => {
                        let state: tauri::State<AppState> = app.state();
                        let _ = commands::settings::persist_service_state(&state, false);
                        let _ = commands::settings::internal_stop_service(&state);
                        let _ = commands::settings::emit_lifecycle_status_for_app(app, &state);
                        let _ = status_on.set_checked(false);
                        let _ = status_off.set_checked(true);
                    }
                    "organize" => {
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let state: tauri::State<AppState> = app_handle.state();
                            match commands::trigger_organize_now(state).await {
                                Ok(response) => {
                                    let tray_outcome =
                                        commands::settings::map_tray_organize_outcome(&response);
                                    let event_payload = TrayOrganizeOutcomeEvent {
                                        status: tray_outcome.status.clone(),
                                        severity: tray_outcome.severity.clone(),
                                        code: tray_outcome.primary_code.clone(),
                                        message: tray_outcome.message.clone(),
                                        remediation_summary: tray_outcome.remediation_summary.clone(),
                                        moved_count: response.moved_count,
                                        total_failures: response.total_failures,
                                    };

                                    if let Err(e) = app_handle
                                        .emit("harbor://tray-organize-outcome", &event_payload)
                                    {
                                        eprintln!(
                                            "[Harbor] Failed to emit tray organize outcome event: {e}"
                                        );
                                    }

                                    let title = match tray_outcome.severity.as_str() {
                                        "info" => "Harbor organize complete",
                                        "warning" => "Harbor organize finished with issues",
                                        _ => "Harbor organize failed",
                                    };
                                    if let Err(e) = app_handle
                                        .notification()
                                        .builder()
                                        .title(title)
                                        .body(tray_outcome.message.clone())
                                        .show()
                                    {
                                        eprintln!(
                                            "[Harbor] Failed to show tray organize notification: {e}"
                                        );
                                    }

                                    if tray_outcome.severity == "info" {
                                        eprintln!("[Harbor] Tray organize succeeded.");
                                    } else {
                                        eprintln!(
                                            "[Harbor] Tray organize {} (code={:?}): {}",
                                            tray_outcome.status,
                                            tray_outcome.primary_code,
                                            tray_outcome.message
                                        );
                                    }
                                }
                                Err(e) => {
                                    eprintln!(
                                        "[Harbor] Tray organize invocation failed before response mapping: {e}"
                                    );
                                    let event_payload = TrayOrganizeOutcomeEvent {
                                        status: "failed".to_string(),
                                        severity: "error".to_string(),
                                        code: Some("invocation_error".to_string()),
                                        message: "Organize request failed to execute.".to_string(),
                                        remediation_summary: Some(
                                            "Retry from tray. If this persists, reopen Harbor."
                                                .to_string(),
                                        ),
                                        moved_count: 0,
                                        total_failures: 1,
                                    };
                                    if let Err(emit_error) = app_handle
                                        .emit("harbor://tray-organize-outcome", &event_payload)
                                    {
                                        eprintln!(
                                            "[Harbor] Failed to emit tray organize invocation failure event: {emit_error}"
                                        );
                                    }
                                    if let Err(notification_error) = app_handle
                                        .notification()
                                        .builder()
                                        .title("Harbor organize failed")
                                        .body(format!(
                                            "{} {}",
                                            event_payload.message,
                                            event_payload
                                                .remediation_summary
                                                .as_deref()
                                                .unwrap_or_default()
                                        ))
                                        .show()
                                    {
                                        eprintln!(
                                            "[Harbor] Failed to show tray organize invocation failure notification: {notification_error}"
                                        );
                                    }
                                }
                            }
                        });
                    }
                    "open_downloads" => {
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            let state: tauri::State<AppState> = app_handle.state();
                            let _ = commands::open_downloads_folder(state).await;
                        });
                    }
                    "open_rules" => {
                        show_main_window(app);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("navigate", "/");
                        }
                    }
                    "open_activity" => {
                        show_main_window(app);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("navigate", "/activity");
                        }
                    }
                    "open_settings" => {
                        show_main_window(app);
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.emit("navigate", "/settings");
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                // Cmd+Q via custom macOS menu item.
                tauri::RunEvent::MenuEvent(menu_event) if menu_event.id.as_ref() == "harbor_quit" => {
                    let state: tauri::State<AppState> = app_handle.state();
                    let mut last_close = state.last_close_request.lock().unwrap();
                    let now = std::time::Instant::now();
                    let should_quit = match *last_close {
                        Some(t) => now.duration_since(t).as_secs() < 7,
                        None => false,
                    };
                    if should_quit {
                        app_handle.exit(0);
                    } else {
                        *last_close = Some(now);
                        let _ = app_handle.emit("show-quit-popup", ());
                    }
                }
                // Cmd+W via custom macOS File > Close Window menu item.
                tauri::RunEvent::MenuEvent(menu_event) if menu_event.id.as_ref() == "close_window" => {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        let _ = window.hide();
                    }
                    #[cfg(target_os = "macos")]
                    {
                        let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
                    }
                }
                // Fallback: Cmd+Q via system quit event.
                tauri::RunEvent::ExitRequested { api, .. } => {
                    let state: tauri::State<AppState> = app_handle.state();

                    // Tray "Quit" bypasses double-press.
                    if state.tray_quit_requested.swap(false, std::sync::atomic::Ordering::SeqCst) {
                        // Allow exit immediately.
                    } else {
                        let mut last_close = state.last_close_request.lock().unwrap();
                        let now = std::time::Instant::now();
                        let should_quit = match *last_close {
                            Some(t) => now.duration_since(t).as_secs() < 7,
                            None => false,
                        };
                        if should_quit {
                            // Allow exit (don't call prevent_exit).
                        } else {
                            *last_close = Some(now);
                            api.prevent_exit();
                            let _ = app_handle.emit("show-quit-popup", ());
                        }
                    }
                }
                _ => {}
            }
        });
}
