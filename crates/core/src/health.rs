use crate::types::{HealthCheck, HealthCheckKind};
use anyhow::{bail, Context, Result};
use std::net::{SocketAddr, TcpStream};
use std::process::Command;
use std::thread;
use std::time::{Duration, Instant};

fn attempt(hc: &HealthCheck) -> Result<()> {
    match hc.kind {
        HealthCheckKind::None => Ok(()),
        HealthCheckKind::Http => {
            let url = hc.url.clone().unwrap_or_default();
            let res = ureq::get(&url)
                .timeout(Duration::from_millis(hc.timeout_ms.unwrap_or(5000)))
                .call();
            match res {
                Ok(r) => {
                    let s = r.status();
                    if (200..400).contains(&s) {
                        Ok(())
                    } else {
                        bail!("http {}", s)
                    }
                }
                Err(e) => bail!("http err {}", e),
            }
        }
        HealthCheckKind::Tcp => {
            let port = hc.tcp_port.unwrap_or(0);
            let addr = SocketAddr::from(([127, 0, 0, 1], port));
            if TcpStream::connect_timeout(
                &addr,
                Duration::from_millis(hc.timeout_ms.unwrap_or(2000)),
            )
            .is_ok()
            {
                Ok(())
            } else {
                bail!("tcp")
            }
        }
        HealthCheckKind::Command => {
            let cmd = hc.command.clone().unwrap_or_default();
            if cmd.is_empty() {
                bail!("empty command")
            }
            let status = if cfg!(windows) {
                Command::new("cmd")
                    .arg("/C")
                    .arg(cmd)
                    .status()
                    .context("command")?
            } else {
                Command::new("sh")
                    .arg("-c")
                    .arg(cmd)
                    .status()
                    .context("command")?
            };
            if status.success() {
                Ok(())
            } else {
                bail!("command failed")
            }
        }
    }
}

pub fn wait_ready(hc: &HealthCheck) -> Result<()> {
    let retries = hc.retries.unwrap_or(10);
    let timeout_ms = hc.timeout_ms.unwrap_or(5000);
    let start = Instant::now();
    for _ in 0..retries {
        let r = attempt(hc);
        if r.is_ok() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(300));
        if start.elapsed() > Duration::from_millis(timeout_ms * 2) {
            break;
        }
    }
    bail!("not ready")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{HealthCheck, HealthCheckKind};

    #[test]
    fn test_wait_ready_command_success() {
        let cmd = if cfg!(windows) { "echo ok" } else { "true" };
        let hc = HealthCheck {
            kind: HealthCheckKind::Command,
            command: Some(cmd.to_string()),
            url: None,
            tcp_port: None,
            timeout_ms: Some(1000),
            retries: Some(1),
        };
        assert!(wait_ready(&hc).is_ok());
    }

    #[test]
    fn test_wait_ready_command_fail() {
        let cmd = if cfg!(windows) { "exit 1" } else { "false" };
        let hc = HealthCheck {
            kind: HealthCheckKind::Command,
            command: Some(cmd.to_string()),
            url: None,
            tcp_port: None,
            timeout_ms: Some(100),
            retries: Some(1),
        };
        assert!(wait_ready(&hc).is_err());
    }

    #[test]
    fn test_wait_ready_tcp_success() {
        // Find a random free port
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();

        // Spawn a thread to accept connections (simulating a server)
        thread::spawn(move || {
            let _ = listener.accept();
        });

        let hc = HealthCheck {
            kind: HealthCheckKind::Tcp,
            command: None,
            url: None,
            tcp_port: Some(port),
            timeout_ms: Some(1000),
            retries: Some(3),
        };
        assert!(wait_ready(&hc).is_ok());
    }
    #[test]
    fn test_wait_ready_timeout() {
        // Use a command that always fails
        let cmd = if cfg!(windows) { "exit 1" } else { "false" };
        let hc = HealthCheck {
            kind: HealthCheckKind::Command,
            command: Some(cmd.to_string()),
            url: None,
            tcp_port: None,
            timeout_ms: Some(10), // Short timeout
            retries: Some(10),    // Many retries, should hit timeout first
        };
        let res = wait_ready(&hc);
        assert!(res.is_err());
    }

    #[test]
    fn test_health_check_none() {
        let hc = HealthCheck {
            kind: HealthCheckKind::None,
            command: None,
            url: None,
            tcp_port: None,
            timeout_ms: None,
            retries: None,
        };
        assert!(wait_ready(&hc).is_ok());
    }
}
