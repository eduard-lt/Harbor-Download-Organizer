use anyhow::Result;
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "harbor")]
#[command(version = env!("CARGO_PKG_VERSION"))]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(name = "downloads-init")]
    Init {
        #[arg(default_value = "harbor.downloads.yaml")]
        path: String,
    },
    #[command(name = "downloads-organize")]
    Organize {
        #[arg(default_value = "harbor.downloads.yaml")]
        path: String,
    },
    #[command(name = "downloads-watch")]
    Watch {
        #[arg(default_value = "harbor.downloads.yaml")]
        path: String,
        #[arg(default_value_t = 5)]
        interval_secs: u64,
    },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    execute_command(cli.command, None)
}

fn execute_command(
    command: Commands,
    shutdown_signal: Option<std::sync::Arc<std::sync::atomic::AtomicBool>>,
) -> Result<()> {
    match command {
        Commands::Init { path } => {
            init_downloads_config(&path)?;
            Ok(())
        }
        Commands::Organize { path } => {
            let cfg = harbor_core::downloads::load_downloads_config(&path)?;
            let summary = harbor_core::downloads::organize_once(&cfg)?;
            for err in &summary.errors {
                eprintln!("[Harbor] {err}");
            }
            for result in summary.moved {
                let sym = result.symlink_info.unwrap_or_default();
                println!(
                    "{} -> {} ({}) {}",
                    result.source.display(),
                    result.destination.display(),
                    result.rule_name,
                    sym
                );
            }
            Ok(())
        }
        Commands::Watch {
            path,
            interval_secs,
        } => {
            let cfg = harbor_core::downloads::load_downloads_config(&path)?;
            let should_continue = shutdown_signal
                .unwrap_or_else(|| std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true)));
            harbor_core::downloads::watch_polling(
                &cfg,
                interval_secs,
                &should_continue,
                |actions| {
                    for result in actions {
                        let sym = result.symlink_info.as_deref().unwrap_or_default();
                        println!(
                            "{} -> {} ({}) {}",
                            result.source.display(),
                            result.destination.display(),
                            result.rule_name,
                            sym
                        );
                    }
                },
            )?;
            Ok(())
        }
    }
}

fn init_downloads_config(path: &str) -> Result<()> {
    harbor_core::config::save(
        std::path::Path::new(path),
        &harbor_core::downloads::default_config(),
    )?;
    println!("created {}", path);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicBool;
    use std::sync::Arc;

    #[test]
    fn test_init_downloads_config() {
        let directory = tempfile::tempdir().unwrap();
        let file = directory.path().join("config.yaml");
        let path = file.to_str().unwrap();
        execute_command(
            Commands::Init {
                path: path.to_string(),
            },
            None,
        )
        .unwrap();
        let content = std::fs::read_to_string(path).unwrap();
        assert!(content.contains("download_dir:"));
        assert!(content.contains("rules:"));
    }

    #[test]
    fn test_downloads_organize() {
        let temp = tempfile::TempDir::new().unwrap();
        let dl_dir = temp.path().join("DL");
        std::fs::create_dir(&dl_dir).unwrap();
        let cfg_path = temp.path().join("config.yaml");

        // Create config with simple rule
        let cfg_content = format!(
            r#"
download_dir: "{}"
min_age_secs: 0
rules:
  - name: test
    extensions: ["txt"]
    target_dir: "{}"
"#,
            dl_dir.display().to_string().replace("\\", "\\\\"),
            temp.path()
                .join("Target")
                .display()
                .to_string()
                .replace("\\", "\\\\")
        );
        std::fs::write(&cfg_path, cfg_content).unwrap();

        // Create file
        std::fs::write(dl_dir.join("test.txt"), "content").unwrap();

        assert!(execute_command(
            Commands::Organize {
                path: cfg_path.to_str().unwrap().to_string()
            },
            None
        )
        .is_ok());

        assert!(temp.path().join("Target").join("test.txt").exists());
    }

    #[test]
    fn test_downloads_watch() {
        let temp = tempfile::TempDir::new().unwrap();
        let dl_dir = temp.path().join("DL");
        std::fs::create_dir(&dl_dir).unwrap();
        let cfg_path = temp.path().join("config.yaml");
        std::fs::write(
            &cfg_path,
            format!(
                "download_dir: \"{}\"\nrules: []",
                dl_dir.display().to_string().replace("\\", "\\\\")
            ),
        )
        .unwrap();

        let signal = Arc::new(AtomicBool::new(false)); // Stop immediately
        assert!(execute_command(
            Commands::Watch {
                path: cfg_path.to_str().unwrap().to_string(),
                interval_secs: 1
            },
            Some(signal)
        )
        .is_ok());
    }
}
