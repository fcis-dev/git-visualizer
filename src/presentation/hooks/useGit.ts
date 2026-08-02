import { useState, useCallback, useEffect, useRef } from "react";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";
import { Commit } from "../../domain/entities/GitEntities";

const PAGE_SIZE = 150;

// Single shared instance — avoids re-instantiation on every render
const repository = new TauriGitRepository();

export function useGit(repoPath: string, filterBranches: string[] = []) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branchName, setBranchName] = useState<string>("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [headHash, setHeadHash] = useState<string>("");
  const [isWorktree, setIsWorktree] = useState(false);
  const [worktreeCount, setWorktreeCount] = useState(0);
  const [hasRemote, setHasRemote] = useState(false);
  const [stashCount, setStashCount] = useState(0);

  const commitCountRef = useRef(0);
  const prevRepoPathRef = useRef(repoPath);

  if (repoPath !== prevRepoPathRef.current) {
    prevRepoPathRef.current = repoPath;
    setCommits([]);
    setBranchName("");
    setAvailableBranches([]);
    setHeadHash("");
    setIsWorktree(false);
    setWorktreeCount(0);
    setHasRemote(false);
    setStashCount(0);
    commitCountRef.current = 0;
  }

  const loadCommits = useCallback(async () => {
    if (!repoPath) return;
    setIsLoading(true);
    setError(null);
    setHasMore(true);
    try {
      // Single aggregated IPC call instead of 6 separate ones
      const data = await repository.getInitialRepoData(
        repoPath,
        0,
        PAGE_SIZE,
        filterBranches.length > 0 ? filterBranches : undefined,
      );

      setCommits(data.commits);
      commitCountRef.current = data.commits.length;
      setBranchName(data.current_branch);
      setAvailableBranches(data.branches);
      setHeadHash(data.head_hash);
      setIsWorktree(data.is_worktree);
      setWorktreeCount(data.worktree_count);
      setHasRemote(data.has_remote);
      if (data.commits.length < PAGE_SIZE) setHasMore(false);

      try {
        const stashes = await repository.getStashes(repoPath);
        setStashCount(stashes.length);
      } catch (err) {
        console.error("Failed to fetch stashes in useGit", err);
        setStashCount(0);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.toString());
      setCommits([]);
      commitCountRef.current = 0;
      setBranchName("");
      setAvailableBranches([]);
      setHeadHash("");
      setIsWorktree(false);
      setWorktreeCount(0);
      setHasRemote(false);
      setStashCount(0);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath, filterBranches.join(",")]);

  const loadMoreCommits = useCallback(async () => {
    if (!repoPath || isLoading || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const newCommits = await repository.getCommits(repoPath, commitCountRef.current, PAGE_SIZE, filterBranches.length > 0 ? filterBranches : undefined);
      if (newCommits.length === 0 || newCommits.length < PAGE_SIZE) setHasMore(false);
      if (newCommits.length > 0) {
        setCommits((prev) => {
          const existingHashes = new Set<string>();
          prev.forEach(c => existingHashes.add(c.hash));
          const uniqueNewCommits = newCommits.filter(c => !existingHashes.has(c.hash));
          const updated = [...prev, ...uniqueNewCommits];
          commitCountRef.current = updated.length;
          return updated;
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath, isLoadingMore, hasMore, filterBranches.join(",")]);

  const checkoutBranch = async (branch: string) => {
    if (!repoPath) return;
    try {
      await repository.checkoutBranch(repoPath, branch);
      await loadCommits();
    } catch (e: any) {
        setError(e.toString());
        throw e;
    }
  };

  const fetch = async () => {
    if (!repoPath) return;
    try {
      await repository.fetch(repoPath);
      await loadCommits();
    } catch (e: any) {
        setError(e.toString());
        throw e;
    }
  };

  useEffect(() => {
    if (repoPath) {
      loadCommits();
    }
  }, [repoPath, loadCommits]);

  return {
    commits,
    branchName,
    availableBranches,
    headHash,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    loadCommits,
    loadMoreCommits,
    checkoutBranch,
    fetch,
    setError,
    isWorktree,
    worktreeCount,
    hasRemote,
    stashCount
  };
}
