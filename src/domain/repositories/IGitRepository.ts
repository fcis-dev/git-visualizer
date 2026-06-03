import { Commit, ReflogEntry, TagData, InitialRepoData, BranchesAndRemotes, SourceControlStatus } from "../entities/GitEntities";

export interface IGitRepository {
  getCommits(
    path: string,
    skip?: number,
    limit?: number,
    branches?: string[]
  ): Promise<Commit[]>;
  getCurrentBranch(path: string): Promise<string>;
  getBranches(path: string): Promise<string[]>;
  isWorktree(path: string): Promise<boolean>;

  checkoutBranch(path: string, branch: string): Promise<void>;
  checkoutCommit(path: string, hash: string): Promise<void>;

  fetch(path: string): Promise<void>;
  pull(path: string): Promise<void>;
  applyPatch(path: string, patch: string, reverse?: boolean): Promise<void>;
  push(path: string): Promise<void>;
  pushTags(path: string): Promise<void>;

  reset(
    path: string,
    hash: string,
    mode: "soft" | "mixed" | "hard",
  ): Promise<void>;
  rebase(path: string, branch: string): Promise<void>;
  
  getRebaseState(path: string): Promise<boolean>;
  rebaseInteractive(path: string, baseCommit: string, sequence: string): Promise<string>;
  rebaseContinue(path: string): Promise<void>;
  rebaseAbort(path: string): Promise<void>;
  
  cherryPick(path: string, hash: string): Promise<void>;
  revert(path: string, hash: string): Promise<void>;
  merge(path: string, branch: string): Promise<void>;
  
  stageFiles(path: string, files: string[]): Promise<void>;
  unstageFiles(path: string, files: string[]): Promise<void>;
  discardChanges(path: string, files: string[]): Promise<void>;
  commit(path: string, message: string, noVerify?: boolean): Promise<void>;

  stashSave(path: string, message?: string): Promise<void>;
  stashPop(path: string): Promise<void>;
  getStashes(path: string): Promise<import("../entities/GitEntities").StashEntry[]>;
  applyStash(path: string, index: string): Promise<void>;
  dropStash(path: string, index: string): Promise<void>;

  createTag(path: string, name: string, hash?: string): Promise<void>;
  deleteTag(path: string, name: string): Promise<void>;
  deleteTagRemote(path: string, name: string): Promise<string>;
  createBranch(path: string, name: string, hash: string): Promise<void>;
  renameBranch(path: string, oldName: string, newName: string): Promise<void>;
  deleteBranch(path: string, name: string, force?: boolean): Promise<void>;
  deleteBranchRemote(path: string, remote: string, name: string): Promise<void>;

  resolveConflict(
    path: string,
    file: string,
    strategy: "ours" | "theirs",
  ): Promise<void>;

  getCommitTree(path: string, hash: string): Promise<string[]>;
  getFileContentAtCommit(
    path: string,
    hash: string,
    filePath: string,
  ): Promise<string>;

  searchCommits(
    path: string,
    query: string,
    searchType: "all" | "message" | "author" | "file",
    branches?: string[],
    skip?: number,
    limit?: number
  ): Promise<Commit[]>;

  commitAmend(path: string, message: string): Promise<void>;

  getReflog(path: string): Promise<ReflogEntry[]>;
  
  getTags(path: string): Promise<TagData[]>;

  getSubmodules(path: string): Promise<import("../entities/GitEntities").SubmoduleInfo[]>;
  updateSubmodules(path: string): Promise<void>;
  syncSubmodules(path: string): Promise<void>;
  addSubmodule(path: string, url: string, name: string): Promise<void>;
  removeSubmodule(path: string, name: string): Promise<void>;
  
  getRepositoryStats(path: string): Promise<import("../entities/GitEntities").RepositoryStats>;

  getWorktrees(path: string): Promise<import("../entities/GitEntities").WorktreeData[]>;
  addWorktree(path: string, newPath: string, branch: string, force?: boolean): Promise<string>;
  removeWorktree(path: string, worktreePath: string): Promise<string>;
  pruneWorktrees(path: string): Promise<string>;

  getInitialRepoData(
    path: string,
    skip?: number,
    limit?: number,
    branches?: string[],
  ): Promise<InitialRepoData>;

  getBranchesAndRemotes(path: string): Promise<BranchesAndRemotes>;

  getSourceControlStatus(path: string): Promise<SourceControlStatus>;

  getGitConfigUser(path: string): Promise<[string, string]>;
  getGlobalGitConfigUser(): Promise<[string, string]>;
  setGitConfigUser(path: string, name: string, email: string): Promise<void>;
  setGlobalGitConfigUser(name: string, email: string): Promise<void>;
  
  getRemotesList(path: string): Promise<string[]>;
  addRemote(path: string, name: string, url: string): Promise<void>;
  removeRemote(path: string, name: string): Promise<void>;

  getGitHooks(path: string): Promise<import("../entities/GitEntities").GitHook[]>;
  toggleGitHook(path: string, hookName: string, state: boolean): Promise<void>;
  readHookContent(path: string, hookName: string): Promise<string>;
  saveHookContent(path: string, hookName: string, content: string): Promise<void>;

  isLfsInstalled(): Promise<boolean>;
  getLfsFiles(path: string): Promise<string[]>;
  trackLfs(path: string, pattern: string): Promise<void>;
  untrackLfs(path: string, pattern: string): Promise<void>;
  pullLfs(path: string): Promise<void>;
  lockLfs(path: string, file: string): Promise<void>;
  unlockLfs(path: string, file: string): Promise<void>;
}

