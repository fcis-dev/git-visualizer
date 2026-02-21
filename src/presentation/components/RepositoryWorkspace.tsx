import { useState, useEffect, useRef } from "react";
import {
  GitBranch,
  RefreshCw,
  ArrowLeft,
  Search,
  Filter
} from "lucide-react";
import { SourceControl } from "./Sidebar/SourceControl";
import { Graph } from "./Graph";
import { DiffView } from "./DiffView";
import { CommitDetails } from "./CommitDetails";
import { HistoricalFileContentView } from "./HistoricalFileContentView";
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

  // Global search state
  const [searchType, setSearchType] = useState<"all" | "message" | "author" | "file">("all");
  const [globalSearchResults, setGlobalSearchResults] = useState<Commit[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  // Using existing hooks
  const { commits, branchName, loadCommits, setError } = useGit(repoPath);

  // Filter commits based on search query
  const filteredLocalCommits = commits.filter(commit => 
      commit.message.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
      commit.hash.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
      commit.author.toLowerCase().includes(commitSearchQuery.toLowerCase())
  );

  const displayCommits = globalSearchResults !== null ? globalSearchResults : filteredLocalCommits;

  const { showConfirm, showInput, showAlert } = useDialog();

  // Refresh after actions (same as before)
  const onActionSuccess = () => {
    loadCommits();
  };

  const gitActions = useGitActions(repoPath, onActionSuccess);

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
        gitActions.searchCommits(commitSearchQuery, searchType)
            .then(results => {
                setGlobalSearchResults(results);
                setIsSearching(false);
            })
            .catch(err => {
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
    showInput("Create Branch", "Branch name:", async (name) => {
      if (!name) return;
      try {
        await gitActions.createBranch(name, hash);
        showAlert("Success", `Branch '${name}' created.`);
      } catch (e: any) {
        setError(e.toString());
      }
    });
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
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-slate-950 z-10">
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

          <div className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded text-sm text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-500/20">
            <GitBranch className="w-4 h-4" />
            <span>{branchName || "..."}</span>
            {/* Build a real branch switcher here later */}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Actions */}

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
                            searchType === "all" ? "Search globally by message, author..." :
                            searchType === "message" ? "Search commit messages globally..." :
                            searchType === "author" ? "Search by commit author globally..." :
                            "Search by changed file path globally..."
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
                        Showing <strong>{globalSearchResults.length}</strong> global search results for "{commitSearchQuery}"
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
                    commits={displayCommits}
                    selectedCommit={selectedCommit}
                    onSelectCommit={setSelectedCommit}
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
                />
            </div>
        )}

      </main>
    </div>
  );
}
