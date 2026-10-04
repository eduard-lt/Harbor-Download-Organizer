//! Windows login registration. Only an explicit enable changes StartupApproved;
//! migration updates an existing Run entry without overriding the user's choice.
use std::{io, path::Path};
use winreg::{enums::*, RegKey, RegValue};

const RUN: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
const APPROVED: &str = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
const NAME: &str = "Harbor";
const LEGACY_NAME: &str = "HarborTray";

fn command(exe: &Path) -> String {
    format!("\"{}\" --minimized", exe.display())
}

fn registration(key: &RegKey) -> io::Result<Option<String>> {
    match key.get_value(NAME) {
        Ok(value) => Ok(Some(value)),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e),
    }
}

fn read_registration(run: &RegKey, name: &str) -> io::Result<Option<String>> {
    match run.get_value(name) {
        Ok(value) => Ok(Some(value)),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e),
    }
}

/// Canonical registration takes precedence. When migrating HarborTray, carry its
/// approval bytes too: a stale Harbor approval must not override the old choice.
fn reconcile_entries(
    run: &RegKey,
    approvals: &RegKey,
    exe: &Path,
    restore: Option<&str>,
) -> io::Result<()> {
    let source = if read_registration(run, NAME)?.is_some() {
        Some(NAME)
    } else if read_registration(run, LEGACY_NAME)?.is_some() {
        Some(LEGACY_NAME)
    } else {
        restore.filter(|name| matches!(*name, NAME | LEGACY_NAME))
    };
    if let Some(source) = source {
        if source == LEGACY_NAME {
            match approvals.get_raw_value(source) {
                Ok(value) => approvals.set_raw_value(NAME, &value)?,
                Err(e) if e.kind() == io::ErrorKind::NotFound => {
                    match approvals.delete_value(NAME) {
                        Ok(()) => {}
                        Err(e) if e.kind() == io::ErrorKind::NotFound => {}
                        Err(e) => return Err(e),
                    }
                }
                Err(e) => return Err(e),
            }
        }
        run.set_value(NAME, &command(exe))?;
        match run.delete_value(LEGACY_NAME) {
            Ok(()) => {}
            Err(e) if e.kind() == io::ErrorKind::NotFound => {}
            Err(e) => return Err(e),
        }
    }
    Ok(())
}

fn repair(restore: Option<&str>) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run, _) = hkcu.create_subkey(RUN).map_err(|e| e.to_string())?;
    let (approvals, _) = hkcu.create_subkey(APPROVED).map_err(|e| e.to_string())?;
    reconcile_entries(&run, &approvals, &exe, restore).map_err(|e| e.to_string())
}

pub fn reconcile() -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Ok(());
    }
    repair(None)
}

/// Installer-only maintenance exits before config, watcher, single-instance or
/// WebView initialization. Works even when the user deselects "Run Harbor".
pub fn installer_maintenance() -> Option<Result<(), String>> {
    let mut args = std::env::args().skip(1);
    if args.next().as_deref() != Some("--repair-startup") {
        return None;
    }
    let source = args.next();
    Some(repair(source.as_deref()))
}

pub fn enable() -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run, _) = hkcu.create_subkey(RUN).map_err(|e| e.to_string())?;
    run.set_value(NAME, &command(&exe))
        .map_err(|e| e.to_string())?;
    // Explicit opt-in can re-enable an item disabled through Task Manager.
    let (approved, _) = hkcu.create_subkey(APPROVED).map_err(|e| e.to_string())?;
    approved
        .set_raw_value(
            NAME,
            &RegValue {
                vtype: REG_BINARY,
                bytes: vec![2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
        )
        .map_err(|e| e.to_string())
}

fn remove_entry(run: &RegKey) -> io::Result<()> {
    match run.delete_value(NAME) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e),
    }
}

