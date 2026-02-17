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
