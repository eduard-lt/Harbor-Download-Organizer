use serde::{Deserialize, Serialize};

/// Generates a new random UUID string; used as the serde default for `Rule::id`.
pub fn new_rule_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    /// Stable identifier for this rule. Auto-generated when deserializing old configs
    /// that predate this field, ensuring backward compatibility.
    #[serde(default = "new_rule_id")]
    pub id: String,
    pub name: String,
    pub extensions: Option<Vec<String>>,
    pub pattern: Option<String>,
    pub min_size_bytes: Option<u64>,
    pub max_size_bytes: Option<u64>,
    pub target_dir: String,
    #[serde(default)]
    pub create_symlink: bool,
    #[serde(default = "default_enabled")]
    pub enabled: bool,
}

fn default_enabled() -> bool {
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rule_serde() {
        let r = Rule {
            id: "test-id".to_string(),
            name: "rule".to_string(),
            extensions: Some(vec!["txt".to_string()]),
            pattern: None,
            min_size_bytes: None,
            max_size_bytes: None,
            target_dir: "target".to_string(),
            create_symlink: false,
            enabled: true,
        };
        let json = serde_json::to_string(&r).unwrap();
        let r2: Rule = serde_json::from_str(&json).unwrap();
        assert_eq!(r.name, r2.name);
    }

    #[test]
    fn test_rule_serde_missing_id_gets_default() {
        // Simulates deserializing an old config that has no `id` field.
        let json = r#"{"name":"old","target_dir":"t","extensions":null,"pattern":null,"min_size_bytes":null,"max_size_bytes":null}"#;
        let r: Rule = serde_json::from_str(json).unwrap();
        assert_eq!(r.name, "old");
        // A UUID should have been generated automatically.
        assert!(!r.id.is_empty());
    }
}
