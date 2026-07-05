use crate::types::{new_rule_id, Rule};
use anyhow::{Context, Result};

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;

#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::time::{Duration, SystemTime};

/// Returns the Harbor application data directory (cross-platform).
/// - macOS: `$HOME/Library/Application Support/Harbor`
/// - Windows: `%LOCALAPPDATA%\Harbor`
pub fn harbor_app_dir() -> PathBuf {
    crate::platform::app_data_dir()
}

/// Returns the path to the recent moves log file:
/// `<app_data_dir>/recent_moves.log`
pub fn harbor_log_path() -> PathBuf {
    harbor_app_dir().join("recent_moves.log")
}

/// A `Rule` with its regex pattern pre-compiled once for efficient reuse.
struct CompiledRule<'a> {
    rule: &'a Rule,
    /// `None` → no pattern on this rule (skip regex check).
    /// `Some(Ok(re))` → valid compiled regex.
    /// `Some(Err(_))` → pattern exists but is invalid; this rule must be skipped.
    compiled_pattern: Option<Result<Regex, regex::Error>>,
}

impl<'a> CompiledRule<'a> {
    fn new(rule: &'a Rule) -> Self {
        let compiled_pattern = rule.pattern.as_deref().map(Regex::new);
        Self {
            rule,
            compiled_pattern,
        }
    }
}

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

#[derive(Debug, Clone)]
pub struct OrganizeResult {
    pub source: PathBuf,
    pub destination: PathBuf,
    pub rule_name: String,
    pub symlink_info: Option<String>,
}

