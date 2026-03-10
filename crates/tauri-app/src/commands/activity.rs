use crate::state::AppState;
use std::fs;
use std::io::{BufRead, BufReader};
use std::sync::LazyLock;

use chrono::{Datelike, Local, NaiveDateTime};
use regex::Regex;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Activity log entry for the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityLogDto {
    pub id: String,
    pub timestamp: String,
    pub filename: String,
    pub icon: String,
    pub icon_color: String,
    pub source_path: String,
    pub dest_path: String,
    pub rule_name: String,
    pub status: String,
    pub symlink_info: Option<String>,
}

/// Activity statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityStats {
    pub total_files_moved: usize,
    pub files_moved_today: usize,
    pub files_moved_this_week: usize,
    pub most_active_rule: Option<String>,
}

/// Paginated response for activity logs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityLogsResponse {
    pub logs: Vec<ActivityLogDto>,
    pub total: usize,
    pub has_more: bool,
}

/// Compiled once; matches both the new timestamped format and the old format.
///
/// New:  `[2024-01-15 10:30:00] <src> -> <dst> (<rule>) <symlink>`
/// Old:  `<src> -> <dst> (<rule>) <symlink>`
///
/// Groups:
///   1 → optional timestamp (may be empty string)
///   2 → source path
///   3 → destination path
///   4 → rule name
///   5 → optional symlink info
static LOG_LINE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(?:\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] )?(.+?) -> (.+) \(([^)]+)\)\s*(.*)$")
        .expect("LOG_LINE_RE is a valid pattern")
});

fn parse_log_line(line: &str, id: usize) -> Option<ActivityLogDto> {
    let caps = LOG_LINE_RE.captures(line)?;

    let timestamp = caps
        .get(1)
        .map(|m| m.as_str().to_string())
        .unwrap_or_default();
    let source_path = caps.get(2)?.as_str().to_string();
    let dest_path = caps.get(3)?.as_str().to_string();
    let rule_name = caps.get(4)?.as_str().to_string();
    let symlink_info = caps.get(5).map(|m| m.as_str().trim().to_string());
    let symlink_info = if symlink_info.as_ref().map(|s| s.is_empty()).unwrap_or(true) {
        None
    } else {
        symlink_info
    };

    // Extract filename from dest_path
    let filename = std::path::Path::new(&dest_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Derive icon from extension
    let ext = std::path::Path::new(&filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let (icon, icon_color) = super::ui_helpers::derive_file_icon_and_color(&ext);

    Some(ActivityLogDto {
        id: id.to_string(),
        timestamp,
        filename,
        icon,
        icon_color,
        source_path,
        dest_path,
        rule_name,
        status: "success".to_string(),
        symlink_info,
    })
}

fn read_log_entries(reader: impl BufRead) -> Vec<ActivityLogDto> {
    reader
        .lines()
        .map_while(Result::ok)
        .filter(|line| {
            !line.trim().is_empty()
                && !line.starts_with("Recent Moves")
                && !line.starts_with("---")
                && !line.starts_with("Startup:")
        })
        .enumerate()
        .filter_map(|(idx, line)| parse_log_line(&line, idx))
        .collect()
}

#[tauri::command]
pub async fn get_activity_logs(
    state: State<'_, AppState>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<ActivityLogsResponse, String> {
    let log_path = state.recent_log_path();
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);

    if !log_path.exists() {
        return Ok(ActivityLogsResponse {
            logs: vec![],
            total: 0,
            has_more: false,
        });
    }

    let file = fs::File::open(&log_path).map_err(|e| format!("Failed to open log file: {}", e))?;
    let reader = BufReader::new(file);

    // Read all lines and parse them
    let mut all_logs = read_log_entries(reader);

    // Reverse to show most recent first
    all_logs.reverse();

    let total = all_logs.len();
    let has_more = offset + limit < total;

    // Apply pagination
    let logs: Vec<ActivityLogDto> = all_logs.into_iter().skip(offset).take(limit).collect();

    Ok(ActivityLogsResponse {
        logs,
        total,
        has_more,
    })
}

#[tauri::command]
pub async fn get_activity_stats(state: State<'_, AppState>) -> Result<ActivityStats, String> {
    let log_path = state.recent_log_path();

    if !log_path.exists() {
        return Ok(ActivityStats {
            total_files_moved: 0,
            files_moved_today: 0,
            files_moved_this_week: 0,
            most_active_rule: None,
        });
    }

    let file = fs::File::open(&log_path).map_err(|e| format!("Failed to open log file: {}", e))?;
    let reader = BufReader::new(file);

    let logs = read_log_entries(reader);
    let total = logs.len();
    let mut rule_counts: std::collections::HashMap<String, usize> =
        std::collections::HashMap::new();

    // Compute time boundaries for today and this week.
    let now = Local::now().naive_local();
    let today_start = now.date().and_hms_opt(0, 0, 0).unwrap_or(now);
    let days_since_monday = now.weekday().num_days_from_monday() as i64;
    let week_start = today_start - chrono::Duration::days(days_since_monday);

    let mut files_moved_today = 0usize;
    let mut files_moved_this_week = 0usize;

    for log in &logs {
        *rule_counts.entry(log.rule_name.clone()).or_insert(0) += 1;

        if !log.timestamp.is_empty() {
            if let Ok(dt) = NaiveDateTime::parse_from_str(&log.timestamp, "%Y-%m-%d %H:%M:%S") {
                if dt >= today_start {
                    files_moved_today += 1;
                }
                if dt >= week_start {
                    files_moved_this_week += 1;
                }
            }
        }
    }

    let most_active_rule = rule_counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(name, _)| name);

    Ok(ActivityStats {
        total_files_moved: total,
        files_moved_today,
        files_moved_this_week,
        most_active_rule,
    })
}

