use crate::commands::settings::{internal_start_service, internal_stop_service};
use crate::state::AppState;
use harbor_core::downloads::DownloadsConfig;
use harbor_core::types::Rule;

use serde::{Deserialize, Serialize};
use std::fs;
use tauri::State;

#[derive(Debug, Clone, PartialEq)]
pub enum NullableField<T> {
    Missing,
    Null,
    Value(T),
}

impl<T> Default for NullableField<T> {
    fn default() -> Self {
        Self::Missing
    }
}

impl<T> NullableField<T> {
    fn is_provided(&self) -> bool {
        !matches!(self, Self::Missing)
    }
}

impl<'de, T> serde::Deserialize<'de> for NullableField<T>
where
    T: serde::Deserialize<'de>,
{
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = Option::<T>::deserialize(deserializer)?;
        Ok(match value {
            Some(v) => Self::Value(v),
            None => Self::Null,
        })
    }
}

/// Request struct for creating a new rule
#[derive(Debug, serde::Deserialize)]
pub struct CreateRuleRequest {
    pub name: String,
    pub extensions: Vec<String>,
    pub destination: String,
    pub pattern: Option<String>,
    pub min_size_bytes: Option<u64>,
    pub max_size_bytes: Option<u64>,
    pub create_symlink: Option<bool>,
    pub enabled: Option<bool>,
}

/// Request struct for updating an existing rule
#[derive(Debug, serde::Deserialize)]
pub struct UpdateRuleRequest {
    pub id: String,
    pub name: Option<String>,
    #[serde(default)]
    pub extensions: NullableField<Vec<String>>,
    pub destination: Option<String>,
    #[serde(default)]
    pub pattern: NullableField<String>,
    #[serde(default)]
    pub min_size_bytes: NullableField<u64>,
    #[serde(default)]
    pub max_size_bytes: NullableField<u64>,
    pub create_symlink: Option<bool>,
    pub enabled: Option<bool>,
}

/// Frontend-facing rule representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleDto {
    /// Unique rule identifier (UUID)
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
        let ext = rule
            .extensions
            .as_ref()
            .and_then(|e| e.first())
            .map(|s| s.to_lowercase())
            .unwrap_or_default();
        let (icon, icon_color) = super::ui_helpers::derive_file_icon_and_color(&ext);

        RuleDto {
            id: rule.id.clone(),
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
            create_symlink: rule.create_symlink,
            enabled: rule.enabled,
            icon,
            icon_color,
        }
    }
}

fn save_config(state: &AppState, config: &DownloadsConfig) -> Result<(), String> {
    let yaml =
        serde_yaml::to_string(config).map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&state.config_path, yaml).map_err(|e| format!("Failed to write config: {}", e))?;
    Ok(())
}

#[derive(Serialize)]
struct ValidationErrorResponse {
    code: &'static str,
    message: String,
    fields: Vec<&'static str>,
}

