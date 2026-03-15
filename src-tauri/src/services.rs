use crate::models::{
    ActivityTimeline, BranchData, CommitData, CommitDetails, ContributorStat, FileChange,
    FileStatus, ReflogEntry, RepoData, RepositoryStats, StashEntry, SubmoduleInfo, TagData,
    WorktreeData,
};
use git2::Repository;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;
// use crate::config::AppState; // config logic stays in config.rs

pub fn get_git_graph(
    path: &str,
    skip: usize,
    limit: usize,
    branches: Option<Vec<String>>,
) -> Result<Vec<CommitData>, String> {
    let skip_str = skip.to_string();
    let limit_str = limit.to_string();
    let mut args = vec![
        "log",
        "--topo-order",
        "--format=%H%x00%an%x00%ct%x00%P%x00%D%x00%s",
        "--skip",
        &skip_str,
        "-n",
        &limit_str,
    ];

    // Keep branch strings alive for the borrow into args
    let branch_strs: Vec<String>;
    match &branches {
        Some(bs) if !bs.is_empty() => {
            // Insert each branch name after "log" (position 1)
            // We insert in reverse order so indices stay correct
            branch_strs = bs.clone();
            for b in branch_strs.iter().rev() {
                args.insert(1, b.as_str());
            }
        }
        _ => {
            args.insert(1, "--all");
        }
    }

    let output = run_git_cmd(path, &args)?;

    let mut commits = Vec::new();
    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\x00').collect();
        if parts.len() >= 6 {
            let hash = parts[0].to_string();
            let author = parts[1].to_string();
            let date = parts[2].parse::<i64>().unwrap_or(0);
            let parents: Vec<String> = parts[3].split_whitespace().map(|s| s.to_string()).collect();

            let refs_str = parts[4].trim();
            let refs: Vec<String> = if refs_str.is_empty() {
                Vec::new()
            } else {
                refs_str
                    .split(", ")
                    .map(|s| {
                        let s = s.trim();
                        if s.starts_with("tag: ") {
                            s.to_string()
                        } else if let Some(stripped) = s.strip_prefix("HEAD -> ") {
                            stripped.to_string()
                        } else {
                            s.to_string()
                        }
                    })
                    .collect()
            };

            let message = parts[5].to_string();

            commits.push(CommitData {
                hash,
                message,
                author,
                date,
                parents,
                refs,
            });
        }
    }

    Ok(commits)
}

pub fn get_commit_details(path: &str, hash: &str) -> Result<CommitDetails, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let oid = git2::Oid::from_str(hash).map_err(|e| e.to_string())?;
    let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;

    let tree = repo
        .find_tree(commit.tree_id())
        .map_err(|e| e.to_string())?;

    let parent_tree = if commit.parent_count() > 0 {
        let parent_id = commit.parent_id(0).map_err(|e| e.to_string())?;
        let parent = repo.find_commit(parent_id).map_err(|e| e.to_string())?;
        Some(
            repo.find_tree(parent.tree_id())
                .map_err(|e| e.to_string())?,
        )
    } else {
        None
    };

    let mut diff_opts = git2::DiffOptions::new();
    let diff = repo
        .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))
        .map_err(|e| e.to_string())?;

    let mut files = Vec::new();

    // We can't easily get insertions/deletions per file without more complex diff analysis (Patch),
    // but for now let's collect paths and statuses.
    // If we want stats, we'd need to iterate patches.

    diff.print(git2::DiffFormat::NameStatus, |delta, _hunk, _line| {
        let path = delta
            .new_file()
            .path()
            .unwrap_or(Path::new(""))
            .to_string_lossy()
            .replace("\\", "/");
        let status = match delta.status() {
            git2::Delta::Added => "A",
            git2::Delta::Deleted => "D",
            git2::Delta::Modified => "M",
            git2::Delta::Renamed => "R",
            git2::Delta::Copied => "C",
            _ => "U",
        };

        // Placeholder for stats since getting them requires iterating patches which is heavier
        // For a quick list, 0 is fine, or we can implement patch iteration if needed.
        files.push(FileChange {
            path,
            status: status.to_string(),
            insertions: 0,
            deletions: 0,
        });
        true
    })
    .map_err(|e| e.to_string())?;

    let parents: Vec<String> = commit.parent_ids().map(|p| p.to_string()).collect();
    let commit_message = commit.message().unwrap_or("").to_string();
    let commit_author = commit.author().name().unwrap_or("").to_string();

    Ok(CommitDetails {
        hash: commit.id().to_string(),
        message: commit_message,
        author: commit_author,
        date: commit.time().seconds(),
        parents,
        files,
    })
}

pub fn get_repos_in_folder(path: &str) -> Result<Vec<RepoData>, String> {
    let mut repos = Vec::new();
    for entry in WalkDir::new(path)
        .max_depth(3)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_name() == ".git" {
            if let Some(parent) = entry.path().parent() {
                let repo_path = parent.to_string_lossy().replace("\\", "/");
                let name = parent
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let mut branch = "HEAD".to_string();
                let mut is_worktree = false;
                if let Ok(repo) = Repository::open(&repo_path) {
                    is_worktree = repo.is_worktree();
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
                    is_worktree,
                });
            }
        }
    }
    Ok(repos)
}

