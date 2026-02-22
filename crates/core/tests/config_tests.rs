use harbor_core::config::validate_config;

#[test]
fn parse_and_validate_sample() {
    let sample = r#"
services:
  - name: web
    command: "node server.js"
    cwd: "."
    depends_on: []
    health_check:
      kind: http
      url: "http://localhost:3000/health"
      timeout_ms: 5000
      retries: 3
"#;
    let cfg: harbor_core::types::WorkspaceConfig = serde_yaml::from_str(sample).unwrap();
    validate_config(&cfg).unwrap();
}
