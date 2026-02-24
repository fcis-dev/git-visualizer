import { Commit, ReflogEntry, TagData } from "../entities/GitEntities";

export interface IGitRepository {
  getCommits(path: string, skip?: number, limit?: number): Promise<Commit[]>;
  getCurrentBranch(path: string): Promise<string>;
  getBranches(path: string): Promise<string[]>;

  checkoutBranch(path: string, branch: string): Promise<void>;
  checkoutCommit(path: string, hash: string): Promise<void>;

  fetch(path: string): Promise<void>;
  pull(path: string): Promise<void>;
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
  
  stashSave(path: string, message?: string): Promise<void>;
  stashPop(path: string): Promise<void>;
  getStashes(path: string): Promise<import("../entities/GitEntities").StashEntry[]>;
  applyStash(path: string, index: string): Promise<void>;
  dropStash(path: string, index: string): Promise<void>;

  createTag(path: string, name: string, hash?: string): Promise<void>;
  deleteTag(path: string, name: string): Promise<void>;
  createBranch(path: string, name: string, hash: string): Promise<void>;
  renameBranch(path: string, oldName: string, newName: string): Promise<void>;
  deleteBranch(path: string, name: string, force?: boolean): Promise<void>;

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
  ): Promise<Commit[]>;

  commitAmend(path: string, message: string): Promise<void>;

  getReflog(path: string): Promise<ReflogEntry[]>;
  
  getTags(path: string): Promise<TagData[]>;
}
