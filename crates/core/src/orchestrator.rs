use crate::health::wait_ready;
use crate::state::{write_state, RunningService, State};
use crate::types::{Service, WorkspaceConfig};
use anyhow::{bail, Context, Result};
use std::collections::{HashMap, VecDeque};
use std::fs::{create_dir_all, File};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use sysinfo::{Pid, ProcessesToUpdate, System};

fn topo_order(services: &[Service]) -> Result<Vec<String>> {
    let mut indeg: HashMap<String, usize> = HashMap::new();
    let mut adj: HashMap<String, Vec<String>> = HashMap::new();
    for s in services {
        indeg.entry(s.name.clone()).or_default();
    }
    for s in services {
        for d in s.depends_on.clone().unwrap_or_default() {
            indeg.entry(s.name.clone()).and_modify(|e| *e += 1);
            adj.entry(d).or_default().push(s.name.clone());
        }
    }
    let mut q: VecDeque<String> = indeg
        .iter()
        .filter(|(_, &v)| v == 0)
        .map(|(k, _)| k.clone())
        .collect();
    let mut res = Vec::new();
    let mut indeg_mut = indeg.clone();
    while let Some(u) = q.pop_front() {
        res.push(u.clone());
        if let Some(neigh) = adj.get(&u) {
            for v in neigh {
                if let Some(e) = indeg_mut.get_mut(v) {
                    *e -= 1;
                    if *e == 0 {
                        q.push_back(v.clone());
                    }
                }
            }
        }
    }
    if res.len() != indeg.len() {
        bail!("cycle in dependencies")
    }
    Ok(res)
}

fn spawn_service(base_dir: &Path, logs_dir: &Path, s: &Service) -> Result<RunningService> {
    let out_path = logs_dir.join(format!("{}.out.log", s.name));
    let err_path = logs_dir.join(format!("{}.err.log", s.name));
    let out_file = File::options().create(true).append(true).open(&out_path)?;
    let err_file = File::options().create(true).append(true).open(&err_path)?;
    let mut cmd = if cfg!(windows) {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(&s.command);
        c
    } else {
        let mut c = Command::new("sh");
        c.arg("-c").arg(&s.command);
        c
    };
    if let Some(cwd) = &s.cwd {
        let p = base_dir.join(cwd);
        cmd.current_dir(p);
    }
    if let Some(env) = &s.env {
        for (k, v) in env {
            cmd.env(k, v);
        }
    }
    cmd.stdout(Stdio::from(out_file));
    cmd.stderr(Stdio::from(err_file));
    let child: Child = cmd.spawn().context("spawn")?;
    let pid = child.id() as i32;
    let mut sys = System::new_all();
    sys.refresh_processes(ProcessesToUpdate::Some(&[Pid::from_u32(pid as u32)]), true);
    let start_time = sys
        .process(Pid::from_u32(pid as u32))
        .map(|p| p.start_time());
    Ok(RunningService {
        name: s.name.clone(),
        pid,
        start_time,
        stdout_log: out_path,
        stderr_log: err_path,
    })
}

pub fn up(
    cfg: &WorkspaceConfig,
    base_dir: impl AsRef<Path>,
    state_path: impl AsRef<Path>,
) -> Result<State> {
    let base = base_dir.as_ref();
    let logs_dir = base.join("logs");
    create_dir_all(&logs_dir)?;
    let order = topo_order(&cfg.services)?;
    let mut by_name: HashMap<String, &Service> = HashMap::new();
    for s in &cfg.services {
        by_name.insert(s.name.clone(), s);
    }
    let mut running: Vec<RunningService> = Vec::new();
    for name in order {
        let s = by_name.get(&name).unwrap();
        let rs = spawn_service(base, &logs_dir, s)?;
        if let Some(hc) = &s.health_check {
            let _ = wait_ready(hc);
        }
        running.push(rs);
    }
    let st = State { services: running };
    write_state(state_path, &st)?;
    Ok(st)
}

pub fn down(state_path: impl AsRef<Path>) -> Result<()> {
    let p = state_path.as_ref();
    let st = crate::state::read_state(p)?;
    if st.is_none() {
        return Ok(());
    }
    let st = st.unwrap();
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    for s in st.services {
        if let Some(proc_) = sys.process(Pid::from_u32(s.pid as u32)) {
            if let Some(st_time) = s.start_time {
                if proc_.start_time() != st_time {
                    continue;
                }
            }
            let _ = proc_.kill();
        }
    }
    std::fs::remove_file(p).ok();
    Ok(())
}

