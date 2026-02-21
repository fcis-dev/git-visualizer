import { invoke } from "@tauri-apps/api/core";
import { Commit, ReflogEntry, TagData } from "../../domain/entities/GitEntities";
import { IGitRepository } from "../../domain/repositories/IGitRepository";

export class TauriGitRepository implements IGitRepository {
  async getCommits(path: string): Promise<Commit[]> {
    return await invoke<Commit[]>("get_git_graph", { path });
  }

  async getCommitDetails(path: string, hash: string): Promise<any> {
      return await invoke("get_commit_details", { path, hash });
  }

  async getCurrentBranch(path: string): Promise<string> {
    return await invoke<string>("get_current_branch", { path });
  }

  async getBranches(path: string): Promise<string[]>;
  async getBranches(path: string): Promise<string[]> {
      return await invoke<string[]>("get_branches", { path });
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

  async push(path: string): Promise<void> {
    await invoke("git_push", { path });
  }

  async pushTags(path: string): Promise<void> {
    await invoke("git_push_tags", { path });
  }

  async reset(path: string, hash: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void> {
    await invoke("git_reset", { path, hash, mode: `--${mode}` });
  }

  async rebase(path: string, branch: string): Promise<void> {
    await invoke("git_rebase", { path, branch });
  }

  async getRebaseState(path: string): Promise<boolean> {
      return await invoke<boolean>("git_get_rebase_state", { path });
  }

  async rebaseInteractive(path: string, baseCommit: string, sequence: string): Promise<string> {
      return await invoke<string>("git_rebase_interactive", { path, base_commit: baseCommit, sequence });
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

  async getStashes(path: string): Promise<import("../../domain/entities/GitEntities").StashEntry[]> {
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

  async createBranch(path: string, name: string, hash: string): Promise<void> {
    await invoke("git_branch_create", { path, name, hash });
  }

  async resolveConflict(path: string, file: string, strategy: 'ours' | 'theirs'): Promise<void> {
    await invoke("git_resolve_conflict", { path, file, strategy });
  }

  async getCommitTree(path: string, hash: string): Promise<string[]> {
      return await invoke<string[]>("get_commit_tree", { path, hash });
  }

  async getFileContentAtCommit(path: string, hash: string, filePath: string): Promise<string> {
      return await invoke<string>("get_file_content_at_commit", { path, hash, filePath });
  }

  async searchCommits(path: string, query: string, searchType: "all" | "message" | "author" | "file"): Promise<Commit[]> {
      // In Rust the command name is search_commits, so the arguments are path, query, search_type
      return await invoke<Commit[]>("search_commits", { path, query, searchType:      searchType
    });
  }

  async commitAmend(path: string, message: string): Promise<void> {
    await invoke("git_commit_amend", { path, message });
  }

  async getReflog(path: string): Promise<ReflogEntry[]> {
    return await invoke<ReflogEntry[]>("get_git_reflog", { path });
  }

  async getTags(path: string): Promise<TagData[]> {
    return await invoke<TagData[]>("get_tags", { path });
  }
}