pub fn is_worktree(path: &str) -> Result<bool, String> {
    if let Ok(repo) = Repository::open(path) {
        Ok(repo.is_worktree())
    } else {
        Err("Failed to open repository to check worktree status".to_string())
    }
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
        let status_str = if status.is_conflicted() {
            "conflicted"
        } else if status.is_index_new()
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

pub fn git_resolve_conflict(path: &str, file: &str, strategy: &str) -> Result<String, String> {
    // strategy: "ours" | "theirs"
    // git checkout --ours -- <file>
    // git add <file>

    let flag = match strategy {
        "ours" => "--ours",
        "theirs" => "--theirs",
        _ => return Err("Invalid strategy".to_string()),
    };

    run_git_cmd(path, &["checkout", flag, "--", file])?;
    run_git_cmd(path, &["add", file])
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

fn get_commit_parents<'repo>(repo: &'repo Repository, path: &str) -> Vec<git2::Commit<'repo>> {
    let mut parents_commits = Vec::new();

    // Always include HEAD as the first parent
    if let Ok(head) = repo.head() {
        if let Ok(head_commit) = head.peel_to_commit() {
            parents_commits.push(head_commit);
        }
    }

    // Check if we are in the middle of a merge
    let merge_head_path = std::path::Path::new(path).join(".git/MERGE_HEAD");
    if merge_head_path.exists() {
        if let Ok(merge_head_content) = std::fs::read_to_string(merge_head_path) {
            let merge_oid_str = merge_head_content.trim();
            if let Ok(merge_oid) = git2::Oid::from_str(merge_oid_str) {
                if let Ok(merge_commit) = repo.find_commit(merge_oid) {
                    parents_commits.push(merge_commit);
                }
            }
        }
    }

    parents_commits
}

fn cleanup_merge_state(path: &str) {
    let _ = std::fs::remove_file(std::path::Path::new(path).join(".git/MERGE_HEAD"));
    let _ = std::fs::remove_file(std::path::Path::new(path).join(".git/MERGE_MODE"));
    let _ = std::fs::remove_file(std::path::Path::new(path).join(".git/MERGE_MSG"));
}

pub fn git_commit(path: &str, message: String) -> Result<String, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let mut index = repo.index().map_err(|e| e.to_string())?;
    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;
    let signature = repo
        .signature()
        .map_err(|_| "Failed to get signature".to_string())?;

    let parents_commits = get_commit_parents(&repo, path);
    let parents: Vec<&git2::Commit> = parents_commits.iter().collect();

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

    cleanup_merge_state(path);

    Ok(oid.to_string())
}

pub fn git_commit_amend(path: &str, message: String) -> Result<String, String> {
    run_git_cmd(path, &["commit", "--amend", "-m", &message])
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

pub fn get_head_hash(path: &str) -> Result<String, String> {
    let repo = Repository::open(path).map_err(|e| e.to_string())?;
    let head = repo.head().map_err(|e| e.to_string())?;
    if let Some(oid) = head.target() {
        Ok(oid.to_string())
    } else {
        Err("HEAD does not point to a commit".to_string())
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

pub fn git_push_tags(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["push", "--tags"])
}

pub fn git_pull(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["pull"])
}

pub fn git_fetch_prune(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["fetch", "--prune", "--all", "--tags"])
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

pub fn git_stash_list(path: &str) -> Result<Vec<StashEntry>, String> {
    let output = run_git_cmd(path, &["stash", "list", "--format=%gd|||%H|||%gs"])?;
    let mut entries = Vec::new();

    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split("|||").collect();
        if parts.len() == 3 {
            entries.push(StashEntry {
                index: parts[0].trim().to_string(),
                hash: parts[1].trim().to_string(),
                message: parts[2].trim().to_string(),
            });
        }
    }

    Ok(entries)
}

pub fn git_stash_apply(path: &str, index: &str) -> Result<String, String> {
    run_git_cmd(path, &["stash", "apply", index])
}

pub fn git_stash_drop(path: &str, index: &str) -> Result<String, String> {
    run_git_cmd(path, &["stash", "drop", index])
}

pub fn git_cherry_pick(path: &str, hash: &str) -> Result<String, String> {
    run_git_cmd(path, &["cherry-pick", hash])
}

pub fn git_revert(path: &str, hash: &str) -> Result<String, String> {
    run_git_cmd(path, &["revert", hash, "--no-edit"])
}

pub fn git_get_rebase_state(path: &str) -> Result<bool, String> {
    let repo_path = Path::new(path);
    let git_dir = repo_path.join(".git");
    let is_rebasing =
        git_dir.join("rebase-merge").exists() || git_dir.join("rebase-apply").exists();
    Ok(is_rebasing)
}

