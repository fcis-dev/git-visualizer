import { useState, useEffect, useRef, useCallback } from "react";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";

const FETCH_INTERVAL_MS = 60 * 1000; // 1 minute

interface UseAutoFetchOptions {
  /** Called after each successful fetch with the new state */
  onFetchDone?: (behindCount: number, prunedBranches: string[], withPrune: boolean) => void;
}

interface UseAutoFetchResult {
  /** How many commits the current branch is behind its upstream (0 = up to date) */
  behindCount: number;
  /** How many commits the current branch is ahead of its upstream (0 = up to date) */
  aheadCount: number;
  /** Local branches whose remote tracking ref is gone */
  prunedBranches: string[];
  /** True while an explicit or background fetch is running */
  isFetching: boolean;
  /** Timestamp of last successful fetch */
  lastFetchedAt: Date | null;
  /** Manually trigger an immediate fetch. If withPrune is true, the onFetchDone callback will be told it was a prune request. */
  triggerFetch: (withPrune?: boolean) => Promise<void>;
}

const repository = new TauriGitRepository();

export function useAutoFetch(
  repoPath: string,
  branchName: string,
  hasRemote: boolean,
  options?: UseAutoFetchOptions,
): UseAutoFetchResult {
  const [behindCount, setBehindCount] = useState(0);
  const [aheadCount, setAheadCount] = useState(0);
  const [prunedBranches, setPrunedBranches] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  // Keep options ref to avoid unnecessary restarts of the interval
  const onFetchDoneRef = useRef(options?.onFetchDone);
  onFetchDoneRef.current = options?.onFetchDone;

  const runFetch = useCallback(async (withPrune: boolean = false) => {
    if (!repoPath || !hasRemote) return;
    setIsFetching(true);
    try {
      await repository.fetch(repoPath);
    } catch {
      // Silently ignore network / no-remote errors during fetch
    }

    try {
      // Always update local tracking stats, even if the remote fetch failed
      const [behind, ahead, pruned] = await Promise.all([
        repository.checkBehind(repoPath),
        repository.checkAhead(repoPath),
        repository.getPrunedBranches(repoPath),
      ]);
      setBehindCount(behind);
      setAheadCount(ahead);
      setPrunedBranches(pruned);
      setLastFetchedAt(new Date());
      onFetchDoneRef.current?.(behind, pruned, withPrune);
    } catch (e) {
      console.warn("Failed to check behind/ahead stats:", e);
    } finally {
      setIsFetching(false);
    }
  }, [repoPath, hasRemote]);

  // Periodic auto-fetch
  useEffect(() => {
    if (!repoPath || !hasRemote) return;

    // Delay the initial behind/ahead/pruned check by 5 s so the UI is
    // responsive (commit graph visible) before we launch extra git processes.
    let cancelled = false;
    const initialTimer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const behind = await repository.checkBehind(repoPath);
        const ahead = await repository.checkAhead(repoPath);
        const pruned = await repository.getPrunedBranches(repoPath);
        if (!cancelled) {
          setBehindCount(behind);
          setAheadCount(ahead);
          setPrunedBranches(pruned);
        }
      } catch {
        // No upstream configured — ignore
      }
    }, 5000);

    const interval = setInterval(() => {
      runFetch();
    }, FETCH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [repoPath, branchName, runFetch, hasRemote]);

  // Reset when repo changes
  useEffect(() => {
    setBehindCount(0);
    setAheadCount(0);
    setPrunedBranches([]);
    setLastFetchedAt(null);
  }, [repoPath]);

  return {
    behindCount,
    aheadCount,
    prunedBranches,
    isFetching,
    lastFetchedAt,
    triggerFetch: runFetch,
  };
}