pub fn disable() -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    match hkcu.open_subkey_with_flags(RUN, KEY_SET_VALUE) {
        Ok(run) => {
            remove_entry(&run).map_err(|e| e.to_string())?;
            match run.delete_value(LEGACY_NAME) {
                Ok(()) => Ok(()),
                Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
                Err(e) => Err(e.to_string()),
            }
        }
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn approved(value: &RegValue) -> bool {
    // Unknown/malformed states must not be reported as enabled.
    value.vtype == REG_BINARY
        && value.bytes.len() >= 12
        && matches!(&value.bytes[..4], [2, 0, 0, 0] | [6, 0, 0, 0])
}

pub fn is_enabled() -> Result<bool, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run = match hkcu.open_subkey(RUN) {
        Ok(key) => key,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(false),
        Err(e) => return Err(e.to_string()),
    };
    if registration(&run).map_err(|e| e.to_string())?.as_deref() != Some(&command(&exe)) {
        return Ok(false);
    }
    let key = match hkcu.open_subkey(APPROVED) {
        Ok(key) => key,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(true),
        Err(e) => return Err(e.to_string()),
    };
    match key.get_raw_value(NAME) {
        Ok(value) => Ok(approved(&value)),
        Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(true),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migration_repairs_legacy_path_without_opting_in_new_users() {
        // Unique disposable registry fixture; never touch real login settings.
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let name = format!(
            r"Software\HarborTests\{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        let (run, _) = hkcu
            .create_subkey_with_flags(&name, KEY_ALL_ACCESS)
            .unwrap();
        let (approvals, _) = run.create_subkey("Approvals").unwrap();
        let exe = Path::new(r"C:\Users\Test User\AppData\Local\Harbor\Harbor.exe");
        reconcile_entries(&run, &approvals, exe, None).unwrap();
        assert!(registration(&run).unwrap().is_none());
        run.set_value(
            NAME,
            &r"C:\Program Files\Harbor\harbor-tauri-app.exe --minimized",
        )
        .unwrap();
        run.set_value("OtherApp", &"unchanged").unwrap();
        reconcile_entries(&run, &approvals, exe, None).unwrap();
        assert_eq!(
            registration(&run).unwrap().unwrap(),
            r#""C:\Users\Test User\AppData\Local\Harbor\Harbor.exe" --minimized"#
        );
        reconcile_entries(&run, &approvals, exe, None).unwrap();
        assert_eq!(run.get_value::<String, _>("OtherApp").unwrap(), "unchanged");
        remove_entry(&run).unwrap();
        remove_entry(&run).unwrap();
        assert!(registration(&run).unwrap().is_none());
        drop(approvals);
        drop(run);
        hkcu.delete_subkey_all(name).unwrap();
    }

    #[test]
    fn upgrades_preserve_approval_and_retire_legacy_registration() {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let root = format!(
            r"Software\HarborTests\upgrade-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        let (fixture, _) = hkcu.create_subkey(&root).unwrap();
        let exe = Path::new(r"C:\New Folder\Harbor.exe");
        for (case, current, legacy, restore, state) in [
            ("legacy-enabled", false, true, None, 2),
            ("legacy-disabled", false, true, None, 3),
            ("canonical-disabled", true, true, None, 3),
            ("removed-by-uninstaller", false, false, Some(NAME), 2),
            ("removed-disabled", false, false, Some(NAME), 3),
            ("old-msi-removed-legacy", false, false, Some(LEGACY_NAME), 3),
        ] {
            let (run, _) = fixture.create_subkey(format!("{case}\\Run")).unwrap();
            let (approvals, _) = fixture.create_subkey(format!("{case}\\Approval")).unwrap();
            if current {
                run.set_value(NAME, &"C:\\Old\\Harbor.exe --minimized")
                    .unwrap();
            }
            if legacy {
                run.set_value(LEGACY_NAME, &"C:\\Old\\harbor-tray.exe")
                    .unwrap();
            }
            let source = if current || restore == Some(NAME) {
                NAME
            } else {
                LEGACY_NAME
            };
            let approval = RegValue {
                vtype: REG_BINARY,
                bytes: vec![state, 0, 0, 0, 11, 22, 33, 44, 55, 66, 77, 88],
            };
            approvals.set_raw_value(source, &approval).unwrap();
            if source == LEGACY_NAME {
                approvals
                    .set_raw_value(
                        NAME,
                        &RegValue {
                            vtype: REG_BINARY,
                            bytes: vec![2; 12],
                        },
                    )
                    .unwrap();
            }
            run.set_value("UnrelatedApp", &"untouched").unwrap();
            reconcile_entries(&run, &approvals, exe, restore).unwrap();
            assert_eq!(registration(&run).unwrap(), Some(command(exe)), "{case}");
            assert_eq!(
                approvals.get_raw_value(NAME).unwrap().bytes,
                approval.bytes,
                "{case}"
            );
            assert!(read_registration(&run, LEGACY_NAME).unwrap().is_none());
            assert_eq!(
                run.get_value::<String, _>("UnrelatedApp").unwrap(),
                "untouched"
            );
            reconcile_entries(&run, &approvals, exe, None).unwrap();
            assert_eq!(approvals.get_raw_value(NAME).unwrap().bytes, approval.bytes);
        }
        drop(fixture);
        hkcu.delete_subkey_all(root).unwrap();
    }

    #[test]
    fn disabled_or_malformed_approval_is_not_enabled() {
        for (state, expected) in [(2, true), (3, false), (6, true), (7, false), (0, false)] {
            let mut bytes = vec![0; 12];
            bytes[0] = state;
            assert_eq!(
                approved(&RegValue {
                    vtype: REG_BINARY,
                    bytes
                }),
                expected
            );
        }
        assert!(!approved(&RegValue {
            vtype: REG_BINARY,
            bytes: vec![2]
        }));
    }
}
