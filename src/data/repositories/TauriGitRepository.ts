import { invoke } from "../../utils/AppLogger";
import {
  Commit,
  ReflogEntry,
  TagData,
  InitialRepoData,
  BranchesAndRemotes,
  SourceControlStatus,
} from "../../domain/entities/GitEntities";
import { IGitRepository } from "../../domain/repositories/IGitRepository";

export class TauriGitRepository implements IGitRepository {
  async getCommits(
    path: string,
    skip: number = 0,
    limit: number = 150,
    branches?: string[],
  ): Promise<Commit[]> {
    const branchArg = branches && branches.length > 0 ? branches : null;
    return await invoke<Commit[]>("get_git_graph", {
      path,
      skip,
      limit,
      branch: branchArg,
    });
  }

  async getCommitDetails(path: string, hash: string): Promise<any> {
    return await invoke("get_commit_details", { path, hash });
  }

  async getCurrentBranch(path: string): Promise<string> {
    return await invoke<string>("get_current_branch", { path });
  }

  async getHeadHash(path: string): Promise<string> {
    return await invoke<string>("get_head_hash", { path });
  }

  async getBranches(path: string): Promise<string[]> {
    return await invoke<string[]>("get_branches", { path });
  }

  async isWorktree(path: string): Promise<boolean> {
    return await invoke<boolean>("is_worktree", { path });
  }

  async getBranchesInfo(
    path: string,
  ): Promise<import("../../domain/entities/GitEntities").BranchData[]> {
    return await invoke<
      import("../../domain/entities/GitEntities").BranchData[]
    >("get_branches_info", { path });
  }

  async checkoutBranch(path: string, branch: string): Promise<void> {
    await invoke("git_checkout_branch", { path, branch });
  }

  async checkoutCommit(path: string, hash: string): Promise<void> {
    await invoke("git_checkout_commit", { path, hash });
  }

  async fetch(path: string): Promise<void> {
    await invoke("git_fetch_prune", { path });
  }

  async pull(path: string): Promise<void> {
    await invoke("git_pull", { path });
  }

  async stageFiles(path: string, files: string[]): Promise<void> {
    await invoke("git_stage", { path, files });
  }

  async unstageFiles(path: string, files: string[]): Promise<void> {
    await invoke("git_unstage", { path, files });
  }

  async discardChanges(path: string, files: string[]): Promise<void> {
    await invoke("git_discard_changes", { path, files });
  }

  async commit(path: string, message: string, noVerify: boolean = false): Promise<void> {
    await invoke("git_commit", { path, message, noVerify });
    try {
      await this.fetch(path);
    } catch (e) {
      console.warn("Failed to fetch after commit", e);
    }
  }

  async applyPatch(path: string, patch: string, reverse: boolean = false): Promise<void> {
    await invoke("git_apply_patch", { path, patch, reverse });
  }

  async push(path: string): Promise<void> {
    await invoke("git_push", { path });
  }

  async pushTags(path: string): Promise<void> {
    await invoke("git_push_tags", { path });
  }

  async reset(
    path: string,
    hash: string,
    mode: "soft" | "mixed" | "hard",
  ): Promise<void> {
    await invoke("git_reset", { path, hash, mode: `--${mode}` });
  }

  async rebase(path: string, branch: string): Promise<void> {
    await invoke("git_rebase", { path, branch });
  }

  async getRebaseState(path: string): Promise<boolean> {
    return await invoke<boolean>("git_get_rebase_state", { path });
  }

  async rebaseInteractive(
    path: string,
    baseCommit: string,
    sequence: string,
  ): Promise<string> {
    return await invoke<string>("git_rebase_interactive", {
      path,
      baseCommit,
      sequence,
    });
  }

  async rebaseContinue(path: string): Promise<void> {
    await invoke("git_rebase_continue", { path });
  }

  async rebaseAbort(path: string): Promise<void> {
    await invoke("git_rebase_abort", { path });
  }

  async stashSave(path: string, message?: string): Promise<void> {
    await invoke("git_stash_save", { path, message });
  }

  async stashPop(path: string): Promise<void> {
    await invoke("git_stash_pop", { path });
  }

  async getStashes(
    path: string,
  ): Promise<import("../../domain/entities/GitEntities").StashEntry[]> {
    return await invoke("git_stash_list", { path });
  }

  async applyStash(path: string, index: string): Promise<void> {
    await invoke("git_stash_apply", { path, index });
  }

  async dropStash(path: string, index: string): Promise<void> {
    await invoke("git_stash_drop", { path, index });
  }

