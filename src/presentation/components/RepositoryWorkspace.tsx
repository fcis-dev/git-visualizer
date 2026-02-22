import { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  RefreshCw,
  ArrowLeft,
  Search,
  Filter,
  LifeBuoy,
  Tag,
  Check,
} from "lucide-react";
import { SourceControl } from "./Sidebar/SourceControl";
import { Graph, GraphHandle } from "./Graph";
import { DiffView } from "./DiffView";
import { CommitDetails } from "./CommitDetails";
import { HistoricalFileContentView } from "./HistoricalFileContentView";
import { ReflogModal } from "./ReflogModal";
import { TagsModal } from "./TagsModal";
import { BranchManagerModal } from "./BranchManagerModal";
import { CreateBranchModal } from "./CreateBranchModal";
import { useGit } from "../hooks/useGit";
import { useGitActions } from "../hooks/useGitActions";
import { useDialog } from "../context/DialogContext";
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
  } | null>(null);

  const [contentTarget, setContentTarget] = useState<{
    path: string;
    commitHash: string;
  } | null>(null);

  const [isReflogModalOpen, setIsReflogModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isBranchManagerOpen, setIsBranchManagerOpen] = useState(false);
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
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isScrollingToHead, setIsScrollingToHead] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);
  const graphRef = useRef<GraphHandle>(null);
  // We keep a ref of commits & loadMoreCommits to avoid stale closures in async loops
  const commitsRef = useRef<Commit[]>([]);
  const hasMoreRef = useRef<boolean>(true);
  const isLoadingMoreRef = useRef<boolean>(false);

  // Using existing hooks
  const {
    commits,
    branchName,
    availableBranches,
    checkoutBranch,
    loadCommits,
    loadMoreCommits,
    isLoadingMore,
    hasMore,
    setError,
  } = useGit(repoPath);

  // Keep refs in sync for use inside async loops (avoids stale closures)
  useEffect(() => { commitsRef.current = commits; }, [commits]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { isLoadingMoreRef.current = isLoadingMore; }, [isLoadingMore]);

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

  // Scroll the graph to the HEAD commit of the current branch.
  // If the commit hasn't been loaded yet, keeps loading more pages until it appears.
  const handleScrollToHead = async () => {
    if (!branchName || isScrollingToHead) return;

    // Try immediately with already-loaded commits
    const found = graphRef.current?.scrollToHash(
      commitsRef.current.find((c) => c.refs?.includes(branchName))?.hash ?? ""
    );
    if (found) return;

    setIsScrollingToHead(true);
    try {
      // Keep loading pages until we find the commit or run out
      while (hasMoreRef.current) {
        if (isLoadingMoreRef.current) {
          // Wait for the ongoing load to finish
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        await loadMoreCommits();
        // Small yield so React can flush the state update
        await new Promise((r) => setTimeout(r, 50));
        const headCommit = commitsRef.current.find((c) => c.refs?.includes(branchName));
        if (headCommit) {
          graphRef.current?.scrollToHash(headCommit.hash);
          return;
        }
      }
      // If we exhausted all commits and still didn't find it, just scroll to top
      graphRef.current?.scrollToTop();
    } finally {
      setIsScrollingToHead(false);
    }
  };

  // Perform global backend search when query changes
  useEffect(() => {
    if (commitSearchQuery.trim().length === 0) {
      setGlobalSearchResults(null);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = window.setTimeout(() => {
      gitActions
        .searchCommits(commitSearchQuery, searchType)
        .then((results) => {
          setGlobalSearchResults(results);
          setIsSearching(false);
        })
        .catch((err) => {
          console.error("Search failed:", err);
          setGlobalSearchResults(null);
          setIsSearching(false);
        });
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [commitSearchQuery, searchType, repoPath]);

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

  const handleFetch = async () => {
    try {
      await gitActions.fetch();
      showAlert(
        "Fetch Successful",
        "Repository fetched and pruned successfully.",
      );
    } catch (e: any) {
      setError(e.toString());
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
                    {availableBranches.map((branch) => (
                      <button
                        key={branch}
                        onClick={async () => {
                          try {
                            await checkoutBranch(branch);
                            setIsBranchDropdownOpen(false);
                            showAlert(
                              "Branch Switched",
                              `Successfully checked out ${branch}`,
                            );
                          } catch (e: any) {
                            setIsBranchDropdownOpen(false);
                            showAlert("Checkout Failed", e.toString());
                          }
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between
                           ${branch === branchName ? "text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/10" : "text-slate-700 dark:text-slate-300"}
                        `}
                      >
                        <span className="truncate">{branch}</span>
                        {branch === branchName && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                    {availableBranches.length === 0 && (
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
              title={isScrollingToHead ? "Buscando commit HEAD…" : "Ir al commit HEAD de la rama actual"}
            >
              {isScrollingToHead ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="31.4 31.4" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
          {/* Actions */}

          <button
            onClick={() => setIsBranchManagerOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-500/20 text-sm font-medium"
            title="Manage Branches"
          >
            <GitBranch className="w-4 h-4" />
            <span>Branches</span>
          </button>

          <button
            onClick={() => setIsTagsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-500/20 text-sm font-medium"
            title="Manage Tags"
          >
            <Tag className="w-4 h-4" />
            <span>Tags</span>
          </button>

          <button
            onClick={() => setIsReflogModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg transition-colors border border-amber-200 dark:border-amber-500/20 text-sm font-medium"
            title="Rescue Center (Reflog)"
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Rescue</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

          <button
            onClick={handleFetch}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Fetch & Prune"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content (Unified 3 Columns) */}
      <main className="flex-1 overflow-hidden relative flex bg-slate-50 dark:bg-slate-900">
        {/* Left Column: Source Control (Changes) */}
        <div className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-10">
          <SourceControl
            repoPath={repoPath}
            latestCommit={commits.length > 0 ? commits[0] : null}
            onSelectFile={(file) => {
              setDiffTarget({ path: file });
            }}
            onCommit={loadCommits}
          />
        </div>

        {/* Middle Column: History Graph & Search (and Overlay Diff) */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex space-x-2">
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
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-colors"
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              )}
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

          {/* Global Search Notice */}
          {globalSearchResults !== null && (
            <div className="bg-indigo-50 dark:bg-indigo-500/10 border-b border-indigo-100 dark:border-indigo-500/20 px-3 py-1.5 flex justify-between items-center text-xs">
              <span className="text-indigo-700 dark:text-indigo-300">
                Showing <strong>{globalSearchResults.length}</strong> global
                search results for "{commitSearchQuery}"
              </span>
              <button
                onClick={() => setCommitSearchQuery("")}
                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 font-medium underline"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Graph */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <Graph
              ref={graphRef}
              commits={displayCommits}
              selectedCommit={selectedCommit}
              onSelectCommit={setSelectedCommit}
              onLoadMore={commitSearchQuery.trim().length === 0 ? loadMoreCommits : undefined}
              isLoadingMore={isLoadingMore}
              hasMore={commitSearchQuery.trim().length === 0 ? hasMore : false}
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
                  onClose={() => setDiffTarget(null)}
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
              onClose={() => setSelectedCommit(null)}
              onCopyHash={(h) => navigator.clipboard.writeText(h)}
              onSelectFile={(p) =>
                setDiffTarget({ path: p, commitHash: selectedCommit.hash })
              }
              onViewHistoricalFile={(p) =>
                setContentTarget({ path: p, commitHash: selectedCommit.hash })
              }
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
      {isReflogModalOpen && (
        <ReflogModal
          repoPath={repoPath}
          onClose={() => setIsReflogModalOpen(false)}
          onRestore={() => loadCommits()}
        />
      )}
      {isBranchManagerOpen && (
        <BranchManagerModal
          repoPath={repoPath}
          currentBranch={branchName}
          onClose={() => setIsBranchManagerOpen(false)}
          onRefreshGraph={() => loadCommits()}
        />
      )}
      {isTagsModalOpen && (
        <TagsModal
          repoPath={repoPath}
          onClose={() => setIsTagsModalOpen(false)}
          onRefreshGraph={() => loadCommits()}
        />
      )}
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
