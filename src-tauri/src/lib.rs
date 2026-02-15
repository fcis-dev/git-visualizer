use git2::{Repository, Sort};
use serde::Serialize;
use std::path::Path;
use tauri::State;
use walkdir::WalkDir;

mod config;
use config::AppState;

#[derive(Debug, Serialize)]
struct CommitData {
    hash: String,
    message: String,
    author: String,
    date: i64,
    parents: Vec<String>,
}

#[derive(Debug, Serialize)]
struct RepoData {
    path: String,
    name: String,
    branch: String,
}

#[tauri::command]
fn get_git_graph(path: &str) -> Result<Vec<CommitData>, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| e.to_string())?;
    revwalk.push_head().map_err(|e| e.to_string())?;

    let mut commits = Vec::new();
    for oid in revwalk {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

        let parents: Vec<String> = commit.parent_ids().map(|p| p.to_string()).collect();

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

#[tauri::command]
fn add_folder(state: State<AppState>, path: String) -> Result<Vec<String>, String> {
    config::add_folder(state, path)
}

#[tauri::command]
fn remove_folder(state: State<AppState>, path: String) -> Result<Vec<String>, String> {
    config::remove_folder(state, path)
}

#[tauri::command]
fn list_folders(state: State<AppState>) -> Result<Vec<String>, String> {
    config::list_folders(state)
}

#[tauri::command]
fn get_repos_in_folder(path: &str) -> Result<Vec<RepoData>, String> {
    let mut repos = Vec::new();

    // Walk directory up to depth 3 to find .git folders
    for entry in WalkDir::new(path)
        .max_depth(3)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_dir() && entry.file_name() == ".git" {
            if let Some(parent) = entry.path().parent() {
                let repo_path = parent.to_string_lossy().replace("\\", "/");
                let name = parent
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();

                let mut branch = "HEAD".to_string();
                if let Ok(repo) = Repository::open(&repo_path) {
                    if let Ok(head) = repo.head() {
                        if let Some(branch_name) = head.shorthand() {
                            branch = branch_name.to_string();
                        }
                    }
                }

                repos.push(RepoData {
                    path: repo_path,
                    name,
                    branch,
                });
            }
        }
    }

    Ok(repos)
}

#[derive(Debug, Serialize)]
struct FileStatus {
    path: String,
    status: String, // "modified", "staged", "new", "deleted"
}

#[tauri::command]
fn get_git_status(path: &str) -> Result<Vec<FileStatus>, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut statuses = Vec::new();

    // StatusOptions defaults are usually fine, but let's be explicit about headers/modified
    let mut opts = git2::StatusOptions::new();
    opts.include_untracked(true);

    let repo_statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    for entry in repo_statuses.iter() {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();

        let status_str = if status.is_index_new()
            || status.is_index_modified()
            || status.is_index_deleted()
            || status.is_index_renamed()
            || status.is_index_typechange()
        {
            "staged"
        } else if status.is_wt_new() {
            "new"
        } else if status.is_wt_modified() || status.is_wt_renamed() || status.is_wt_typechange() {
            "modified"
        } else if status.is_wt_deleted() {
            "deleted"
        } else {
            "unknown"
        };

        statuses.push(FileStatus {
            path,
            status: status_str.to_string(),
        });
    }

    Ok(statuses)
}

#[tauri::command]
fn git_stage(path: &str, files: Vec<String>) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;

    for file in files {
        let path = Path::new(&file);
        index.add_path(path).map_err(|e| e.to_string())?;
    }

    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn git_unstage(path: &str, files: Vec<String>) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    let target = head.peel_to_commit().map_err(|e| e.to_string())?;

    let mut files_paths = Vec::new();
    for f in &files {
        files_paths.push(f.as_str());
    }

    repo.reset_default(Some(target.as_object()), files_paths)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn git_commit(path: &str, message: String) -> Result<String, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let signature = repo
        .signature()
        .map_err(|_| "Failed to get signature. Configure user.name and user.email".to_string())?;

    let parent_commit = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| e.to_string())?),
        Err(_) => None, // Initial commit
    };

    let parents = match &parent_commit {
        Some(c) => vec![c],
        None => vec![],
    };

    let oid = repo
        .commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &parents,
        )
        .map_err(|e| e.to_string())?;

    Ok(oid.to_string())
}

#[tauri::command]
fn git_push(path: &str) -> Result<String, String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("git");
    cmd.arg("push");
    cmd.current_dir(path);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute git push: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn git_pull(path: &str) -> Result<String, String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("git");
    cmd.arg("pull");
    cmd.current_dir(path);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute git pull: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
fn get_current_branch(path: &str) -> Result<String, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;

    let head = match repo.head() {
        Ok(head) => head,
        Err(_) => return Ok("HEAD (detached)".to_string()),
    };

    if let Some(name) = head.shorthand() {
        Ok(name.to_string())
    } else {
        Ok("HEAD (detached)".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_git_graph,
            add_folder,
            remove_folder,
            list_folders,
            get_repos_in_folder,
            get_git_status,
            git_stage,
            git_unstage,
            git_commit,
            git_push,
            git_pull,
            get_current_branch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
