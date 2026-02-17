import { invoke } from "@tauri-apps/api/core";
import { Commit } from "../../domain/entities/GitEntities";
import { IGitRepository } from "../../domain/repositories/IGitRepository";

export class TauriGitRepository implements IGitRepository {
  async getCommits(path: string): Promise<Commit[]> {
    return await invoke<Commit[]>("get_git_graph", { path });
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

  async reset(path: string, hash: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void> {
    await invoke("git_reset", { path, hash, mode: `--${mode}` });
  }

  async rebase(path: string, branch: string): Promise<void> {
    await invoke("git_rebase", { path, branch });
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

  async createBranch(path: string, name: string, hash: string): Promise<void> {
    await invoke("git_branch_create", { path, name, hash });
  }
}
