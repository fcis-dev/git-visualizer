use git2::{Repository, Sort};
use serde::Serialize;

#[derive(Debug, Serialize)]
struct CommitData {
    hash: String,
    message: String,
    author: String,
    date: i64,
    parents: Vec<String>,
}

#[tauri::command]
fn get_git_graph(path: &str) -> Result<Vec<CommitData>, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME).map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;

    let mut commits = Vec::new();
    for oid in revwalk {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        
        let parents: Vec<String> = commit.parent_ids()
            .map(|p| p.to_string())
            .collect();

        commits.push(CommitData {
            hash: oid.to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            date: commit.time().seconds(),
            parents,
        });
    }

    Ok(commits)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![get_git_graph])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
