use crate::config;
use crate::config::AppState;
use crate::models::{
    BranchData, CommitData, CommitDetails, FileStatus, ReflogEntry, RepoData, TagData,
};
use crate::services;
use tauri::State; // use services module

#[tauri::command]
pub async fn get_commit_details(path: &str, hash: &str) -> Result<CommitDetails, String> {
    services::get_commit_details(path, hash)
}

#[tauri::command]
pub async fn get_git_graph(
    path: &str,
    skip: usize,
    limit: usize,
    branch: Option<Vec<String>>,
) -> Result<Vec<CommitData>, String> {
    services::get_git_graph(path, skip, limit, branch)
}

#[tauri::command]
pub async fn add_folder(state: State<'_, AppState>, path: String) -> Result<Vec<String>, String> {
    config::add_folder(state, path)
}

#[tauri::command]
pub async fn remove_folder(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<String>, String> {
    config::remove_folder(state, path)
}

#[tauri::command]
pub async fn list_folders(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    config::list_folders(state)
}

#[tauri::command]
pub async fn get_repos_in_folder(path: &str) -> Result<Vec<RepoData>, String> {
    services::get_repos_in_folder(path)
}

#[tauri::command]
pub async fn get_git_status(path: &str) -> Result<Vec<FileStatus>, String> {
    services::get_git_status(path)
}

#[tauri::command]
pub async fn git_resolve_conflict(
    path: String,
    file: String,
    strategy: String,
) -> Result<String, String> {
    services::git_resolve_conflict(&path, &file, &strategy)
}

#[tauri::command]
pub async fn git_stage(path: &str, files: Vec<String>) -> Result<(), String> {
    services::git_stage(path, files)
}

#[tauri::command]
pub async fn git_unstage(path: &str, files: Vec<String>) -> Result<(), String> {
    services::git_unstage(path, files)
}

#[tauri::command]
pub async fn git_commit(path: &str, message: String) -> Result<String, String> {
    services::git_commit(path, message)
}

#[tauri::command]
pub async fn git_commit_amend(path: &str, message: String) -> Result<String, String> {
    services::git_commit_amend(path, message)
}

#[tauri::command]
pub async fn git_push(path: &str) -> Result<String, String> {
    services::git_push(path)
}

#[tauri::command]
pub async fn git_push_tags(path: &str) -> Result<String, String> {
    services::git_push_tags(path)
}

#[tauri::command]
pub async fn git_pull(path: &str) -> Result<String, String> {
    services::git_pull(path)
}

#[tauri::command]
pub async fn get_current_branch(path: &str) -> Result<String, String> {
    services::get_current_branch(path)
}

#[tauri::command]
pub async fn git_fetch_prune(path: &str) -> Result<String, String> {
    services::git_fetch_prune(path)
}

#[tauri::command]
pub async fn git_merge(path: &str, branch: &str) -> Result<String, String> {
    services::git_merge(path, branch)
}

#[tauri::command]
pub async fn git_stash_save(path: &str, message: Option<String>) -> Result<String, String> {
    services::git_stash_save(path, message)
}

#[tauri::command]
pub async fn git_stash_pop(path: &str) -> Result<String, String> {
    services::git_stash_pop(path)
}

#[tauri::command]
pub async fn git_stash_list(path: &str) -> Result<Vec<crate::models::StashEntry>, String> {
    services::git_stash_list(path)
}

#[tauri::command]
pub async fn git_stash_apply(path: &str, index: &str) -> Result<String, String> {
    services::git_stash_apply(path, index)
}

#[tauri::command]
pub async fn git_stash_drop(path: &str, index: &str) -> Result<String, String> {
    services::git_stash_drop(path, index)
}

#[tauri::command]
pub async fn git_cherry_pick(path: &str, hash: &str) -> Result<String, String> {
    services::git_cherry_pick(path, hash)
}

#[tauri::command]
pub async fn git_revert(path: &str, hash: &str) -> Result<String, String> {
    services::git_revert(path, hash)
}

#[tauri::command]
pub async fn git_diff(
    path: &str,
    file: Option<String>,
    hash: Option<String>,
) -> Result<String, String> {
    services::git_diff(path, file, hash)
}

#[tauri::command]
pub async fn git_tag_create(
    path: &str,
    name: &str,
    hash: Option<String>,
) -> Result<String, String> {
    services::git_tag_create(path, name, hash)
}

#[tauri::command]
pub async fn git_tag_delete(path: &str, name: &str) -> Result<String, String> {
    services::git_tag_delete(path, name)
}

#[tauri::command]
pub async fn get_tags(path: &str) -> Result<Vec<TagData>, String> {
    services::get_tags(path)
}

#[tauri::command]
pub async fn git_branch_create(path: &str, name: &str, hash: &str) -> Result<String, String> {
    services::git_branch_create(path, name, hash)
}

#[tauri::command]
pub async fn git_checkout_branch(path: &str, branch: &str) -> Result<String, String> {
    services::git_checkout_branch(path, branch)
}

#[tauri::command]
pub async fn git_branch_delete(path: &str, name: &str, force: bool) -> Result<String, String> {
    services::git_branch_delete(path, name, force)
}

#[tauri::command]
pub async fn git_checkout_commit(path: &str, hash: &str) -> Result<String, String> {
    services::git_checkout_commit(path, hash)
}

#[tauri::command]
pub async fn git_reset(path: &str, hash: &str, mode: &str) -> Result<String, String> {
    services::git_reset(path, hash, mode)
}

#[tauri::command]
pub async fn get_git_reflog(path: &str) -> Result<Vec<ReflogEntry>, String> {
    services::get_git_reflog(path)
}

#[tauri::command]
pub async fn git_rebase(path: &str, branch: &str) -> Result<String, String> {
    services::git_rebase(path, branch)
}

#[tauri::command]
pub async fn git_remote_list(path: &str) -> Result<Vec<String>, String> {
    services::git_remote_list(path)
}

#[tauri::command]
pub async fn git_remote_add(path: &str, name: &str, url: &str) -> Result<String, String> {
    services::git_remote_add(path, name, url)
}

#[tauri::command]
pub async fn git_remote_remove(path: &str, name: &str) -> Result<String, String> {
    services::git_remote_remove(path, name)
}

#[tauri::command]
pub async fn git_blame(path: &str, file: &str, hash: Option<String>) -> Result<String, String> {
    services::git_blame(path, file, hash)
}

#[tauri::command]
pub async fn get_branches(path: &str) -> Result<Vec<String>, String> {
    services::get_branches(path)
}

#[tauri::command]
pub async fn get_branches_info(path: &str) -> Result<Vec<BranchData>, String> {
    services::get_branches_info(path)
}

#[tauri::command]
pub async fn get_git_config_user(path: &str) -> Result<(String, String), String> {
    services::get_git_config_user(path)
}

#[tauri::command]
pub async fn set_git_config_user(path: &str, name: &str, email: &str) -> Result<(), String> {
    services::set_git_config_user(path, name, email)
}

#[tauri::command]
pub async fn git_discard_changes(path: &str, files: Vec<String>) -> Result<(), String> {
    services::git_discard_changes(path, files)
}

#[tauri::command]
pub async fn get_commit_tree(path: &str, hash: &str) -> Result<Vec<String>, String> {
    services::get_commit_tree(path, hash)
}

#[tauri::command]
pub async fn get_file_content_at_commit(
    path: &str,
    hash: &str,
    file_path: &str,
) -> Result<String, String> {
    services::get_file_content_at_commit(path, hash, file_path)
}

#[tauri::command]
pub async fn search_commits(
    path: &str,
    query: &str,
    search_type: &str,
    branches: Option<Vec<String>>,
    skip: usize,
    limit: usize,
) -> Result<Vec<CommitData>, String> {
    services::search_commits(path, query, search_type, branches, skip, limit)
}

#[tauri::command]
pub async fn git_get_rebase_state(path: &str) -> Result<bool, String> {
    services::git_get_rebase_state(path)
}

#[tauri::command]
pub async fn git_rebase_interactive(
    path: &str,
    base_commit: &str,
    sequence: &str,
) -> Result<String, String> {
    services::git_rebase_interactive(path, base_commit, sequence)
}

#[tauri::command]
pub async fn git_rebase_continue(path: &str) -> Result<String, String> {
    services::git_rebase_continue(path)
}

#[tauri::command]
pub async fn git_rebase_abort(path: &str) -> Result<String, String> {
    services::git_rebase_abort(path)
}
