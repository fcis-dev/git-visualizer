use crate::config;
use crate::config::validate_path_in_workspace;
use crate::config::AppState;
use crate::models::{
    BranchData, CommitData, CommitDetails, FileStatus, ReflogEntry, RepoData, SubmoduleInfo,
    TagData, WorktreeData,
};
use crate::services;
use tauri::State; // use services module

#[tauri::command]
pub async fn get_commit_details(
    state: tauri::State<'_, AppState>,
    path: &str,
    hash: &str,
) -> Result<CommitDetails, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_commit_details(path, hash)
}

#[tauri::command]
pub async fn get_git_graph(
    state: tauri::State<'_, AppState>,
    path: &str,
    skip: usize,
    limit: usize,
    branch: Option<Vec<String>>,
) -> Result<Vec<CommitData>, String> {
    validate_path_in_workspace(&state, path)?;
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
pub async fn get_repos_in_folder(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<RepoData>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_repos_in_folder(path)
}

#[tauri::command]
pub async fn get_git_status(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<FileStatus>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_git_status(path)
}

#[tauri::command]
pub async fn git_resolve_conflict(
    state: tauri::State<'_, AppState>,
    path: String,
    file: String,
    strategy: String,
) -> Result<String, String> {
    validate_path_in_workspace(&state, &path)?;
    services::git_resolve_conflict(&path, &file, &strategy)
}

#[tauri::command]
pub async fn is_worktree(state: tauri::State<'_, AppState>, path: &str) -> Result<bool, String> {
    validate_path_in_workspace(&state, path)?;
    services::is_worktree(path)
}

#[tauri::command]
pub async fn git_stage(
    state: tauri::State<'_, AppState>,
    path: &str,
    files: Vec<String>,
) -> Result<(), String> {
    validate_path_in_workspace(&state, path)?;
    services::git_stage(path, files)
}

#[tauri::command]
pub async fn git_unstage(
    state: tauri::State<'_, AppState>,
    path: &str,
    files: Vec<String>,
) -> Result<(), String> {
    validate_path_in_workspace(&state, path)?;
    services::git_unstage(path, files)
}

#[tauri::command]
pub async fn git_commit(
    state: tauri::State<'_, AppState>,
    path: &str,
    message: String,
    no_verify: bool,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_commit(path, message, no_verify)
}

#[tauri::command]
pub async fn git_commit_amend(
    state: tauri::State<'_, AppState>,
    path: &str,
    message: String,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_commit_amend(path, message)
}

#[tauri::command]
pub async fn git_push(state: tauri::State<'_, AppState>, path: &str) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_push(path)
}

#[tauri::command]
pub async fn git_push_tags(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_push_tags(path)
}

#[tauri::command]
pub async fn git_pull(state: tauri::State<'_, AppState>, path: &str) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_pull(path)
}

#[tauri::command]
pub async fn get_current_branch(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_current_branch(path)
}

#[tauri::command]
pub async fn get_head_hash(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_head_hash(path)
}

#[tauri::command]
pub async fn git_fetch_prune(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_fetch_prune(path)
}

#[tauri::command]
pub async fn git_merge(
    state: tauri::State<'_, AppState>,
    path: &str,
    branch: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_merge(path, branch)
}

#[tauri::command]
pub async fn git_stash_save(
    state: tauri::State<'_, AppState>,
    path: &str,
    message: Option<String>,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_stash_save(path, message)
}

#[tauri::command]
pub async fn git_stash_pop(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_stash_pop(path)
}

#[tauri::command]
pub async fn git_stash_list(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<crate::models::StashEntry>, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_stash_list(path)
}

#[tauri::command]
pub async fn git_stash_show_diff(
    state: tauri::State<'_, AppState>,
    path: &str,
    index: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_stash_show_diff(path, index)
}

#[tauri::command]
pub async fn git_stash_apply(
    state: tauri::State<'_, AppState>,
    path: &str,
    index: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_stash_apply(path, index)
}

#[tauri::command]
pub async fn git_stash_drop(
    state: tauri::State<'_, AppState>,
    path: &str,
    index: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_stash_drop(path, index)
}

#[tauri::command]
pub async fn git_cherry_pick(
    state: tauri::State<'_, AppState>,
    path: &str,
    hash: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_cherry_pick(path, hash)
}

#[tauri::command]
pub async fn git_revert(
    state: tauri::State<'_, AppState>,
    path: &str,
    hash: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_revert(path, hash)
}

#[tauri::command]
pub async fn git_diff(
    state: tauri::State<'_, AppState>,
    path: &str,
    file: Option<String>,
    hash: Option<String>,
    cached: Option<bool>,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_diff(path, file, hash, cached)
}

#[tauri::command]
pub async fn git_apply_patch(
    state: tauri::State<'_, AppState>,
    path: &str,
    patch: &str,
    reverse: bool,
) -> Result<(), String> {
    validate_path_in_workspace(&state, path)?;
    services::git_apply_patch(path, patch, reverse)
}

#[tauri::command]
pub async fn git_tag_create(
    state: tauri::State<'_, AppState>,
    path: &str,
    name: &str,
    hash: Option<String>,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_tag_create(path, name, hash)
}

#[tauri::command]
pub async fn git_tag_delete(
    state: tauri::State<'_, AppState>,
    path: &str,
    name: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_tag_delete(path, name)
}

#[tauri::command]
pub async fn git_tag_delete_remote(
    state: tauri::State<'_, AppState>,
    path: &str,
    name: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_tag_delete_remote(path, name)
}

#[tauri::command]
pub async fn get_tags(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<TagData>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_tags(path)
}

#[tauri::command]
pub async fn git_branch_create(
    state: tauri::State<'_, AppState>,
    path: &str,
    name: &str,
    hash: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_branch_create(path, name, hash)
}

#[tauri::command]
pub async fn git_branch_rename(
    state: tauri::State<'_, AppState>,
    path: &str,
    old_name: &str,
    new_name: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_branch_rename(path, old_name, new_name)
}

#[tauri::command]
pub async fn git_checkout_branch(
    state: tauri::State<'_, AppState>,
    path: &str,
    branch: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_checkout_branch(path, branch)
}

#[tauri::command]
pub async fn git_branch_delete(
    state: tauri::State<'_, AppState>,
    path: &str,
    name: &str,
    force: bool,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_branch_delete(path, name, force)
}

#[tauri::command]
pub async fn git_branch_delete_remote(
    state: tauri::State<'_, AppState>,
    path: &str,
    remote: &str,
    name: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_branch_delete_remote(path, remote, name)
}

#[tauri::command]
pub async fn git_checkout_commit(
    state: tauri::State<'_, AppState>,
    path: &str,
    hash: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_checkout_commit(path, hash)
}

#[tauri::command]
pub async fn git_reset(
    state: tauri::State<'_, AppState>,
    path: &str,
    hash: &str,
    mode: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_reset(path, hash, mode)
}

#[tauri::command]
pub async fn get_git_reflog(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<ReflogEntry>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_git_reflog(path)
}

#[tauri::command]
pub async fn git_rebase(
    state: tauri::State<'_, AppState>,
    path: &str,
    branch: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_rebase(path, branch)
}

#[tauri::command]
pub async fn git_remote_list(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<String>, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_remote_list(path)
}

#[tauri::command]
pub async fn git_remote_add(
    state: tauri::State<'_, AppState>,
    path: &str,
    name: &str,
    url: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_remote_add(path, name, url)
}

#[tauri::command]
pub async fn git_remote_remove(
    state: tauri::State<'_, AppState>,
    path: &str,
    name: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_remote_remove(path, name)
}

#[tauri::command]
pub async fn git_check_behind(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<u32, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_check_behind(path)
}

#[tauri::command]
pub async fn git_check_ahead(state: tauri::State<'_, AppState>, path: &str) -> Result<u32, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_check_ahead(path)
}

#[tauri::command]
pub async fn git_get_pruned_branches(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<String>, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_get_pruned_branches(path)
}

#[tauri::command]
pub async fn git_blame(
    state: tauri::State<'_, AppState>,
    path: &str,
    file: &str,
    hash: Option<String>,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_blame(path, file, hash)
}

#[tauri::command]
pub async fn get_branches(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<String>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_branches(path)
}

#[tauri::command]
pub async fn get_branches_info(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<BranchData>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_branches_info(path)
}

#[tauri::command]
pub async fn get_initial_repo_data(
    state: tauri::State<'_, AppState>,
    path: String,
    skip: usize,
    limit: usize,
    branch: Option<Vec<String>>,
) -> Result<crate::models::InitialRepoData, String> {
    validate_path_in_workspace(&state, &path)?;
    tauri::async_runtime::spawn_blocking(move || {
        services::get_initial_repo_data(&path, skip, limit, branch)
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn get_branches_and_remotes(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<crate::models::BranchesAndRemotes, String> {
    validate_path_in_workspace(&state, &path)?;
    tauri::async_runtime::spawn_blocking(move || services::get_branches_and_remotes(&path))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn get_source_control_status(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<crate::models::SourceControlStatus, String> {
    validate_path_in_workspace(&state, &path)?;
    tauri::async_runtime::spawn_blocking(move || services::get_source_control_status(&path))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn get_git_config_user(
    _state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<(String, String), String> {
    services::get_git_config_user(path)
}

#[tauri::command]
pub async fn get_global_git_config_user(
    _state: tauri::State<'_, AppState>,
) -> Result<(String, String), String> {
    services::get_global_git_config_user()
}

#[tauri::command]
pub async fn set_git_config_user(
    _state: tauri::State<'_, AppState>,
    path: &str,
    name: &str,
    email: &str,
) -> Result<(), String> {
    services::set_git_config_user(path, name, email)
}

#[tauri::command]
pub async fn set_global_git_config_user(
    _state: tauri::State<'_, AppState>,
    name: &str,
    email: &str,
) -> Result<(), String> {
    services::set_global_git_config_user(name, email)
}

#[tauri::command]
pub async fn git_discard_changes(
    state: tauri::State<'_, AppState>,
    path: &str,
    files: Vec<String>,
) -> Result<(), String> {
    validate_path_in_workspace(&state, path)?;
    services::git_discard_changes(path, files)
}

#[tauri::command]
pub async fn get_commit_tree(
    state: tauri::State<'_, AppState>,
    path: &str,
    hash: &str,
) -> Result<Vec<String>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_commit_tree(path, hash)
}

#[tauri::command]
pub async fn get_file_content_at_commit(
    state: tauri::State<'_, AppState>,
    path: &str,
    hash: &str,
    file_path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_file_content_at_commit(path, hash, file_path)
}

#[tauri::command]
pub async fn search_commits(
    state: tauri::State<'_, AppState>,
    path: &str,
    query: &str,
    search_type: &str,
    branches: Option<Vec<String>>,
    skip: usize,
    limit: usize,
) -> Result<Vec<CommitData>, String> {
    validate_path_in_workspace(&state, path)?;
    services::search_commits(path, query, search_type, branches, skip, limit)
}

#[tauri::command]
pub async fn git_get_rebase_state(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<bool, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_get_rebase_state(path)
}

#[tauri::command]
pub async fn git_rebase_interactive(
    state: tauri::State<'_, AppState>,
    path: &str,
    base_commit: &str,
    sequence: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_rebase_interactive(path, base_commit, sequence)
}

#[tauri::command]
pub async fn git_rebase_continue(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_rebase_continue(path)
}

#[tauri::command]
pub async fn git_rebase_abort(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_rebase_abort(path)
}

#[tauri::command]
pub async fn get_git_submodules(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<SubmoduleInfo>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_git_submodules(path)
}

#[tauri::command]
pub async fn git_submodule_update(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    validate_path_in_workspace(&state, &path)?;
    tauri::async_runtime::spawn_blocking(move || services::git_submodule_update(&path))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn git_submodule_sync(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<(), String> {
    validate_path_in_workspace(&state, &path)?;
    tauri::async_runtime::spawn_blocking(move || services::git_submodule_sync(&path))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn git_submodule_add(
    state: tauri::State<'_, AppState>,
    path: String,
    url: String,
    name: String,
) -> Result<(), String> {
    validate_path_in_workspace(&state, &path)?;
    tauri::async_runtime::spawn_blocking(move || services::git_submodule_add(&path, &url, &name))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn git_submodule_remove(
    state: tauri::State<'_, AppState>,
    path: String,
    name: String,
) -> Result<(), String> {
    validate_path_in_workspace(&state, &path)?;
    tauri::async_runtime::spawn_blocking(move || services::git_submodule_remove(&path, &name))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn git_get_repository_stats(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<crate::models::RepositoryStats, String> {
    validate_path_in_workspace(&state, &path)?;
    tauri::async_runtime::spawn_blocking(move || services::git_get_repository_stats(&path))
        .await
        .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn git_read_file(state: State<'_, AppState>, path: String) -> Result<String, String> {
    validate_path_in_workspace(&state, &path)?;

    tauri::async_runtime::spawn_blocking(move || {
        std::fs::read_to_string(&path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn git_write_file(
    state: State<'_, AppState>,
    path: String,
    content: String,
) -> Result<(), String> {
    validate_path_in_workspace(&state, &path)?;

    tauri::async_runtime::spawn_blocking(move || {
        std::fs::write(&path, content).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?
}

#[tauri::command]
pub async fn git_worktree_list(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<WorktreeData>, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_worktree_list(path)
}

#[tauri::command]
pub async fn git_worktree_add(
    state: tauri::State<'_, AppState>,
    path: &str,
    new_path: &str,
    branch: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_worktree_add(path, new_path, branch)
}

#[tauri::command]
pub async fn git_worktree_remove(
    state: tauri::State<'_, AppState>,
    path: &str,
    worktree_path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_worktree_remove(path, worktree_path)
}

#[tauri::command]
pub async fn git_worktree_prune(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::git_worktree_prune(path)
}
#[tauri::command]
pub async fn register_window(
    state: State<'_, AppState>,
    label: String,
    path: String,
) -> Result<(), String> {
    services::register_window(state, label, path)
}

#[tauri::command]
pub async fn unregister_window(state: State<'_, AppState>, label: String) -> Result<(), String> {
    services::unregister_window(state, label)
}

#[tauri::command]
pub async fn get_git_hooks(
    state: tauri::State<'_, AppState>,
    path: &str,
) -> Result<Vec<crate::models::GitHook>, String> {
    validate_path_in_workspace(&state, path)?;
    services::get_git_hooks(path)
}

#[tauri::command]
pub async fn toggle_git_hook(
    state: tauri::State<'_, AppState>,
    path: &str,
    hook_name: &str,
    hook_state: bool,
) -> Result<(), String> {
    validate_path_in_workspace(&state, path)?;
    services::toggle_git_hook(path, hook_name, hook_state)
}

#[tauri::command]
pub async fn read_hook_content(
    state: tauri::State<'_, AppState>,
    path: &str,
    hook_name: &str,
) -> Result<String, String> {
    validate_path_in_workspace(&state, path)?;
    services::read_hook_content(path, hook_name)
}

#[tauri::command]
pub async fn save_hook_content(
    state: tauri::State<'_, AppState>,
    path: &str,
    hook_name: &str,
    content: &str,
) -> Result<(), String> {
    validate_path_in_workspace(&state, path)?;
    services::save_hook_content(path, hook_name, content)
}

#[tauri::command]
pub async fn get_session(
    state: State<'_, AppState>,
) -> Result<Vec<crate::models::WindowSession>, String> {
    services::get_session(state)
}
