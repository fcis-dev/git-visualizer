import { useState, useCallback, useEffect } from "react";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";
import { Commit } from "../../domain/entities/GitEntities";

export function useGit(repoPath: string) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branchName, setBranchName] = useState<string>("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const repository = new TauriGitRepository();

  const loadCommits = useCallback(async () => {
    if (!repoPath) return;
    setIsLoading(true);
    setError(null);
    try {
      const [commitsData, branch, branchesList] = await Promise.all([
        repository.getCommits(repoPath),
        repository.getCurrentBranch(repoPath),
        repository.getBranches(repoPath),
      ]);
      setCommits(commitsData);
      setBranchName(branch);
      setAvailableBranches(branchesList);
    } catch (err: any) {
      console.error(err);
      setError(err.toString());
      setCommits([]);
      setBranchName("");
      setAvailableBranches([]);
    } finally {
      setIsLoading(false);
    }
  }, [repoPath]);

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
    error,
    isLoading,
    loadCommits,
    checkoutBranch,
    fetch,
    setError
  };
}
