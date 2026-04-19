use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub enum AppError {
    Validation {
        field: String,
        message: String,
        remediation_hint: String,
        legacy_error: String,
    },
    Filesystem {
        operation: String,
        source_path: Option<String>,
        destination_path: Option<String>,
        reason: String,
        remediation_hint: String,
        legacy_error: String,
    },
    Conflict {
        resource: String,
        message: String,
        remediation_hint: String,
        legacy_error: String,
    },
    Internal {
        message: String,
        remediation_hint: String,
        legacy_error: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppErrorDto {
    pub code: String,
    pub message: String,
    pub details: AppErrorDetailsDto,
    pub legacy_error: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppErrorDetailsDto {
    pub field: Option<String>,
    pub operation: Option<String>,
    pub resource: Option<String>,
    pub source_path: Option<String>,
    pub destination_path: Option<String>,
    pub reason: Option<String>,
    pub remediation_hint: Option<String>,
}

impl AppError {
    pub fn to_dto(&self, download_dir: Option<&Path>) -> AppErrorDto {
        match self {
            AppError::Validation {
                field,
                message,
                remediation_hint,
                legacy_error,
            } => AppErrorDto {
                code: "validation_error".to_string(),
                message: message.clone(),
                details: AppErrorDetailsDto {
                    field: Some(field.clone()),
                    remediation_hint: Some(remediation_hint.clone()),
                    ..Default::default()
                },
                legacy_error: legacy_error.clone(),
            },
            AppError::Filesystem {
                operation,
                source_path,
                destination_path,
                reason,
                remediation_hint,
                legacy_error,
            } => AppErrorDto {
                code: "filesystem_error".to_string(),
                message: format!("File operation failed during {}", operation),
                details: AppErrorDetailsDto {
                    operation: Some(operation.clone()),
                    source_path: source_path
                        .as_deref()
                        .map(|p| sanitize_path_for_ui(p, download_dir)),
                    destination_path: destination_path
                        .as_deref()
                        .map(|p| sanitize_path_for_ui(p, download_dir)),
                    reason: Some(reason.clone()),
                    remediation_hint: Some(remediation_hint.clone()),
                    ..Default::default()
                },
                legacy_error: legacy_error.clone(),
            },
            AppError::Conflict {
                resource,
                message,
                remediation_hint,
                legacy_error,
            } => AppErrorDto {
                code: "conflict_error".to_string(),
                message: message.clone(),
                details: AppErrorDetailsDto {
                    resource: Some(resource.clone()),
                    remediation_hint: Some(remediation_hint.clone()),
                    ..Default::default()
                },
                legacy_error: legacy_error.clone(),
            },
            AppError::Internal {
                message,
                remediation_hint,
                legacy_error,
            } => AppErrorDto {
                code: "internal_error".to_string(),
                message: message.clone(),
                details: AppErrorDetailsDto {
                    remediation_hint: Some(remediation_hint.clone()),
                    ..Default::default()
                },
                legacy_error: legacy_error.clone(),
            },
        }
    }
}

pub fn map_legacy_organize_error(message: &str) -> AppError {
    if let Some((source_path, destination_path, reason)) = parse_move_error(message) {
        if reason.to_ascii_lowercase().contains("already exists") {
            return AppError::Conflict {
                resource: destination_path.clone(),
                message: "A destination file already exists".to_string(),
                remediation_hint:
                    "Rename the source file, or remove the existing destination file and retry."
                        .to_string(),
                legacy_error: message.to_string(),
            };
        }

        return AppError::Filesystem {
            operation: "move_file".to_string(),
            source_path: Some(source_path),
            destination_path: Some(destination_path),
            reason,
            remediation_hint:
                "Close any app locking the file and verify write permissions for the destination."
                    .to_string(),
            legacy_error: message.to_string(),
        };
    }

    if message.contains("list ") {
        let path = message
            .split("list ")
            .nth(1)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        return AppError::Filesystem {
            operation: "scan_download_directory".to_string(),
            source_path: path,
            destination_path: None,
            reason: "Failed to enumerate files in the download directory".to_string(),
            remediation_hint: "Confirm the download directory exists and Harbor has read access."
                .to_string(),
            legacy_error: message.to_string(),
        };
    }

    AppError::Internal {
        message: "Unexpected organization error".to_string(),
        remediation_hint: "Retry the operation. If this persists, inspect local Harbor logs."
            .to_string(),
        legacy_error: message.to_string(),
    }
}

fn sanitize_path_for_ui(path: &str, download_dir: Option<&Path>) -> String {
    let path_buf = PathBuf::from(path);
    if let Some(base) = download_dir {
        if let Ok(relative) = path_buf.strip_prefix(base) {
            if !relative.as_os_str().is_empty() {
                return relative.to_string_lossy().to_string();
            }
        }
    }

    path_buf
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string())
}

fn parse_move_error(message: &str) -> Option<(String, String, String)> {
    let prefix = "Failed to move '";
    if !message.starts_with(prefix) {
        return None;
    }

    let after_source = &message[prefix.len()..];
    let source_end = after_source.find("' to '")?;
    let source = after_source[..source_end].to_string();

    let after_destination = &after_source[source_end + "' to '".len()..];
    let destination_end = after_destination.find("': ")?;
    let destination = after_destination[..destination_end].to_string();
    let reason = after_destination[destination_end + 3..].to_string();

    Some((source, destination, reason))
}
