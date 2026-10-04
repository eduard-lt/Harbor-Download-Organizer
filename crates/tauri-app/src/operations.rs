//! Serialize organizing, journaling and undo as one application operation.
use anyhow::{bail, Context, Result};
use harbor_core::downloads::{self, DownloadsConfig, OrganizeSummary};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
};

pub struct Work {
    pub gate: Mutex<()>,
    pub closing: AtomicBool,
    directory: PathBuf,
}
impl Work {
    pub fn new(directory: &Path) -> Self {
        Self {
            gate: Mutex::new(()),
            closing: AtomicBool::new(false),
            directory: directory.into(),
        }
    }
}

#[derive(Serialize, Deserialize)]
struct MoveRecord {
    source: PathBuf,
    destination: PathBuf,
    hash: String,
}
#[derive(Default, Serialize, Deserialize)]
struct Journal {
    version: u32,
    moves: Vec<MoveRecord>,
}

fn digest(path: &Path) -> Result<String> {
    let meta = fs::symlink_metadata(path)?;
    if !meta.is_file() || meta.file_type().is_symlink() {
        bail!("Not a regular file: {}", path.display());
    }
    let mut file = fs::File::open(path)?;
    let mut hash = Sha256::new();
    let mut bytes = [0; 65536];
    loop {
        let read = file.read(&mut bytes)?;
        if read == 0 {
            break;
        }
        hash.update(&bytes[..read]);
    }
    Ok(format!("{:x}", hash.finalize()))
}

fn save_journal(work: &Work, journal: &Journal) -> Result<()> {
    fs::create_dir_all(&work.directory)?;
    let mut file = tempfile::NamedTempFile::new_in(&work.directory)?;
    file.write_all(&serde_json::to_vec_pretty(journal)?)?;
    file.as_file().sync_all()?;
    file.persist(work.directory.join("last-batch.json"))
        .map_err(|e| e.error)?;
    Ok(())
}

pub fn run_batch(
    work: &Work,
    cfg: &DownloadsConfig,
    active: Option<&AtomicBool>,
) -> Result<OrganizeSummary> {
    let _guard = work
        .gate
        .lock()
        .map_err(|_| anyhow::anyhow!("Organizer lock poisoned"))?;
    if work.closing.load(Ordering::SeqCst) {
        bail!("Harbor is shutting down");
    }
    let mut result = match active {
        Some(flag) => downloads::organize_cancellable(cfg, flag)?,
        None => downloads::organize_once(cfg)?,
    };
    downloads::append_organize_results_to_log(
        &work.directory.join("recent_moves.log"),
        &result.moved,
    );
    if !result.moved.is_empty() {
        let journal = (|| -> Result<Journal> {
            let mut moves = Vec::new();
            for item in &result.moved {
                moves.push(MoveRecord {
                    source: std::path::absolute(&item.source)?,
                    destination: std::path::absolute(&item.destination)?,
                    hash: digest(&item.destination)?,
                });
            }
            Ok(Journal { version: 1, moves })
        })();
        if let Err(error) = journal.and_then(|journal| save_journal(work, &journal)) {
            // Never offer the previous batch as if it were the newly moved batch.
            let _ = fs::remove_file(work.directory.join("last-batch.json"));
            result.errors.push(format!(
                "Files moved, but undo could not be recorded: {error:#}"
            ));
        }
    }
    Ok(result)
}

/// Undo refuses changed files and collisions, and checkpoints after each restore.
pub fn undo(work: &Work) -> Result<usize> {
    let _guard = work
        .gate
        .lock()
        .map_err(|_| anyhow::anyhow!("Organizer lock poisoned"))?;
    if work.closing.load(Ordering::SeqCst) {
        bail!("Harbor is shutting down");
    }
    let path = work.directory.join("last-batch.json");
    let mut journal: Journal =
        serde_json::from_slice(&fs::read(path).context("No recorded batch is available to undo")?)?;
    if journal.version != 1 {
        bail!("Unsupported undo journal version");
    }
    for item in &journal.moves {
        if digest(&item.destination)? != item.hash {
            bail!("Undo refused: {} has changed", item.destination.display());
        }
        match fs::symlink_metadata(&item.source) {
            Ok(meta)
                if meta.file_type().is_symlink()
                    && fs::read_link(&item.source)? == item.destination => {}
            Ok(_) => bail!("Undo refused: {} already exists", item.source.display()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
            Err(e) => return Err(e.into()),
        }
    }
    let count = journal.moves.len();
    while let Some(item) = journal.moves.last() {
        // Recheck just before each move; never replace an existing original.
        if digest(&item.destination)? != item.hash {
            bail!("Undo refused: destination changed");
        }
        let was_link = fs::symlink_metadata(&item.source).is_ok_and(|m| m.file_type().is_symlink());
        if was_link {
            if fs::read_link(&item.source)? != item.destination {
                bail!("Undo refused: original link changed");
            }
            fs::remove_file(&item.source)?;
        }
        if let Some(parent) = item.source.parent() {
            fs::create_dir_all(parent)?;
        }
        if let Err(error) = downloads::move_without_replace(&item.destination, &item.source) {
            if was_link {
                #[cfg(windows)]
                let _ = std::os::windows::fs::symlink_file(&item.destination, &item.source);
                #[cfg(unix)]
                let _ = std::os::unix::fs::symlink(&item.destination, &item.source);
            }
            return Err(error.into());
        }
        record_event(
            &work.directory.join("recent_moves.log"),
            "undone",
            &format!("Restored {}", item.source.display()),
        );
        journal.moves.pop();
        save_journal(work, &journal)?;
    }
    Ok(count)
}

fn record_event(path: &Path, status: &str, message: &str) {
    let entry = serde_json::json!({"timestamp": chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(), "status": status, "message": message});
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{entry}");
    }
}
pub fn record_health(path: &Path, error: Option<&str>) {
    record_event(
        path,
        if error.is_some() {
            "error"
        } else {
            "recovered"
        },
        error.unwrap_or("Monitoring recovered"),
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn undo_checks_content_and_collisions_then_restores() {
        let dir = tempfile::tempdir().unwrap();
        let work = Work::new(dir.path());
        let source = dir.path().join("original.txt");
        let destination = dir.path().join("moved.txt");
        fs::write(&destination, "original").unwrap();
        save_journal(
            &work,
            &Journal {
                version: 1,
                moves: vec![MoveRecord {
                    source: source.clone(),
                    destination: destination.clone(),
                    hash: digest(&destination).unwrap(),
                }],
            },
        )
        .unwrap();
        fs::write(&destination, "modified").unwrap();
        assert!(undo(&work).is_err());
        fs::write(&destination, "original").unwrap();
        fs::write(&source, "collision").unwrap();
        assert!(undo(&work).is_err());
        assert_eq!(fs::read_to_string(&source).unwrap(), "collision");
        fs::remove_file(&source).unwrap();
        assert_eq!(undo(&work).unwrap(), 1);
        assert_eq!(fs::read_to_string(source).unwrap(), "original");
        assert!(!destination.exists());
        assert_eq!(undo(&work).unwrap(), 0);
    }
}
