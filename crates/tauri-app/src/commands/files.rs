use crate::{commands::settings, state::AppState};
use harbor_core::{downloads, types::Rule};
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct PreviewMove {
    source: String,
    destination: String,
    rule: String,
}
#[derive(Serialize)]
pub struct Preview {
    moves: Vec<PreviewMove>,
    errors: Vec<String>,
}

#[tauri::command]
pub async fn preview_organization(state: State<'_, AppState>) -> Result<Preview, String> {
    let work = state.work.clone();
    if let Some(error) = state
        .configuration_error
        .lock()
        .map_err(|e| e.to_string())?
        .as_ref()
    {
        return Err(error.clone());
    }
    let cfg = state.config.read().map_err(|e| e.to_string())?.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = work.gate.lock().map_err(|e| e.to_string())?;
        let result = downloads::preview(&cfg).map_err(|e| format!("{e:#}"))?;
        Ok(Preview {
            moves: result
                .moved
                .into_iter()
                .map(|item| PreviewMove {
                    source: item.source.display().to_string(),
                    destination: item.destination.display().to_string(),
                    rule: item.rule_name,
                })
                .collect(),
            errors: result.errors,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn undo_last_batch(app: tauri::AppHandle) -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use tauri::Manager;
        let state = app.state::<AppState>();
        let _operation = state
            .lifecycle_operation
            .lock()
            .map_err(|e| e.to_string())?;
        settings::stop_locked(&state)?;
        settings::persist_service_state(&state, false)?;
        if *state
            .watcher_join_pending
            .lock()
            .map_err(|e| e.to_string())?
        {
            return Err("Monitoring is still stopping. Retry undo shortly.".into());
        }
        crate::operations::undo(&state.work).map_err(|e| format!("{e:#}"))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn set_download_dir(state: State<'_, AppState>, directory: String) -> Result<(), String> {
    let path = std::path::PathBuf::from(downloads::expand_env(directory.trim()));
    if !path.is_absolute() || !path.is_dir() {
        return Err("Choose an existing absolute folder path.".into());
    }
    std::fs::read_dir(&path).map_err(|e| format!("Cannot read folder: {e}"))?;
    // Stop first: no remaining old pass should keep using the previous folder.
    let _operation = state
        .lifecycle_operation
        .lock()
        .map_err(|e| e.to_string())?;
    settings::stop_locked(&state)?;
    state.update_config(|cfg| {
        cfg.download_dir = path.display().to_string();
        cfg.service_enabled = Some(false);
    })
}

#[derive(Serialize, Deserialize)]
struct RulesFile {
    version: u32,
    rules: Vec<Rule>,
}

fn parse_rules(content: &str) -> Result<Vec<Rule>, String> {
    let mut file: RulesFile =
        serde_json::from_str(content).map_err(|e| format!("Invalid rules file: {e}"))?;
    if file.version != 1 {
        return Err("Unsupported rules file version".into());
    }
    let mut names = std::collections::HashSet::new();
    for rule in &mut file.rules {
        rule.name = rule.name.trim().into();
        if rule.name.is_empty() || !names.insert(rule.name.clone()) {
            return Err("Rule names must be nonempty and unique".into());
        }
        rule.target_dir = downloads::expand_env(&rule.target_dir);
        if !std::path::Path::new(&rule.target_dir).is_absolute() {
            return Err(format!(
                "Rule '{}' needs an absolute destination",
                rule.name
            ));
        }
        if let Some(pattern) = &rule.pattern {
            regex::Regex::new(pattern).map_err(|e| format!("Rule '{}': {e}", rule.name))?;
        }
        if matches!((rule.min_size_bytes, rule.max_size_bytes), (Some(min), Some(max)) if min > max)
        {
            return Err(format!("Rule '{}': invalid size range", rule.name));
        }
        if let Some(exts) = &mut rule.extensions {
            for ext in exts {
                *ext = ext.trim().trim_start_matches('.').to_lowercase();
            }
        }
        rule.id = harbor_core::types::new_rule_id();
    }
    Ok(file.rules)
}

#[tauri::command]
pub async fn export_rules(state: State<'_, AppState>, destination: String) -> Result<(), String> {
    let rules = state
        .config
        .read()
        .map_err(|e| e.to_string())?
        .rules
        .clone();
    let content =
        serde_json::to_vec_pretty(&RulesFile { version: 1, rules }).map_err(|e| e.to_string())?;
    let path = std::path::Path::new(&destination);
    if !path.is_absolute() {
        return Err("Choose an absolute export path".into());
    }
    use std::io::Write;
    let mut file = tempfile::NamedTempFile::new_in(path.parent().ok_or("Missing export folder")?)
        .map_err(|e| e.to_string())?;
    file.write_all(&content).map_err(|e| e.to_string())?;
    file.as_file().sync_all().map_err(|e| e.to_string())?;
    file.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn import_rules(state: State<'_, AppState>, content: String) -> Result<usize, String> {
    if content.len() > 2 * 1024 * 1024 {
        return Err("Rules file must be smaller than 2 MiB".into());
    }
    let rules = parse_rules(&content)?;
    let count = rules.len();
    let _operation = state
        .lifecycle_operation
        .lock()
        .map_err(|e| e.to_string())?;
    settings::stop_locked(&state)?;
    state.update_config(|cfg| {
        cfg.rules = rules;
        cfg.service_enabled = Some(false);
    })?;
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rules_export_roundtrip_and_validation() {
        let rules = downloads::default_config().rules;
        let file = serde_json::to_string(&RulesFile {
            version: 1,
            rules: rules.clone(),
        })
        .unwrap();
        let imported = parse_rules(&file).unwrap();
        assert_eq!(imported.len(), rules.len());
        assert_ne!(imported[0].id, rules[0].id);
        let mut invalid = imported;
        invalid[0].pattern = Some("[".into());
        assert!(parse_rules(
            &serde_json::to_string(&RulesFile {
                version: 1,
                rules: invalid
            })
            .unwrap()
        )
        .is_err());
        assert!(parse_rules(r#"{"version":999,"rules":[]}"#).is_err());
    }
}
