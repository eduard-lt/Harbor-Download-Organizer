use super::error_contract::{AppError, AppErrorDto};

#[test]
fn app_error_dto_serializes_required_contract_fields() {
    let dto = AppError::Validation {
        field: "download_dir".to_string(),
        message: "Download directory is required".to_string(),
        remediation_hint: "Set a valid download directory in settings".to_string(),
        legacy_error: "Download directory is required".to_string(),
    }
    .to_dto(None);

    let json = serde_json::to_value(dto).expect("AppErrorDto should serialize");
    assert!(json.get("code").is_some());
    assert!(json.get("message").is_some());
    assert!(json.get("details").is_some());
}

#[test]
fn app_error_mapper_covers_validation_filesystem_and_conflict_classes() {
    let validation = AppError::Validation {
        field: "download_dir".to_string(),
        message: "Download directory is required".to_string(),
        remediation_hint: "Set a valid download directory in settings".to_string(),
        legacy_error: "Download directory is required".to_string(),
    };
    let filesystem = AppError::Filesystem {
        operation: "move_file".to_string(),
        source_path: Some(r"C:\Users\Alice\Downloads\foo.txt".to_string()),
        destination_path: Some(r"C:\Users\Alice\Downloads\Docs\foo.txt".to_string()),
        reason: "Access denied".to_string(),
        remediation_hint: "Close applications locking the file and retry".to_string(),
        legacy_error: "Failed to move file".to_string(),
    };
    let conflict = AppError::Conflict {
        resource: "foo.txt".to_string(),
        message: "A destination file already exists".to_string(),
        remediation_hint: "Rename the source file or remove the conflict".to_string(),
        legacy_error: "Conflict while moving file".to_string(),
    };

    let validation_dto = validation.to_dto(None);
    let filesystem_dto = filesystem.to_dto(None);
    let conflict_dto = conflict.to_dto(None);

    assert_eq!(validation_dto.code, "validation_error");
    assert_eq!(filesystem_dto.code, "filesystem_error");
    assert_eq!(conflict_dto.code, "conflict_error");
}

#[test]
fn filesystem_mapping_preserves_legacy_field_and_sanitizes_paths() {
    let dto: AppErrorDto = AppError::Filesystem {
        operation: "move_file".to_string(),
        source_path: Some(r"C:\Users\Alice\Downloads\sub\file.txt".to_string()),
        destination_path: Some(r"C:\Users\Alice\Downloads\Docs\file.txt".to_string()),
        reason: "Permission denied".to_string(),
        remediation_hint: "Verify write permissions to the destination".to_string(),
        legacy_error: "Failed to move file".to_string(),
    }
    .to_dto(Some(std::path::Path::new(r"C:\Users\Alice\Downloads")));

    assert_eq!(dto.legacy_error, "Failed to move file");
    assert_eq!(dto.details.source_path.as_deref(), Some(r"sub\file.txt"));
    assert_eq!(
        dto.details.destination_path.as_deref(),
        Some(r"Docs\file.txt")
    );
}
