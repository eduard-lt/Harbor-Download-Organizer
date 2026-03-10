/// Returns the `(icon_name, icon_color)` pair for a given file extension.
///
/// Icon names correspond to Material Icon identifiers used in the React frontend.
/// The lookup is case-insensitive.  Colors are the canonical set agreed upon for
/// both the Rules list and the Activity log views.
pub fn derive_file_icon_and_color(ext: &str) -> (String, String) {
    match ext.to_lowercase().as_str() {
        // Images
        "jpg" | "jpeg" | "png" | "gif" | "webp" | "svg" | "bmp" | "tiff" | "heic" | "avif" => {
            ("image".to_string(), "blue".to_string())
        }
        // Videos
        "mp4" | "mkv" | "avi" | "mov" | "wmv" | "webm" => {
            ("movie".to_string(), "indigo".to_string())
        }
        // Audio
        "mp3" | "flac" | "wav" | "aac" | "ogg" => ("music_note".to_string(), "pink".to_string()),
        // Documents
        "pdf" => ("description".to_string(), "red".to_string()),
        "doc" | "docx" | "txt" | "rtf" => ("description".to_string(), "blue".to_string()),
        "xls" | "xlsx" | "csv" => ("table_chart".to_string(), "green".to_string()),
        "ppt" | "pptx" => ("slideshow".to_string(), "amber".to_string()),
        // Archives
        "zip" | "rar" | "7z" | "tar" | "gz" | "xz" => {
            ("folder_zip".to_string(), "amber".to_string())
        }
        // Executables / Installers
        "exe" | "msi" | "msix" | "dmg" | "pkg" | "apk" => {
            ("install_desktop".to_string(), "purple".to_string())
        }
        // Disk images
        "iso" => ("album".to_string(), "slate".to_string()),
        // Torrents
        "torrent" => ("download".to_string(), "green".to_string()),
        // Web / markup
        "html" | "htm" => ("web".to_string(), "orange".to_string()),
        // Code / data
        "json" | "xml" | "yaml" | "yml" => ("code".to_string(), "purple".to_string()),
        // Subtitles
        "srt" | "vtt" => ("subtitles".to_string(), "slate".to_string()),
        // Fallback
        _ => ("insert_drive_file".to_string(), "slate".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_file_icon_and_color() {
        // Images
        assert_eq!(
            derive_file_icon_and_color("jpg"),
            ("image".to_string(), "blue".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("PNG"), // case-insensitive
            ("image".to_string(), "blue".to_string())
        );
        // Videos
        assert_eq!(
            derive_file_icon_and_color("mp4"),
            ("movie".to_string(), "indigo".to_string())
        );
        // Audio
        assert_eq!(
            derive_file_icon_and_color("mp3"),
            ("music_note".to_string(), "pink".to_string())
        );
        // Documents
        assert_eq!(
            derive_file_icon_and_color("pdf"),
            ("description".to_string(), "red".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("txt"),
            ("description".to_string(), "blue".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("xlsx"),
            ("table_chart".to_string(), "green".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color("pptx"),
            ("slideshow".to_string(), "amber".to_string())
        );
        // Archives
        assert_eq!(
            derive_file_icon_and_color("zip"),
            ("folder_zip".to_string(), "amber".to_string())
        );
        // Executables
        assert_eq!(
            derive_file_icon_and_color("exe"),
            ("install_desktop".to_string(), "purple".to_string())
        );
        // Disk image
        assert_eq!(
            derive_file_icon_and_color("iso"),
            ("album".to_string(), "slate".to_string())
        );
        // Torrent
        assert_eq!(
            derive_file_icon_and_color("torrent"),
            ("download".to_string(), "green".to_string())
        );
        // Web
        assert_eq!(
            derive_file_icon_and_color("html"),
            ("web".to_string(), "orange".to_string())
        );
        // Code / data
        assert_eq!(
            derive_file_icon_and_color("json"),
            ("code".to_string(), "purple".to_string())
        );
        // Subtitles
        assert_eq!(
            derive_file_icon_and_color("srt"),
            ("subtitles".to_string(), "slate".to_string())
        );
        // Unknown / empty
        assert_eq!(
            derive_file_icon_and_color("unknown"),
            ("insert_drive_file".to_string(), "slate".to_string())
        );
        assert_eq!(
            derive_file_icon_and_color(""),
            ("insert_drive_file".to_string(), "slate".to_string())
        );
    }
}
