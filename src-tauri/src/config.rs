use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppConfig {
    pub folders: Vec<String>,
}

pub struct AppState {
    pub config: Mutex<AppConfig>,
}

impl AppState {
    pub fn new() -> Self {
        let config = load_config().unwrap_or_default();
        Self {
            config: Mutex::new(config),
        }
    }
}

const CONFIG_DIR_NAME: &str = "git-visualizer";
const CONFIG_FILE_NAME: &str = "config.json";

fn get_config_path() -> Option<PathBuf> {
    dirs::config_dir().map(|mut path| {
        path.push(CONFIG_DIR_NAME);
        if !path.exists() {
            let _ = fs::create_dir_all(&path);
        }
        path.push(CONFIG_FILE_NAME);
        path
    })
}

fn load_config() -> Option<AppConfig> {
    let path = get_config_path()?;
    if path.exists() {
        let content = fs::read_to_string(path).ok()?;
        serde_json::from_str(&content).ok()
    } else {
        None
    }
}

pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let path = get_config_path().ok_or("Could not determine config path")?;
    let content = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

pub fn add_folder(state: State<AppState>, path: String) -> Result<Vec<String>, String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;

    // Normalize path to verify existence and avoid duplicates
    let p = Path::new(&path);
    if !p.exists() || !p.is_dir() {
        return Err("Path does not exist or is not a directory".to_string());
    }

    // Simple normalization: just use what the user provided, OR canonicalize.
    // Canonicalize can be tricky with UNC paths on Windows, so we'll stick to string dedup for now.
    // Ideally we'd consistency normalize separators.
    let normalized = path.replace("\\", "/");

    if !config.folders.contains(&normalized) {
        config.folders.push(normalized);
        save_config(&config)?;
    }

    Ok(config.folders.clone())
}

pub fn remove_folder(state: State<AppState>, path: String) -> Result<Vec<String>, String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    let normalized = path.replace("\\", "/");

    if let Some(pos) = config.folders.iter().position(|x| x == &normalized) {
        config.folders.remove(pos);
        save_config(&config)?;
    }

    Ok(config.folders.clone())
}

pub fn list_folders(state: State<AppState>) -> Result<Vec<String>, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.folders.clone())
}
