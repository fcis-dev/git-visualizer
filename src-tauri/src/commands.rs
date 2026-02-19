use crate::config;
use crate::config::AppState;
use crate::models::{CommitData, CommitDetails, FileStatus, RepoData};
use crate::services;
use tauri::State; // use services module

#[tauri::command]
pub fn get_commit_details(path: &str, hash: &str) -> Result<CommitDetails, String> {
    services::get_commit_details(path, hash)
}

#[tauri::command]
pub fn get_git_graph(path: &str) -> Result<Vec<CommitData>, String> {
    services::get_git_graph(path)
}

#[tauri::command]
pub fn add_folder(state: State<AppState>, path: String) -> Result<Vec<String>, String> {
    config::add_folder(state, path)
}

#[tauri::command]
pub fn remove_folder(state: State<AppState>, path: String) -> Result<Vec<String>, String> {
    config::remove_folder(state, path)
}

#[tauri::command]
pub fn list_folders(state: State<AppState>) -> Result<Vec<String>, String> {
    config::list_folders(state)
}

#[tauri::command]
pub fn get_repos_in_folder(path: &str) -> Result<Vec<RepoData>, String> {
    services::get_repos_in_folder(path)
}

#[tauri::command]
pub fn get_git_status(path: &str) -> Result<Vec<FileStatus>, String> {
    services::get_git_status(path)
}

#[tauri::command]
pub fn git_resolve_conflict(
    path: String,
    file: String,
    strategy: String,
) -> Result<String, String> {
    services::git_resolve_conflict(&path, &file, &strategy)
}

#[tauri::command]
pub fn git_stage(path: &str, files: Vec<String>) -> Result<(), String> {
    services::git_stage(path, files)
}

#[tauri::command]
pub fn git_unstage(path: &str, files: Vec<String>) -> Result<(), String> {
    services::git_unstage(path, files)
}

#[tauri::command]
pub fn git_commit(path: &str, message: String) -> Result<String, String> {
    services::git_commit(path, message)
}

#[tauri::command]
pub fn git_push(path: &str) -> Result<String, String> {
    services::git_push(path)
}

#[tauri::command]
pub fn git_pull(path: &str) -> Result<String, String> {
    services::git_pull(path)
}

#[tauri::command]
pub fn get_current_branch(path: &str) -> Result<String, String> {
    services::get_current_branch(path)
}

#[tauri::command]
pub fn git_fetch_prune(path: &str) -> Result<String, String> {
    services::git_fetch_prune(path)
}

#[tauri::command]
pub fn git_merge(path: &str, branch: &str) -> Result<String, String> {
    services::git_merge(path, branch)
}

#[tauri::command]
pub fn git_stash_save(path: &str, message: Option<String>) -> Result<String, String> {
    services::git_stash_save(path, message)
}

#[tauri::command]
pub fn git_stash_pop(path: &str) -> Result<String, String> {
    services::git_stash_pop(path)
}

#[tauri::command]
pub fn git_cherry_pick(path: &str, hash: &str) -> Result<String, String> {
    services::git_cherry_pick(path, hash)
}

#[tauri::command]
pub fn git_revert(path: &str, hash: &str) -> Result<String, String> {
    services::git_revert(path, hash)
}

#[tauri::command]
pub fn git_diff(path: &str, file: Option<String>, hash: Option<String>) -> Result<String, String> {
    services::git_diff(path, file, hash)
}

#[tauri::command]
pub fn git_tag_create(path: &str, name: &str, hash: Option<String>) -> Result<String, String> {
    services::git_tag_create(path, name, hash)
}

#[tauri::command]
pub fn git_tag_delete(path: &str, name: &str) -> Result<String, String> {
    services::git_tag_delete(path, name)
}

#[tauri::command]
pub fn git_branch_create(path: &str, name: &str, hash: &str) -> Result<String, String> {
    services::git_branch_create(path, name, hash)
}

#[tauri::command]
pub fn git_checkout_branch(path: &str, branch: &str) -> Result<String, String> {
    services::git_checkout_branch(path, branch)
}

#[tauri::command]
pub fn git_checkout_commit(path: &str, hash: &str) -> Result<String, String> {
    services::git_checkout_commit(path, hash)
}

#[tauri::command]
pub fn git_reset(path: &str, hash: &str, mode: &str) -> Result<String, String> {
    services::git_reset(path, hash, mode)
}

#[tauri::command]
pub fn git_rebase(path: &str, branch: &str) -> Result<String, String> {
    services::git_rebase(path, branch)
}

#[tauri::command]
pub fn git_remote_list(path: &str) -> Result<Vec<String>, String> {
    services::git_remote_list(path)
}

#[tauri::command]
pub fn git_remote_add(path: &str, name: &str, url: &str) -> Result<String, String> {
    services::git_remote_add(path, name, url)
}

#[tauri::command]
pub fn git_remote_remove(path: &str, name: &str) -> Result<String, String> {
    services::git_remote_remove(path, name)
}

#[tauri::command]
pub fn git_blame(path: &str, file: &str, hash: Option<String>) -> Result<String, String> {
    services::git_blame(path, file, hash)
}

#[tauri::command]
pub fn get_branches(path: &str) -> Result<Vec<String>, String> {
    services::get_branches(path)
}

#[tauri::command]
pub fn get_git_config_user(path: &str) -> Result<(String, String), String> {
    services::get_git_config_user(path)
}

#[tauri::command]
pub fn set_git_config_user(path: &str, name: &str, email: &str) -> Result<(), String> {
    services::set_git_config_user(path, name, email)
}

#[tauri::command]
pub fn git_discard_changes(path: &str, files: Vec<String>) -> Result<(), String> {
    services::git_discard_changes(path, files)
}
