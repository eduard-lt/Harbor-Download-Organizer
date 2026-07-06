//! Integration tests for Tauri app service lifecycle, tray organize pipeline,
//! and config initialization. These exercise the orchestration layer — paths
//! that isolated unit tests cannot reach.
//!
//! Note: because harbor-tauri-app is a binary crate, integration tests live
//! here as a `#[cfg(test)]` module rather than in `tests/`.

#[cfg(test)]
mod integration {
    use crate::commands::settings;
    use crate::state::{AppState, ServiceLifecycleState};
    use harbor_core::downloads::DownloadsConfig;
    use tempfile::tempdir;

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    fn test_config(service_enabled: bool) -> DownloadsConfig {
        DownloadsConfig {
            download_dir: "DL".to_string(),
            rules: vec![],
            min_age_secs: Some(0),
            tutorial_completed: Some(false),
            service_enabled: Some(service_enabled),
            check_updates: Some(true),
            last_notified_version: None,
        }
    }

    fn state_with_config(dir: &tempfile::TempDir, config: DownloadsConfig) -> AppState {
        let cfg_path = dir.path().join("harbor.test.yaml");
        std::fs::write(&cfg_path, serde_yaml::to_string(&config).unwrap()).unwrap();
        AppState::new(cfg_path, config)
    }

    // -----------------------------------------------------------------------
    // Service lifecycle orchestration
    // -----------------------------------------------------------------------

    #[test]
    fn service_start_sets_running_state_and_watcher_flag() {
        let dir = tempdir().unwrap();
        let state = state_with_config(&dir, test_config(false));

        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Stopped
        );
        assert!(state.watcher_flag.lock().unwrap().is_none());

        settings::internal_start_service(&state).unwrap();

        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Running
        );
        assert!(state.watcher_flag.lock().unwrap().is_some());

        settings::internal_stop_service(&state).unwrap();
    }

    #[test]
    fn service_stop_clears_flag_and_returns_to_stopped() {
        let dir = tempdir().unwrap();
        let state = state_with_config(&dir, test_config(false));

        settings::internal_start_service(&state).unwrap();
        settings::internal_stop_service(&state).unwrap();

        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Stopped
        );
        assert!(state.watcher_flag.lock().unwrap().is_none());
    }

    #[test]
    fn double_start_is_idempotent() {
        let dir = tempdir().unwrap();
        let state = state_with_config(&dir, test_config(false));

        settings::internal_start_service(&state).unwrap();

        // Second start is silently idempotent (returns Ok, no state change).
        let before = state.service_lifecycle.lock().unwrap().clone();
        let result = settings::internal_start_service(&state);
        assert!(result.is_ok(), "double start should succeed silently");
        assert_eq!(*state.service_lifecycle.lock().unwrap(), before);

        settings::internal_stop_service(&state).unwrap();
    }

    #[test]
    fn stop_of_already_stopped_service_is_harmless() {
        let dir = tempdir().unwrap();
        let state = state_with_config(&dir, test_config(false));

        // Should not panic.
        settings::internal_stop_service(&state).unwrap();
        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Stopped
        );
    }

    #[test]
    fn lifecycle_transitions_running_to_stopped() {
        let dir = tempdir().unwrap();
        let state = state_with_config(&dir, test_config(false));

        settings::internal_start_service(&state).unwrap();
        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Running
        );

        settings::internal_stop_service(&state).unwrap();
        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Stopped
        );
    }

    #[test]
    fn degraded_state_persists_reason() {
        let dir = tempdir().unwrap();
        let state = state_with_config(&dir, test_config(false));

        settings::internal_start_service(&state).unwrap();

        {
            let mut lifecycle = state.service_lifecycle.lock().unwrap();
            *lifecycle = ServiceLifecycleState::Degraded;
        }
        {
            let mut reason = state.degraded_reason.lock().unwrap();
            *reason = Some("simulated failure".to_string());
        }

        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Degraded
        );
        assert_eq!(
            state.degraded_reason.lock().unwrap().as_deref(),
            Some("simulated failure")
        );

        settings::internal_stop_service(&state).unwrap();
    }

    // -----------------------------------------------------------------------
    // Tray organize outcome pipeline
    // -----------------------------------------------------------------------

    #[test]
    fn tray_outcome_maps_success_response() {
        let response = settings::OrganizeNowResponse {
            status: "success".to_string(),
            message: "All done".to_string(),
            moved_count: 5,
            moved: 5,
            total_failures: 0,
            errors: vec![],
            failure_groups: vec![],
        };

        let outcome = settings::map_tray_organize_outcome(&response);
        assert_eq!(outcome.status, "success");
        assert_eq!(outcome.severity, "info");
        // For success, the message is passed through unchanged.
        assert_eq!(outcome.message, "All done");
    }

    #[test]
    fn tray_outcome_maps_partial_failure_response() {
        let response = settings::OrganizeNowResponse {
            status: "partial_failure".to_string(),
            message: "Some failed".to_string(),
            moved_count: 3,
            moved: 3,
            total_failures: 2,
            errors: vec!["e1".to_string()],
            failure_groups: vec![],
        };

        let outcome = settings::map_tray_organize_outcome(&response);
        assert_eq!(outcome.severity, "warning");
    }

    #[test]
    fn tray_outcome_maps_full_failure_response() {
        let response = settings::OrganizeNowResponse {
            status: "failed".to_string(),
            message: "All failed".to_string(),
            moved_count: 0,
            moved: 0,
            total_failures: 10,
            errors: vec!["critical".to_string()],
            failure_groups: vec![],
        };

        let outcome = settings::map_tray_organize_outcome(&response);
        assert_eq!(outcome.severity, "error");
    }

    // -----------------------------------------------------------------------
    // Config initialization (main.rs startup path)
    // -----------------------------------------------------------------------

    #[test]
    fn config_init_loads_existing_file() {
        use harbor_core::downloads::load_or_initialize_config;

        let dir = tempdir().unwrap();
        let cfg_path = dir.path().join("harbor.test.yaml");

        let expected = test_config(true);
        std::fs::write(&cfg_path, serde_yaml::to_string(&expected).unwrap()).unwrap();

        let loaded = load_or_initialize_config(&cfg_path).unwrap();
        assert_eq!(loaded.download_dir, expected.download_dir);
        assert_eq!(loaded.service_enabled, expected.service_enabled);
    }

    #[test]
    fn config_init_creates_default_when_missing() {
        use harbor_core::downloads::load_or_initialize_config;

        let dir = tempdir().unwrap();
        let cfg_path = dir.path().join("harbor.nonexistent.yaml");

        let config = load_or_initialize_config(&cfg_path).unwrap();
        assert!(!config.download_dir.is_empty());
        assert_eq!(config.service_enabled, Some(true));
    }

    // -----------------------------------------------------------------------
    // Service status reflects running state
    // -----------------------------------------------------------------------

    #[test]
    fn service_status_reflects_running_state() {
        let dir = tempdir().unwrap();
        let state = state_with_config(&dir, test_config(false));

        settings::internal_start_service(&state).unwrap();

        assert_eq!(
            *state.service_lifecycle.lock().unwrap(),
            ServiceLifecycleState::Running
        );

        settings::internal_stop_service(&state).unwrap();
    }
}
