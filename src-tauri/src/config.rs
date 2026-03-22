use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

use std::collections::HashMap;

use crate::models::WindowSession;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct AppConfig {
    pub folders: Vec<String>,
    pub session: Vec<WindowSession>,
}

pub struct AppState {
    pub config: Mutex<AppConfig>,
    pub active_sessions: Mutex<HashMap<String, String>>,
}

impl AppState {
    pub fn new() -> Self {
        let config = load_config().unwrap_or_default();
        let mut active_sessions = HashMap::new();

        // Populate active_sessions from loaded config on startup
        for s in &config.session {
            active_sessions.insert(s.label.clone(), s.path.clone());
        }

        Self {
            config: Mutex::new(config),
            active_sessions: Mutex::new(active_sessions),
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

pub fn persist_session(state: &AppState) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    let sessions = state.active_sessions.lock().map_err(|e| e.to_string())?;

    config.session = sessions
        .iter()
        .map(|(label, path)| WindowSession {
            label: label.clone(),
            path: path.clone(),
        })
        .collect();

    save_config(&config)
}

pub fn validate_path_in_workspace(state: &State<'_, AppState>, path: &str) -> Result<(), String> {
    let path_obj = std::path::Path::new(path);

    // Canonicalize parent directory to resolve any ".." traversals
    let parent = path_obj.parent().ok_or("Invalid path: no parent")?;
    let canonical_parent =
        std::fs::canonicalize(parent).map_err(|e| format!("Invalid path: {}", e))?;

    let mut is_allowed = false;

    if let Ok(config) = state.config.lock() {
        for folder in &config.folders {
            if let Ok(canonical_folder) = std::fs::canonicalize(folder) {
                if canonical_parent.starts_with(canonical_folder) {
                    is_allowed = true;
                    break;
                }
            }
        }
    }

    if !is_allowed {
        if let Ok(sessions) = state.active_sessions.lock() {
            for session_path in sessions.values() {
                if let Ok(canonical_session) = std::fs::canonicalize(session_path) {
                    if canonical_parent.starts_with(canonical_session) {
                        is_allowed = true;
                        break;
                    }
                }
            }
        }
    }

    if !is_allowed {
        return Err("Permission denied: Path is outside of allowed workspaces".to_string());
    }

    Ok(())
}