pub fn git_rebase_interactive(
    path: &str,
    base_commit: &str,
    sequence: &str,
) -> Result<String, String> {
    let repo_path = Path::new(path);
    let git_dir = repo_path.join(".git");

    // 1. Write the frontend-generated sequence to a temporary file
    let todo_path = git_dir.join("gitvi_todo.txt");
    if let Err(e) = fs::write(&todo_path, sequence) {
        return Err(format!("Failed to write rebase sequence: {}", e));
    }

    // 2. Generate the bypass script
    // On Windows, Git Bash uses .sh scripts for sequence editor even if executed from CMD,
    // but cross-platform we can provide a shell script that copies our txt over the target git-rebase-todo.
    let script_path = git_dir.join("gitvi_seq_editor.sh");
    // git passes the path to `.git/rebase-merge/git-rebase-todo` as $1
    let script_content = format!(
        "#!/bin/sh\ncp \"{todo}\" \"$1\"\n",
        todo = todo_path.to_string_lossy().replace("\\", "/")
    );

    if let Err(e) = fs::write(&script_path, script_content) {
        return Err(format!("Failed to write editor bypass script: {}", e));
    }

    // Run git rebase -i <base>, injecting our bypass script
    let mut command = std::process::Command::new("git");
    command.current_dir(path);
    command.arg("rebase");
    command.arg("-i");
    command.arg(base_commit);

    // Override the sequence editor so Git invokes our script instead of vim
    command.env(
        "GIT_SEQUENCE_EDITOR",
        script_path.to_string_lossy().as_ref(),
    );

    // We also set standard core.editor to true (no-op) so if a commit is 'reword' or 'edit',
    // it doesn't pop up a text editor. We handle rebasing strictly visually or manually.
    command.env("GIT_EDITOR", "true");

    let output = command.output().map_err(|e| e.to_string())?;

    // Cleanup temporary files
    let _ = fs::remove_file(&todo_path);
    let _ = fs::remove_file(&script_path);

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(err.to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

pub fn git_rebase_continue(path: &str) -> Result<String, String> {
    // Pass -c core.editor=true to prevent vim popups if rebase tries to force an edit commit msg.
    run_git_cmd(path, &["-c", "core.editor=true", "rebase", "--continue"])
}

pub fn git_rebase_abort(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["rebase", "--abort"])
}

pub fn git_diff(
    path: &str,
    file: Option<String>,
    hash: Option<String>,
    cached: Option<bool>,
) -> Result<String, String> {
    let normalized_file = file.map(|f| f.replace("\\", "/"));

    let mut args = Vec::new();
    if let Some(h) = &hash {
        args.push("show");
        args.push("--pretty=format:");
        args.push("--patch");
        args.push("--no-color");
        args.push(h);
        if normalized_file.is_some() {
            args.push("--");
        }
    } else {
        args.push("diff");
        if let Some(true) = cached {
            args.push("--cached");
        } else if cached.is_none() {
            args.push("HEAD");
        }
        if normalized_file.is_some() {
            args.push("--");
        }
    }

    if let Some(f) = &normalized_file {
        args.push(f);
    }

    let result = run_git_cmd(path, &args);

    if hash.is_none() {
        if let Ok(diff_output) = &result {
            if diff_output.trim().is_empty() {
                if let Some(f) = &normalized_file {
                    let full_path = std::path::Path::new(path).join(f);
                    if let Ok(content) = std::fs::read_to_string(full_path) {
                        let lines: Vec<&str> = content.lines().collect();
                        let line_count = if lines.is_empty() { 0 } else { lines.len() };
                        let mut synthetic_diff = format!(
                            "diff --git a/{0} b/{0}\nnew file mode 100644\nindex 0000000..0000000\n--- /dev/null\n+++ b/{0}\n@@ -0,0 +1,{1} @@\n",
                            f, line_count
                        );
                        for line in lines {
                            synthetic_diff.push_str(&format!("+{}\n", line));
                        }
                        return Ok(synthetic_diff);
                    }
                }
            }
        }
    }

    result
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

pub fn git_tag_delete_remote(path: &str, name: &str) -> Result<String, String> {
    run_git_cmd(path, &["push", "origin", "--delete", name])
}

pub fn git_branch_create(path: &str, name: &str, hash: &str) -> Result<String, String> {
    run_git_cmd(path, &["branch", name, hash])
}

pub fn git_checkout_branch(path: &str, branch: &str) -> Result<String, String> {
    run_git_cmd(path, &["checkout", branch])
}

pub fn git_branch_rename(path: &str, old_name: &str, new_name: &str) -> Result<String, String> {
    run_git_cmd(path, &["branch", "-m", old_name, new_name])
}

/// Delete a local branch. If `force` is true, uses -D (force-delete even if not merged).
pub fn git_branch_delete(path: &str, name: &str, force: bool) -> Result<String, String> {
    let flag = if force { "-D" } else { "-d" };
    run_git_cmd(path, &["branch", flag, name])
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

/// Returns the number of commits the current branch is behind its upstream (0 = up to date).
/// Returns Err if the branch has no upstream configured.
pub fn git_check_behind(path: &str) -> Result<u32, String> {
    let out = run_git_cmd(path, &["rev-list", "--count", "HEAD..@{u}"])?;
    Ok(out.trim().parse::<u32>().unwrap_or(0))
}

/// Returns the number of commits the current branch is ahead of its upstream (0 = up to date).
/// Returns Err if the branch has no upstream configured.
pub fn git_check_ahead(path: &str) -> Result<u32, String> {
    let out = run_git_cmd(path, &["rev-list", "--count", "@{u}..HEAD"])?;
    Ok(out.trim().parse::<u32>().unwrap_or(0))
}

/// Returns local branch names whose remote-tracking ref is marked as ': gone]'
/// (i.e. the remote branch was deleted and the local tracking ref no longer exists).
pub fn git_get_pruned_branches(path: &str) -> Result<Vec<String>, String> {
    let out = run_git_cmd(path, &["branch", "-vv"])?;
    let pruned = out
        .lines()
        .filter(|l| l.contains(": gone]"))
        .filter_map(|l| {
            l.trim()
                .trim_start_matches('*')
                .trim()
                .split_whitespace()
                .next()
                .map(|s| s.to_string())
        })
        .filter(|s| !s.is_empty())
        .collect();
    Ok(pruned)
}

pub fn git_blame(path: &str, file: &str, hash: Option<String>) -> Result<String, String> {
    let mut args = vec!["blame", "--date=short"];
    if let Some(h) = &hash {
        args.push(h);
    }
    args.push("--");
    // Normalize path separators
    let normalized_file = file.replace("\\", "/");
    args.push(&normalized_file);

    run_git_cmd(path, &args)
}

pub fn get_branches(path: &str) -> Result<Vec<String>, String> {
    let output = run_git_cmd(path, &["branch", "--format=%(refname:short)"])?;
    Ok(output.lines().map(|s| s.to_string()).collect())
}

pub fn get_branches_info(path: &str) -> Result<Vec<BranchData>, String> {
    let output = run_git_cmd(
        path,
        &[
            "for-each-ref",
            "--format=%(refname)|%(authordate:unix)|%(subject)|%(objectname)",
            "refs/heads/",
            "refs/remotes/",
        ],
    )?;

    let mut branches = Vec::new();
    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 4 {
            let refname = parts[0].to_string();
            let date = parts[1].parse::<i64>().unwrap_or(0);
            let message = parts[2].to_string();
            let hash = parts[3].to_string();

            let is_remote = refname.starts_with("refs/remotes/");

            let name = if is_remote {
                refname.trim_start_matches("refs/remotes/").to_string()
            } else {
                refname.trim_start_matches("refs/heads/").to_string()
            };

            // Ignore HEAD references like origin/HEAD
            if name.ends_with("/HEAD") || name == "HEAD" {
                continue;
            }

            branches.push(BranchData {
                name,
                hash,
                date,
                message,
                is_remote,
            });
        }
    }

    Ok(branches)
}

/// Aggregated startup call: returns commits, current branch, branch list, HEAD hash,
/// worktree status and worktree count all in one round-trip to avoid spawning 6 separate
/// git subprocesses when the user opens a repository.
pub fn get_initial_repo_data(
    path: &str,
    skip: usize,
    limit: usize,
    filter_branches: Option<Vec<String>>,
) -> Result<crate::models::InitialRepoData, String> {
    use std::sync::{Arc, Mutex};

    let path_arc = Arc::new(path.to_string());
    let filter_clone = filter_branches.clone();

    // Run all queries in parallel threads
    let commits_result: Arc<Mutex<Result<Vec<crate::models::CommitData>, String>>> =
        Arc::new(Mutex::new(Err("not started".into())));
    let branch_result: Arc<Mutex<Result<String, String>>> =
        Arc::new(Mutex::new(Err("not started".into())));
    let branches_result: Arc<Mutex<Result<Vec<String>, String>>> =
        Arc::new(Mutex::new(Err("not started".into())));
    let head_result: Arc<Mutex<Result<String, String>>> =
        Arc::new(Mutex::new(Err("not started".into())));
    let worktree_flag: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    let worktree_count: Arc<Mutex<usize>> = Arc::new(Mutex::new(0));
    let has_remote_result: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));

    std::thread::scope(|s| {
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&commits_result);
            let f = filter_clone;
            s.spawn(move || {
                *r.lock().unwrap() = get_git_graph(&p, skip, limit, f);
            });
        }
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&branch_result);
            s.spawn(move || {
                *r.lock().unwrap() = get_current_branch(&p);
            });
        }
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&branches_result);
            s.spawn(move || {
                *r.lock().unwrap() = get_branches(&p);
            });
        }
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&head_result);
            s.spawn(move || {
                *r.lock().unwrap() = get_head_hash(&p);
            });
        }
        {
            let p = Arc::clone(&path_arc);
            let flag = Arc::clone(&worktree_flag);
            let count = Arc::clone(&worktree_count);
            s.spawn(move || {
                let is_wt = is_worktree(&p).unwrap_or(false);
                *flag.lock().unwrap() = is_wt;
                let wt_count = git_worktree_list(&p)
                    .map(|v| v.len().saturating_sub(1))
                    .unwrap_or(0);
                *count.lock().unwrap() = wt_count;
            });
        }
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&has_remote_result);
            s.spawn(move || {
                *r.lock().unwrap() = git_remote_list(&p).map(|v| !v.is_empty()).unwrap_or(false);
            });
        }
    });

    let commits = Arc::try_unwrap(commits_result)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?
        .unwrap_or_default();

    let current_branch = Arc::try_unwrap(branch_result)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?
        .unwrap_or_default();

    let branches = Arc::try_unwrap(branches_result)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?
        .unwrap_or_default();

    let head_hash = Arc::try_unwrap(head_result)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?
        .unwrap_or_default();

    let is_wt = Arc::try_unwrap(worktree_flag)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?;

    let wt_count = Arc::try_unwrap(worktree_count)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?;

    let has_remote = Arc::try_unwrap(has_remote_result)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?;

    let has_more = commits.len() < limit;
    let _ = has_more; // used by caller

    Ok(crate::models::InitialRepoData {
        commits,
        current_branch,
        branches,
        head_hash,
        is_worktree: is_wt,
        worktree_count: wt_count,
        has_remote,
    })
}

