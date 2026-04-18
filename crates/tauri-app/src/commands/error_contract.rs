use serde::{Deserialize, Serialize};
use std::path::Path;

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
    pub fn to_dto(&self, _download_dir: Option<&Path>) -> AppErrorDto {
        todo!("Implemented in GREEN phase")
    }
}