pub fn status(state_path: impl AsRef<Path>) -> Result<Vec<(String, i32, bool)>> {
    let st = crate::state::read_state(state_path)?;
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let mut res = Vec::new();
    if let Some(st) = st {
        for s in st.services {
            let mut alive = false;
            if let Some(proc_) = sys.process(Pid::from_u32(s.pid as u32)) {
                if let Some(st_time) = s.start_time {
                    if proc_.start_time() == st_time {
                        alive = true;
                    }
                } else {
                    alive = true; // Fallback for old state without start_time
                }
            }
            res.push((s.name, s.pid, alive));
        }
    }
    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::Service;

    fn make_service(name: &str, depends_on: Vec<&str>) -> Service {
        Service {
            name: name.to_string(),
            command: "echo".to_string(),
            cwd: None,
            env: None,
            depends_on: Some(depends_on.into_iter().map(|s| s.to_string()).collect()),
            health_check: None,
        }
    }

    #[test]
    fn test_topo_order_basic() {
        let s1 = make_service("db", vec![]);
        let s2 = make_service("backend", vec!["db"]);
        let s3 = make_service("frontend", vec!["backend"]);
        let services = vec![s1, s2, s3];

        let order = topo_order(&services).unwrap();
        assert_eq!(
            order,
            vec![
                "db".to_string(),
                "backend".to_string(),
                "frontend".to_string()
            ]
        );
    }

    #[test]
    fn test_topo_order_independent() {
        let s1 = make_service("a", vec![]);
        let s2 = make_service("b", vec![]);
        let services = vec![s1, s2];
        let order = topo_order(&services).unwrap();
        assert_eq!(order.len(), 2);
        assert!(order.contains(&"a".to_string()));
        assert!(order.contains(&"b".to_string()));
    }

    #[test]
    fn test_topo_order_cycle() {
        let s1 = make_service("a", vec!["b"]);
        let s2 = make_service("b", vec!["a"]);
        let services = vec![s1, s2];
        let res = topo_order(&services);
        assert!(res.is_err());
    }

    #[test]
    fn test_spawn_service_echo() {
        let temp = tempfile::TempDir::new().unwrap();
        let logs = temp.path().join("logs");
        std::fs::create_dir(&logs).unwrap();

        let s = Service {
            name: "test".to_string(),
            command: "echo hello".to_string(),
            cwd: None,
            env: Some([(String::from("TEST_VAR"), String::from("val"))].into()),
            depends_on: None,
            health_check: None,
        };

        let res = spawn_service(temp.path(), &logs, &s).unwrap();
        assert_eq!(res.name, "test");
        assert!(res.pid > 0);

        // Wait a bit for output
        std::thread::sleep(std::time::Duration::from_millis(50));
        let out = std::fs::read_to_string(&res.stdout_log).unwrap();
        assert!(out.trim().contains("hello"));
    }

    #[test]
    fn test_up_and_down() {
        let temp = tempfile::TempDir::new().unwrap();
        let state_path = temp.path().join("state.json");

        let s1 = Service {
            name: "s1".to_string(),
            command: if cfg!(windows) {
                // Ping for a few seconds to simulate a running service
                "ping -n 5 127.0.0.1 > nul".to_string()
            } else {
                "sleep 5".to_string()
            },
            cwd: None,
            env: None,
            depends_on: None,
            health_check: None,
        };

        let cfg = WorkspaceConfig { services: vec![s1] };

        let state = up(&cfg, temp.path(), &state_path).unwrap();
        assert_eq!(state.services.len(), 1);
        let pid = state.services[0].pid;

        // Check status
        let st = status(&state_path).unwrap();
        assert_eq!(st.len(), 1);
        assert_eq!(st[0].1, pid);
        assert!(st[0].2); // should be alive

        // Down
        down(&state_path).unwrap();

        // Wait bit for kill
        std::thread::sleep(std::time::Duration::from_millis(100));

        let mut sys = System::new();
        sys.refresh_processes(ProcessesToUpdate::Some(&[Pid::from_u32(pid as u32)]), true);
        assert!(sys.process(Pid::from_u32(pid as u32)).is_none());
    }
    #[test]
    fn test_spawn_service_invalid_cwd() {
        let temp = tempfile::TempDir::new().unwrap();
        let logs = temp.path().join("logs");
        std::fs::create_dir(&logs).unwrap();

        let s = Service {
            name: "invalid_cwd".to_string(),
            command: "echo hello".to_string(),
            cwd: Some("nonexistent_dir".to_string()),
            env: None,
            depends_on: None,
            health_check: None,
        };

        let res = spawn_service(temp.path(), &logs, &s);
        assert!(res.is_err());
    }

    #[test]
    fn test_down_no_state() {
        let temp = tempfile::TempDir::new().unwrap();
        let state_path = temp.path().join("no_state.json");
        let res = down(&state_path);
        assert!(res.is_ok());
    }

    #[test]
    fn test_down_dead_process() {
        let temp = tempfile::TempDir::new().unwrap();
        let state_path = temp.path().join("state_dead.json");

        // Mock a service that just ran (we can't easily mock a dead PID that matches our structure without writing state)
        // So we run a real quick process
        let s1 = Service {
            name: "quick".to_string(),
            command: "echo quick".to_string(),
            cwd: None,
            env: None,
            depends_on: None,
            health_check: None,
        };
        let cfg = WorkspaceConfig { services: vec![s1] };

        // Up
        let _ = up(&cfg, temp.path(), &state_path).unwrap();

        // Wait for it to finish
        std::thread::sleep(std::time::Duration::from_millis(200));

        // Now down
        let res = down(&state_path);
        assert!(res.is_ok());
        assert!(!state_path.exists());
    }
}
