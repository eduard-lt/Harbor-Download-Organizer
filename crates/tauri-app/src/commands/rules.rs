use crate::commands::settings::{internal_start_service, internal_stop_service};
use crate::state::AppState;
use harbor_core::downloads::DownloadsConfig;
use harbor_core::types::Rule;

use serde::{Deserialize, Serialize};
use std::fs;
use tauri::State;

/// Frontend-facing rule representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleDto {
    /// Rule name (used as ID)
    pub id: String,
    /// Display name
    pub name: String,
    /// File extensions this rule applies to
    pub extensions: Vec<String>,
    /// Optional regex pattern for filename matching
    pub pattern: Option<String>,
    /// Minimum file size in bytes
    pub min_size_bytes: Option<u64>,
    /// Maximum file size in bytes
    pub max_size_bytes: Option<u64>,
    /// Target directory for matched files
    pub destination: String,
    /// Whether to create a symlink in the original location
    pub create_symlink: bool,
    /// Whether the rule is enabled
    pub enabled: bool,
    /// Icon name (derived from first extension)
    pub icon: String,
    /// Icon color
    pub icon_color: String,
}

impl From<&Rule> for RuleDto {
    fn from(rule: &Rule) -> Self {
        let icon = derive_icon(rule.extensions.as_ref());
        let icon_color = derive_icon_color(rule.extensions.as_ref());

        RuleDto {
            id: rule.name.clone(),
            name: rule.name.clone(),
            extensions: rule
                .extensions
                .clone()
                .unwrap_or_default()
                .into_iter()
                .map(|e| format!(".{}", e))
                .collect(),
            pattern: rule.pattern.clone(),
            min_size_bytes: rule.min_size_bytes,
            max_size_bytes: rule.max_size_bytes,
            destination: rule.target_dir.clone(),
            create_symlink: rule.create_symlink.unwrap_or(false),
            enabled: rule.enabled.unwrap_or(true),
            icon,
            icon_color,
        }
    }
}

fn derive_icon(extensions: Option<&Vec<String>>) -> String {
    let ext = extensions
        .and_then(|e| e.first())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "tiff" | "heic" | "avif" => {
            "image".to_string()
        }
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "webm" => "movie".to_string(),
        "mp3" | "flac" | "wav" | "aac" | "ogg" => "music_note".to_string(),
        "pdf" | "doc" | "docx" | "txt" | "rtf" => "description".to_string(),
        "xls" | "xlsx" | "csv" => "table_chart".to_string(),
        "ppt" | "pptx" => "slideshow".to_string(),
        "zip" | "rar" | "7z" | "tar" | "gz" | "xz" => "folder_zip".to_string(),
        "exe" | "msi" | "msix" | "dmg" | "pkg" | "apk" => "install_desktop".to_string(),
        "iso" => "album".to_string(),
        "torrent" => "download".to_string(),
        "html" | "htm" => "web".to_string(),
        "json" | "xml" | "yaml" | "yml" => "code".to_string(),
        "srt" | "vtt" => "subtitles".to_string(),
        _ => "insert_drive_file".to_string(),
    }
}

fn derive_icon_color(extensions: Option<&Vec<String>>) -> String {
    let ext = extensions
        .and_then(|e| e.first())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "tiff" | "heic" | "avif" => {
            "indigo".to_string()
        }
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "webm" => "purple".to_string(),
        "mp3" | "flac" | "wav" | "aac" | "ogg" => "pink".to_string(),
        "pdf" | "doc" | "docx" | "txt" | "rtf" | "xls" | "xlsx" | "csv" | "ppt" | "pptx" => {
            "amber".to_string()
        }
        "zip" | "rar" | "7z" | "tar" | "gz" | "xz" => "slate".to_string(),
        "exe" | "msi" | "msix" | "dmg" | "pkg" | "apk" => "red".to_string(),
        _ => "slate".to_string(),
    }
}

fn save_config(state: &AppState, config: &DownloadsConfig) -> Result<(), String> {
    let yaml =
        serde_yaml::to_string(config).map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&state.config_path, yaml).map_err(|e| format!("Failed to write config: {}", e))?;
    Ok(())
}

