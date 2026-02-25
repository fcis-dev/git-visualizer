import { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  ArrowLeft,
  Search,
  Filter,
  LifeBuoy,
  Tag,
  Check,
  FolderGit2,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { SourceControl } from "./Sidebar/SourceControl";
import { BranchesSidebar } from "./Sidebar/BranchesSidebar";
import { TagsSidebar } from "./Sidebar/TagsSidebar";
import { RescueSidebar } from "./Sidebar/RescueSidebar";
import { Graph, GraphHandle } from "./Graph";
import { DiffView } from "./DiffView";
import { CommitDetails } from "./CommitDetails";
import { HistoricalFileContentView } from "./HistoricalFileContentView";
import { CreateBranchModal } from "./CreateBranchModal";
import { useGit } from "../hooks/useGit";
import { useGitActions } from "../hooks/useGitActions";
import { useAutoFetch } from "../hooks/useAutoFetch";
import { useDialog } from "../context/DialogContext";
import {
  buildBranchTree,
  sortTreeNodes,
  BranchTreeNode,
} from "../utils/branchTreeUtils";
import {
  Commit,
  CommitDetails as CommitDetailsType,
} from "../../domain/entities/GitEntities";

interface RepositoryWorkspaceProps {
  repoPath: string;
  onBack: () => void;
}

export function RepositoryWorkspace({
  repoPath,
  onBack,
}: RepositoryWorkspaceProps) {
  const [commitSearchQuery, setCommitSearchQuery] = useState("");
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [commitDetails, setCommitDetails] = useState<CommitDetailsType | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [diffTarget, setDiffTarget] = useState<{
    path: string;
    commitHash?: string;
    cached?: boolean;
  } | null>(null);

  const [contentTarget, setContentTarget] = useState<{
    path: string;
    commitHash: string;
  } | null>(null);

  type SidebarTab = "changes" | "branches" | "tags" | "rescue";
  const [activeSidebarTab, setActiveSidebarTab] =
    useState<SidebarTab>("changes");

  const [createBranchTarget, setCreateBranchTarget] = useState<string | null>(
    null,
  );

  // Global search state
  const [searchType, setSearchType] = useState<
    "all" | "message" | "author" | "file"
  >("all");
  const [globalSearchResults, setGlobalSearchResults] = useState<
    Commit[] | null
  >(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isScrollingToHead, setIsScrollingToHead] = useState(false);
  const [graphBranches, setGraphBranches] = useState<string[]>([]); // empty = all branches
  const [isBranchFilterOpen, setIsBranchFilterOpen] = useState(false);
  const graphRef = useRef<GraphHandle>(null);
  const commitsRef = useRef<Commit[]>([]);
  const hasMoreRef = useRef<boolean>(true);
  const isLoadingMoreRef = useRef<boolean>(false);

  // Loading states for async buttons
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isFetchingManual, setIsFetchingManual] = useState(false);
  const [checkoutingBranch, setCheckoutingBranch] = useState<string | null>(
    null,
  );

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
  } = useGit(repoPath, graphBranches);

  // Keep refs in sync for use inside async loops (avoids stale closures)
  useEffect(() => {
    commitsRef.current = commits;
  }, [commits]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore]);

  // Filter commits based on search query
  const filteredLocalCommits = commits.filter(
    (commit) =>
      commit.message.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
      commit.hash.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
      commit.author.toLowerCase().includes(commitSearchQuery.toLowerCase()),
  );

  const displayCommits =
    globalSearchResults !== null ? globalSearchResults : filteredLocalCommits;

  const { showConfirm, showInput, showAlert } = useDialog();

  // Refresh after actions (same as before)
  const onActionSuccess = () => {
    loadCommits();
  };

  const gitActions = useGitActions(repoPath, onActionSuccess);

  // File history view logic
  const handleViewFileHistory = (path: string) => {
    setSearchType("file");
    setCommitSearchQuery(path);
  };

  // Auto-fetch hook — periodic silent fetch every 3 minutes
  const {
    aheadCount,
    behindCount,
    prunedBranches: _prunedBranches,
    isFetching: isAutoFetching,
    triggerFetch,
  } = useAutoFetch(repoPath, branchName, {
    onFetchDone: (_behind, pruned, withPrune) => {
      // After fetch, if requested, offer to delete pruned branches (those whose remote was deleted)
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
                } catch {
                  /* ignore */
                }
              }
            }
            loadCommits();
          },
        );
      }
    },
  });

  // Scroll the graph to the HEAD commit of the current branch.
  const handleScrollToHead = async () => {
    if (isScrollingToHead) return;

    // Helper to identify HEAD either by precise hash or by refs
    const isHead = (c: Commit) => {
      if (headHash && c.hash === headHash) return true;
      if (!c.refs) return false;
      return c.refs.some(
        (r) => r === "HEAD" || r.toUpperCase().startsWith("HEAD ->"),
      );
    };

    // Try immediately with already-loaded commits
    const foundLocal = commitsRef.current.find(isHead);
    if (foundLocal) {
      const found = graphRef.current?.scrollToHash(foundLocal.hash);
      if (found) return;
    }

    setIsScrollingToHead(true);
    let pagesSearched = 0;
    const MAX_PAGES = 10; // Avoid truly infinite loops if HEAD is not in the current filter
    try {
      // Keep loading pages until we find the commit or hit the limit
      while (hasMoreRef.current && pagesSearched < MAX_PAGES) {
        if (isLoadingMoreRef.current) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        await loadMoreCommits();
        pagesSearched++;
        await new Promise((r) => setTimeout(r, 50));
        const headCommit = commitsRef.current.find(isHead);
        if (headCommit) {
          graphRef.current?.scrollToHash(headCommit.hash);
          return;
        }
      }
      // If we exhausted all commits or hit limit, just scroll to top
      graphRef.current?.scrollToTop();
      if (pagesSearched >= MAX_PAGES && !commitsRef.current.find(isHead)) {
        showAlert(
          "HEAD no encontrado",
          "No se encontró el commit HEAD en el gráfico actual.",
        );
      }
    } finally {
      setIsScrollingToHead(false);
    }
  };

  // Perform global backend search when query changes (first page)
  const SEARCH_PAGE = 50;
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
      gitActions
        .searchCommits(
          commitSearchQuery,
          searchType,
          graphBranches.length > 0 ? graphBranches : undefined,
          0,
          SEARCH_PAGE,
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

  // Load next page of search results (append)
  const loadMoreSearchResults = async () => {
    if (!globalSearchResults || isLoadingMoreSearch || !hasMoreSearch) return;
    setIsLoadingMoreSearch(true);
    try {
      const skip = globalSearchResults.length;
      const results = await gitActions.searchCommits(
        commitSearchQuery,
        searchType,
        graphBranches.length > 0 ? graphBranches : undefined,
        skip,
        SEARCH_PAGE,
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

  // Load commit details when selected
  useEffect(() => {
    if (selectedCommit) {
      // Reset details while loading to avoid stale data
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
          // We could set an error state here specifically for details
          setCommitDetails(null);
          setDetailsLoading(false);
        });
    } else {
      setCommitDetails(null);
      setDetailsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCommit?.hash]);

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
      await gitActions.fetch(); // fetch first to update remote tracking
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("git_pull", { path: repoPath });
      await triggerFetch(); // Refresh ahead/behind counts
      loadCommits();
      showAlert(
        "Pull Completado",
        "Los cambios remotos se han descargado correctamente.",
      );
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
      await triggerFetch(); // Refresh ahead/behind counts
      loadCommits();
      showAlert(
        "Push Completado",
        "Los cambios locales se han subido correctamente.",
      );
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setIsPushing(false);
    }
  };

  // Actions Wrappers
  const handleCheckoutCommit = (hash: string) => {
    showConfirm(
      "Checkout Commit",
      `Checkout ${hash.substring(0, 7)}? Detached HEAD.`,
      async () => {
        try {
          await gitActions.checkoutCommit(hash);
          showAlert("Checked Out", `Checked out ${hash.substring(0, 7)}`);
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };
  const handleCreateBranch = (hash: string) => {
    setCreateBranchTarget(hash);
  };

  const handleCreateTag = (hash: string) => {
    showInput("Create Tag", "Tag name:", async (name) => {
      if (!name) return;
      try {
        await gitActions.createTag(name, hash);
      } catch (e: any) {
        setError(e.toString());
      }
    });
  };
  const handleMerge = (hash: string) => {
    showConfirm(
      "Merge",
      `Merge ${hash.substring(0, 7)} into ${branchName}?`,
      async () => {
        try {
          await gitActions.merge(hash);
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };
  const handleRevert = (hash: string) => {
    showConfirm("Revert", `Revert ${hash.substring(0, 7)}?`, async () => {
      try {
        await gitActions.revert(hash);
      } catch (e: any) {
        setError(e.toString());
      }
    });
  };
  const handleCherryPick = (hash: string) => {
    showConfirm(
      "Cherry Pick",
      `Cherry-pick ${hash.substring(0, 7)}?`,
      async () => {
        try {
          await gitActions.cherryPick(hash);
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };
  const handleRebase = (hash: string) => {
    showConfirm(
      "Rebase",
      `Rebase ${branchName} onto ${hash.substring(0, 7)}?`,
      async () => {
        try {
          await gitActions.rebase(hash);
          showAlert("Rebase Complete", "Success.");
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };
  const handleReset = (hash: string, mode: "soft" | "mixed" | "hard") => {
    showConfirm(
      `Reset (${mode})`,
      `Reset to ${hash.substring(0, 7)}?`,
      async () => {
        try {
          await gitActions.reset(hash, mode);
          showAlert("Reset Complete", "Success.");
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };

  const repoName = repoPath.split(/[\/\\]/).pop() || "Repository";

  return (
    <div className="flex-1 w-full flex flex-col h-full min-w-0 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="relative h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-slate-950 z-20">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Back to Projects"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {repoName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-500 truncate max-w-[300px]">
              {repoPath}
            </p>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

          {/* Branch Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded text-sm text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              title="Switch Branch"
            >
              <GitBranch className="w-4 h-4" />
              <span>{branchName || "..."}</span>
            </button>

            {isBranchDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setIsBranchDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-40 overflow-hidden animate-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    Local Branches
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {availableBranches.length > 0 ? (
                      <DropdownBranchNodeRenderer
                        node={buildBranchTree(availableBranches, (b) => b)}
                        branchName={branchName}
                        checkoutingBranch={checkoutingBranch}
                        onCheckout={async (branch) => {
                          try {
                            setCheckoutingBranch(branch);
                            await checkoutBranch(branch);
                            setIsBranchDropdownOpen(false);
                            showAlert(
                              "Branch Switched",
                              `Successfully checked out ${branch}`,
                            );
                          } catch (e: any) {
                            setIsBranchDropdownOpen(false);
                            showAlert("Checkout Failed", e.toString());
                          } finally {
                            setCheckoutingBranch(null);
                          }
                        }}
                      />
                    ) : (
                      <div className="px-3 py-4 text-center text-xs text-slate-400">
                        No branches found
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Scroll to HEAD button */}
          {commits.length > 0 && (
            <button
              onClick={handleScrollToHead}
              disabled={isScrollingToHead}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                isScrollingToHead
                  ? "Locating HEAD commit…"
                  : "Scroll to HEAD commit of current branch"
              }
            >
              {isScrollingToHead ? (
                <svg
                  className="animate-spin w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    strokeWidth="3"
                    strokeDasharray="31.4 31.4"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="8 12 12 8 16 12" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                </svg>
              )}
              <span>HEAD</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Sync Actions (Fetch, Pull, Push) */}
          <button
            onClick={() => handleFetch(true)}
            disabled={isFetchingManual || isAutoFetching}
            className="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-wait"
            title="Fetch (con Prune)"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetchingManual || isAutoFetching ? "animate-spin" : ""}`}
            />
          </button>

          <button
            onClick={handlePull}
            disabled={isPulling}
            className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border disabled:opacity-60 disabled:cursor-wait ${
              behindCount > 0
                ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent"
            }`}
            title={behindCount > 0 ? `Pull (${behindCount} behind)` : "Pull"}
          >
            {isPulling ? (
              <svg
                className="animate-spin w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="3"
                  strokeDasharray="31.4 31.4"
                />
              </svg>
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )}
            <span>Pull</span>
            {behindCount > 0 && !isPulling && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.2rem] text-[9px] font-bold rounded-full bg-amber-500 text-white leading-none shadow-sm text-center">
                {behindCount}
              </span>
            )}
          </button>

          <button
            onClick={handlePush}
            disabled={isPushing}
            className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border disabled:opacity-60 disabled:cursor-wait ${
              aheadCount > 0
                ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
                : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent"
            }`}
            title={aheadCount > 0 ? `Push (${aheadCount} ahead)` : "Push"}
          >
            {isPushing ? (
              <svg
                className="animate-spin w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="3"
                  strokeDasharray="31.4 31.4"
                />
              </svg>
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
            <span>Push</span>
            {aheadCount > 0 && !isPushing && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.2rem] text-[9px] font-bold rounded-full bg-indigo-500 text-white leading-none shadow-sm text-center">
                {aheadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content (Activity Bar + Sidebar + Main Area) */}
      <main className="flex-1 overflow-hidden relative flex bg-slate-50 dark:bg-slate-900">
        {/* Activity Bar (Leftmost Column) */}
        <div className="w-14 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center py-4 z-20 space-y-4">
          <div className="flex-1 w-full flex flex-col items-center space-y-4">
            <button
              onClick={() => setActiveSidebarTab("changes")}
              className={`p-3 rounded-xl transition-all relative ${
                activeSidebarTab === "changes"
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Changes"
            >
              <FolderGit2 className="w-6 h-6 stroke-[1.5]" />
              {activeSidebarTab === "changes" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full -ml-[9px]"></div>
              )}
            </button>

            <button
              onClick={() => setActiveSidebarTab("branches")}
              className={`p-3 rounded-xl transition-all relative ${
                activeSidebarTab === "branches"
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Branches"
            >
              <GitBranch className="w-6 h-6 stroke-[1.5]" />
              {activeSidebarTab === "branches" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full -ml-[9px]"></div>
              )}
            </button>

            <button
              onClick={() => setActiveSidebarTab("tags")}
              className={`p-3 rounded-xl transition-all relative ${
                activeSidebarTab === "tags"
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title="Tags"
            >
              <Tag className="w-6 h-6 stroke-[1.5]" />
              {activeSidebarTab === "tags" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-600 dark:bg-emerald-500 rounded-r-full -ml-[9px]"></div>
              )}
            </button>
          </div>

          {/* Bottom Actions of Activity Bar */}
          <div className="w-full flex flex-col items-center pb-2">
            <button
              onClick={() => setActiveSidebarTab("rescue")}
              className={`p-3 rounded-xl transition-all relative ${
                activeSidebarTab === "rescue"
                  ? "text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm"
                  : "text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
              }`}
              title="Rescue (Reflog)"
            >
              <LifeBuoy className="w-6 h-6 stroke-[1.5]" />
              {activeSidebarTab === "rescue" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full -ml-[9px]"></div>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Sidebar (Changes / Branches / Rescue) */}
        <div className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-10 transition-all">
          {activeSidebarTab === "changes" && (
            <SourceControl
              repoPath={repoPath}
              latestCommit={commits.length > 0 ? commits[0] : null}
              onSelectFile={(file, cached) => {
                setDiffTarget({ path: file, cached });
              }}
              onViewFileHistory={handleViewFileHistory}
              onCommit={loadCommits}
              isAutoFetching={isAutoFetching || isFetchingManual}
              onFetch={handleFetch}
            />
          )}

          {activeSidebarTab === "branches" && (
            <BranchesSidebar
              repoPath={repoPath}
              currentBranch={branchName}
              onRefreshGraph={loadCommits}
            />
          )}

          {activeSidebarTab === "tags" && (
            <TagsSidebar repoPath={repoPath} onRefreshGraph={loadCommits} />
          )}

          {activeSidebarTab === "rescue" && (
            <RescueSidebar repoPath={repoPath} onRestore={loadCommits} />
          )}
        </div>

        {/* Middle Column: History Graph & Search (and Overlay Diff) */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950">
          {/* Search Bar — includes branch filter button */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex space-x-2 items-center">
            {/* Branch filter button */}
            <div className="relative shrink-0 flex items-center">
              <div
                className={`flex items-center border rounded transition-colors ${
                  graphBranches.length > 0
                    ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                }`}
              >
                <div
                  className={`pl-2.5 pr-2 border-r flex items-center self-stretch ${
                    graphBranches.length > 0
                      ? "border-indigo-200 dark:border-indigo-500/30 text-indigo-500"
                      : "border-slate-200 dark:border-slate-800 text-slate-400"
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                </div>
                <button
                  onClick={() => setIsBranchFilterOpen((v) => !v)}
                  className={`py-2 pl-2 pr-2 text-sm focus:outline-none cursor-pointer flex items-center gap-1.5 ${
                    graphBranches.length > 0
                      ? "text-indigo-700 dark:text-indigo-300 font-medium"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span>
                    {graphBranches.length === 0
                      ? "All branches"
                      : graphBranches.join(" + ")}
                  </span>
                  <svg
                    className="w-3 h-3 text-slate-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
              {/* Dropdown */}
              {isBranchFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsBranchFilterOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-40 overflow-hidden">
                    <button
                      onClick={() => {
                        setGraphBranches([]);
                        setSelectedCommit(null);
                        setCommitSearchQuery("");
                        setIsBranchFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                        graphBranches.length === 0
                          ? "text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-500/5"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 flex items-center justify-center rounded border text-xs shrink-0 ${
                          graphBranches.length === 0
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {graphBranches.length === 0 && (
                          <Check className="w-3 h-3" />
                        )}
                      </span>
                      <span>All branches</span>
                    </button>
                    <div className="max-h-52 overflow-y-auto custom-scrollbar">
                      {availableBranches.length > 0 && (
                        <FilterBranchNodeRenderer
                          node={buildBranchTree(availableBranches, (b) => b)}
                          graphBranches={graphBranches}
                          branchName={branchName}
                          onToggle={(b) => {
                            setGraphBranches((prev) =>
                              prev.includes(b)
                                ? prev.filter((x) => x !== b)
                                : [...prev, b],
                            );
                            setSelectedCommit(null);
                            setCommitSearchQuery("");
                          }}
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder={
                  searchType === "all"
                    ? "Search globally by message, author..."
                    : searchType === "message"
                      ? "Search commit messages globally..."
                      : searchType === "author"
                        ? "Search by commit author globally..."
                        : "Search by changed file path globally..."
                }
                value={commitSearchQuery}
                onChange={(e) => setCommitSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-colors"
              />
              {isSearching ? (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              ) : commitSearchQuery.length > 0 ? (
                <button
                  onClick={() => setCommitSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Clear search"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              ) : null}
            </div>

            <div className="relative shrink-0 flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
              <div className="pl-3 pr-2 border-r border-slate-200 dark:border-slate-800 text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="py-2 pl-2 pr-6 text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 dark:text-slate-300 appearance-none cursor-pointer"
              >
                <option value="all">Everywhere</option>
                <option value="message">Message</option>
                <option value="author">Author</option>
                <option value="file">File Path</option>
              </select>
            </div>
          </div>

          {/* Graph */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <Graph
              ref={graphRef}
              commits={displayCommits}
              selectedCommit={selectedCommit}
              onSelectCommit={setSelectedCommit}
              onLoadMore={
                commitSearchQuery.trim().length > 0
                  ? hasMoreSearch
                    ? loadMoreSearchResults
                    : undefined
                  : loadMoreCommits
              }
              isLoadingMore={
                commitSearchQuery.trim().length > 0
                  ? isLoadingMoreSearch
                  : isLoadingMore
              }
              hasMore={
                commitSearchQuery.trim().length > 0 ? hasMoreSearch : hasMore
              }
              isSearchResult={commitSearchQuery.trim().length > 0}
            />
          </div>

          {/* Diff View Overlay (over the middle column) */}
          {diffTarget && (
            <div className="absolute inset-0 z-20 bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom-4 duration-200 shadow-2xl">
              <header className="h-12 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDiffTarget(null)}
                    className="flex items-center space-x-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-xl">
                    {diffTarget.path}
                  </span>
                </div>
              </header>
              <div className="flex-1 overflow-hidden">
                <DiffView
                  repoPath={repoPath}
                  filePath={diffTarget.path}
                  commitHash={diffTarget.commitHash}
                  cached={diffTarget.cached}
                  onClose={() => setDiffTarget(null)}
                  onRefresh={onActionSuccess}
                />
              </div>
            </div>
          )}

          {/* Historical File Content View Overlay */}
          {contentTarget && (
            <HistoricalFileContentView
              repoPath={repoPath}
              filePath={contentTarget.path}
              commitHash={contentTarget.commitHash}
              onClose={() => setContentTarget(null)}
            />
          )}
        </div>

        {/* Right Column: Commit Details */}
        {selectedCommit && (
          <div className="w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-in slide-in-from-right duration-200 z-10 shadow-xl overflow-y-auto">
            <CommitDetails
              repoPath={repoPath}
              commit={selectedCommit}
              details={commitDetails}
              detailsLoading={detailsLoading}
              currentBranch={branchName}
              fileFilter={
                searchType === "file" && commitSearchQuery.trim().length > 0
                  ? commitSearchQuery.trim()
                  : undefined
              }
              onClose={() => setSelectedCommit(null)}
              onCopyHash={(h) => navigator.clipboard.writeText(h)}
              onSelectFile={(p) =>
                setDiffTarget({
                  path: p,
                  commitHash: selectedCommit.hash,
                  cached: false,
                })
              }
              onViewHistoricalFile={(p) =>
                setContentTarget({ path: p, commitHash: selectedCommit.hash })
              }
              onViewFileHistory={handleViewFileHistory}
              onCheckout={handleCheckoutCommit}
              onCreateBranch={handleCreateBranch}
              onCreateTag={handleCreateTag}
              onMerge={handleMerge}
              onRevert={handleRevert}
              onCherryPick={handleCherryPick}
              onRebase={handleRebase}
              onReset={handleReset}
              onRefreshGraph={() => loadCommits()}
            />
          </div>
        )}
      </main>

      {/* Overlays */}
      {createBranchTarget && (
        <CreateBranchModal
          baseCommit={createBranchTarget}
          onClose={() => setCreateBranchTarget(null)}
          onSubmit={async (name, checkout) => {
            await gitActions.createBranch(name, createBranchTarget);
            if (checkout) {
              await gitActions.checkoutBranch(name);
              showAlert("Success", `Branch '${name}' created and checked out.`);
              loadCommits();
            } else {
              showAlert("Success", `Branch '${name}' created.`);
            }
          }}
        />
      )}
    </div>
  );
}

function DropdownBranchNodeRenderer({
  node,
  branchName,
  checkoutingBranch,
  onCheckout,
  level = 0,
}: {
  node: BranchTreeNode<string>;
  branchName: string;
  checkoutingBranch: string | null;
  onCheckout: (b: string) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = sortTreeNodes(node);
  const isFolder = !node.isLeaf && children.length > 0;

  if (node.name === "root") {
    return (
      <>
        {children.map((child) => (
          <DropdownBranchNodeRenderer
            key={child.path}
            node={child}
            branchName={branchName}
            checkoutingBranch={checkoutingBranch}
            onCheckout={onCheckout}
            level={level}
          />
        ))}
      </>
    );
  }

  if (isFolder) {
    return (
      <div className="flex flex-col">
        <button
          onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center text-slate-500 dark:text-slate-400 font-medium"
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          type="button"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 mr-1" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mr-1" />
          )}
          <span className="truncate">{node.name}/</span>
        </button>
        {expanded && (
          <div className="flex flex-col">
            {children.map((child) => (
              <DropdownBranchNodeRenderer
                key={child.path}
                node={child}
                branchName={branchName}
                checkoutingBranch={checkoutingBranch}
                onCheckout={onCheckout}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const branch = node.data!;
  return (
    <button
      disabled={checkoutingBranch === branch}
      onClick={() => onCheckout(branch)}
      className={`w-full text-left pr-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between disabled:opacity-60 disabled:cursor-wait
                ${branch === branchName ? "text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/10" : "text-slate-700 dark:text-slate-300"}
            `}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      type="button"
    >
      <span className="truncate">{node.name}</span>
      {checkoutingBranch === branch ? (
        <svg
          className="animate-spin w-3.5 h-3.5 text-indigo-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            strokeWidth="3"
            strokeDasharray="31.4 31.4"
          />
        </svg>
      ) : branch === branchName ? (
        <Check className="w-3.5 h-3.5" />
      ) : null}
    </button>
  );
}

function FilterBranchNodeRenderer({
  node,
  graphBranches,
  branchName,
  onToggle,
  level = 0,
}: {
  node: BranchTreeNode<string>;
  graphBranches: string[];
  branchName: string;
  onToggle: (b: string) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = sortTreeNodes(node);
  const isFolder = !node.isLeaf && children.length > 0;

  if (node.name === "root") {
    return (
      <>
        {children.map((child) => (
          <FilterBranchNodeRenderer
            key={child.path}
            node={child}
            graphBranches={graphBranches}
            branchName={branchName}
            onToggle={onToggle}
            level={level}
          />
        ))}
      </>
    );
  }

  if (isFolder) {
    return (
      <div className="flex flex-col">
        <button
          onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center text-slate-500 dark:text-slate-400 font-medium"
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          type="button"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 mr-1" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mr-1" />
          )}
          <span className="truncate">{node.name}/</span>
        </button>
        {expanded && (
          <div className="flex flex-col">
            {children.map((child) => (
              <FilterBranchNodeRenderer
                key={child.path}
                node={child}
                graphBranches={graphBranches}
                branchName={branchName}
                onToggle={onToggle}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const b = node.data!;
  const checked = graphBranches.includes(b);
  return (
    <button
      onClick={() => onToggle(b)}
      className={`w-full text-left pr-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
        checked
          ? "text-indigo-700 dark:text-indigo-300"
          : "text-slate-700 dark:text-slate-300"
      }`}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      type="button"
    >
      <span
        className={`w-4 h-4 flex items-center justify-center rounded border shrink-0 transition-colors ${
          checked
            ? "bg-indigo-500 border-indigo-500 text-white"
            : "border-slate-300 dark:border-slate-600"
        }`}
      >
        {checked && <Check className="w-3 h-3" />}
      </span>
      <GitBranch className="w-3.5 h-3.5 shrink-0 text-slate-400" />
      <span className="truncate">{node.name}</span>
      {b === branchName && (
        <span className="ml-auto text-xs text-indigo-500 dark:text-indigo-400 shrink-0">
          current
        </span>
      )}
    </button>
  );
}
