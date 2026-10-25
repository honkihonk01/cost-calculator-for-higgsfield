// Gerechnet wird vollständig im Frontend (docs/ARCHITECTURE.md, Abschnitt Tauri). Einziger eigener Befehl: der
// Credit-Stand aus dem Higgsfield-Konto über die angemeldete Higgsfield-Kommandozeile (docs/DECISIONS.md 2026-10-25).

use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

const TIMEOUT: Duration = Duration::from_secs(15);

/// Ordner, in denen die Higgsfield-Kommandozeile liegen kann. Eine aus dem Finder gestartete App kennt den
/// Suchpfad des Terminals nicht; deshalb zusätzlich die üblichen Orte von Homebrew, ~/.local und nvm.
fn candidate_dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = std::env::var_os("PATH")
        .map(|path| std::env::split_paths(&path).collect())
        .unwrap_or_default();
    let home = std::env::var_os("HOME").map(PathBuf::from);
    if let Some(home) = &home {
        dirs.push(home.join(".local/bin"));
    }
    dirs.push(PathBuf::from("/opt/homebrew/bin"));
    dirs.push(PathBuf::from("/usr/local/bin"));
    if let Some(home) = &home {
        if let Ok(entries) = std::fs::read_dir(home.join(".nvm/versions/node")) {
            let mut versions: Vec<PathBuf> = entries.filter_map(|entry| entry.ok()).map(|entry| entry.path()).collect();
            versions.sort();
            versions.reverse();
            dirs.extend(versions.into_iter().map(|version| version.join("bin")));
        }
    }
    dirs
}

fn read_credits() -> Result<f64, String> {
    let dir = candidate_dirs()
        .into_iter()
        .find(|dir| dir.join("higgsfield").is_file())
        .ok_or("Die Higgsfield-Kommandozeile ist auf diesem Mac nicht installiert.")?;
    // Die Kommandozeile ist ein Node-Skript; Node liegt bei nvm im selben Ordner.
    let path = format!("{}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin", dir.display());
    let mut child = Command::new(dir.join("higgsfield"))
        .args(["account", "status", "--json"])
        .env("PATH", path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("Die Higgsfield-Kommandozeile ließ sich nicht starten: {error}"))?;
    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() > TIMEOUT => {
                let _ = child.kill();
                return Err("Higgsfield hat nicht innerhalb von 15 Sekunden geantwortet.".into());
            }
            Ok(None) => std::thread::sleep(Duration::from_millis(100)),
            Err(error) => return Err(format!("Der Abruf bei Higgsfield ist fehlgeschlagen: {error}")),
        }
    };
    let mut stdout = String::new();
    let mut stderr = String::new();
    if let Some(mut out) = child.stdout.take() {
        let _ = out.read_to_string(&mut stdout);
    }
    if let Some(mut err) = child.stderr.take() {
        let _ = err.read_to_string(&mut stderr);
    }
    if !status.success() {
        let reason = stderr.lines().chain(stdout.lines()).find(|line| !line.trim().is_empty()).unwrap_or("ohne Meldung");
        return Err(format!(
            "Higgsfield meldet: {}. Ist die Anmeldung abgelaufen, im Terminal `higgsfield auth login` ausführen.",
            reason.trim()
        ));
    }
    let json: serde_json::Value =
        serde_json::from_str(&stdout).map_err(|_| "Die Antwort von Higgsfield war kein gültiges JSON.".to_string())?;
    json.get("credits")
        .and_then(serde_json::Value::as_f64)
        .ok_or_else(|| "In der Antwort von Higgsfield fehlt der Credit-Stand.".to_string())
}

#[tauri::command]
async fn higgsfield_credits() -> Result<f64, String> {
    tauri::async_runtime::spawn_blocking(read_credits)
        .await
        .map_err(|error| format!("Der Abruf bei Higgsfield ist abgebrochen: {error}"))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![higgsfield_credits])
        .run(tauri::generate_context!())
        .expect("Die App konnte nicht gestartet werden");
}
