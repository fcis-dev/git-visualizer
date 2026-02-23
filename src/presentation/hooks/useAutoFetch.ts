import { useState, useEffect, useRef, useCallback } from "react";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";

const FETCH_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

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
    if (!repoPath) return;
    setIsFetching(true);
    try {
      await repository.fetch(repoPath);
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
    } catch {
      // Silently ignore network / no-remote errors
    } finally {
      setIsFetching(false);
    }
  }, [repoPath]);

  // Periodic auto-fetch
  useEffect(() => {
    if (!repoPath) return;

    // Initial check (just behind count, no full fetch to avoid being slow at open)
    let cancelled = false;
    (async () => {
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
    })();

    const interval = setInterval(() => {
      runFetch();
    }, FETCH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [repoPath, runFetch]);

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
