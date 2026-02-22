use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub services: Vec<Service>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub name: String,
    pub command: String,
    pub cwd: Option<String>,
    pub env: Option<HashMap<String, String>>,
    pub depends_on: Option<Vec<String>>,
    pub health_check: Option<HealthCheck>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheck {
    pub kind: HealthCheckKind,
    pub command: Option<String>,
    pub url: Option<String>,
    pub tcp_port: Option<u16>,
    pub timeout_ms: Option<u64>,
    pub retries: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthCheckKind {
    Command,
    Http,
    Tcp,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub name: String,
    pub extensions: Option<Vec<String>>,
    pub pattern: Option<String>,
    pub min_size_bytes: Option<u64>,
    pub max_size_bytes: Option<u64>,
    pub target_dir: String,
    pub create_symlink: Option<bool>,
    #[serde(default = "default_enabled")]
    pub enabled: Option<bool>,
}

fn default_enabled() -> Option<bool> {
    Some(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_serde() {
        let s = Service {
            name: "test".to_string(),
            command: "echo".to_string(),
            cwd: Some(".".to_string()),
            env: None,
            depends_on: None,
            health_check: None,
        };
        let json = serde_json::to_string(&s).unwrap();
        let s2: Service = serde_json::from_str(&json).unwrap();
        assert_eq!(s.name, s2.name);
    }

    #[test]
    fn test_rule_serde() {
        let r = Rule {
            name: "rule".to_string(),
            extensions: Some(vec!["txt".to_string()]),
            pattern: None,
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".to_string(),
            create_symlink: None,
            enabled: Some(true),
        };
        let json = serde_json::to_string(&r).unwrap();
        let r2: Rule = serde_json::from_str(&json).unwrap();
        assert_eq!(r.name, r2.name);
    }
}
