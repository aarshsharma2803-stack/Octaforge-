use std::process::Command;
use std::thread;
use std::time::Duration;

fn spawn_sidecar() {
    thread::spawn(|| {
        let sidecar_dir = std::env::current_dir()
            .unwrap_or_default()
            .join("sidecar");

        let result = Command::new("uv")
            .args(["run", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8765"])
            .current_dir(&sidecar_dir)
            .spawn();

        if result.is_err() {
            let _ = Command::new("python3")
                .args(["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8765"])
                .current_dir(&sidecar_dir)
                .spawn();
        }
    });

    // Give sidecar time to start
    thread::sleep(Duration::from_millis(1500));
}

#[tauri::command]
fn get_sidecar_url() -> String {
    "http://localhost:8765".to_string()
}

#[tauri::command]
async fn open_in_obsidian(path: String) -> Result<(), String> {
    // Try opening with obsidian:// URI scheme
    let obsidian_uri = format!("obsidian://open?path={}", urlencoding::encode(&path));
    Command::new("open")
        .arg(&obsidian_uri)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn open_in_finder(path: String) -> Result<(), String> {
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn run_app_in_terminal(project_path: String) -> Result<(), String> {
    // Prefer run.sh (auto-generated launcher). Fall back to README / ls.
    let escaped = project_path.replace('\\', "\\\\").replace('"', "\\\"");
    let inner = format!(
        "cd \\\"{p}\\\" && if [ -f run.sh ]; then chmod +x run.sh && ./run.sh; \
         elif [ -f README.md ]; then cat README.md | head -60; \
         else ls; fi",
        p = escaped
    );
    let script = format!("tell application \"Terminal\" to do script \"{}\"", inner);
    Command::new("osascript")
        .args(["-e", &script])
        .spawn()
        .map_err(|e| e.to_string())?;
    // Activate Terminal so window comes forward
    let _ = Command::new("osascript")
        .args(["-e", "tell application \"Terminal\" to activate"])
        .spawn();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    spawn_sidecar();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_sidecar_url,
            open_in_obsidian,
            open_in_finder,
            run_app_in_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
