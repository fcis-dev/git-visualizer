import { useState, useRef, useEffect, useMemo } from "react";
import { Commit, CommitDetails } from "../../domain/entities/GitEntities";
import { useGit } from "../hooks/useGit";
import { useAutoFetch } from "../hooks/useAutoFetch";
import { useGitActions } from "../hooks/useGitActions";
import { useDialog } from "../context/DialogContext";
import { SearchCommitsUseCase } from "../../domain/usecases/SearchCommitsUseCase";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";
import { useTranslation } from "react-i18next";

type SidebarTab = "changes" | "branches" | "tags" | "rescue" | "worktrees";

// In a real DI setup, we would inject this into the hook or Context.
const gitRepository = new TauriGitRepository();
const searchCommitsUseCase = new SearchCommitsUseCase(gitRepository);
const SEARCH_PAGE = 50;

export function useRepositoryWorkspaceController(
  repoPath: string,
  onBack: () => void
) {
  const { t } = useTranslation();
  const [commitSearchQuery, setCommitSearchQuery] = useState("");
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [commitDetails, setCommitDetails] = useState<CommitDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  
  const [diffTarget, setDiffTarget] = useState<{ path: string; commitHash?: string; cached?: boolean; } | null>(null);
  const [contentTarget, setContentTarget] = useState<{ path: string; commitHash: string; } | null>(null);
  const [conflictTarget, setConflictTarget] = useState<string | null>(null);
  
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>("changes");
  const [createBranchTarget, setCreateBranchTarget] = useState<string | null>(null);

  const [graphBranchContextMenu, setGraphBranchContextMenu] = useState<{ visible: boolean; x: number; y: number; refName: string; }>({ visible: false, x: 0, y: 0, refName: "" });

  const [refreshDate, setRefreshDate] = useState<Date>(new Date());
  const [searchType, setSearchType] = useState<"all" | "message" | "author" | "file">("all");
  const [globalSearchResults, setGlobalSearchResults] = useState<Commit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isScrollingToHead, setIsScrollingToHead] = useState(false);
  const [graphBranches, setGraphBranches] = useState<string[]>([]);
  const [isBranchFilterOpen, setIsBranchFilterOpen] = useState(false);

  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isFetchingManual, setIsFetchingManual] = useState(false);
  const [checkoutingBranch, setCheckoutingBranch] = useState<string | null>(null);

  const {
    commits,
    branchName,
    availableBranches,
    headHash,
    checkoutBranch,
    loadCommits,
    loadMoreCommits,
    isLoadingMore,
    hasMore,
    setError,
    error,
    isWorktree,
    worktreeCount,
    hasRemote,
  } = useGit(repoPath, graphBranches);

  const gitActions = useGitActions(repoPath, () => {
    loadCommits();
    setRefreshDate(new Date());
  });

  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    const onFocus = () => setRefreshDate(new Date());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filteredLocalCommits = useMemo(
    () =>
      commits.filter(
        (commit) =>
          commit.message.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
          commit.hash.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
          commit.author.toLowerCase().includes(commitSearchQuery.toLowerCase()),
      ),
    [commits, commitSearchQuery],
  );

  const displayCommits = useMemo(
    () => (globalSearchResults !== null ? globalSearchResults : filteredLocalCommits),
    [globalSearchResults, filteredLocalCommits],
  );

  useEffect(() => {
    if (error && (error.includes("No such file or directory") || error.includes("not a git repository"))) {
        console.warn("- Repository context lost (likely deleted submodule). Navigating back.", error);
        onBack();
    }
  }, [error, onBack]);

  const handleViewFileHistory = (path: string) => {
    setSearchType("file");
    setCommitSearchQuery(path);
  };

  const {
    aheadCount,
    behindCount,
    prunedBranches: _prunedBranches,
    isFetching: isAutoFetching,
    triggerFetch,
  } = useAutoFetch(repoPath, branchName, hasRemote, {
    onFetchDone: (_behind, pruned, withPrune) => {
      if (withPrune && pruned.length > 0) {
        showConfirm(
          "Ramas remotas eliminadas",
          `Las siguientes ramas locales rastrean refs remotas ya borradas:\n\n${pruned.join(", ")}\n\n¿Eliminarlas localmente?`,
          async () => {
            for (const branch of pruned) {
              try {
                await gitActions.deleteBranch(branch, false);
              } catch {
                try {
                  await gitActions.deleteBranch(branch, true);
                } catch { /* ignore */ }
              }
            }
            loadCommits();
          },
        );
      }
    },
  });

  useEffect(() => {
    if (commitSearchQuery.trim().length === 0) {
      setGlobalSearchResults(null);
      setHasMoreSearch(false);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    setGlobalSearchResults(null);
    setHasMoreSearch(false);
    searchTimeoutRef.current = window.setTimeout(() => {
        searchCommitsUseCase.execute(
          repoPath,
          commitSearchQuery,
          searchType,
          graphBranches.length > 0 ? graphBranches : undefined,
          0,
          SEARCH_PAGE
        )
        .then((results) => {
          const hasMore = results.length > SEARCH_PAGE;
          setGlobalSearchResults(
            hasMore ? results.slice(0, SEARCH_PAGE) : results,
          );
          setHasMoreSearch(hasMore);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("Search failed:", err);
          setGlobalSearchResults(null);
          setHasMoreSearch(false);
          setIsSearching(false);
        });
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commitSearchQuery, searchType, repoPath, graphBranches]);

  useEffect(() => {
    if (selectedCommit) {
      setCommitDetails(null);
      setDetailsLoading(true);
      gitActions
        .getCommitDetails(selectedCommit.hash)
        .then((details) => {
          setCommitDetails(details);
          setDetailsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load commit details", err);
          setCommitDetails(null);
          setDetailsLoading(false);
        });
    } else {
      setCommitDetails(null);
      setDetailsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommit?.hash]);

  const loadMoreSearchResults = async () => {
    if (!globalSearchResults || isLoadingMoreSearch || !hasMoreSearch) return;
    setIsLoadingMoreSearch(true);
    try {
      const skip = globalSearchResults.length;
      const results = await searchCommitsUseCase.execute(
        repoPath,
        commitSearchQuery,
        searchType,
        graphBranches.length > 0 ? graphBranches : undefined,
        skip,
        SEARCH_PAGE
      );
      const hasMore = results.length > SEARCH_PAGE;
      const toAdd = hasMore ? results.slice(0, SEARCH_PAGE) : results;
      setGlobalSearchResults((prev) => [...(prev ?? []), ...toAdd]);
      setHasMoreSearch(hasMore);
    } catch (err) {
      console.error("Load more search failed:", err);
    } finally {
      setIsLoadingMoreSearch(false);
    }
  };

  const handleFetch = async (withPrune: boolean = false) => {
    if (isFetchingManual || isAutoFetching) return;
    setIsFetchingManual(true);
    try {
      await triggerFetch(withPrune);
      loadCommits();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setIsFetchingManual(false);
    }
  };

  const handlePull = async () => {
    if (isPulling) return;
    setIsPulling(true);
    try {
      await gitActions.fetch();
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("git_pull", { path: repoPath });
      await triggerFetch();
      loadCommits();
      showAlert(t('workspace.header.pullCompleteTitle'), t('workspace.header.pullCompleteMsg'));
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    if (isPushing) return;
    setIsPushing(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("git_push", { path: repoPath });
      await triggerFetch();
      loadCommits();
      showAlert(t('workspace.header.pushCompleteTitle'), t('workspace.header.pushCompleteMsg'));
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setIsPushing(false);
    }
  };

  const onActionSuccess = () => {
    loadCommits();
    setRefreshDate(new Date());
  };

  return {
    state: {
      commitSearchQuery,
      selectedCommit,
      commitDetails,
      detailsLoading,
      isStatsModalOpen,
      diffTarget,
      contentTarget,
      conflictTarget,
      activeSidebarTab,
      createBranchTarget,
      graphBranchContextMenu,
      refreshDate,
      searchType,
      globalSearchResults,
      isSearching,
      hasMoreSearch,
      isLoadingMoreSearch,
      isBranchDropdownOpen,
      isScrollingToHead,
      graphBranches,
      isBranchFilterOpen,
      isPulling,
      isPushing,
      isFetchingManual,
      checkoutingBranch,
      commits,
      branchName,
      availableBranches,
      headHash,
      isLoadingMore,
      hasMore,
      error,
      isWorktree,
      worktreeCount,
      displayCommits,
      aheadCount,
      behindCount,
      isAutoFetching,
      hasRemote
    },
    actions: {
      setCommitSearchQuery,
      setSelectedCommit,
      setIsStatsModalOpen,
      setDiffTarget,
      setContentTarget,
      setConflictTarget,
      setActiveSidebarTab,
      setCreateBranchTarget,
      setGraphBranchContextMenu,
      setSearchType,
      setIsBranchDropdownOpen,
      setIsScrollingToHead,
      setGraphBranches,
      setIsBranchFilterOpen,
      setCheckoutingBranch,
      setCommitDetails,
      setDetailsLoading,
      setRefreshDate,
      loadCommits,
      loadMoreCommits,
      checkoutBranch,
      handleViewFileHistory,
      loadMoreSearchResults,
      handleFetch,
      handlePull,
      handlePush,
      onActionSuccess
    }
  }
}