fn validation_error(message: impl Into<String>, fields: Vec<&'static str>) -> String {
    serde_json::to_string(&ValidationErrorResponse {
        code: "validation_error",
        message: message.into(),
        fields,
    })
    .unwrap_or_else(|_| {
        "{\"code\":\"validation_error\",\"message\":\"Validation failed\"}".to_string()
    })
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
pub async fn create_rule(
    state: State<'_, AppState>,
    rule: CreateRuleRequest,
) -> Result<RuleDto, String> {
    impl_create_rule(&state, rule).await
}

pub async fn impl_create_rule(
    state: &AppState,
    rule: CreateRuleRequest,
) -> Result<RuleDto, String> {
    let new_rule = {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        // Check if rule with this name already exists
        if config.rules.iter().any(|r| r.name == rule.name) {
            return Err(format!("Rule with name '{}' already exists", rule.name));
        }

        // Convert extensions: remove leading dots if present
        let extensions: Vec<String> = rule
            .extensions
            .into_iter()
            .map(|e| e.trim_start_matches('.').to_string())
            .filter(|e| !e.is_empty())
            .collect();

        let new = Rule {
            id: harbor_core::types::new_rule_id(),
            name: rule.name.clone(),
            extensions: if extensions.is_empty() {
                None
            } else {
                Some(extensions)
            },
            pattern: rule.pattern,
            min_size_bytes: rule.min_size_bytes,
            max_size_bytes: rule.max_size_bytes,
            target_dir: rule.destination,
            create_symlink: rule.create_symlink.unwrap_or(false),
            enabled: rule.enabled.unwrap_or(true),
        };

        config.rules.push(new.clone());
        save_config(state, &config)?;
        new
    };

    restart_service_if_running(state)?;

    Ok(RuleDto::from(&new_rule))
}

#[tauri::command]
pub async fn update_rule(
    state: State<'_, AppState>,
    rule: UpdateRuleRequest,
) -> Result<RuleDto, String> {
    impl_update_rule(&state, rule).await
}

pub async fn impl_update_rule(
    state: &AppState,
    rule: UpdateRuleRequest,
) -> Result<RuleDto, String> {
    let UpdateRuleRequest {
        id,
        name,
        extensions,
        destination,
        pattern,
        min_size_bytes,
        max_size_bytes,
        create_symlink,
        enabled,
    } = rule;

    let updated = {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        let r = config
            .rules
            .iter_mut()
            .find(|r| r.id == id)
            .ok_or_else(|| format!("Rule '{}' not found", id))?;

        let next_min_size = match min_size_bytes {
            NullableField::Missing => r.min_size_bytes,
            NullableField::Null => None,
            NullableField::Value(value) => Some(value),
        };
        let next_max_size = match max_size_bytes {
            NullableField::Missing => r.max_size_bytes,
            NullableField::Null => None,
            NullableField::Value(value) => Some(value),
        };

        if let (Some(min), Some(max)) = (next_min_size, next_max_size) {
            if min > max {
                return Err(validation_error(
                    "min_size_bytes cannot be greater than max_size_bytes",
                    vec!["min_size_bytes", "max_size_bytes"],
                ));
            }
        }

        if let Some(new_name) = name {
            r.name = new_name;
        }
        if extensions.is_provided() {
            r.extensions = match extensions {
                NullableField::Missing => r.extensions.clone(),
                NullableField::Null => None,
                NullableField::Value(values) => {
                    let normalized: Vec<String> = values
                        .into_iter()
                        .map(|e| e.trim_start_matches('.').to_string())
                        .filter(|e| !e.is_empty())
                        .collect();
                    if normalized.is_empty() { None } else { Some(normalized) }
                }
            };
        }
        if let Some(dest) = destination {
            r.target_dir = dest;
        }
        if pattern.is_provided() {
            r.pattern = match pattern {
                NullableField::Missing => r.pattern.clone(),
                NullableField::Null => None,
                NullableField::Value(next_pattern) => Some(next_pattern),
            };
        }
        if min_size_bytes.is_provided() {
            r.min_size_bytes = next_min_size;
        }
        if max_size_bytes.is_provided() {
            r.max_size_bytes = next_max_size;
        }
        if let Some(symlink) = create_symlink {
            r.create_symlink = symlink;
        }
        if let Some(en) = enabled {
            r.enabled = en;
        }

        let updated = RuleDto::from(&*r);
        save_config(state, &config)?;
        updated
    };

    restart_service_if_running(state)?;

    Ok(updated)
}

#[tauri::command]
pub async fn delete_rule(state: State<'_, AppState>, rule_id: String) -> Result<(), String> {
    impl_delete_rule(&state, rule_id).await
}

pub async fn impl_delete_rule(state: &AppState, rule_id: String) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        let original_len = config.rules.len();
        config.rules.retain(|r| r.id != rule_id);

        if config.rules.len() == original_len {
            return Err(format!("Rule '{}' not found", rule_id));
        }

        save_config(state, &config)?;
    }
    restart_service_if_running(state)?;
    Ok(())
}

#[tauri::command]
pub async fn toggle_rule(
    state: State<'_, AppState>,
    rule_id: String,
    enabled: bool,
) -> Result<(), String> {
    impl_toggle_rule(&state, rule_id, enabled).await
}

pub async fn impl_toggle_rule(
    state: &AppState,
    rule_id: String,
    enabled: bool,
) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        let rule = config
            .rules
            .iter_mut()
            .find(|r| r.id == rule_id)
            .ok_or_else(|| format!("Rule '{}' not found", rule_id))?;

        rule.enabled = enabled;
        save_config(state, &config)?;
    }
    restart_service_if_running(state)?;

    Ok(())
}