/// Returns branch info (local + remote) and remotes list in a single IPC call,
/// replacing the two separate calls `get_branches_info` + `git_remote_list`.
pub fn get_branches_and_remotes(path: &str) -> Result<crate::models::BranchesAndRemotes, String> {
    use std::sync::{Arc, Mutex};

    let path_arc = Arc::new(path.to_string());
    let branches_r: Arc<Mutex<Result<Vec<crate::models::BranchData>, String>>> =
        Arc::new(Mutex::new(Err("not started".into())));
    let remotes_r: Arc<Mutex<Result<Vec<String>, String>>> =
        Arc::new(Mutex::new(Err("not started".into())));

    std::thread::scope(|s| {
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&branches_r);
            s.spawn(move || {
                *r.lock().unwrap() = get_branches_info(&p);
            });
        }
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&remotes_r);
            s.spawn(move || {
                *r.lock().unwrap() = git_remote_list(&p);
            });
        }
    });

    let branches = Arc::try_unwrap(branches_r)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?
        .unwrap_or_default();

    let remotes = Arc::try_unwrap(remotes_r)
        .map_err(|_| "Arc unwrap failed".to_string())?
        .into_inner()
        .map_err(|_| "Mutex poisoned".to_string())?
        .unwrap_or_default();

    Ok(crate::models::BranchesAndRemotes { branches, remotes })
}

