use crate::types::WorkspaceConfig;
use anyhow::{bail, Context, Result};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

pub fn load_config(path: impl AsRef<Path>) -> Result<WorkspaceConfig> {
    let p = path.as_ref();
    let content = fs::read_to_string(p).with_context(|| format!("read {}", p.display()))?;
    let ext = p
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "yaml" | "yml" => {
            let cfg: WorkspaceConfig = serde_yaml::from_str(&content).context("parse yaml")?;
            Ok(cfg)
        }
        "json" => {
            let cfg: WorkspaceConfig = serde_json::from_str(&content).context("parse json")?;
            Ok(cfg)
        }
        _ => {
            let yaml = serde_yaml::from_str::<WorkspaceConfig>(&content);
            if let Ok(cfg) = yaml {
                return Ok(cfg);
            }
            let json = serde_json::from_str::<WorkspaceConfig>(&content);
            if let Ok(cfg) = json {
                return Ok(cfg);
            }
            bail!("unsupported config format");
        }
    }
}

pub fn validate_config(cfg: &WorkspaceConfig) -> Result<()> {
    let mut names = HashSet::new();
    for s in &cfg.services {
        if !names.insert(&s.name) {
            bail!("duplicate service name {}", s.name);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Service;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_load_config_yaml_ext() {
        let mut file = tempfile::Builder::new().suffix(".yaml").tempfile().unwrap();
        writeln!(
            file,
            r#"
services:
  - name: test
    command: echo hello
"#
        )
        .unwrap();

        let cfg = load_config(file.path()).unwrap();
        assert_eq!(cfg.services.len(), 1);
        assert_eq!(cfg.services[0].name, "test");
    }

    #[test]
    fn test_load_config_json_ext() {
        let mut file = tempfile::Builder::new().suffix(".json").tempfile().unwrap();
        writeln!(
            file,
            r#"
{{
  "services": [
    {{
      "name": "test",
      "command": "echo hello"
    }}
  ]
}}
"#
        )
        .unwrap();

        let cfg = load_config(file.path()).unwrap();
        assert_eq!(cfg.services.len(), 1);
        assert_eq!(cfg.services[0].name, "test");
    }

    #[test]
    fn test_load_config_unknown_ext_yaml() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(
            file,
            r#"
services:
  - name: test
    command: echo hello
"#
        )
        .unwrap();

        let cfg = load_config(file.path()).unwrap();
        assert_eq!(cfg.services.len(), 1);
    }

    #[test]
    fn test_load_config_unknown_ext_json() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(
            file,
            r#"
{{
  "services": [
    {{
        "name": "test",
        "command": "echo hello"
    }}
  ]
}}
"#
        )
        .unwrap();

        let cfg = load_config(file.path()).unwrap();
        assert_eq!(cfg.services.len(), 1);
    }

    #[test]
    fn test_load_config_fail_parse() {
        let mut file = tempfile::Builder::new().suffix(".yaml").tempfile().unwrap();
        writeln!(file, "invalid yaml").unwrap();
        let res = load_config(file.path());
        assert!(res.is_err());
    }

    #[test]
    fn test_load_config_fail_read() {
        let res = load_config(Path::new("non_existent_file.yaml"));
        assert!(res.is_err());
    }

    #[test]
    fn test_validate_config_duplicate() {
        let s = Service {
            name: "s1".to_string(),
            command: "cmd".to_string(),
            cwd: None,
            env: None,
            depends_on: None,
            health_check: None,
        };
        let cfg = WorkspaceConfig {
            services: vec![s.clone(), s.clone()],
        };
        let res = validate_config(&cfg);
        assert!(res.is_err());
        assert!(res.unwrap_err().to_string().contains("duplicate service"));
    }

    #[test]
    fn test_validate_config_ok() {
        let s1 = Service {
            name: "s1".to_string(),
            command: "cmd".to_string(),
            cwd: None,
            env: None,
            depends_on: None,
            health_check: None,
        };
        let s2 = Service {
            name: "s2".to_string(),
            command: "cmd".to_string(),
            cwd: None,
            env: None,
            depends_on: None,
            health_check: None,
        };
        let cfg = WorkspaceConfig {
            services: vec![s1, s2],
        };
        let res = validate_config(&cfg);
        assert!(res.is_ok());
    }
}
