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