/// Aggregated SourceControl status — replaces 4+ sequential IPC calls that poll every few seconds.
/// Runs git_status, rebase check, MERGE_MSG read, submodule list, and stash count in parallel.
pub fn get_source_control_status(path: &str) -> Result<crate::models::SourceControlStatus, String> {
    use std::sync::{Arc, Mutex};

    let path_arc = Arc::new(path.to_string());

    let files_r: Arc<Mutex<Vec<crate::models::FileStatus>>> = Arc::new(Mutex::new(Vec::new()));
    let rebasing_r: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    let merge_msg_r: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let submodules_r: Arc<Mutex<Vec<crate::models::SubmoduleInfo>>> =
        Arc::new(Mutex::new(Vec::new()));
    let stash_count_r: Arc<Mutex<usize>> = Arc::new(Mutex::new(0));

    std::thread::scope(|s| {
        // git status
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&files_r);
            s.spawn(move || {
                if let Ok(files) = get_git_status(&p) {
                    *r.lock().unwrap() = files;
                }
            });
        }
        // rebase state (filesystem check — very fast)
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&rebasing_r);
            s.spawn(move || {
                *r.lock().unwrap() = git_get_rebase_state(&p).unwrap_or(false);
            });
        }
        // MERGE_MSG
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&merge_msg_r);
            s.spawn(move || {
                let merge_msg_path = Path::new(p.as_str()).join(".git/MERGE_MSG");
                if let Ok(msg) = std::fs::read_to_string(merge_msg_path) {
                    if !msg.trim().is_empty() {
                        *r.lock().unwrap() = Some(msg.trim().to_string());
                    }
                }
            });
        }
        // submodules
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&submodules_r);
            s.spawn(move || {
                if let Ok(subs) = get_git_submodules(&p) {
                    *r.lock().unwrap() = subs;
                }
            });
        }
        // stash count
        {
            let p = Arc::clone(&path_arc);
            let r = Arc::clone(&stash_count_r);
            s.spawn(move || {
                let count = git_stash_list(&p).map(|v| v.len()).unwrap_or(0);
                *r.lock().unwrap() = count;
            });
        }
    });

    let files = Arc::try_unwrap(files_r)
        .map_err(|_| "Arc error".to_string())?
        .into_inner()
        .map_err(|_| "Mutex error".to_string())?;
    let is_rebasing = Arc::try_unwrap(rebasing_r)
        .map_err(|_| "Arc error".to_string())?
        .into_inner()
        .map_err(|_| "Mutex error".to_string())?;
    let merge_msg = Arc::try_unwrap(merge_msg_r)
        .map_err(|_| "Arc error".to_string())?
        .into_inner()
        .map_err(|_| "Mutex error".to_string())?;
    let submodules = Arc::try_unwrap(submodules_r)
        .map_err(|_| "Arc error".to_string())?
        .into_inner()
        .map_err(|_| "Mutex error".to_string())?;
    let stash_count = Arc::try_unwrap(stash_count_r)
        .map_err(|_| "Arc error".to_string())?
        .into_inner()
        .map_err(|_| "Mutex error".to_string())?;

    Ok(crate::models::SourceControlStatus {
        files,
        is_rebasing,
        merge_msg,
        submodules,
        stash_count,
    })
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

