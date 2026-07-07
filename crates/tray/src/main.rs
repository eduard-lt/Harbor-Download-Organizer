#[cfg(windows)]
use anyhow::Result;
#[cfg(windows)]
use harbor_core::downloads::{harbor_app_dir, harbor_log_path};
#[cfg(windows)]
use native_windows_gui as nwg;
#[cfg(windows)]
use std::cell::Cell;
#[cfg(windows)]
use std::path::PathBuf;
#[cfg(windows)]
use std::sync::Arc;
#[cfg(windows)]
use std::time::SystemTime;
#[cfg(windows)]
use std::time::UNIX_EPOCH;

#[cfg(windows)]
mod logic;
#[cfg(windows)]
use harbor_core::downloads::load_or_initialize_config;
#[cfg(windows)]
use logic::{open_config, open_folder, windows::utils::SingleInstance, TrayLogic};

#[cfg(windows)]
#[derive(Default)]
struct TrayState {
    window: nwg::MessageWindow,
    tray: nwg::TrayNotification,
    tray_menu: nwg::Menu,
    item_start: nwg::MenuItem,
    item_stop: nwg::MenuItem,
    item_organize: nwg::MenuItem,
    item_open_downloads: nwg::MenuItem,
    item_open_cfg: nwg::MenuItem,
    item_open_recent: nwg::MenuItem,
    item_exit: nwg::MenuItem,
    /// Timestamp (ms) of the last popup menu close, used to debounce
    /// spurious OnContextMenu events that fire after the popup dismisses.
    last_popup_close_ms: Cell<u128>,
}

#[cfg(windows)]
fn show_menu(ui: &TrayState) {
    // Debounce: ignore OnContextMenu events that arrive right after a popup
    // was dismissed. On some Windows versions, dismissing the popup menu by
    // clicking an item triggers a spurious WM_CONTEXTMENU that re-opens the
    // menu at the cursor position before OnMenuItemSelected can be delivered.
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    if now_ms.saturating_sub(ui.last_popup_close_ms.get()) <= 300 {
        return;
    }

    let (x, y) = nwg::GlobalCursor::position();
    ui.tray_menu.popup(x, y);

    // Record close time so the next OnContextMenu is debounced
    ui.last_popup_close_ms.set(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis(),
    );
}

#[cfg(windows)]
fn tray_main() -> Result<()> {
    // Ensure only one instance of Harbor is running
    let _instance = SingleInstance::new("Harbor-Tray-Instance")?;

    nwg::init()?;

    let cfg_path = harbor_app_dir().join("harbor.downloads.yaml");

    // Load config using refactored function
    let cfg = load_or_initialize_config(&cfg_path)?;

    let app_logic = Arc::new(TrayLogic::new(cfg));

    let mut ui = TrayState::default();

    // Use MessageWindow (like the official nwg example) — avoids focus-related
    // spurious OnContextMenu events that cause the popup menu to reopen on click.
    nwg::MessageWindow::builder().build(&mut ui.window)?;

    // We need to load icon from file or resource
    let mut icon = nwg::Icon::default();

    // Try to find icon
    let icon_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("icon_h.ico")))
        .unwrap_or(PathBuf::from("icon_h.ico"));

    if icon_path.exists() {
        let _ = nwg::Icon::builder()
            .source_file(Some(icon_path.to_str().unwrap()))
            .build(&mut icon);
    }

    nwg::TrayNotification::builder()
        .parent(&ui.window)
        .icon(Some(&icon))
        .tip(Some("Harbor"))
        .build(&mut ui.tray)?;

    nwg::Menu::builder()
        .popup(true)
        .parent(&ui.window)
        .build(&mut ui.tray_menu)?;

    nwg::MenuItem::builder()
        .text("Start Watching")
        .parent(&ui.tray_menu)
        .build(&mut ui.item_start)?;

    nwg::MenuItem::builder()
        .text("Stop Watching")
        .check(false)
        .parent(&ui.tray_menu)
        .build(&mut ui.item_stop)?;

    nwg::MenuItem::builder()
        .text("Organize Now")
        .parent(&ui.tray_menu)
        .build(&mut ui.item_organize)?;

    nwg::MenuItem::builder()
        .text("Open Downloads")
        .parent(&ui.tray_menu)
        .build(&mut ui.item_open_downloads)?;

    nwg::MenuItem::builder()
        .text("Open Config")
        .parent(&ui.tray_menu)
        .build(&mut ui.item_open_cfg)?;

    nwg::MenuItem::builder()
        .text("Open Recent Moves")
        .parent(&ui.tray_menu)
        .build(&mut ui.item_open_recent)?;

    nwg::MenuItem::builder()
        .text("Exit")
        .parent(&ui.tray_menu)
        .build(&mut ui.item_exit)?;

    let ui_ref = std::rc::Rc::new(ui);
    let ui_weak = std::rc::Rc::downgrade(&ui_ref);
    let cfg_open_path = cfg_path.clone();
    let downloads_dir = PathBuf::from(&cfg_open_path)
        .parent()
        .map(|_| PathBuf::from(&app_logic.config.download_dir))
        .unwrap_or(PathBuf::from(&app_logic.config.download_dir));

    let logic_c = app_logic.clone();

    let handler = move |evt, _evt_data, handle| {
        if let Some(ui) = ui_weak.upgrade() {
            match evt {
                nwg::Event::OnContextMenu if handle == ui.tray => {
                    show_menu(&ui);
                }
                nwg::Event::OnMenuItemSelected => {
                    if handle == ui.item_start {
                        logic_c.start_watching();
                    } else if handle == ui.item_stop {
                        logic_c.stop_watching();
                    } else if handle == ui.item_organize {
                        if let Ok(actions) = logic_c.organize_now() {
                            if !actions.is_empty() {
                                ui.tray.show(
                                    &format!("Moved {} file(s)", actions.len()),
                                    Some("Harbor"),
                                    Some(nwg::TrayNotificationFlags::INFO_ICON),
                                    None,
                                );
                            }
                        }
                    } else if handle == ui.item_open_downloads {
                        open_folder(&downloads_dir);
                    } else if handle == ui.item_open_cfg {
                        open_config(&cfg_open_path);
                    } else if handle == ui.item_open_recent {
                        let p = harbor_log_path();
                        if !p.exists() {
                            if let Some(parent) = p.parent() {
                                let _ = std::fs::create_dir_all(parent);
                            }
                            let _ = std::fs::write(&p, "Recent Moves Log\n----------------\n");
                        }
                        open_config(&p);
                    } else if handle == ui.item_exit {
                        nwg::stop_thread_dispatch();
                    }
                }
                _ => {}
            }
        }
    };
    let _eh = nwg::full_bind_event_handler(&ui_ref.window.handle, handler);

    // Cleanup old symlinks on startup
    let _ = app_logic.cleanup_old_symlinks();

    app_logic.start_watching();

    nwg::dispatch_thread_events();
    Ok(())
}

fn main() {
    #[cfg(windows)]
    {
        if let Err(e) = tray_main() {
            eprintln!("harbor-tray error: {e}");
            std::process::exit(1);
        }
    }

    #[cfg(not(windows))]
    {
        eprintln!("harbor-tray is Windows-only. Use cargo run -p harbor-tauri-app instead.");
    }
}
