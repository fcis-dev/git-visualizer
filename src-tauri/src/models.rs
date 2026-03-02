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
    pub is_worktree: bool,
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
pub struct BranchData {
    pub name: String,
    pub hash: String,
    pub date: i64,
    pub message: String,
    pub is_remote: bool,
}

#[derive(Debug, Serialize)]
pub struct StashEntry {
    pub index: String,
    pub message: String,
    pub hash: String,
}

#[derive(Debug, Serialize)]
pub struct SubmoduleInfo {
    pub name: String,
    pub path: String,
    pub url: String,
    pub status: String, // e.g., "", "+", "-", "U"
    pub hash: String,
}

#[derive(Debug, Serialize)]
pub struct ActivityTimeline {
    pub timestamp: i64,
    pub date: String,
    pub count: usize,
}

#[derive(Debug, Serialize)]
pub struct ContributorStat {
    pub name: String,
    pub commits: usize,
}

#[derive(Debug, Serialize)]
pub struct RepositoryStats {
    pub total_commits: usize,
    pub timeline: Vec<ActivityTimeline>,
    pub top_contributors: Vec<ContributorStat>,
}

#[derive(Debug, Serialize)]
pub struct WorktreeData {
    pub path: String,
    pub branch: String,
    pub commit: String,
}

/// Aggregated data returned in a single IPC call when opening a repository.
/// Replaces 6 individual calls: get_git_graph, get_current_branch, get_branches,
/// get_head_hash, is_worktree, git_worktree_list.
#[derive(Debug, Serialize)]
pub struct InitialRepoData {
    pub commits: Vec<CommitData>,
    pub current_branch: String,
    pub branches: Vec<String>,
    pub head_hash: String,
    pub is_worktree: bool,
    pub worktree_count: usize,
}

/// Aggregated data for the Branches sidebar — branches + remotes in one call.
#[derive(Debug, Serialize)]
pub struct BranchesAndRemotes {
    pub branches: Vec<BranchData>,
    pub remotes: Vec<String>,
}

/// Aggregated response for SourceControl panel status poll — replaces 4+ sequential IPC calls.
#[derive(Debug, Serialize)]
pub struct SourceControlStatus {
    pub files: Vec<FileStatus>,
    pub is_rebasing: bool,
    pub merge_msg: Option<String>,
    pub submodules: Vec<SubmoduleInfo>,
    pub stash_count: usize,
}