pub fn git_discard_changes(path: &str, files: Vec<String>) -> Result<(), String> {
    use std::path::Path;
    let repo = Repository::open(path).map_err(|e| e.to_string())?;

    let mut files_to_checkout = Vec::new();

    for file_path_str in files {
        let path_obj = Path::new(&file_path_str);
        // Check if file is untracked
        let status = repo.status_file(path_obj).map_err(|e| e.to_string())?;

        if status.is_wt_new() {
            // Untracked file: delete it
            let full_path = Path::new(path).join(path_obj);
            if full_path.exists() {
                if full_path.is_dir() {
                    std::fs::remove_dir_all(&full_path).map_err(|e| e.to_string())?;
                } else {
                    std::fs::remove_file(&full_path).map_err(|e| e.to_string())?;
                }
            }
        } else {
            // Tracked file (modified or deleted)
            files_to_checkout.push(file_path_str);
        }
    }

    if !files_to_checkout.is_empty() {
        // Use run_git_cmd for checkout as it handles multiple files well
        let mut args = vec!["checkout", "--"];
        let refs: Vec<&str> = files_to_checkout.iter().map(|s| s.as_str()).collect();
        args.extend(refs);
        run_git_cmd(path, &args)?;
    }

    Ok(())
}

pub fn get_commit_tree(path: &str, hash: &str) -> Result<Vec<String>, String> {
    let output = run_git_cmd(path, &["ls-tree", "-r", "--name-only", hash])?;
    Ok(output.lines().map(|s| s.to_string()).collect())
}

pub fn get_file_content_at_commit(
    path: &str,
    hash: &str,
    file_path: &str,
) -> Result<String, String> {
    let target = format!("{}:{}", hash, file_path.replace("\\", "/"));
    run_git_cmd(path, &["show", &target])
}

pub fn search_commits(
    path: &str,
    query: &str,
    search_type: &str,
    branches: Option<Vec<String>>,
    skip: usize,
    limit: usize,
) -> Result<Vec<CommitData>, String> {
    if search_type == "all" {
        // Fetch enough from each sub-type to cover skip+limit after merge/dedup
        let fetch_n = skip + limit + 1;
        let msg_commits =
            search_commits_internal(path, query, "message", branches.clone(), 0, fetch_n)
                .unwrap_or_default();
        let author_commits =
            search_commits_internal(path, query, "author", branches.clone(), 0, fetch_n)
                .unwrap_or_default();
        let file_commits =
            search_commits_internal(path, query, "file", branches.clone(), 0, fetch_n)
                .unwrap_or_default();

        let mut seen = std::collections::HashSet::new();
        let mut merged = Vec::new();

        for c in msg_commits
            .into_iter()
            .chain(author_commits.into_iter())
            .chain(file_commits.into_iter())
        {
            if seen.insert(c.hash.clone()) {
                merged.push(c);
            }
        }

        merged.sort_by(|a, b| b.date.cmp(&a.date));
        // Return skip..skip+limit+1 so the caller knows if there is a next page
        return Ok(merged.into_iter().skip(skip).take(limit + 1).collect());
    }

    search_commits_internal(path, query, search_type, branches, skip, limit)
}