  async cherryPick(path: string, hash: string): Promise<void> {
    await invoke("git_cherry_pick", { path, hash });
  }

  async revert(path: string, hash: string): Promise<void> {
    await invoke("git_revert", { path, hash });
  }

  async merge(path: string, branch: string): Promise<void> {
    await invoke("git_merge", { path, branch });
  }

  async createTag(path: string, name: string, hash?: string): Promise<void> {
    await invoke("git_tag_create", { path, name, hash });
  }

  async deleteTag(path: string, name: string): Promise<void> {
    await invoke("git_tag_delete", { path, name });
  }

  async deleteTagRemote(path: string, name: string): Promise<string> {
    return await invoke<string>("git_tag_delete_remote", { path, name });
  }

  async createBranch(path: string, name: string, hash: string): Promise<void> {
    await invoke("git_branch_create", { path, name, hash });
  }

  async renameBranch(path: string, oldName: string, newName: string): Promise<void> {
    await invoke("git_branch_rename", { path, oldName, newName });
  }

  async deleteBranch(
    path: string,
    name: string,
    force: boolean = false,
  ): Promise<void> {
    await invoke("git_branch_delete", { path, name, force });
  }

  async deleteBranchRemote(path: string, remote: string, name: string): Promise<void> {
    await invoke("git_branch_delete_remote", { path, remote, name });
  }

  async resolveConflict(
    path: string,
    file: string,
    strategy: "ours" | "theirs",
  ): Promise<void> {
    await invoke("git_resolve_conflict", { path, file, strategy });
  }

  async getCommitTree(path: string, hash: string): Promise<string[]> {
    return await invoke<string[]>("get_commit_tree", { path, hash });
  }

  async getFileContentAtCommit(
    path: string,
    hash: string,
    filePath: string,
  ): Promise<string> {
    return await invoke<string>("get_file_content_at_commit", {
      path,
      hash,
      filePath,
    });
  }

  async searchCommits(
    path: string,
    query: string,
    searchType: "all" | "message" | "author" | "file",
    branches?: string[],
    skip: number = 0,
    limit: number = 50,
  ): Promise<Commit[]> {
    return await invoke<Commit[]>("search_commits", {
      path,
      query,
      searchType,
      branches: branches && branches.length > 0 ? branches : null,
      skip,
      limit,
    });
  }

  async commitAmend(path: string, message: string): Promise<void> {
    await invoke("git_commit_amend", { path, message });
    try {
      await this.fetch(path);
    } catch (e) {
      console.warn("Failed to fetch after commit amend", e);
    }
  }

  async getReflog(path: string): Promise<ReflogEntry[]> {
    return await invoke<ReflogEntry[]>("get_git_reflog", { path });
  }

  async getTags(path: string): Promise<TagData[]> {
    return await invoke<TagData[]>("get_tags", { path });
  }

  /** Returns the number of commits the current branch is behind its upstream. 0 if no upstream or up to date. */
  async checkBehind(path: string): Promise<number> {
    try {
      return await invoke<number>("git_check_behind", { path });
    } catch {
      return 0;
    }
  }

  /** Returns the number of commits the current branch is ahead of its upstream. 0 if no upstream or up to date. */
  async checkAhead(path: string): Promise<number> {
    try {
      return await invoke<number>("git_check_ahead", { path });
    } catch {
      return 0;
    }
  }

  /** Returns local branch names whose remote tracking ref has been deleted (gone). */
  async getPrunedBranches(path: string): Promise<string[]> {
    try {
      return await invoke<string[]>("git_get_pruned_branches", { path });
    } catch {
      return [];
    }
  }

  async getSubmodules(path: string): Promise<import("../../domain/entities/GitEntities").SubmoduleInfo[]> {
    return await invoke<import("../../domain/entities/GitEntities").SubmoduleInfo[]>("get_git_submodules", { path });
  }

  async updateSubmodules(path: string): Promise<void> {
    await invoke("git_submodule_update", { path });
  }

  async syncSubmodules(path: string): Promise<void> {
    await invoke("git_submodule_sync", { path });
  }

  async addSubmodule(path: string, url: string, name: string): Promise<void> {
    await invoke("git_submodule_add", { path, url, name });
  }

  async removeSubmodule(path: string, name: string): Promise<void> {
    await invoke("git_submodule_remove", { path, name });
  }

  async getRepositoryStats(path: string): Promise<import("../../domain/entities/GitEntities").RepositoryStats> {
    return await invoke<import("../../domain/entities/GitEntities").RepositoryStats>("git_get_repository_stats", { path });
  }

