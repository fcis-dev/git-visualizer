import { useState } from "react";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Calendar,
  Files,
  Settings,
  RefreshCw,
  RotateCcw,
  Tag,
  Copy,
  ArrowDown,
  ArrowUp,
  Check,
  Search as SearchIcon,
} from "lucide-react";
import { Graph } from "../components/Graph";
import { ProjectExplorer } from "../components/Sidebar/ProjectExplorer";
import { SourceControl } from "../components/Sidebar/SourceControl";
import { SettingsModal } from "../components/SettingsModal";
import { DiffView } from "../components/DiffView";
import { useDialog } from "../context/DialogContext";
import { useGit } from "../hooks/useGit";
import { useGitActions } from "../hooks/useGitActions";
import { Commit } from "../../domain/entities/GitEntities";

type ActiveView = "explorer" | "source-control";

export function Dashboard() {
  const [repoPath, setRepoPath] = useState<string>("");
  const [activeView, setActiveView] = useState<ActiveView>("explorer");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [diffFile, setDiffFile] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { commits, branchName, availableBranches, error, loadCommits, setError } = useGit(repoPath);
  const { showConfirm, showInput, showAlert } = useDialog();
  
  // Refresh graph after action
  const onActionSuccess = () => {
      loadCommits();
  };

  const gitActions = useGitActions(repoPath, onActionSuccess);

  const repoName = repoPath ? repoPath.split("/").pop() : "GitVi";

  const handleFetch = async () => {
    try {
      await gitActions.fetch();
      showAlert("Fetch Successful", "Repository fetched and pruned successfully.");
    } catch (e: any) {
      console.error(e);
      setError(e.toString());
    }
  };

  const handleCheckout = async (branch: string) => {
      try {
          await gitActions.checkoutBranch(branch);
          setIsBranchDropdownOpen(false);
          showAlert("Checked Out", `Switched to branch ${branch}`);
      } catch (e: any) {
          setError(e.toString());
      }
  };

  const handleCheckoutCommit = (hash: string) => {
    showConfirm(
      "Checkout Commit",
      `Are you sure you want to checkout commit ${hash.substring(0, 7)}? You will be in a detached HEAD state.`,
      async () => {
        try {
          await gitActions.checkoutCommit(hash);
          showAlert("Checked Out", `Checked out commit ${hash.substring(0, 7)}`);
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };

  const handleReset = (hash: string, mode: 'soft' | 'mixed' | 'hard') => {
      showConfirm(
          `Reset (${mode})`,
          `Are you sure you want to ${mode} reset to ${hash.substring(0,7)}? This may rewrite history.`,
          async () => {
              try {
                  await gitActions.reset(hash, mode);
                  showAlert("Reset Complete", `Successfully reset to ${hash.substring(0,7)}`);
              } catch (e: any) {
                  setError(e.toString());
              }
          }
      );
  };

  const handleRebase = (hash: string) => {
      showConfirm(
          "Rebase",
          `Are you sure you want to rebase current branch onto ${hash.substring(0,7)}?`,
          async () => {
              try {
                  await gitActions.rebase(hash);
                  showAlert("Rebase Complete", "Rebase finished successfully.");
              } catch (e: any) {
                  setError(e.toString());
              }
          }
      );
  };

  const handleCherryPick = (hash: string) => {
    showConfirm(
      "Cherry Pick",
      `Are you sure you want to cherry-pick commit ${hash.substring(0, 7)}?`,
      async () => {
        try {
          await gitActions.cherryPick(hash);
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };

  const handleRevert = (hash: string) => {
    showConfirm(
      "Revert Commit",
      `Are you sure you want to revert commit ${hash.substring(0, 7)}?`,
      async () => {
        try {
          await gitActions.revert(hash);
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };

  const handleCreateTag = (hash: string) => {
    showInput("Create Tag", "Enter tag name:", async (name) => {
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
      "Merge Branch",
      `Are you sure you want to merge commit ${hash.substring(0, 7)} into ${branchName}?`,
      async () => {
        try {
          await gitActions.merge(hash);
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };

  const handleCreateBranch = (hash: string) => {
    showInput("Create Branch", "Enter branch name:", async (name) => {
      if (!name) return;
      try {
        await gitActions.createBranch(name, hash);
        showAlert(
          "Success",
          `Branch '${name}' created at ${hash.substring(0, 7)}`,
        );
      } catch (e: any) {
        setError(e.toString());
      }
    });
  };

  return (
    <div
      className="flex h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-600 dark:selection:text-indigo-200 overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        repoPath={repoPath}
      />

      {diffFile && repoPath && (
        <DiffView
          repoPath={repoPath}
          filePath={diffFile}
          onClose={() => setDiffFile(null)}
        />
      )}

      {/* Activity Bar (Leftmost narrow strip) */}
      <nav className="w-12 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 space-y-4 z-30">
        <button
          onClick={() => setActiveView("explorer")}
          className={`p-2 rounded-lg transition-colors ${activeView === "explorer" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
          title="Explorer"
        >
          <Files className="w-6 h-6" />
        </button>
        <button
          onClick={() => setActiveView("source-control")}
          className={`p-2 rounded-lg transition-colors ${activeView === "source-control" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
          title="Source Control"
        >
          <GitBranch className="w-6 h-6" />
        </button>

        <div className="w-8 h-px bg-slate-200 dark:bg-slate-800" />

        <div className="flex-1" />
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </nav>

      {/* Sidebar (Explorer / Details) */}
      <aside className="w-80 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20">
        {activeView === "explorer" && (
          <ProjectExplorer
            onSelectRepo={(path) => {
                setRepoPath(path);
                // The useEffect in useGit will trigger loadCommits
            }}
            activeRepoPath={repoPath}
            onClearActiveRepo={() => {
              setRepoPath("");
              // useGit handles empty path
              setSelectedCommit(null);
            }}
          />
        )}
        {activeView === "source-control" && (
          <SourceControl
            repoPath={repoPath || null}
            onSelectFile={setDiffFile}
          />
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white/80 dark:bg-slate-950/80 relative">
        {/* Top Header */}
        <header className="h-12 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-4 bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-md">
          <div className="flex items-center space-x-2 overflow-hidden">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[400px]">
              {repoName}
            </span>
            {repoPath && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 relative">
                    <span className="text-xs text-slate-500 dark:text-slate-600 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">Git</span>
                    <button 
                         onClick={(e) => {
                            e.stopPropagation();
                            setIsBranchDropdownOpen(!isBranchDropdownOpen);
                         }}
                         className="flex items-center space-x-1 text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                    >
                        <GitBranch className="w-3 h-3" />
                        <span>{branchName || "No Branch"}</span>
                        <ArrowDown className="w-3 h-3 ml-1 opacity-50" />
                    </button>
                    
                    {/* Branch Dropdown */}
                    {isBranchDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-100 custom-scrollbar">
                            <div className="p-2 space-y-1">
                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1">Switch Branch</div>
                                {availableBranches.map(branch => (
                                    <button
                                        key={branch}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCheckout(branch);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center space-x-2 ${branch === branchName ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <GitBranch className="w-3.5 h-3.5 opacity-70" />
                                        <span className="truncate">{branch}</span>
                                        {branch === branchName && <Check className="w-3 h-3 ml-auto" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {repoPath && (
            <div className="flex items-center space-x-2">
                   <div className="relative">
                        <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search commits..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-full py-1 pl-8 pr-3 text-xs w-48 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder:text-slate-400"
                        />
                   </div>
              <button
                onClick={() => handleFetch()}
                className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
                title="Fetch & Prune"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* Git Graph Visualization or Commit Details */}
        <main className="flex-1 overflow-hidden relative flex">
          {/* Graph View */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {error && (
              <div className="absolute top-4 left-4 right-4 z-50 p-3 bg-red-500/10 text-red-600 dark:text-red-200 border border-red-500/20 rounded backdrop-blur-md">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  {error}
                </p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-xs hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {repoPath ? (
              commits.length > 0 ? (
                <Graph
                  commits={commits.filter(c => 
                      c.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      c.hash.includes(searchQuery) ||
                      c.author.toLowerCase().includes(searchQuery.toLowerCase())
                  )}
                  selectedCommit={selectedCommit}
                  onSelectCommit={(commit) => {
                    if (selectedCommit?.hash === commit.hash) {
                      setSelectedCommit(null);
                    } else {
                      setSelectedCommit(commit);
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-slate-400 dark:text-slate-600">
                <GitBranch className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-sm font-medium">No repository open</p>
              </div>
            )}
          </div>

          {/* Commit Details Panel (Right side if selected) */}
          {selectedCommit && (
            <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 overflow-y-auto p-4 animate-in slide-in-from-right duration-300">
              <div className="space-y-6">
                {/* Commit Status */}
                <div>
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      <GitCommit className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug whitespace-pre-wrap break-all">
                        {selectedCommit.message}
                      </h3>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono">
                          {selectedCommit.hash.substring(0, 7)}
                        </span>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(selectedCommit.hash)
                          }
                          className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"
                          title="Copy Hash"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCherryPick(selectedCommit.hash)}
                    className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                    title="Cherry Pick"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span>Picking</span>
                  </button>
                  <button
                    onClick={() => handleRevert(selectedCommit.hash)}
                    className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                    title="Revert"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert</span>
                  </button>
                  <button
                    onClick={() => handleMerge(selectedCommit.hash)}
                    className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                    title="Merge into current branch"
                  >
                    <GitPullRequest className="w-3.5 h-3.5 rotate-90" />
                    <span>Merge</span>
                  </button>
                  <button
                    onClick={() => handleCreateTag(selectedCommit.hash)}
                    className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                    title="Create Tag"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tag</span>
                  </button>
                  <button
                    onClick={() => handleCreateBranch(selectedCommit.hash)}
                    className="col-span-2 flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                    title="Create Branch"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Create Branch</span>
                  </button>
                  <button
                    onClick={() => handleCheckoutCommit(selectedCommit.hash)}
                    className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                    title="Checkout this commit"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Checkout</span>
                  </button>
                    <button 
                    onClick={() => handleRebase(selectedCommit.hash)}
                    className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors"
                    title="Rebase current branch onto this commit"
                >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>Rebase</span>
                </button>
                
                {/* Reset Menu */}
                {/* Reset Menu */}
                <div className="relative group">
                    <button className="w-full flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors">
                        <RotateCcw className="w-3.5 h-3.5 text-red-500" />
                        <span>Reset...</span>
                    </button>
                    {/* Invisible bridge to prevent closing when moving mouse */}
                    <div className="absolute bottom-full left-0 w-full h-2 bg-transparent hidden group-hover:block" />
                    
                    <div className="absolute bottom-full right-0 mb-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl hidden group-hover:block z-50 overflow-hidden">
                        <button 
                            onClick={() => handleReset(selectedCommit.hash, 'soft')}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 transition-colors"
                        >
                            Soft
                        </button>
                        <button 
                            onClick={() => handleReset(selectedCommit.hash, 'mixed')}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 transition-colors"
                        >
                            Mixed
                        </button>
                        <button 
                            onClick={() => handleReset(selectedCommit.hash, 'hard')}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 transition-colors"
                        >
                            Hard
                        </button>
                    </div>
                </div>
                </div>

                <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />

                {/* Author Info */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 grayscale uppercase">
                    Author
                  </h4>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-linear-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {selectedCommit.author.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedCommit.author}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 pl-8">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(
                        selectedCommit.date * 1000,
                      ).toLocaleDateString()}{" "}
                      {new Date(
                        selectedCommit.date * 1000,
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />

                {/* Parents */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 grayscale uppercase">
                    Parents
                  </h4>
                  <div className="flex flex-col space-y-1">
                    {selectedCommit.parents.map((p) => (
                      <div
                        key={p}
                        className="flex items-center space-x-2 text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 cursor-pointer transition-colors"
                      >
                        <GitPullRequest className="w-3 h-3" />
                        <span>{p.substring(0, 7)}</span>
                      </div>
                    ))}
                    {selectedCommit.parents.length === 0 && (
                      <span className="text-xs text-slate-500 dark:text-slate-600">
                        No parents (Root)
                      </span>
                    )}
                  </div>
                </div>

                {/* Refs */}
                {selectedCommit.refs && selectedCommit.refs.length > 0 && (
                  <>
                    <div className="w-full h-px bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 grayscale uppercase">
                        Refs
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedCommit.refs.map((ref) => (
                          <span
                            key={ref}
                            className="px-2 py-0.5 rounded textxs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