fn search_commits_internal(
    path: &str,
    query: &str,
    search_type: &str,
    branches: Option<Vec<String>>,
    skip: usize,
    limit: usize, // caller passes limit+1 so we can detect "has more"
) -> Result<Vec<CommitData>, String> {
    let skip_str = skip.to_string();
    let limit_str = limit.to_string();
    let mut args = vec![
        "log",
        "--format=%H%x00%an%x00%ct%x00%P%x00%D%x00%s",
        "--skip",
        &skip_str,
        "-n",
        &limit_str,
    ];

    // Scope to selected branches or fall back to --all
    let branch_strs: Vec<String>;
    match &branches {
        Some(bs) if !bs.is_empty() => {
            branch_strs = bs.clone();
            for b in branch_strs.iter().rev() {
                args.insert(1, b.as_str());
            }
        }
        _ => {
            args.insert(1, "--all");
        }
    }

    let query_string = query.to_string();
    let author_query;
    let grep_query;

    match search_type {
        "message" => {
            grep_query = format!("--grep={}", query_string);
            args.push("-i"); // case-insensitive
            args.push(&grep_query);
        }
        "author" => {
            author_query = format!("--author={}", query_string);
            args.push("-i"); // case-insensitive
            args.push(&author_query);
        }
        "file" => {
            args.push("--");
            args.push(&query_string); // e.g. "package.json" or "*.rs"
        }
        _ => return Err("Invalid search type".to_string()),
    }

    let output = run_git_cmd(path, &args)?;

    let mut commits = Vec::new();
    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('\x00').collect();
        if parts.len() >= 6 {
            let hash = parts[0].to_string();
            let author = parts[1].to_string();
            let date = parts[2].parse::<i64>().unwrap_or(0);
            let parents: Vec<String> = parts[3].split_whitespace().map(|s| s.to_string()).collect();

            let refs_str = parts[4].trim();
            let refs: Vec<String> = if refs_str.is_empty() {
                Vec::new()
            } else {
                refs_str.split(", ").map(|s| s.to_string()).collect()
            };

            let message = parts[5].to_string();

            commits.push(CommitData {
                hash,
                message,
                author,
                date,
                parents,
                refs,
            });
        }
    }

    Ok(commits)
}

pub fn get_git_reflog(path: &str) -> Result<Vec<ReflogEntry>, String> {
    let output = run_git_cmd(path, &["reflog", "-n", "100"])?;
    let mut entries = Vec::new();

    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }

        // Example line:
        // 9b6d61d HEAD@{0}: commit: my message here
        // 564177c HEAD@{1}: reset: moving to HEAD~1

        // Handle variations gracefully
        // Handle variations gracefully
        let hash_index_part;
        let action_message_part;

        if let Some(pos) = line.find(": ") {
            hash_index_part = &line[..pos];
            action_message_part = &line[pos + 2..];
        } else {
            hash_index_part = line;
            action_message_part = "";
        }

        let hash_index_split: Vec<&str> = hash_index_part.split_whitespace().collect();
        if hash_index_split.len() < 2 {
            continue;
        }

        let hash = hash_index_split[0].to_string();
        let index = hash_index_split[1..].join(" ");

        let action;
        let message;

        if let Some(pos) = action_message_part.find(": ") {
            action = action_message_part[..pos].to_string();
            message = action_message_part[pos + 2..].to_string();
        } else {
            action = action_message_part.to_string();
            message = String::new();
        }

        entries.push(ReflogEntry {
            hash,
            index,
            action,
            message,
        });
    }

    Ok(entries)
}

pub fn git_apply_patch(path: &str, patch: &str, reverse: bool) -> Result<(), String> {
    use std::io::Write;
    use std::process::{Command, Stdio};
    #[cfg(target_os = "windows")]
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = Command::new("git");
    cmd.current_dir(path);
    cmd.arg("apply");
    cmd.arg("--cached");

    if reverse {
        cmd.arg("-R");
    }

    cmd.arg("-"); // read from stdin

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn git apply: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(patch.as_bytes())
            .map_err(|e| format!("Failed to write patch to stdin: {}", e))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Failed to read git apply output: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

pub fn get_tags(path: &str) -> Result<Vec<TagData>, String> {
    let output = run_git_cmd(
        path,
        &[
            "tag",
            "-l",
            "--format=%(refname:short)|||%(subject)|||%(creatordate:unix)|||%(objectname)",
        ],
    )?;

    let mut tags = Vec::new();

    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split("|||").collect();
        if parts.len() >= 4 {
            let name = parts[0].to_string();
            let message = parts[1].to_string();
            let date = parts[2].parse::<i64>().unwrap_or(0);
            let hash = parts[3].to_string();

            tags.push(TagData {
                name,
                message,
                date,
                hash,
            });
        }
    }

    Ok(tags)
}

pub fn get_git_submodules(path: &str) -> Result<Vec<SubmoduleInfo>, String> {
    // `git submodule status` usually returns lines like:
    //  +f3c95a0bc0640f1a2380a9d9e45e7f12eb6bc303 lib/somemod (v1.0.0)
    //  -f3c95a0bc0640f1a2380a9d9e45e7f12eb6bc303 lib/othermod
    // The first char can be '-', '+', 'U', or ' ' (up to date).
    let output = run_git_cmd(path, &["submodule", "status"])?;
    let mut submodules = Vec::new();

    for line in output.lines() {
        if line.trim().is_empty() {
            continue;
        }

        let mut chars = line.chars();
        let status_char = chars.next().unwrap_or(' ');
        let status = status_char.to_string();

        let rest = chars.as_str().trim();
        let parts: Vec<&str> = rest.split_whitespace().collect();

        if parts.len() >= 2 {
            let hash = parts[0].to_string();
            let sub_path = parts[1].to_string();
            let name = Path::new(&sub_path)
                .file_name()
                .and_then(|ost| ost.to_str())
                .unwrap_or(&sub_path)
                .to_string();

            // To get the actual URL we would need `git config --get submodule.<name>.url`
            // But let's keep it simple for now or fetch it if needed.
            let url = String::new();

            submodules.push(SubmoduleInfo {
                name,
                path: sub_path,
                url,
                status,
                hash,
            });
        }
    }

    Ok(submodules)
}