#[tauri::command]
pub async fn clear_activity_logs(state: State<'_, AppState>) -> Result<(), String> {
    let log_path = state.recent_log_path();

    if log_path.exists() {
        fs::write(&log_path, "Recent Moves Log\n----------------\n")
            .map_err(|e| format!("Failed to clear log file: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_icon_and_color() {
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
            derive_file_icon_and_color("txt"),
            ("description".to_string(), "blue".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("unknown"),
            ("insert_drive_file".to_string(), "slate".to_string())
        );
    }

    #[test]
    fn test_parse_log_line() {
        // New timestamped format
        let line = r#"[2024-01-15 10:30:00] C:\Source\file.txt -> C:\Dest\file.txt (Docs) Symlink created"#;
        let dto = parse_log_line(line, 1).unwrap();
        assert_eq!(dto.id, "1");
        assert_eq!(dto.timestamp, "2024-01-15 10:30:00");
        assert_eq!(dto.source_path, r"C:\Source\file.txt");
        assert_eq!(dto.dest_path, r"C:\Dest\file.txt");
        assert_eq!(dto.rule_name, "Docs");
        assert_eq!(dto.symlink_info.as_deref(), Some("Symlink created"));
        assert_eq!(dto.filename, "file.txt");
        assert_eq!(dto.icon, "description");
        assert_eq!(dto.icon_color, "blue");

        // New format without symlink info
        let line2 = r#"[2024-01-15 10:30:00] C:\src\img.png -> C:\dst\img.png (Images) "#;
        let dto2 = parse_log_line(line2, 2).unwrap();
        assert_eq!(dto2.timestamp, "2024-01-15 10:30:00");
        assert_eq!(dto2.symlink_info, None);

        // Legacy format (no timestamp) is still parsed correctly.
        let line3 = r#"C:\Source\file.txt -> C:\Dest\file.txt (Docs) Symlink created"#;
        let dto3 = parse_log_line(line3, 3).unwrap();
        assert_eq!(dto3.timestamp, "");
        assert_eq!(dto3.source_path, r"C:\Source\file.txt");
        assert_eq!(dto3.rule_name, "Docs");
    }

    #[test]
    fn test_read_log_entries() {
        let data = "Recent Moves Log\n----------------\n\nC:\\src\\a.txt -> C:\\dst\\a.txt (RuleA)\nC:\\src\\b.txt -> C:\\dst\\b.txt (RuleB)";
        let reader = std::io::Cursor::new(data);
        let logs = read_log_entries(reader);
        assert_eq!(logs.len(), 2);
        assert_eq!(logs[0].rule_name, "RuleA");
        assert_eq!(logs[1].rule_name, "RuleB");
    }
}
