use crate::models::{CommitData, FileStatus, RepoData};
use git2::{Repository, Sort};
use std::path::Path;
use walkdir::WalkDir;
// use crate::config::AppState; // config logic stays in config.rs

pub fn get_git_graph(path: &str) -> Result<Vec<CommitData>, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;

    revwalk.push_head().ok();
    revwalk
        .push_glob("refs/heads/*")
        .map_err(|e| e.to_string())?;
    revwalk
        .push_glob("refs/remotes/*")
        .map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(Sort::TOPOLOGICAL | Sort::TIME)
        .map_err(|e| e.to_string())?;

    let mut refs_map: std::collections::HashMap<String, Vec<String>> =
        std::collections::HashMap::new();
    if let Ok(references) = repo.references() {
        for ref_result in references {
            if let Ok(reference) = ref_result {
                let name = reference.shorthand().unwrap_or("").to_string();
                if let Ok(resolved) = reference.peel_to_commit() {
                    let id = resolved.id().to_string();
                    refs_map.entry(id).or_default().push(name);
                }
            }
        }
    }

    let mut commits = Vec::new();
    for oid in revwalk.take(1000) {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        let parents: Vec<String> = commit.parent_ids().map(|p| p.to_string()).collect();
        let refs = refs_map.get(&oid.to_string()).cloned().unwrap_or_default();

        commits.push(CommitData {
            hash: oid.to_string(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            date: commit.time().seconds(),
            parents,
            refs,
        });
    }
    Ok(commits)
}

pub fn get_repos_in_folder(path: &str) -> Result<Vec<RepoData>, String> {
    let mut repos = Vec::new();
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

pub fn get_git_status(path: &str) -> Result<Vec<FileStatus>, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut statuses = Vec::new();
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

pub fn git_stage(path: &str, files: Vec<String>) -> Result<(), String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    for file in files {
        let path = Path::new(&file);
        index.add_path(path).map_err(|e| e.to_string())?;
    }
    index.write().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn git_unstage(path: &str, files: Vec<String>) -> Result<(), String> {
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

pub fn git_commit(path: &str, message: String) -> Result<String, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    let signature = repo
        .signature()
        .map_err(|_| "Failed to get signature".to_string())?;
    let parent_commit = match repo.head() {
        Ok(head) => Some(head.peel_to_commit().map_err(|e| e.to_string())?),
        Err(_) => None,
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

pub fn get_current_branch(path: &str) -> Result<String, String> {
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

fn run_git_cmd(path: &str, args: &[&str]) -> Result<String, String> {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("git");
    cmd.args(args);
    cmd.current_dir(path);

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("Failed to execute git command: {}", e))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn git_push(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["push"])
}

pub fn git_pull(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["pull"])
}

pub fn git_fetch_prune(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["fetch", "--prune", "--all"])
}

pub fn git_merge(path: &str, branch: &str) -> Result<String, String> {
    run_git_cmd(path, &["merge", branch])
}

pub fn git_stash_save(path: &str, message: Option<String>) -> Result<String, String> {
    let mut args = vec!["stash", "save"];
    if let Some(msg) = &message {
        args.push(msg);
    }
    run_git_cmd(path, &args)
}

pub fn git_stash_pop(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["stash", "pop"])
}

pub fn git_cherry_pick(path: &str, hash: &str) -> Result<String, String> {
    run_git_cmd(path, &["cherry-pick", hash])
}

pub fn git_revert(path: &str, hash: &str) -> Result<String, String> {
    run_git_cmd(path, &["revert", hash, "--no-edit"])
}

pub fn git_diff(path: &str, file: Option<String>) -> Result<String, String> {
    let mut args = vec!["diff"];
    if let Some(f) = &file {
        args.push(f);
    }
    run_git_cmd(path, &args)
}

pub fn git_tag_create(path: &str, name: &str, hash: Option<String>) -> Result<String, String> {
    let mut args = vec!["tag", name];
    if let Some(h) = &hash {
        args.push(h);
    }
    run_git_cmd(path, &args)
}

pub fn git_tag_delete(path: &str, name: &str) -> Result<String, String> {
    run_git_cmd(path, &["tag", "-d", name])
}

pub fn git_branch_create(path: &str, name: &str, hash: &str) -> Result<String, String> {
    run_git_cmd(path, &["branch", name, hash])
}

pub fn git_checkout_branch(path: &str, branch: &str) -> Result<String, String> {
    run_git_cmd(path, &["checkout", branch])
}

pub fn git_checkout_commit(path: &str, hash: &str) -> Result<String, String> {
    run_git_cmd(path, &["checkout", hash])
}

pub fn git_reset(path: &str, hash: &str, mode: &str) -> Result<String, String> {
    run_git_cmd(path, &["reset", mode, hash])
}

pub fn git_rebase(path: &str, branch: &str) -> Result<String, String> {
    run_git_cmd(path, &["rebase", branch])
}

pub fn git_remote_list(path: &str) -> Result<Vec<String>, String> {
    let output = run_git_cmd(path, &["remote", "-v"])?;
    Ok(output.lines().map(|s| s.to_string()).collect())
}

pub fn git_remote_add(path: &str, name: &str, url: &str) -> Result<String, String> {
    run_git_cmd(path, &["remote", "add", name, url])
}

pub fn git_remote_remove(path: &str, name: &str) -> Result<String, String> {
    run_git_cmd(path, &["remote", "remove", name])
}

pub fn git_blame(path: &str, file: &str) -> Result<String, String> {
    run_git_cmd(path, &["blame", file])
}

pub fn get_branches(path: &str) -> Result<Vec<String>, String> {
    let output = run_git_cmd(path, &["branch", "-a", "--format=%(refname:short)"])?;
    Ok(output.lines().map(|s| s.to_string()).collect())
}

pub fn get_git_config_user(_path: &str) -> Result<(String, String), String> {
    // Open default config (global/system) directly
    let config = git2::Config::open_default().map_err(|e| e.to_string())?;
    let name = config.get_string("user.name").unwrap_or_default();
    let email = config.get_string("user.email").unwrap_or_default();
    Ok((name, email))
}

pub fn set_git_config_user(_path: &str, name: &str, email: &str) -> Result<(), String> {
    let global_path = git2::Config::find_global().map_err(|e| e.to_string())?;
    let mut config = git2::Config::open(&global_path).map_err(|e| e.to_string())?;
    config
        .set_str("user.name", name)
        .map_err(|e| e.to_string())?;
    config
        .set_str("user.email", email)
        .map_err(|e| e.to_string())?;
    Ok(())
}