#[tauri::command]
pub async fn reorder_rules(
    state: State<'_, AppState>,
    rule_ids: Vec<String>,
) -> Result<(), String> {
    impl_reorder_rules(&state, rule_ids).await
}

pub async fn impl_reorder_rules(state: &AppState, rule_ids: Vec<String>) -> Result<(), String> {
    {
        let mut config = state.config.write().map_err(|e| e.to_string())?;

        // Build a lookup map for O(1) access
        let rule_map: std::collections::HashMap<&str, &Rule> =
            config.rules.iter().map(|r| (r.id.as_str(), r)).collect();

        // Reorder rules based on the provided order
        let mut new_rules: Vec<Rule> = rule_ids
            .iter()
            .filter_map(|id| rule_map.get(id.as_str()).copied().cloned())
            .collect();

        // Add any rules that weren't in the provided list (shouldn't happen, but safety first)
        let rule_ids_set: std::collections::HashSet<&str> =
            rule_ids.iter().map(|s| s.as_str()).collect();
        for rule in &config.rules {
            if !rule_ids_set.contains(rule.id.as_str()) {
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
    use serde_json::json;

    #[test]
    fn test_derive_file_icon_and_color_via_helper() {
        use super::super::ui_helpers::derive_file_icon_and_color;

        assert_eq!(
            derive_file_icon_and_color("jpg"),
            ("image".to_string(), "blue".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("mp4"),
            ("movie".to_string(), "indigo".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("mp3"),
            ("music_note".to_string(), "pink".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("pdf"),
            ("description".to_string(), "red".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("xlsx"),
            ("table_chart".to_string(), "green".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("zip"),
            ("folder_zip".to_string(), "amber".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("exe"),
            ("install_desktop".to_string(), "purple".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("unknown"),
            ("insert_drive_file".to_string(), "slate".to_string())
        );
        // None-equivalent: empty string → fallback
        assert_eq!(
            derive_file_icon_and_color(""),
            ("insert_drive_file".to_string(), "slate".to_string())
        );
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
            CreateRuleRequest {
                name: "New Rule".to_string(),
                extensions: vec!["txt".to_string()],
                destination: "Target".to_string(),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                create_symlink: None,
                enabled: None,
            },
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
            CreateRuleRequest {
                name: "New Rule".to_string(),
                extensions: vec!["txt".to_string()],
                destination: "Target".to_string(),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                create_symlink: None,
                enabled: None,
            },
        )
        .await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_update_rule() {
        let (state, _tmp) = create_test_state();

        let created = impl_create_rule(
            &state,
            CreateRuleRequest {
                name: "Rule1".to_string(),
                extensions: vec!["txt".to_string()],
                destination: "Target".to_string(),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                create_symlink: None,
                enabled: None,
            },
        )
        .await
        .unwrap();

        let updated = impl_update_rule(
            &state,
            UpdateRuleRequest {
                id: created.id.clone(),
                name: Some("Rule1_Updated".to_string()),
                extensions: NullableField::Value(vec!["md".to_string()]),
                destination: Some("NewTarget".to_string()),
                pattern: NullableField::Missing,
                min_size_bytes: NullableField::Missing,
                max_size_bytes: NullableField::Missing,
                create_symlink: None,
                enabled: None,
            },
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
    async fn test_update_rule_explicit_null_clears_optional_fields() {
        let (state, _tmp) = create_test_state();

        let created = impl_create_rule(
            &state,
            CreateRuleRequest {
                name: "RuleToClear".to_string(),
                extensions: vec!["txt".to_string()],
                destination: "Target".to_string(),
                pattern: Some("invoice".to_string()),
                min_size_bytes: Some(10),
                max_size_bytes: Some(100),
                create_symlink: None,
                enabled: None,
            },
        )
        .await
        .unwrap();

        let request: UpdateRuleRequest = serde_json::from_value(json!({
            "id": created.id,
            "pattern": null,
            "min_size_bytes": null,
            "max_size_bytes": null
        }))
        .unwrap();

        let updated = impl_update_rule(&state, request).await.unwrap();
        assert_eq!(updated.pattern, None);
        assert_eq!(updated.min_size_bytes, None);
        assert_eq!(updated.max_size_bytes, None);
    }

    #[tokio::test]
    async fn test_update_rule_rejects_invalid_size_range() {
        let (state, _tmp) = create_test_state();

        let created = impl_create_rule(
            &state,
            CreateRuleRequest {
                name: "RuleWithRange".to_string(),
                extensions: vec!["txt".to_string()],
                destination: "Target".to_string(),
                pattern: None,
                min_size_bytes: Some(10),
                max_size_bytes: Some(100),
                create_symlink: None,
                enabled: None,
            },
        )
        .await
        .unwrap();

        let request: UpdateRuleRequest = serde_json::from_value(json!({
            "id": created.id,
            "min_size_bytes": 200,
            "max_size_bytes": 100
        }))
        .unwrap();

        let error = impl_update_rule(&state, request).await.unwrap_err();
        assert!(error.contains("min_size_bytes"));
        assert!(error.contains("max_size_bytes"));
    }

    #[test]
    fn test_restart_service_if_running_debounces_rapid_requests() {
        let (state, _tmp) = create_test_state();

        internal_start_service(&state).unwrap();
        restart_service_if_running(&state).unwrap();
        let after_first = state
            .service_start_time
            .lock()
            .unwrap()
            .as_ref()
            .copied()
            .unwrap();

        restart_service_if_running(&state).unwrap();
        let after_second = state
            .service_start_time
            .lock()
            .unwrap()
            .as_ref()
            .copied()
            .unwrap();

        assert_eq!(
            after_first, after_second,
            "rapid restart requests should coalesce into one restart"
        );

        internal_stop_service(&state).unwrap();
    }

    #[tokio::test]
    async fn test_delete_rule() {
        let (state, _tmp) = create_test_state();

        let created = impl_create_rule(
            &state,
            CreateRuleRequest {
                name: "To Delete".to_string(),
                extensions: vec![],
                destination: "".to_string(),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                create_symlink: None,
                enabled: None,
            },
        )
        .await
        .unwrap();

        let res = impl_delete_rule(&state, created.id.clone()).await;
        assert!(res.is_ok());

        let rules = impl_get_rules(&state).await.unwrap();
        assert!(rules.is_empty());

        // Delete non-existent UUID
        let res =
            impl_delete_rule(&state, "00000000-0000-0000-0000-000000000000".to_string()).await;
        assert!(res.is_err());
    }

    #[tokio::test]
    async fn test_toggle_rule() {
        let (state, _tmp) = create_test_state();

        let created = impl_create_rule(
            &state,
            CreateRuleRequest {
                name: "ToggleMe".to_string(),
                extensions: vec![],
                destination: "".to_string(),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                create_symlink: None,
                enabled: Some(true),
            },
        )
        .await
        .unwrap();

        impl_toggle_rule(&state, created.id.clone(), false)
            .await
            .unwrap();

        let rules = impl_get_rules(&state).await.unwrap();
        assert!(!rules[0].enabled);
    }

    #[tokio::test]
    async fn test_reorder_rules() {
        let (state, _tmp) = create_test_state();

        let a = impl_create_rule(
            &state,
            CreateRuleRequest {
                name: "A".into(),
                extensions: vec![],
                destination: "".into(),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                create_symlink: None,
                enabled: None,
            },
        )
        .await
        .unwrap();
        let b = impl_create_rule(
            &state,
            CreateRuleRequest {
                name: "B".into(),
                extensions: vec![],
                destination: "".into(),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                create_symlink: None,
                enabled: None,
            },
        )
        .await
        .unwrap();
        let c = impl_create_rule(
            &state,
            CreateRuleRequest {
                name: "C".into(),
                extensions: vec![],
                destination: "".into(),
                pattern: None,
                min_size_bytes: None,
                max_size_bytes: None,
                create_symlink: None,
                enabled: None,
            },
        )
        .await
        .unwrap();

        // Reorder by UUID: C, A, B
        let order = vec![c.id.clone(), a.id.clone(), b.id.clone()];
        impl_reorder_rules(&state, order).await.unwrap();

        let rules = impl_get_rules(&state).await.unwrap();
        assert_eq!(rules[0].name, "C");
        assert_eq!(rules[1].name, "A");
        assert_eq!(rules[2].name, "B");
    }
}
