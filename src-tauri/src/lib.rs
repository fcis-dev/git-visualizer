mod commands;
mod config;
mod models;
mod services;

use config::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_commit_details,
            commands::get_git_graph,
            commands::add_folder,
            commands::remove_folder,
            commands::list_folders,
            commands::get_repos_in_folder,
            commands::get_git_status,
            commands::git_stage,
            commands::git_unstage,
            commands::git_commit,
            commands::git_push,
            commands::git_push_tags,
            commands::git_pull,
            commands::get_current_branch,
            commands::get_head_hash,
            commands::git_fetch_prune,
            commands::git_merge,
            commands::git_stash_save,
            commands::git_stash_pop,
            commands::git_stash_list,
            commands::git_stash_apply,
            commands::git_stash_drop,
            commands::git_cherry_pick,
            commands::git_revert,
            commands::git_diff,
            commands::git_apply_patch,
            commands::git_tag_create,
            commands::git_tag_delete,
            commands::git_tag_delete_remote,
            commands::get_tags,
            commands::git_branch_create,
            commands::git_branch_rename,
            commands::git_checkout_branch,
            commands::git_branch_delete,
            commands::git_branch_delete_remote,
            commands::git_checkout_commit,
            commands::git_reset,
            commands::git_rebase,
            commands::git_remote_list,
            commands::git_remote_add,
            commands::git_remote_remove,
            commands::git_blame,
            commands::git_resolve_conflict,
            commands::get_branches,
            commands::get_branches_info,
            commands::get_git_config_user,
            commands::set_git_config_user,
            commands::git_discard_changes,
            commands::get_commit_tree,
            commands::get_file_content_at_commit,
            commands::search_commits,
            commands::git_commit_amend,
            commands::get_git_reflog,
            commands::git_get_rebase_state,
            commands::git_rebase_interactive,
            commands::git_rebase_continue,
            commands::git_rebase_abort,
            commands::git_check_behind,
            commands::git_check_ahead,
            commands::git_get_pruned_branches,
            commands::get_git_submodules,
            commands::git_submodule_update,
            commands::git_submodule_sync,
            commands::git_submodule_add,
            commands::git_submodule_remove,
            commands::git_get_repository_stats,
            commands::git_read_file,
            commands::git_write_file,
            commands::git_worktree_list,
            commands::git_worktree_add,
            commands::git_worktree_remove,
            commands::git_worktree_prune,
            commands::is_worktree,
            commands::get_initial_repo_data,
            commands::get_branches_and_remotes,
            commands::get_source_control_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
