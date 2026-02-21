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
