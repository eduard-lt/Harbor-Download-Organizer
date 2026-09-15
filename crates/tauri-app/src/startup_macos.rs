use objc2_service_management::{SMAppService, SMAppServiceStatus};
use std::path::Path;

pub fn is_login_launch() -> bool {
    use objc2_foundation::NSAppleEventManager;
    // ServiceManagement launches the bundle without command-line arguments.
    // Read the launch event during application setup instead.
    NSAppleEventManager::sharedAppleEventManager()
        .currentAppleEvent()
        .is_some_and(|event| {
            event.eventID() == u32::from_be_bytes(*b"oapp")
                && event
                    .paramDescriptorForKeyword(u32::from_be_bytes(*b"prdt"))
                    .is_some_and(|value| value.enumCodeValue() == u32::from_be_bytes(*b"lgit"))
        })
}

pub fn is_enabled() -> bool {
    // The main app service identifies Harbor by its application bundle.
    unsafe { SMAppService::mainAppService().status() == SMAppServiceStatus::Enabled }
}

pub fn enable() -> Result<(), String> {
    unsafe {
        let service = SMAppService::mainAppService();
        if matches!(
            service.status(),
            SMAppServiceStatus::Enabled | SMAppServiceStatus::RequiresApproval
        ) {
            return Ok(());
        }
        service
            .registerAndReturnError()
            .map_err(|e| e.to_string())?;
        // Keep a pending registration so it can be approved in Login Items.
        // The caller reconciles the toggle with the service's actual status.
    }
    Ok(())
}

pub fn disable() -> Result<(), String> {
    unsafe {
        let service = SMAppService::mainAppService();
        if service.status() == SMAppServiceStatus::NotRegistered {
            return Ok(());
        }
        service
            .unregisterAndReturnError()
            .map_err(|e| e.to_string())
    }
}

fn belongs_to_bundle(value: &plist::Value, bundle: &Path) -> bool {
    value
        .as_dictionary()
        .and_then(|dict| dict.get("ProgramArguments"))
        .and_then(plist::Value::as_array)
        .and_then(|args| args.first())
        .and_then(plist::Value::as_string)
        .is_some_and(|exe| {
            let path = Path::new(exe);
            path.parent() == Some(bundle.join("Contents/MacOS").as_path())
                && matches!(
                    path.file_name().and_then(|n| n.to_str()),
                    Some("harbor-tauri-app" | "Harbor")
                )
        })
}

fn idle_job_matches_bundle(job: &str, bundle: &Path) -> bool {
    let field = |name: &str| {
        job.lines()
            .find_map(|line| line.strip_prefix('\t')?.strip_prefix(name))
    };
    field("state = ") == Some("not running")
        && field("pid = ").is_none()
        && field("program = ").is_some_and(|program| {
            ["Harbor", "harbor-tauri-app"]
                .iter()
                .any(|name| Path::new(program) == bundle.join("Contents/MacOS").join(name))
        })
}

fn unload_retired_job(value: &plist::Value, bundle: &Path) -> Result<(), String> {
    use std::process::Command;
    let Some(label @ ("Harbor" | "harbor-tauri-app")) = value
        .as_dictionary()
        .and_then(|dict| dict.get("Label"))
        .and_then(plist::Value::as_string)
    else {
        return Ok(());
    };
    let uid = Command::new("/usr/bin/id")
        .arg("-u")
        .output()
        .map_err(|e| e.to_string())?;
    let uid: u32 = String::from_utf8_lossy(&uid.stdout)
        .trim()
        .parse()
        .map_err(|_| "Could not determine the login session user".to_string())?;
    let service = format!("gui/{uid}/{label}");
    let job = Command::new("/bin/launchctl")
        .args(["print", &service])
        .output()
        .map_err(|e| e.to_string())?;
    // A retired job may already be unloaded. Never stop a running app or a
    // different installation that happens to use the same legacy label.
    if !job.status.success()
        || !idle_job_matches_bundle(&String::from_utf8_lossy(&job.stdout), bundle)
    {
        return Ok(());
    }
    let result = Command::new("/bin/launchctl")
        .args(["bootout", &service])
        .output()
        .map_err(|e| e.to_string())?;
    if !result.status.success() {
        return Err(format!(
            "Could not unload retired startup job: {}",
            String::from_utf8_lossy(&result.stderr)
        ));
    }
    Ok(())
}

/// Replace only legacy registrations pointing into this installed bundle.
/// Development builds must never migrate a user's installed application.
pub fn migrate_legacy() -> Result<(), String> {
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let Some(bundle) = executable
        .ancestors()
        .nth(3)
        .filter(|p| p.extension().is_some_and(|e| e == "app"))
    else {
        return Ok(());
    };
    let Some(home) = std::env::var_os("HOME") else {
        return Ok(());
    };
    let agents = Path::new(&home).join("Library/LaunchAgents");
    for name in ["Harbor.plist", "harbor-tauri-app.plist"] {
        let path = agents.join(name);
        let backup = path.with_extension("plist.disabled");
        if !path.exists() {
            if backup.exists() {
                let value = plist::Value::from_file(&backup).map_err(|e| e.to_string())?;
                if belongs_to_bundle(&value, bundle) {
                    unload_retired_job(&value, bundle)?;
                }
            }
            continue;
        }
        let value = plist::Value::from_file(&path).map_err(|e| e.to_string())?;
        if !belongs_to_bundle(&value, bundle) {
            continue;
        }
        enable()?;
        if !is_enabled() {
            return Err(
                "Harbor login item registration is not enabled; legacy startup was preserved."
                    .into(),
            );
        }
        // Preserve the old configuration for recovery while removing it from
        // launchd's .plist discovery on subsequent logins.
        if backup.exists() {
            return Err(format!(
                "Startup migration backup already exists: {}",
                backup.display()
            ));
        }
        std::fs::rename(&path, backup).map_err(|e| e.to_string())?;
        unload_retired_job(&value, bundle)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retired_job_cleanup_requires_an_idle_job_from_this_bundle() {
        let bundle = Path::new("/Applications/Harbor.app");
        let job = "gui/501/Harbor = {\n\tstate = not running\n\tprogram = /Applications/Harbor.app/Contents/MacOS/harbor-tauri-app\n}";
        assert!(idle_job_matches_bundle(job, bundle));
        assert!(!idle_job_matches_bundle(
            &job.replace("not running", "running"),
            bundle
        ));
        assert!(!idle_job_matches_bundle(
            &job.replace("\n}", "\n\tpid = 123\n}"),
            bundle
        ));
        assert!(!idle_job_matches_bundle(job, Path::new("/tmp/Harbor.app")));
        assert!(!idle_job_matches_bundle("", bundle));
    }

    #[test]
    fn migration_only_matches_this_bundles_executable() {
        let mut dict = plist::Dictionary::new();
        dict.insert(
            "ProgramArguments".into(),
            plist::Value::Array(vec![plist::Value::String(
                "/Applications/Harbor.app/Contents/MacOS/harbor-tauri-app".into(),
            )]),
        );
        let value = plist::Value::Dictionary(dict);
        assert!(belongs_to_bundle(
            &value,
            Path::new("/Applications/Harbor.app")
        ));
        assert!(!belongs_to_bundle(&value, Path::new("/tmp/Harbor.app")));
        assert!(!belongs_to_bundle(
            &plist::Value::String("Harbor".into()),
            Path::new("/Applications/Harbor.app")
        ));
    }
}
