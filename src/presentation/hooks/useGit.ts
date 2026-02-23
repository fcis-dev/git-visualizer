import { useState, useCallback, useEffect, useRef } from "react";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";
import { Commit } from "../../domain/entities/GitEntities";

const PAGE_SIZE = 150;

export function useGit(repoPath: string, filterBranches: string[] = []) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branchName, setBranchName] = useState<string>("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [headHash, setHeadHash] = useState<string>("");

  const commitCountRef = useRef(0);
  const repository = new TauriGitRepository();

  const loadCommits = useCallback(async () => {
    if (!repoPath) return;
    setIsLoading(true);
    setError(null);
    setHasMore(true);
    try {
      const [commitsData, branch, branchesList, headHashStr] = await Promise.all([
        repository.getCommits(repoPath, 0, PAGE_SIZE, filterBranches.length > 0 ? filterBranches : undefined),
        repository.getCurrentBranch(repoPath),
        repository.getBranches(repoPath),
        repository.getHeadHash(repoPath).catch(() => ""),
      ]);
      setCommits(commitsData);
      commitCountRef.current = commitsData.length;
      setBranchName(branch);
      setAvailableBranches(branchesList);
      setHeadHash(headHashStr);
      if (commitsData.length < PAGE_SIZE) setHasMore(false);
    } catch (err: any) {
      console.error(err);
      setError(err.toString());
      setCommits([]);
      commitCountRef.current = 0;
      setBranchName("");
      setAvailableBranches([]);
      setHeadHash("");
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
          const existingHashes = new Set(prev.map(c => c.hash));
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
    setError
  };
}
