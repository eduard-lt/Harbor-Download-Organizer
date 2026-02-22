use crate::types::Rule;
use anyhow::{Context, Result};

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadsConfig {
    pub download_dir: String,
    pub rules: Vec<Rule>,
    pub min_age_secs: Option<u64>,
    pub tutorial_completed: Option<bool>,
    pub service_enabled: Option<bool>,
    pub check_updates: Option<bool>,
    pub last_notified_version: Option<String>,
}

pub type OrganizeResult = (PathBuf, PathBuf, String, Option<String>);

/// Loads and parses the downloads configuration file.
///
/// This function reads a YAML file from the specified path, parses it into a
/// `DownloadsConfig` struct, and expands environment variables (like `%USERPROFILE%`)
/// in the paths.
///
/// # Arguments
///
/// * `path` - Path to the configuration file
///
/// # Examples
///
/// ```no_run
/// use harbor_core::downloads::load_downloads_config;
///
/// if let Ok(cfg) = load_downloads_config("harbor.downloads.yaml") {
///     println!("Monitoring {}", cfg.download_dir);
/// }
/// ```
pub fn default_config() -> DownloadsConfig {
    let user = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Public".to_string());
    let dl = format!("{}\\Downloads", user);
    let pictures = format!("{}\\Downloads\\Images", user);
    let videos = format!("{}\\Downloads\\Videos", user);
    let music = format!("{}\\Downloads\\Music", user);
    let docs = format!("{}\\Downloads\\Documents", user);
    let archives = format!("{}\\Downloads\\Archives", user);
    let installers = format!("{}\\Downloads\\Installers", user);
    let torrents = format!("{}\\Downloads\\Torrents", user);
    let isos = format!("{}\\Downloads\\ISOs", user);
    let dev = format!("{}\\Downloads\\Dev", user);
    let subtitles = format!("{}\\Downloads\\Subtitles", user);
    let webpages = format!("{}\\Downloads\\Webpages", user);

    DownloadsConfig {
        download_dir: dl,
        min_age_secs: Some(5),
        tutorial_completed: Some(false),
        service_enabled: Some(true),
        check_updates: Some(true),
        last_notified_version: None,
        rules: vec![
            Rule {
                name: "Images".to_string(),
                extensions: Some(
                    [
                        "jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "heic", "svg", "avif",
                    ]
                    .iter()
                    .map(|s| s.to_string())
                    .collect(),
                ),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: pictures,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Videos".to_string(),
                extensions: Some(
                    ["mp4", "mkv", "avi", "mov", "wmv", "webm"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                ),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: videos,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Music".to_string(),
                extensions: Some(
                    ["mp3", "flac", "wav", "aac", "ogg"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                ),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: music,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Archives".to_string(),
                extensions: Some(
                    ["zip", "rar", "7z", "tar", "gz", "xz"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                ),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: archives,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Documents".to_string(),
                extensions: Some(
                    [
                        "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf",
                    ]
                    .iter()
                    .map(|s| s.to_string())
                    .collect(),
                ),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: docs.clone(),
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Installers".to_string(),
                extensions: Some(
                    ["exe", "msi", "msix", "dmg", "pkg", "apk"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                ),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: installers,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "ISOs".to_string(),
                extensions: Some(["iso"].iter().map(|s| s.to_string()).collect()),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: isos,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Torrents".to_string(),
                extensions: Some(["torrent"].iter().map(|s| s.to_string()).collect()),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: torrents,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Dev".to_string(),
                extensions: Some(
                    ["json", "env", "xml", "plist"]
                        .iter()
                        .map(|s| s.to_string())
                        .collect(),
                ),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: dev,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Web Pages".to_string(),
                extensions: Some(["html", "htm"].iter().map(|s| s.to_string()).collect()),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: webpages,
                create_symlink: None,
                enabled: Some(true),
            },
            Rule {
                name: "Subtitles".to_string(),
                extensions: Some(["srt", "vtt"].iter().map(|s| s.to_string()).collect()),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: subtitles,
                create_symlink: None,
                enabled: Some(true),
            },
        ],
    }
}

pub fn load_downloads_config(path: impl AsRef<Path>) -> Result<DownloadsConfig> {
    let p = path.as_ref();
    let content = fs::read_to_string(p).with_context(|| format!("read {}", p.display()))?;
    let mut cfg: DownloadsConfig =
        serde_yaml::from_str(&content).context("parse downloads yaml")?;
    cfg.download_dir = expand_env(&cfg.download_dir);
    for r in cfg.rules.iter_mut() {
        r.target_dir = expand_env(&r.target_dir);
    }
    Ok(cfg)
}

fn is_partial(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower.ends_with(".crdownload")
        || lower.ends_with(".part")
        || lower.ends_with(".tmp")
        || lower.ends_with(".download")
}

fn matches_rule(path: &Path, meta: &fs::Metadata, rule: &Rule) -> bool {
    if let Some(exts) = &rule.extensions {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase())
            .unwrap_or_default();
        if !exts.iter().any(|x| x.to_ascii_lowercase() == ext) {
            return false;
        }
    }
    if let Some(pat) = &rule.pattern {
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if let Ok(re) = Regex::new(pat) {
                if !re.is_match(name) {
                    return false;
                }
            }
        }
    }
    let size: u64 = meta.len();
    if let Some(min) = rule.min_size_bytes {
        if size < min {
            return false;
        }
    }
    if let Some(max) = rule.max_size_bytes {
        if size > max {
            return false;
        }
    }
    true
}

fn ensure_dir(dir: &Path) -> Result<()> {
    fs::create_dir_all(dir).with_context(|| format!("create {}", dir.display()))?;
    Ok(())
}

fn unique_target(target: &Path) -> PathBuf {
    if !target.exists() {
        return target.to_path_buf();
    }
    let mut i = 1u32;
    loop {
        let mut p = target.to_path_buf();
        let stem = target
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("file");
        let ext = target.extension().and_then(|e| e.to_str()).unwrap_or("");
        let name = if ext.is_empty() {
            format!("{} ({})", stem, i)
        } else {
            format!("{} ({}).{}", stem, i, ext)
        };
        p.set_file_name(name);
        if !p.exists() {
            return p;
        }
        i += 1;
    }
}

/// Runs a single organization pass based on the provided configuration.
///
/// Iterates through files in the `download_dir`, checks them against the defined `rules`,
/// and moves matching files to their target directories. It also handles safe renaming
/// (to avoid overwrites) and optional symlink creation.
///
/// Returns a list of actions taken, where each action is a tuple:
/// `(original_path, new_path, rule_name, symlink_info)`.
pub fn organize_once(cfg: &DownloadsConfig) -> Result<Vec<OrganizeResult>> {
    let base = PathBuf::from(&cfg.download_dir);
    let min_age = Duration::from_secs(cfg.min_age_secs.unwrap_or(5));
    let mut actions = Vec::new();
    for entry in fs::read_dir(&base).with_context(|| format!("list {}", base.display()))? {
        let entry = entry?;
        let path = entry.path();
        let meta = match fs::symlink_metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.file_type().is_symlink() || !meta.is_file() {
            continue;
        }
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if is_partial(name) {
                continue;
            }
        }
        if let Ok(modified) = meta.modified() {
            if SystemTime::now()
                .duration_since(modified)
                .unwrap_or(Duration::from_secs(0))
                < min_age
            {
                continue;
            }
        }
        let mut applied: Option<(&Rule, PathBuf)> = None;
        for rule in &cfg.rules {
            // Skip disabled rules
            if !rule.enabled.unwrap_or(true) {
                continue;
            }
            if matches_rule(&path, &meta, rule) {
                let target_dir = PathBuf::from(&rule.target_dir);
                ensure_dir(&target_dir)?;
                let target = target_dir.join(
                    path.file_name()
                        .map(|n| n.to_os_string())
                        .unwrap_or_default(),
                );
                let target = unique_target(&target);
                applied = Some((rule, target));
                break;
            }
        }
        if let Some((rule, target)) = applied {
            fs::rename(&path, &target)
                .with_context(|| format!("move {} -> {}", path.display(), target.display()))?;

            let mut symlink_info = None;
            if rule.create_symlink.unwrap_or(false) {
                #[cfg(windows)]
                let res = std::os::windows::fs::symlink_file(&target, &path);
                #[cfg(unix)]
                let res = std::os::unix::fs::symlink(&target, &path);

                match res {
                    Ok(_) => {
                        symlink_info = Some("Symlink created".to_string());
                        #[cfg(windows)]
                        {
                            let _ = std::process::Command::new("attrib")
                                .arg("+h")
                                .arg(&path)
                                .arg("/L")
                                .creation_flags(0x08000000) // CREATE_NO_WINDOW
                                .status();
                        }
                    }
                    Err(e) => symlink_info = Some(format!("Symlink failed: {}", e)),
                }
            }

            actions.push((path, target.clone(), rule.name.clone(), symlink_info));
        }
    }
    Ok(actions)
}

/// Continuously polls the download directory and runs organization logic.
///
/// This runs `organize_once` in a loop, sleeping for `interval_secs` between iterations.
/// When actions are taken, the `callback` is invoked with the list of actions.
/// The function checks the `should_continue` flag on each iteration; when set to false, it exits.
pub fn watch_polling<F>(
    cfg: &DownloadsConfig,
    interval_secs: u64,
    should_continue: &std::sync::atomic::AtomicBool,
    callback: F,
) -> Result<()>
where
    F: Fn(&[OrganizeResult]),
{
    use std::sync::atomic::Ordering;
    loop {
        if !should_continue.load(Ordering::Relaxed) {
            break;
        }
        match organize_once(cfg) {
            Ok(actions) => {
                if !actions.is_empty() {
                    callback(&actions);
                }
            }
            Err(e) => eprintln!("organize error: {}", e),
        }
        thread::sleep(Duration::from_secs(interval_secs));
    }
    Ok(())
}

fn expand_env(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut i = 0;
    let bytes = input.as_bytes();
    while i < bytes.len() {
        if bytes[i] == b'%' {
            if let Some(end) = input[i + 1..].find('%') {
                let var = &input[i + 1..i + 1 + end];
                let val = std::env::var(var).unwrap_or_else(|_| "".to_string());
                out.push_str(&val);
                i += end + 2;
                continue;
            }
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

/// Scans the download directory for old symlinks created by Harbor and removes them.
///
/// A symlink is considered "old" (and safe to remove) if:
/// 1. It is a valid symbolic link.
/// 2. It points to a file inside one of the configured `target_dirs`.
///
/// Returns the number of symlinks removed.
pub fn cleanup_old_symlinks(cfg: &DownloadsConfig) -> Result<usize> {
    let base = PathBuf::from(&cfg.download_dir);
    if !base.exists() {
        return Ok(0);
    }

    let mut count = 0;
    // Collect target dirs to check against
    let target_dirs: Vec<PathBuf> = cfg
        .rules
        .iter()
        .map(|r| PathBuf::from(&r.target_dir))
        .collect();

    for entry in fs::read_dir(&base).with_context(|| format!("list {}", base.display()))? {
        let entry = entry?;
        let path = entry.path();

        let meta = match fs::symlink_metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };

        if meta.file_type().is_symlink() {
            // Check if it points to one of our folders
            if let Ok(target) = fs::read_link(&path) {
                // If relative symlink, resolve it relative to base
                let abs_target = if target.is_relative() {
                    base.join(&target)
                } else {
                    target
                };

                let points_to_our_dir = target_dirs.iter().any(|d| abs_target.starts_with(d));

                if points_to_our_dir {
                    // It's one of ours, delete it
                    if fs::remove_file(&path).is_ok() {
                        count += 1;
                    }
                }
            }
        }
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_expand_env() {
        std::env::set_var("TEST_VAR", "world");
        assert_eq!(expand_env("Hello %TEST_VAR%"), "Hello world");
        assert_eq!(expand_env("%TEST_VAR%"), "world");
        assert_eq!(expand_env("No vars"), "No vars");
        assert_eq!(expand_env("Unknown %MISSING_VAR%"), "Unknown ");
    }

    #[test]
    fn test_is_partial() {
        assert!(is_partial("file.crdownload"));
        assert!(is_partial("file.part"));
        assert!(is_partial("file.tmp"));
        assert!(is_partial("file.download"));
        assert!(is_partial("FILE.CRDOWNLOAD")); // Case check
        assert!(!is_partial("file.txt"));
        assert!(!is_partial("image.png"));
    }

    #[test]
    fn test_matches_rule() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("test.png");
        {
            let mut f = fs::File::create(&file_path).unwrap();
            f.write_all(b"123").unwrap(); // 3 bytes
        }
        let meta = fs::metadata(&file_path).unwrap();

        let rule_ext = Rule {
            name: "Ext".into(),
            extensions: Some(vec!["png".into()]),
            pattern: None,
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".into(),
            create_symlink: None,
            enabled: None,
        };
        assert!(matches_rule(&file_path, &meta, &rule_ext));

        let rule_pat = Rule {
            name: "Pat".into(),
            extensions: None,
            pattern: Some(".*st\\.png".into()),
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".into(),
            create_symlink: None,
            enabled: None,
        };
        assert!(matches_rule(&file_path, &meta, &rule_pat));

        let rule_size = Rule {
            name: "Size".into(),
            extensions: None,
            pattern: None,
            min_size_bytes: Some(2),
            max_size_bytes: Some(10),
            target_dir: "target".into(),
            create_symlink: None,
            enabled: None,
        };
        assert!(matches_rule(&file_path, &meta, &rule_size));

        let rule_fail = Rule {
            name: "Fail".into(),
            extensions: Some(vec!["jpg".into()]),
            pattern: None,
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".into(),
            create_symlink: None,
            enabled: None,
        };
        assert!(!matches_rule(&file_path, &meta, &rule_fail));
    }

    #[test]
    fn test_unique_target() {
        let temp = TempDir::new().unwrap();
        let target = temp.path().join("file.txt");

        // 1. Doesn't exist
        assert_eq!(unique_target(&target), target);

        // 2. Exists
        fs::File::create(&target).unwrap();
        let expected = temp.path().join("file (1).txt");
        assert_eq!(unique_target(&target), expected);

        // 3. (1) Exists
        fs::File::create(&expected).unwrap();
        let expected_2 = temp.path().join("file (2).txt");
        assert_eq!(unique_target(&target), expected_2);
    }

    #[test]
    fn test_organize_basic() {
        let root = TempDir::new().unwrap();
        let dl = root.path().join("Downloads");
        let target = root.path().join("Images");
        fs::create_dir(&dl).unwrap();

        // Create file
        let file_path = dl.join("test.png");
        {
            let mut f = fs::File::create(&file_path).unwrap();
            f.write_all(b"data").unwrap();
        }

        // Create config
        let cfg = DownloadsConfig {
            download_dir: dl.to_str().unwrap().into(),
            min_age_secs: Some(0), // Immediate move
            tutorial_completed: None,
            service_enabled: None,
            check_updates: None,
            last_notified_version: None,
            rules: vec![Rule {
                name: "Images".into(),
                extensions: Some(vec!["png".into()]),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: target.to_str().unwrap().into(),
                create_symlink: Some(false),
                enabled: None,
            }],
        };

        // Run
        let actions = organize_once(&cfg).unwrap();
        assert_eq!(actions.len(), 1);
        assert!(!file_path.exists());
        assert!(target.join("test.png").exists());
    }

    #[test]
    fn test_cleanup_old_symlinks() {
        let root = TempDir::new().unwrap();
        let dl = root.path().join("Downloads");
        let target = root.path().join("Images");
        fs::create_dir_all(&dl).unwrap();
        fs::create_dir_all(&target).unwrap();

        // Create a symlink in dl -> target
        let symlink_path = dl.join("link.png");

        #[cfg(windows)]
        let res = std::os::windows::fs::symlink_file(&target, &symlink_path);
        #[cfg(unix)]
        let res = std::os::unix::fs::symlink(&target, &symlink_path);

        // If we can't create symlinks (permissions), skip test
        if res.is_err() {
            return;
        }

        let cfg = DownloadsConfig {
            download_dir: dl.to_str().unwrap().into(),
            rules: vec![Rule {
                name: "Images".into(),
                extensions: None,
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: target.to_str().unwrap().into(),
                create_symlink: None,
                enabled: None,
            }],
            min_age_secs: None,
            tutorial_completed: None,
            service_enabled: None,
            check_updates: None,
            last_notified_version: None,
        };

        // Clean up
        let count = cleanup_old_symlinks(&cfg).unwrap();
        assert_eq!(count, 1);
        assert!(!symlink_path.exists());
    }

    #[test]
    fn test_load_downloads_config_new_fields() {
        let yaml = r#"
download_dir: "C:\\Downloads"
rules: []
check_updates: false
last_notified_version: "v1.2.3"
"#;
        let cfg: DownloadsConfig = serde_yaml::from_str(yaml).unwrap();
        assert_eq!(cfg.check_updates, Some(false));
        assert_eq!(cfg.last_notified_version, Some("v1.2.3".to_string()));

        // Round trip
        let serialized = serde_yaml::to_string(&cfg).unwrap();
        let deserialized: DownloadsConfig = serde_yaml::from_str(&serialized).unwrap();
        assert_eq!(deserialized.check_updates, Some(false));
        assert_eq!(
            deserialized.last_notified_version,
            Some("v1.2.3".to_string())
        );
    }

    #[test]
    fn test_load_downloads_config() {
        let mut file = tempfile::Builder::new().suffix(".yaml").tempfile().unwrap();
        writeln!(
            file,
            r#"
download_dir: "C:\\Downloads"
rules:
  - name: test
    target_dir: "C:\\Target"
"#
        )
        .unwrap();

        let cfg = load_downloads_config(file.path()).unwrap();
        assert_eq!(cfg.rules.len(), 1);
        assert_eq!(cfg.rules[0].name, "test");
    }

    #[test]
    fn test_default_config() {
        let cfg = default_config();
        assert!(cfg.download_dir.contains("Downloads"));
        assert_eq!(cfg.service_enabled, Some(true));
        assert!(!cfg.rules.is_empty());
        assert!(cfg.rules.iter().any(|r| r.name == "Images"));
    }
}