fn restart_service_if_running(state: &AppState) -> Result<(), String> {
    let flag_guard = state.watcher_flag.lock().map_err(|e| e.to_string())?;
    let is_running = flag_guard.is_some();
    drop(flag_guard);

    if is_running {
        internal_stop_service(state)?;
        internal_start_service(state)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_rules(state: State<'_, AppState>) -> Result<Vec<RuleDto>, String> {
    impl_get_rules(&state).await
}

pub async fn impl_get_rules(state: &AppState) -> Result<Vec<RuleDto>, String> {
    let config = state.config.read().map_err(|e| e.to_string())?;
    Ok(config.rules.iter().map(RuleDto::from).collect())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn create_rule(
    state: State<'_, AppState>,
    name: String,
    extensions: Vec<String>,
    destination: String,
    pattern: Option<String>,
    min_size_bytes: Option<u64>,
    max_size_bytes: Option<u64>,
    create_symlink: Option<bool>,
    enabled: Option<bool>,
) -> Result<RuleDto, String> {
    impl_create_rule(
        &state,
        name,
        extensions,
        destination,
        pattern,
        min_size_bytes,
        max_size_bytes,
        create_symlink,
        enabled,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
pub async fn impl_create_rule(
    state: &AppState,
    name: String,
    extensions: Vec<String>,
    destination: String,
    pattern: Option<String>,
    min_size_bytes: Option<u64>,
    max_size_bytes: Option<u64>,
    create_symlink: Option<bool>,
    enabled: Option<bool>,
) -> Result<RuleDto, String> {
    let new_rule = {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        // Check if rule with this name already exists
        if config.rules.iter().any(|r| r.name == name) {
            return Err(format!("Rule with name '{}' already exists", name));
        }

        // Convert extensions: remove leading dots if present
        let extensions: Vec<String> = extensions
            .into_iter()
            .map(|e| e.trim_start_matches('.').to_string())
            .filter(|e| !e.is_empty())
            .collect();

        let rule = Rule {
            name: name.clone(),
            extensions: if extensions.is_empty() {
                None
            } else {
                Some(extensions)
            },
            pattern,
            min_size_bytes,
            max_size_bytes,
            target_dir: destination,
            create_symlink,
            enabled,
        };

        config.rules.push(rule.clone());
        save_config(state, &config)?;
        rule
    };

    restart_service_if_running(state)?;

    Ok(RuleDto::from(&new_rule))
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn update_rule(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    extensions: Option<Vec<String>>,
    destination: Option<String>,
    pattern: Option<String>,
    min_size_bytes: Option<u64>,
    max_size_bytes: Option<u64>,
    create_symlink: Option<bool>,
    enabled: Option<bool>,
) -> Result<RuleDto, String> {
    impl_update_rule(
        &state,
        id,
        name,
        extensions,
        destination,
        pattern,
        min_size_bytes,
        max_size_bytes,
        create_symlink,
        enabled,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
pub async fn impl_update_rule(
    state: &AppState,
    id: String,
    name: Option<String>,
    extensions: Option<Vec<String>>,
    destination: Option<String>,
    pattern: Option<String>,
    min_size_bytes: Option<u64>,
    max_size_bytes: Option<u64>,
    create_symlink: Option<bool>,
    enabled: Option<bool>,
) -> Result<RuleDto, String> {
    let updated = {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        let rule = config
            .rules
            .iter_mut()
            .find(|r| r.name == id)
            .ok_or_else(|| format!("Rule '{}' not found", id))?;

        if let Some(new_name) = name {
            rule.name = new_name;
        }
        if let Some(exts) = extensions {
            let exts: Vec<String> = exts
                .into_iter()
                .map(|e| e.trim_start_matches('.').to_string())
                .filter(|e| !e.is_empty())
                .collect();
            rule.extensions = if exts.is_empty() { None } else { Some(exts) };
        }
        if let Some(dest) = destination {
            rule.target_dir = dest;
        }
        if pattern.is_some() {
            rule.pattern = pattern;
        }
        if min_size_bytes.is_some() {
            rule.min_size_bytes = min_size_bytes;
        }
        if max_size_bytes.is_some() {
            rule.max_size_bytes = max_size_bytes;
        }
        if let Some(symlink) = create_symlink {
            rule.create_symlink = Some(symlink);
        }
        if let Some(en) = enabled {
            rule.enabled = Some(en);
        }

        let updated = RuleDto::from(&*rule);
        save_config(state, &config)?;
        updated
    };

    restart_service_if_running(state)?;

    Ok(updated)
}

#[tauri::command]
pub async fn delete_rule(state: State<'_, AppState>, rule_name: String) -> Result<(), String> {
    impl_delete_rule(&state, rule_name).await
}

pub async fn impl_delete_rule(state: &AppState, rule_name: String) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        let original_len = config.rules.len();
        config.rules.retain(|r| r.name != rule_name);

        if config.rules.len() == original_len {
            return Err(format!("Rule '{}' not found", rule_name));
        }

        save_config(state, &config)?;
    }
    restart_service_if_running(state)?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_rule(
    state: State<'_, AppState>,
    rule_name: String,
    enabled: bool,
) -> Result<(), String> {
    impl_toggle_rule(&state, rule_name, enabled).await
}

pub async fn impl_toggle_rule(
    state: &AppState,
    rule_name: String,
    enabled: bool,
) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        let rule = config
            .rules
            .iter_mut()
            .find(|r| r.name == rule_name)
            .ok_or_else(|| format!("Rule '{}' not found", rule_name))?;

        rule.enabled = Some(enabled);
        save_config(state, &config)?;
    }
    restart_service_if_running(state)?;

    Ok(())
}

#[tauri::command]
pub async fn reorder_rules(
    state: State<'_, AppState>,
    rule_names: Vec<String>,
) -> Result<(), String> {
    impl_reorder_rules(&state, rule_names).await
}

pub async fn impl_reorder_rules(state: &AppState, rule_names: Vec<String>) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        // Reorder rules based on the provided order
        let mut new_rules: Vec<Rule> = Vec::with_capacity(rule_names.len());

        for name in &rule_names {
            if let Some(rule) = config.rules.iter().find(|r| &r.name == name).cloned() {
                new_rules.push(rule);
            }
        }

        // Add any rules that weren't in the provided list (shouldn't happen, but safety first)
        for rule in &config.rules {
            if !rule_names.contains(&rule.name) {
                new_rules.push(rule.clone());
            }
        }

        config.rules = new_rules;
        save_config(state, &config)?;
    }
    restart_service_if_running(state)?;

    Ok(())
}

#[tauri::command]
pub async fn get_download_dir(state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.read().map_err(|e| e.to_string())?;
    Ok(config.download_dir.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_icon() {
        assert_eq!(derive_icon(Some(&vec!["jpg".to_string()])), "image");
        assert_eq!(derive_icon(Some(&vec!["mp4".to_string()])), "movie");
        assert_eq!(derive_icon(Some(&vec!["mp3".to_string()])), "music_note");
        assert_eq!(derive_icon(Some(&vec!["pdf".to_string()])), "description");
        assert_eq!(derive_icon(Some(&vec!["xlsx".to_string()])), "table_chart");
        assert_eq!(derive_icon(Some(&vec!["zip".to_string()])), "folder_zip");
        assert_eq!(
            derive_icon(Some(&vec!["exe".to_string()])),
            "install_desktop"
        );
        assert_eq!(
            derive_icon(Some(&vec!["unknown".to_string()])),
            "insert_drive_file"
        );
        assert_eq!(derive_icon(None), "insert_drive_file");
    }

    #[test]
    fn test_derive_icon_color() {
        assert_eq!(derive_icon_color(Some(&vec!["jpg".to_string()])), "indigo");
        assert_eq!(derive_icon_color(Some(&vec!["mp4".to_string()])), "purple");
        assert_eq!(derive_icon_color(Some(&vec!["mp3".to_string()])), "pink");
        assert_eq!(derive_icon_color(Some(&vec!["pdf".to_string()])), "amber");
        assert_eq!(derive_icon_color(Some(&vec!["zip".to_string()])), "slate");
        assert_eq!(derive_icon_color(Some(&vec!["exe".to_string()])), "red");
        assert_eq!(
            derive_icon_color(Some(&vec!["unknown".to_string()])),
            "slate"
        );
        assert_eq!(derive_icon_color(None), "slate");
    }

    use tempfile::tempdir;

    fn create_test_state() -> (AppState, tempfile::TempDir) {
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
        let yaml = serde_yaml::to_string(&config).unwrap();
        std::fs::write(&cfg_path, yaml).unwrap();

        (AppState::new(cfg_path, config), tmp)
    }

    #[tokio::test]
    async fn test_create_rule() {
        let (state, _tmp) = create_test_state();

        let rule = impl_create_rule(
            &state,
            "New Rule".to_string(),
            vec!["txt".to_string()],
            "Target".to_string(),
            None,
            None,
            None,
            None,
            None,
        )
        .await;

        assert!(rule.is_ok());
        let rule = rule.unwrap();
        assert_eq!(rule.name, "New Rule");

        // Verify it's in config
        let rules = impl_get_rules(&state).await.unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].name, "New Rule");

        // Duplicate name should fail
        let res = impl_create_rule(
            &state,
            "New Rule".to_string(),
            vec!["txt".to_string()],
            "Target".to_string(),
            None,
            None,
            None,
            None,
            None,
        )
        .await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_update_rule() {
        let (state, _tmp) = create_test_state();

        let _ = impl_create_rule(
            &state,
            "Rule1".to_string(),
            vec!["txt".to_string()],
            "Target".to_string(),
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        let updated = impl_update_rule(
            &state,
            "Rule1".to_string(),
            Some("Rule1_Updated".to_string()),
            Some(vec!["md".to_string()]),
            Some("NewTarget".to_string()),
            None,
            None,
            None,
            None,
            None,
        )
        .await;

        assert!(updated.is_ok());
        let u = updated.unwrap();
        assert_eq!(u.name, "Rule1_Updated");
        assert_eq!(u.destination, "NewTarget");
        assert!(u.extensions.contains(&".md".to_string()));

        // Verify config
        let rules = impl_get_rules(&state).await.unwrap();
        assert_eq!(rules.len(), 1);
        assert_eq!(rules[0].name, "Rule1_Updated");
    }

    #[tokio::test]
    async fn test_delete_rule() {
        let (state, _tmp) = create_test_state();

        impl_create_rule(
            &state,
            "To Delete".to_string(),
            vec![],
            "".to_string(),
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        let res = impl_delete_rule(&state, "To Delete".to_string()).await;
        assert!(res.is_ok());

        let rules = impl_get_rules(&state).await.unwrap();
        assert!(rules.is_empty());

        // Delete non-existent
        let res = impl_delete_rule(&state, "NonExistent".to_string()).await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_toggle_rule() {
        let (state, _tmp) = create_test_state();

        impl_create_rule(
            &state,
            "ToggleMe".to_string(),
            vec![],
            "".to_string(),
            None,
            None,
            None,
            None,
            Some(true),
        )
        .await
        .unwrap();

        impl_toggle_rule(&state, "ToggleMe".to_string(), false)
            .await
            .unwrap();

        let rules = impl_get_rules(&state).await.unwrap();
        assert!(!rules[0].enabled);
    }

    #[tokio::test]
    async fn test_reorder_rules() {
        let (state, _tmp) = create_test_state();

        impl_create_rule(
            &state,
            "A".into(),
            vec![],
            "".into(),
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();
        impl_create_rule(
            &state,
            "B".into(),
            vec![],
            "".into(),
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();
        impl_create_rule(
            &state,
            "C".into(),
            vec![],
            "".into(),
            None,
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();

        let order = vec!["C".to_string(), "A".to_string(), "B".to_string()];
        impl_reorder_rules(&state, order).await.unwrap();

        let rules = impl_get_rules(&state).await.unwrap();
        assert_eq!(rules[0].name, "C");
        assert_eq!(rules[1].name, "A");
        assert_eq!(rules[2].name, "B");
    }
}
