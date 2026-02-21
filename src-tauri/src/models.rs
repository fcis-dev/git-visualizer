use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct CommitData {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: i64,
    pub parents: Vec<String>,
    pub refs: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct RepoData {
    pub path: String,
    pub name: String,
    pub branch: String,
}

#[derive(Debug, Serialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String, // "modified", "staged", "new", "deleted"
}

#[derive(Debug, Serialize)]
pub struct FileChange {
    pub path: String,
    pub status: String, // "A", "M", "D", "R", etc.
    pub insertions: usize,
    pub deletions: usize,
}

#[derive(Debug, Serialize)]
pub struct CommitDetails {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: i64,
    pub parents: Vec<String>,
    pub files: Vec<FileChange>,
}

#[derive(Debug, Serialize)]
pub struct ReflogEntry {
    pub hash: String,
    pub index: String,
    pub action: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct TagData {
    pub name: String,
    pub message: String,
    pub date: i64,
    pub hash: String,
}

#[derive(Debug, Serialize)]
pub struct StashEntry {
    pub index: String,
    pub message: String,
    pub hash: String,
}
