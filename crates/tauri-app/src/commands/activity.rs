use crate::state::AppState;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
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

fn parse_log_line(line: &str, id: usize) -> Option<ActivityLogDto> {
    // Log format: "source_path -> dest_path (rule_name) symlink_info"
    // Example: "C:\Downloads\file.jpg -> C:\Images\file.jpg (Images) Symlink created"

    let arrow_pattern = Regex::new(r"^(.+?) -> (.+) \(([^)]+)\)\s*(.*)$").ok()?;

    let caps = arrow_pattern.captures(line)?;

    let source_path = caps.get(1)?.as_str().to_string();
    let dest_path = caps.get(2)?.as_str().to_string();
    let rule_name = caps.get(3)?.as_str().to_string();
    let symlink_info = caps.get(4).map(|m| m.as_str().trim().to_string());
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

    let (icon, icon_color) = derive_icon_and_color(&ext);

    Some(ActivityLogDto {
        id: id.to_string(),
        timestamp: "".to_string(), // We don't have timestamps in current log format
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

fn derive_icon_and_color(ext: &str) -> (String, String) {
    match ext {
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "tiff" | "heic" | "avif" => {
            ("image".to_string(), "blue".to_string())
        }
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "webm" => {
            ("movie".to_string(), "indigo".to_string())
        }
        "mp3" | "flac" | "wav" | "aac" | "ogg" => ("music_note".to_string(), "pink".to_string()),
        "pdf" => ("description".to_string(), "red".to_string()),
        "doc" | "docx" | "txt" | "rtf" => ("description".to_string(), "blue".to_string()),
        "xls" | "xlsx" | "csv" => ("table_chart".to_string(), "green".to_string()),
        "ppt" | "pptx" => ("slideshow".to_string(), "amber".to_string()),
        "zip" | "rar" | "7z" | "tar" | "gz" | "xz" => {
            ("folder_zip".to_string(), "amber".to_string())
        }
        "exe" | "msi" | "msix" | "dmg" | "pkg" | "apk" => {
            ("install_desktop".to_string(), "purple".to_string())
        }
        "iso" => ("album".to_string(), "slate".to_string()),
        "torrent" => ("download".to_string(), "green".to_string()),
        "html" | "htm" => ("web".to_string(), "orange".to_string()),
        "json" | "xml" | "yaml" | "yml" => ("code".to_string(), "purple".to_string()),
        "srt" | "vtt" => ("subtitles".to_string(), "slate".to_string()),
        _ => ("insert_drive_file".to_string(), "slate".to_string()),
    }
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

    for log in logs {
        *rule_counts.entry(log.rule_name).or_insert(0) += 1;
    }

    let most_active_rule = rule_counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(name, _)| name);

    Ok(ActivityStats {
        total_files_moved: total,
        files_moved_today: total, // Simplified - we don't have timestamps in current format
        files_moved_this_week: total,
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
        assert_eq!(
            derive_icon_and_color("jpg"),
            ("image".to_string(), "blue".to_string())
        );
        assert_eq!(
            derive_icon_and_color("mp4"),
            ("movie".to_string(), "indigo".to_string())
        );
        assert_eq!(
            derive_icon_and_color("txt"),
            ("description".to_string(), "blue".to_string())
        );
        assert_eq!(
            derive_icon_and_color("unknown"),
            ("insert_drive_file".to_string(), "slate".to_string())
        );
    }

    #[test]
    fn test_parse_log_line() {
        let line = r#"C:\Source\file.txt -> C:\Dest\file.txt (Docs) Symlink created"#;
        let dto = parse_log_line(line, 1).unwrap();
        assert_eq!(dto.id, "1");
        assert_eq!(dto.source_path, r"C:\Source\file.txt");
        assert_eq!(dto.dest_path, r"C:\Dest\file.txt");
        assert_eq!(dto.rule_name, "Docs");
        assert_eq!(dto.symlink_info.as_deref(), Some("Symlink created"));
        assert_eq!(dto.filename, "file.txt");
        assert_eq!(dto.icon, "description");
        assert_eq!(dto.icon_color, "blue");

        // Test without symlink info
        let line2 = r#"C:\src\img.png -> C:\dst\img.png (Images) "#;
        let dto2 = parse_log_line(line2, 2).unwrap();
        assert_eq!(dto2.symlink_info, None);
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
