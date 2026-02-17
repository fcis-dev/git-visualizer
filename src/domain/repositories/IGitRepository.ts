import { Commit } from "../entities/GitEntities";

export interface IGitRepository {
  getCommits(path: string): Promise<Commit[]>;
  getCurrentBranch(path: string): Promise<string>;
  getBranches(path: string): Promise<string[]>;
  
  checkoutBranch(path: string, branch: string): Promise<void>;
  checkoutCommit(path: string, hash: string): Promise<void>;
  
  fetch(path: string): Promise<void>;
  pull(path: string): Promise<void>;
  push(path: string): Promise<void>;
  
  reset(path: string, hash: string, mode: 'soft' | 'mixed' | 'hard'): Promise<void>;
  rebase(path: string, branch: string): Promise<void>;
  cherryPick(path: string, hash: string): Promise<void>;
  revert(path: string, hash: string): Promise<void>;
  merge(path: string, branch: string): Promise<void>;
  
  createTag(path: string, name: string, hash?: string): Promise<void>;
  createBranch(path: string, name: string, hash: string): Promise<void>;
}
