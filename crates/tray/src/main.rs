use anyhow::Result;
use native_windows_gui as nwg;
use std::path::{Path, PathBuf};
use std::sync::Arc;

mod logic;
use logic::{load_initial_config, windows::utils::SingleInstance, TrayLogic};

#[derive(Default)]
struct TrayState {
    window: nwg::Window,
    tray: nwg::TrayNotification,
    tray_menu: nwg::Menu,
    item_start: nwg::MenuItem,
    item_stop: nwg::MenuItem,
    item_organize: nwg::MenuItem,
    item_open_downloads: nwg::MenuItem,
    item_open_cfg: nwg::MenuItem,
    item_open_recent: nwg::MenuItem,
    item_exit: nwg::MenuItem,
}

fn show_menu(ui: &TrayState) {
    let (x, y) = nwg::GlobalCursor::position();
    ui.tray_menu.popup(x, y);
}

fn open_folder(path: &Path) {
    if cfg!(windows) {
        let _ = std::process::Command::new("explorer").arg(path).spawn();
    }
}

fn open_config(path: &Path) {
    if cfg!(windows) {
        // Use default editor
        let _ = std::process::Command::new("cmd")
            .args(["/C", "start", "", path.to_str().unwrap_or("")])
            .spawn();
    }
}

fn main() -> Result<()> {
    // Ensure only one instance of Harbor is running
    let _instance = SingleInstance::new("Harbor-Tray-Instance")?;

    nwg::init()?;

    let cfg_path = TrayLogic::local_appdata_harbor().join("harbor.downloads.yaml");

    // Load config using refactored function
    let cfg = load_initial_config(&cfg_path)?;

    let app_logic = Arc::new(TrayLogic::new(cfg));

    let mut ui = TrayState::default();

    // We modify ui fields in place
    nwg::Window::builder()
        .flags(nwg::WindowFlags::POPUP)
        .size((300, 300))
        .title("Harbor Tray")
        .build(&mut ui.window)?;

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
                nwg::Event::OnContextMenu => {
                    if handle == ui.tray {
                        show_menu(&ui);
                    }
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
                        let p = TrayLogic::recent_log_path();
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
