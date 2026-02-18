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