  async getWorktrees(path: string): Promise<import("../../domain/entities/GitEntities").WorktreeData[]> {
    return await invoke<import("../../domain/entities/GitEntities").WorktreeData[]>("git_worktree_list", { path });
  }

  async addWorktree(path: string, newPath: string, branch: string, force: boolean = false): Promise<string> {
    return await invoke<string>("git_worktree_add", { path, newPath, branch, force });
  }

  async removeWorktree(path: string, worktreePath: string): Promise<string> {
    return await invoke<string>("git_worktree_remove", { path, worktreePath });
  }

  async pruneWorktrees(path: string): Promise<string> {
    return await invoke<string>("git_worktree_prune", { path });
  }

  /**
   * Aggregated startup call — returns commits, current branch, branch names,
   * HEAD hash, worktree status, and worktree count all in a single IPC round-trip.
   * Use this instead of making 6 separate calls on repository open.
   */
  async getInitialRepoData(
    path: string,
    skip: number = 0,
    limit: number = 150,
    branches?: string[],
  ): Promise<InitialRepoData> {
    const branchArg = branches && branches.length > 0 ? branches : null;
    return await invoke<InitialRepoData>("get_initial_repo_data", {
      path,
      skip,
      limit,
      branch: branchArg,
    });
  }

  /**
   * Aggregated branches + remotes call — replaces the two separate calls
   * `get_branches_info` and `git_remote_list` when opening the Branches sidebar.
   */
  async getBranchesAndRemotes(path: string): Promise<BranchesAndRemotes> {
    return await invoke<BranchesAndRemotes>("get_branches_and_remotes", { path });
  }

  /**
   * Aggregated SourceControl status poll — replaces 4+ sequential IPC calls.
   * Returns file statuses, rebase state, merge message, submodules, and stash count.
   */
  async getSourceControlStatus(path: string): Promise<SourceControlStatus> {
    return await invoke<SourceControlStatus>("get_source_control_status", { path });
  }

  async getGitConfigUser(path: string): Promise<[string, string]> {
    return await invoke<[string, string]>("get_git_config_user", { path });
  }

  async getGlobalGitConfigUser(): Promise<[string, string]> {
    return await invoke<[string, string]>("get_global_git_config_user");
  }

  async setGitConfigUser(path: string, name: string, email: string): Promise<void> {
    await invoke("set_git_config_user", { path, name, email });
  }

  async setGlobalGitConfigUser(name: string, email: string): Promise<void> {
    await invoke("set_global_git_config_user", { name, email });
  }

  async getRemotesList(path: string): Promise<string[]> {
    return await invoke<string[]>("git_remote_list", { path });
  }

  async addRemote(path: string, name: string, url: string): Promise<void> {
    await invoke("git_remote_add", { path, name, url });
  }

  async removeRemote(path: string, name: string): Promise<void> {
    await invoke("git_remote_remove", { path, name });
  }

  async getGitHooks(path: string): Promise<import("../../domain/entities/GitEntities").GitHook[]> {
    return await invoke("get_git_hooks", { path });
  }

  async toggleGitHook(path: string, hookName: string, state: boolean): Promise<void> {
    await invoke("toggle_git_hook", { path, hookName, hookState: state });
  }

  async readHookContent(path: string, hookName: string): Promise<string> {
    return await invoke<string>("read_hook_content", { path, hookName });
  }

  async saveHookContent(path: string, hookName: string, content: string): Promise<void> {
    await invoke("save_hook_content", { path, hookName, content });
  }

  async isLfsInstalled(): Promise<boolean> {
    try {
      return await invoke<boolean>("git_lfs_is_installed");
    } catch {
      return false;
    }
  }

  async getLfsFiles(path: string): Promise<string[]> {
    try {
      return await invoke<string[]>("git_lfs_ls_files", { path });
    } catch {
      return [];
    }
  }

  async trackLfs(path: string, pattern: string): Promise<void> {
    await invoke("git_lfs_track", { path, pattern });
  }

  async untrackLfs(path: string, pattern: string): Promise<void> {
    await invoke("git_lfs_untrack", { path, pattern });
  }

  async pullLfs(path: string): Promise<void> {
    await invoke("git_lfs_pull", { path });
  }

  async lockLfs(path: string, file: string): Promise<void> {
    await invoke("git_lfs_lock", { path, file });
  }

  async unlockLfs(path: string, file: string): Promise<void> {
    await invoke("git_lfs_unlock", { path, file });
  }
}