/// Summary returned by [`organize_once`], containing both successfully moved files
/// and any per-file errors that occurred during the pass.
#[derive(Debug, Default)]
pub struct OrganizeSummary {
    pub moved: Vec<OrganizeResult>,
    pub errors: Vec<String>,
}

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
    let dl = crate::platform::downloads_dir();
    let dl_str = dl.to_string_lossy().to_string();
    let pictures = dl.join("Images");
    let videos = dl.join("Videos");
    let music = dl.join("Music");
    let docs = dl.join("Documents");
    let archives = dl.join("Archives");
    let installers = dl.join("Installers");
    let torrents = dl.join("Torrents");
    let isos = dl.join("ISOs");
    let dev = dl.join("Dev");
    let subtitles = dl.join("Subtitles");
    let webpages = dl.join("Webpages");

    DownloadsConfig {
        download_dir: dl_str,
        min_age_secs: Some(5),
        tutorial_completed: Some(false),
        service_enabled: Some(true),
        check_updates: Some(true),
        last_notified_version: None,
        rules: vec![
            Rule {
                id: new_rule_id(),
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
                target_dir: pictures.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
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
                target_dir: videos.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
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
                target_dir: music.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
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
                target_dir: archives.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
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
                target_dir: docs.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
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
                target_dir: installers.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
                name: "ISOs".to_string(),
                extensions: Some(["iso"].iter().map(|s| s.to_string()).collect()),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: isos.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
                name: "Torrents".to_string(),
                extensions: Some(["torrent"].iter().map(|s| s.to_string()).collect()),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: torrents.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
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
                target_dir: dev.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
                name: "Web Pages".to_string(),
                extensions: Some(["html", "htm"].iter().map(|s| s.to_string()).collect()),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: webpages.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
            },
            Rule {
                id: new_rule_id(),
                name: "Subtitles".to_string(),
                extensions: Some(["srt", "vtt"].iter().map(|s| s.to_string()).collect()),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: subtitles.to_string_lossy().to_string(),
                create_symlink: false,
                enabled: true,
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
        || lower.ends_with(".opdownload")
}

fn matches_rule(path: &Path, meta: &fs::Metadata, compiled: &CompiledRule<'_>) -> bool {
    let rule = compiled.rule;
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
    match &compiled.compiled_pattern {
        None => {}
        Some(Err(_)) => {
            // Pattern exists but failed to compile — skip this rule entirely.
            return false;
        }
        Some(Ok(re)) => {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
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
/// Computes a priority score for a rule based on its position and modifiers.
/// - Base score = `total - index` (top rule = highest base, bottom = 1)
/// - Each modifier (+1 for regex pattern, +1 for size constraints) adds `total` points,
///   guaranteeing that a single modifier pushes a bottom rule above all non-modified rules.
fn rule_priority(index: usize, total: usize, rule: &Rule) -> usize {
    let base = total.saturating_sub(index);
    let mut modifiers: usize = 0;
    if rule.pattern.is_some() {
        modifiers += 1;
    }
    if rule.min_size_bytes.is_some() || rule.max_size_bytes.is_some() {
        modifiers += 1;
    }
    base + modifiers * total
}

pub fn organize_once(cfg: &DownloadsConfig) -> Result<OrganizeSummary> {
    let base = PathBuf::from(&cfg.download_dir);
    let min_age = Duration::from_secs(cfg.min_age_secs.unwrap_or(5));
    let mut summary = OrganizeSummary::default();

    // Pre-compile each rule's regex pattern once for this pass, then sort by priority.
    let mut compiled_rules: Vec<(usize, CompiledRule<'_>)> = cfg
        .rules
        .iter()
        .enumerate()
        .map(|(i, r)| (i, CompiledRule::new(r)))
        .collect();
    let total = compiled_rules.len();
    compiled_rules.sort_by_key(|(i, cr)| std::cmp::Reverse(rule_priority(*i, total, cr.rule)));

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

            // Check for corresponding partial files. Browsers often create the target file
            // as a placeholder while downloading into a temporary (.part, .crdownload, etc.) file.
            let part_path = path.with_file_name(format!("{}.part", name));
            let cr_path = path.with_file_name(format!("{}.crdownload", name));
            let tmp_path = path.with_file_name(format!("{}.tmp", name));
            let dl_path = path.with_file_name(format!("{}.download", name));
            let op_path = path.with_file_name(format!("{}.opdownload", name));

            if part_path.exists()
                || cr_path.exists()
                || tmp_path.exists()
                || dl_path.exists()
                || op_path.exists()
            {
                continue;
            }
        }

        // Ensure we don't move 0-byte placeholders created by browsers
        if meta.len() == 0 {
            continue;
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
        for (_, compiled) in &compiled_rules {
            // Skip disabled rules
            if !compiled.rule.enabled {
                continue;
            }
            if matches_rule(&path, &meta, compiled) {
                let target_dir = PathBuf::from(&compiled.rule.target_dir);
                ensure_dir(&target_dir)?;
                let target = target_dir.join(
                    path.file_name()
                        .map(|n| n.to_os_string())
                        .unwrap_or_default(),
                );
                let target = unique_target(&target);
                applied = Some((compiled.rule, target));
                break;
            }
        }
        if let Some((rule, target)) = applied {
            if let Err(e) = fs::rename(&path, &target) {
                summary.errors.push(format!(
                    "Failed to move '{}' to '{}': {e}",
                    path.display(),
                    target.display()
                ));
                continue;
            }

            let mut symlink_info = None;
            if rule.create_symlink {
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

            summary.moved.push(OrganizeResult {
                source: path,
                destination: target.clone(),
                rule_name: rule.name.clone(),
                symlink_info,
            });
        }
    }
    Ok(summary)
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
            return Ok(());
        }
        match organize_once(cfg) {
            Ok(summary) => {
                for err in &summary.errors {
                    eprintln!("[Harbor] {err}");
                }
                if !summary.moved.is_empty() {
                    callback(&summary.moved);
                }
            }
            Err(e) => eprintln!("organize error: {}", e),
        }
        // Sleep in small chunks so we can respond to stop signals quickly
        // instead of being stuck in one long sleep that blocks thread join.
        let chunk = Duration::from_millis(500);
        let mut remaining = Duration::from_secs(interval_secs);
        while remaining > Duration::ZERO {
            if !should_continue.load(Ordering::Relaxed) {
                return Ok(());
            }
            let sleep_time = chunk.min(remaining);
            thread::sleep(sleep_time);
            remaining = remaining.saturating_sub(sleep_time);
        }
    }
}

/// Expands environment variables in a string.
///
/// Supports:
/// - Windows style: `%VAR%`
/// - POSIX style: `$VAR`, `${VAR}`
/// - Tilde expansion: `~/` → `$HOME/`
fn expand_env(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let chars: Vec<char> = input.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        let ch = chars[i];

        // Windows-style %VAR%
        if ch == '%' {
            if let Some(end) = input[i + 1..].find('%') {
                let var_name = &input[i + 1..i + 1 + end];
                if !var_name.is_empty() {
                    let value = std::env::var(var_name).unwrap_or_default();
                    result.push_str(&value);
                    i = i + 1 + end + 1; // skip past closing '%'
                    continue;
                }
            }
            result.push(ch);
            i += 1;
            continue;
        }

        // Tilde expansion: ~/ or ~ at end
        if ch == '~' {
            let next_is_slash = i + 1 < len && chars[i + 1] == '/';
            let is_end = i + 1 == len;
            if next_is_slash || is_end {
                let home = std::env::var("HOME").unwrap_or_default();
                result.push_str(&home);
                i += 1; // skip the '~'
                continue;
            }
        }

        // POSIX-style $VAR or ${VAR}
        if ch == '$' && i + 1 < len {
            let next = chars[i + 1];
            // ${VAR}
            if next == '{' {
                if let Some(close) = input[i + 2..].find('}') {
                    let var_name = &input[i + 2..i + 2 + close];
                    if !var_name.is_empty() {
                        let value = std::env::var(var_name).unwrap_or_default();
                        result.push_str(&value);
                        i = i + 2 + close + 1; // skip past closing '}'
                        continue;
                    }
                }
                result.push(ch);
                i += 1;
                continue;
            }
            // $VAR — consume while next char is alphanumeric or underscore
            if next.is_ascii_alphabetic() || next == '_' {
                let start = i + 1;
                let mut end = start;
                while end < len && (chars[end].is_ascii_alphanumeric() || chars[end] == '_') {
                    end += 1;
                }
                let var_name: String = chars[start..end].iter().collect();
                if !var_name.is_empty() {
                    let value = std::env::var(&var_name).unwrap_or_default();
                    result.push_str(&value);
                    i = end;
                    continue;
                }
            }
        }

        result.push(ch);
        i += 1;
    }

    result
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
    fn test_expand_env_windows() {
        std::env::set_var("TEST_VAR", "world");
        assert_eq!(expand_env("Hello %TEST_VAR%"), "Hello world");
        assert_eq!(expand_env("%TEST_VAR%"), "world");
        assert_eq!(expand_env("No vars"), "No vars");
        assert_eq!(expand_env("Unknown %MISSING_VAR%"), "Unknown ");
    }

    #[test]
    fn test_expand_env_posix_dollar() {
        std::env::set_var("MY_PATH", "/usr/local/bin");
        assert_eq!(expand_env("path: $MY_PATH"), "path: /usr/local/bin");
        assert_eq!(expand_env("$MY_PATH/tools"), "/usr/local/bin/tools");
        assert_eq!(expand_env("$UNKNOWN_VAR"), "");
    }

    #[test]
    fn test_expand_env_posix_brace() {
        std::env::set_var("MY_PATH", "/usr/local/bin");
        assert_eq!(expand_env("path: ${MY_PATH}"), "path: /usr/local/bin");
        assert_eq!(expand_env("${MY_PATH}/tools"), "/usr/local/bin/tools");
        assert_eq!(expand_env("${UNKNOWN}"), "");
    }

    #[test]
    fn test_expand_env_tilde() {
        let home = std::env::var("HOME").unwrap_or_default();
        assert_eq!(expand_env("~/Documents"), format!("{home}/Documents"));
        assert_eq!(expand_env("~"), home);
    }

    #[test]
    fn test_expand_env_mixed() {
        std::env::set_var("TEST_VAR", "world");
        std::env::set_var("MY_PATH", "/usr/local/bin");
        assert_eq!(expand_env("%TEST_VAR% $MY_PATH"), "world /usr/local/bin");
    }

    #[test]
    fn test_expand_env_non_ascii() {
        // Paths with non-ASCII chars in the non-variable portion should pass through unchanged
        let input = "C:\\Utilisateurs\\Édouard\\Documents";
        let result = expand_env(input);
        assert_eq!(result, input);
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
            id: "ext-rule".to_string(),
            name: "Ext".into(),
            extensions: Some(vec!["png".into()]),
            pattern: None,
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".into(),
            create_symlink: false,
            enabled: true,
        };
        assert!(matches_rule(
            &file_path,
            &meta,
            &CompiledRule::new(&rule_ext)
        ));

        let rule_pat = Rule {
            id: "pat-rule".to_string(),
            name: "Pat".into(),
            extensions: None,
            pattern: Some(".*st\\.png".into()),
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".into(),
            create_symlink: false,
            enabled: true,
        };
        assert!(matches_rule(
            &file_path,
            &meta,
            &CompiledRule::new(&rule_pat)
        ));

        let rule_size = Rule {
            id: "size-rule".to_string(),
            name: "Size".into(),
            extensions: None,
            pattern: None,
            min_size_bytes: Some(2),
            max_size_bytes: Some(10),
            target_dir: "target".into(),
            create_symlink: false,
            enabled: true,
        };
        assert!(matches_rule(
            &file_path,
            &meta,
            &CompiledRule::new(&rule_size)
        ));

        let rule_fail = Rule {
            id: "fail-rule".to_string(),
            name: "Fail".into(),
            extensions: Some(vec!["jpg".into()]),
            pattern: None,
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".into(),
            create_symlink: false,
            enabled: true,
        };
        assert!(!matches_rule(
            &file_path,
            &meta,
            &CompiledRule::new(&rule_fail)
        ));

        // Invalid regex must NOT silently match — it should be skipped (false).
        let rule_bad_re = Rule {
            id: "bad-re-rule".to_string(),
            name: "BadRe".into(),
            extensions: None,
            pattern: Some("[invalid regex".into()),
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".into(),
            create_symlink: false,
            enabled: true,
        };
        assert!(!matches_rule(
            &file_path,
            &meta,
            &CompiledRule::new(&rule_bad_re)
        ));
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
                id: "images-rule".to_string(),
                name: "Images".into(),
                extensions: Some(vec!["png".into()]),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: target.to_str().unwrap().into(),
                create_symlink: false,
                enabled: true,
            }],
        };

        // Run
        let summary = organize_once(&cfg).unwrap();
        assert_eq!(summary.moved.len(), 1);
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
                id: "images-cleanup-rule".to_string(),
                name: "Images".into(),
                extensions: None,
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                target_dir: target.to_str().unwrap().into(),
                create_symlink: false,
                enabled: true,
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

    #[test]
    fn test_rule_priority_scoring() {
        let total = 5;

        // Top rule (index 0), no modifiers → base = 5
        let rule_no_mod = Rule {
            id: "a".into(),
            name: "a".into(),
            extensions: Some(vec!["txt".into()]),
            pattern: None,
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "t".into(),
            create_symlink: false,
            enabled: true,
        };
        assert_eq!(rule_priority(0, total, &rule_no_mod), 5);

        // Bottom rule (index 4), no modifiers → base = 1
        assert_eq!(rule_priority(4, total, &rule_no_mod), 1);

        // Bottom rule (index 4), with regex → 1 + 5 = 6
        let rule_regex = Rule {
            id: "b".into(),
            name: "b".into(),
            extensions: Some(vec!["txt".into()]),
            pattern: Some("test".into()),
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "t".into(),
            create_symlink: false,
            enabled: true,
        };
        assert_eq!(rule_priority(4, total, &rule_regex), 6);

        // Bottom rule (index 4), with regex + size → 1 + 10 = 11
        let rule_both = Rule {
            id: "c".into(),
            name: "c".into(),
            extensions: Some(vec!["txt".into()]),
            pattern: Some("test".into()),
            min_size_bytes: Some(1024),
            max_size_bytes: None,
            target_dir: "t".into(),
            create_symlink: false,
            enabled: true,
        };
        assert_eq!(rule_priority(4, total, &rule_both), 11);
    }

    #[test]
    fn test_organize_regex_rule_wins_over_extension_only() {
        let root = TempDir::new().unwrap();
        let dl = root.path().join("Downloads");
        let images = root.path().join("Images");
        let social = root.path().join("SocialMedia");
        fs::create_dir(&dl).unwrap();

        // Create broll.jpg
        let broll_path = dl.join("broll.jpg");
        {
            let mut f = fs::File::create(&broll_path).unwrap();
            f.write_all(b"broll data").unwrap();
        }

        // Create wallpaper.png
        let wp_path = dl.join("wallpaper.png");
        {
            let mut f = fs::File::create(&wp_path).unwrap();
            f.write_all(b"wallpaper data").unwrap();
        }

        let cfg = DownloadsConfig {
            download_dir: dl.to_str().unwrap().into(),
            min_age_secs: Some(0),
            tutorial_completed: None,
            service_enabled: None,
            check_updates: None,
            last_notified_version: None,
            rules: vec![
                // Rule 1 (top): Images — no regex, matches jpg/png
                Rule {
                    id: "images-rule".into(),
                    name: "Images".into(),
                    extensions: Some(vec!["jpg".into(), "png".into()]),
                    pattern: None,
                    min_size_bytes: None,
                    max_size_bytes: None,
                    target_dir: images.to_str().unwrap().into(),
                    create_symlink: false,
                    enabled: true,
                },
                // Rule 2 (bottom): Broll — regex pattern for "broll"
                Rule {
                    id: "broll-rule".into(),
                    name: "Broll".into(),
                    extensions: Some(vec!["jpg".into(), "png".into()]),
                    pattern: Some("broll".into()),
                    min_size_bytes: None,
                    max_size_bytes: None,
                    target_dir: social.to_str().unwrap().into(),
                    create_symlink: false,
                    enabled: true,
                },
            ],
        };

        let summary = organize_once(&cfg).unwrap();
        assert_eq!(summary.moved.len(), 2);

        // broll.jpg → should go to SocialMedia (regex rule wins despite being position 2)
        assert!(!broll_path.exists());
        assert!(social.join("broll.jpg").exists());

        // wallpaper.png → should go to Images (regex rule checked first but doesn't match)
        assert!(!wp_path.exists());
        assert!(images.join("wallpaper.png").exists());
    }
}
