use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunningService {
    pub name: String,
    pub pid: i32,
    #[serde(default)]
    pub start_time: Option<u64>,
    pub stdout_log: PathBuf,
    pub stderr_log: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct State {
    pub services: Vec<RunningService>,
}

pub fn read_state(path: impl AsRef<Path>) -> Result<Option<State>> {
    let p = path.as_ref();
    if !p.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(p).with_context(|| format!("read {}", p.display()))?;
    let s: State = serde_json::from_str(&content).context("parse state")?;
    Ok(Some(s))
}

pub fn write_state(path: impl AsRef<Path>, state: &State) -> Result<()> {
    let p = path.as_ref();
    let content = serde_json::to_string_pretty(state).context("serialize state")?;
    fs::write(p, content).with_context(|| format!("write {}", p.display()))?;
    Ok(())
}
