export interface Commit {
  hash: string;
  message: string;
  author: string;
  date: number;
  parents: string[];
  refs: string[];
}

export interface Repository {
  path: string;
  name: string;
  branch?: string;
  is_worktree?: boolean;
}

export interface FileChange {
  path: string;
  status: string; // "A", "M", "D", "R", "conflicted", etc.
  insertions: number;
  deletions: number;
}

export interface CommitDetails extends Commit {
  files: FileChange[];
}

export interface ReflogEntry {
  hash: string;
  index: string;
  action: string;
  message: string;
}

export interface TagData {
  name: string;
  message: string;
  date: number;
  hash: string;
}

export interface BranchData {
  name: string;
  hash: string;
  date: number;
  message: string;
  is_remote: boolean;
}

export interface StashEntry {
  index: string;
  message: string;
  hash: string;
}

export interface SubmoduleInfo {
  name: string;
  path: string;
  url: string;
  status: string; // "", "+", "-", "U"
  hash: string;
}

export interface ActivityTimeline {
    timestamp: number;
    date: string;
    count: number;
}

export interface ContributorStat {
    name: string;
    commits: number;
}

export interface RepositoryStats {
    total_commits: number;
    timeline: ActivityTimeline[];
    top_contributors: ContributorStat[];
}

export interface WorktreeData {
  path: string;
  branch: string;
  commit: string;
}
