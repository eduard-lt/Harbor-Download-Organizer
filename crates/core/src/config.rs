//! Atomic configuration persistence shared by all entry points.
use crate::downloads::DownloadsConfig;
use anyhow::{Context, Result};
use std::{fs, io::Write, path::Path};

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<()> {
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    fs::create_dir_all(parent)?;
    let mut staging = tempfile::NamedTempFile::new_in(parent)?;
    staging.write_all(bytes)?;
    staging.as_file().sync_all()?;
    staging.persist(path).map_err(|e| e.error)?;
    Ok(())
}

/// Preserve the previous valid configuration, then atomically replace the live file.
/// Invalid originals are preserved separately for explicit reset/recovery.
pub fn save(path: &Path, config: &DownloadsConfig) -> Result<()> {
    let yaml = serde_yaml::to_string(config)?;
    match fs::read(path) {
        Ok(previous) => {
            if serde_yaml::from_slice::<DownloadsConfig>(&previous).is_ok() {
                atomic_write(&path.with_extension("yaml.bak"), &previous)?;
            } else {
                let parent = path.parent().unwrap_or(Path::new("."));
                let mut backup = tempfile::Builder::new()
                    .prefix("harbor-corrupt-")
                    .suffix(".yaml")
                    .tempfile_in(parent)?;
                backup.write_all(&previous)?;
                backup.as_file().sync_all()?;
                backup.keep().map_err(|e| e.error)?;
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(e).context("read existing configuration before saving"),
    }
    atomic_write(path, yaml.as_bytes()).context("save configuration")
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn replacement_preserves_previous_valid_config() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.yaml");
        let mut cfg = crate::downloads::default_config();
        save(&path, &cfg).unwrap();
        let original = fs::read(&path).unwrap();
        cfg.rules.clear();
        save(&path, &cfg).unwrap();
        assert_eq!(fs::read(path.with_extension("yaml.bak")).unwrap(), original);
        assert!(crate::downloads::load_downloads_config(path)
            .unwrap()
            .rules
            .is_empty());
    }
    #[test]
    fn reset_preserves_invalid_original_and_valid_backup() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config.yaml");
        fs::write(&path, "invalid: [yaml").unwrap();
        fs::write(path.with_extension("yaml.bak"), "last good").unwrap();
        save(&path, &crate::downloads::default_config()).unwrap();
        assert_eq!(
            fs::read_to_string(path.with_extension("yaml.bak")).unwrap(),
            "last good"
        );
        assert!(fs::read_dir(dir.path()).unwrap().any(|entry| {
            let path = entry.unwrap().path();
            path.file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("harbor-corrupt-")
                && fs::read_to_string(path).unwrap() == "invalid: [yaml"
        }));
    }
}