pub fn git_submodule_update(path: &str) -> Result<(), String> {
    run_git_cmd(path, &["submodule", "update", "--init", "--recursive"])?;
    Ok(())
}

pub fn git_submodule_sync(path: &str) -> Result<(), String> {
    run_git_cmd(path, &["submodule", "sync"])?;
    Ok(())
}

pub fn git_submodule_add(path: &str, url: &str, name: &str) -> Result<(), String> {
    run_git_cmd(path, &["submodule", "add", url, name])?;
    Ok(())
}

pub fn git_submodule_remove(path: &str, name: &str) -> Result<(), String> {
    // 1. Deinit the submodule
    run_git_cmd(path, &["submodule", "deinit", "-f", "--", name])?;

    // 2. Remove the submodule's git directory
    let git_dir = Path::new(path).join(".git").join("modules").join(name);
    if git_dir.exists() {
        std::fs::remove_dir_all(git_dir).map_err(|e| e.to_string())?;
    }

    // 3. Remove the submodule from the working tree and index
    run_git_cmd(path, &["rm", "-f", name])?;

    Ok(())
}

pub fn git_get_repository_stats(path: &str) -> Result<RepositoryStats, String> {
    use std::collections::HashMap;

    let output = run_git_cmd(path, &["log", "--format=%ct|%an"])?;

    let mut total_commits = 0;
    let mut author_counts: HashMap<String, usize> = HashMap::new();
    let mut daily_counts: HashMap<String, (i64, usize)> = HashMap::new();

    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 2 {
            let timestamp_str = parts[0];
            let author_name = parts[1].to_string();

            if let Ok(timestamp) = timestamp_str.parse::<i64>() {
                total_commits += 1;

                // Count by author
                *author_counts.entry(author_name).or_insert(0) += 1;

                // For chart: format YYYY-MM-DD manually (basic math for UTC offset ignoring leaps if rough, or prefer full timezone lib).
                // To keep it simple without adding `chrono` if we don't have to, we will pass the JS timestamps.
                // Or better, let's just group by rounded JS days (timestamp / 86400).
                let day_id = timestamp / 86400;
                let entry = daily_counts
                    .entry(day_id.to_string())
                    .or_insert((day_id * 86400, 0));
                entry.1 += 1;
            }
        }
    }

    let mut top_contributors: Vec<ContributorStat> = author_counts
        .into_iter()
        .map(|(name, commits)| ContributorStat { name, commits })
        .collect();

    // Sort descending by commit count
    top_contributors.sort_by(|a, b| b.commits.cmp(&a.commits));

    // Take top 10
    if top_contributors.len() > 10 {
        top_contributors.truncate(10);
    }

    let mut timeline: Vec<ActivityTimeline> = daily_counts
        .into_iter()
        .map(|(_, (ts, count))| ActivityTimeline {
            timestamp: ts,
            date: "".to_string(),
            count,
        })
        .collect();

    // Sort ascending by timestamp
    timeline.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));

    Ok(RepositoryStats {
        total_commits,
        timeline,
        top_contributors,
    })
}

pub fn git_worktree_list(path: &str) -> Result<Vec<WorktreeData>, String> {
    let output = run_git_cmd(path, &["worktree", "list", "--porcelain"])?;
    let mut worktrees = Vec::new();

    let mut current_path = String::new();
    let mut current_commit = String::new();
    let mut current_branch = String::new();

    for line in output.lines() {
        if line.trim().is_empty() {
            if !current_path.is_empty() {
                worktrees.push(WorktreeData {
                    path: current_path.clone(),
                    commit: current_commit.clone(),
                    branch: current_branch.clone(),
                });
                current_path.clear();
                current_commit.clear();
                current_branch.clear();
            }
            continue;
        }

        if let Some(p) = line.strip_prefix("worktree ") {
            current_path = p.replace("\\", "/");
        } else if let Some(h) = line.strip_prefix("HEAD ") {
            current_commit = h.to_string();
        } else if let Some(b) = line.strip_prefix("branch refs/heads/") {
            current_branch = b.to_string();
        } else if line == "detached" {
            current_branch = "detached".to_string();
        }
    }

    if !current_path.is_empty() {
        worktrees.push(WorktreeData {
            path: current_path,
            commit: current_commit,
            branch: current_branch,
        });
    }

    Ok(worktrees)
}

pub fn git_worktree_add(path: &str, new_path: &str, branch: &str) -> Result<String, String> {
    if branch.is_empty() {
        run_git_cmd(path, &["worktree", "add", "-d", new_path])
    } else {
        run_git_cmd(path, &["worktree", "add", new_path, branch])
    }
}

pub fn git_worktree_remove(path: &str, worktree_path: &str) -> Result<String, String> {
    run_git_cmd(path, &["worktree", "remove", "--force", worktree_path])
}

pub fn git_worktree_prune(path: &str) -> Result<String, String> {
    run_git_cmd(path, &["worktree", "prune"])
}
