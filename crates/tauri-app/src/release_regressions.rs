use crate::{
    commands::{rules, settings},
    state::AppState,
};

#[tokio::test]
async fn rejected_rule_changes_preserve_memory_and_disk() {
    let dir = tempfile::tempdir().unwrap();
    let cfg = harbor_core::downloads::default_config();
    let original = serde_json::to_string(&cfg).unwrap();
    let id = cfg.rules[0].id.clone();
    let state = AppState::new(dir.path().into(), cfg); // a directory cannot be replaced as YAML
    assert!(rules::impl_create_rule(
        &state,
        rules::CreateRuleRequest {
            name: "Rejected".into(),
            extensions: vec!["txt".into()],
            destination: dir.path().display().to_string(),
            pattern: None,
            min_size_bytes: None,
            max_size_bytes: None,
            create_symlink: None,
            enabled: None,
        }
    )
    .await
    .is_err());
    assert!(rules::impl_delete_rule(&state, id.clone()).await.is_err());
    assert!(rules::impl_toggle_rule(&state, id.clone(), false)
        .await
        .is_err());
    let update =
        serde_json::from_value(serde_json::json!({"id": id, "name": "Not saved"})).unwrap();
    assert!(rules::impl_update_rule(&state, update).await.is_err());
    let ids = state
        .config
        .read()
        .unwrap()
        .rules
        .iter()
        .rev()
        .map(|r| r.id.clone())
        .collect();
    assert!(rules::impl_reorder_rules(&state, ids).await.is_err());
    assert_eq!(
        serde_json::to_string(&*state.config.read().unwrap()).unwrap(),
        original
    );
    assert!(dir.path().is_dir());
}

#[test]
fn stop_signals_worker_even_when_setting_cannot_be_saved() {
    let dir = tempfile::tempdir().unwrap();
    let mut cfg = harbor_core::downloads::default_config();
    cfg.download_dir = dir.path().display().to_string();
    cfg.rules.clear();
    let state = AppState::new(dir.path().into(), cfg);
    settings::internal_start_service(&state).unwrap();
    assert!(settings::impl_stop_service(&state).is_err());
    assert!(state.watcher_flag.lock().unwrap().is_none());
}

#[test]
fn pending_worker_cannot_be_forgotten_or_replaced() {
    let dir = tempfile::tempdir().unwrap();
    let state = AppState::new(
        dir.path().join("config.yaml"),
        harbor_core::downloads::default_config(),
    );
    *state.watcher_join_pending.lock().unwrap() = true;
    settings::internal_stop_service(&state).unwrap();
    assert!(*state.watcher_join_pending.lock().unwrap());
    assert!(settings::internal_start_service(&state).is_err());
    assert!(state.watcher_flag.lock().unwrap().is_none());
}

#[test]
fn background_failure_is_visible_and_persisted() {
    let dir = tempfile::tempdir().unwrap();
    let mut cfg = harbor_core::downloads::default_config();
    cfg.download_dir = dir.path().join("missing").display().to_string();
    let state = AppState::new(dir.path().join("config.yaml"), cfg);
    settings::internal_start_service(&state).unwrap();
    for _ in 0..100 {
        if state.scan_error.lock().unwrap().is_some() {
            break;
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    settings::internal_stop_service(&state).unwrap();
    assert!(state.scan_error.lock().unwrap().is_some());
    assert!(std::fs::read_to_string(state.recent_log_path())
        .unwrap()
        .contains("missing"));
}

#[test]
fn corrupt_configuration_blocks_mutation_and_monitoring() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("config.yaml");
    std::fs::write(&path, "broken: [").unwrap();
    let state = AppState::new(path.clone(), harbor_core::downloads::default_config());
    *state.configuration_error.lock().unwrap() = Some("Invalid YAML".into());
    assert!(state.update_config(|cfg| cfg.rules.clear()).is_err());
    assert!(settings::internal_start_service(&state).is_err());
    assert_eq!(std::fs::read_to_string(path).unwrap(), "broken: [");
}

#[test]
fn preview_does_not_create_destination_or_move_files() {
    let dir = tempfile::tempdir().unwrap();
    let source = dir.path().join("downloads");
    std::fs::create_dir(&source).unwrap();
    let file = source.join("one.txt");
    std::fs::write(&file, "content").unwrap();
    let target = dir.path().join("output");
    let mut cfg = harbor_core::downloads::default_config();
    cfg.download_dir = source.display().to_string();
    cfg.min_age_secs = Some(0);
    cfg.rules.truncate(1);
    cfg.rules[0].extensions = Some(vec!["txt".into()]);
    cfg.rules[0].pattern = None;
    cfg.rules[0].target_dir = target.display().to_string();
    let preview = harbor_core::downloads::preview(&cfg).unwrap();
    assert_eq!(preview.moved.len(), 1);
    assert!(file.exists());
    assert!(!target.exists());
    let work = crate::operations::Work::new(dir.path());
    let result = crate::operations::run_batch(&work, &cfg, None).unwrap();
    assert_eq!(result.moved.len(), 1);
    assert_eq!(crate::operations::undo(&work).unwrap(), 1);
    assert_eq!(std::fs::read_to_string(file).unwrap(), "content");
}

#[test]
fn preview_reserves_distinct_names_for_a_collision_batch() {
    let dir = tempfile::tempdir().unwrap();
    let source = dir.path().join("downloads");
    let target = dir.path().join("output");
    std::fs::create_dir(&source).unwrap();
    std::fs::create_dir(&target).unwrap();
    for name in ["file.txt", "file (1).txt"] {
        std::fs::write(source.join(name), name).unwrap();
    }
    std::fs::write(target.join("file.txt"), "existing").unwrap();
    let mut cfg = harbor_core::downloads::default_config();
    cfg.download_dir = source.display().to_string();
    cfg.min_age_secs = Some(0);
    cfg.rules.truncate(1);
    cfg.rules[0].extensions = Some(vec!["txt".into()]);
    cfg.rules[0].pattern = None;
    cfg.rules[0].target_dir = target.display().to_string();
    let preview = harbor_core::downloads::preview(&cfg).unwrap();
    assert_eq!(preview.moved.len(), 2);
    assert_ne!(preview.moved[0].destination, preview.moved[1].destination);
    let result = harbor_core::downloads::organize_once(&cfg).unwrap();
    assert!(result.errors.is_empty());
    assert_eq!(
        preview
            .moved
            .iter()
            .map(|m| &m.destination)
            .collect::<Vec<_>>(),
        result
            .moved
            .iter()
            .map(|m| &m.destination)
            .collect::<Vec<_>>()
    );
    assert_eq!(
        std::fs::read_to_string(target.join("file.txt")).unwrap(),
        "existing"
    );
}
