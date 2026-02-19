import { useState, useEffect } from "react";
import {
  GitBranch,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { SourceControl } from "./Sidebar/SourceControl";
import { Graph } from "./Graph";
import { DiffView } from "./DiffView";
import { CommitDetails } from "./CommitDetails";
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

  // Using existing hooks
  const { commits, branchName, loadCommits, setError } = useGit(repoPath);

  // Filter commits based on search query
  const filteredCommits = commits.filter(commit => 
      commit.message.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
      commit.hash.toLowerCase().includes(commitSearchQuery.toLowerCase()) ||
      commit.author.toLowerCase().includes(commitSearchQuery.toLowerCase())
  );

  const { showConfirm, showInput, showAlert } = useDialog();

  // Refresh after actions (same as before)
  const onActionSuccess = () => {
    loadCommits();
  };

  const gitActions = useGitActions(repoPath, onActionSuccess);

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
            onSelectFile={(file) => {
              setDiffTarget({ path: file });
            }}
          />
        </div>

        {/* Middle Column: History Graph & Search (and Overlay Diff) */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950">
            
            {/* Search Bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <input 
                    type="text" 
                    placeholder="Search commits by message, hash, or author..." 
                    value={commitSearchQuery}
                    onChange={(e) => setCommitSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                />
            </div>

            {/* Graph */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
               <Graph
                    commits={filteredCommits}
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
        </div>

        {/* Right Column: Commit Details */}
        {selectedCommit && (
            <div className="w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-in slide-in-from-right duration-200 z-10 shadow-xl overflow-y-auto">
                <CommitDetails
                    commit={selectedCommit}
                    details={commitDetails}
                    detailsLoading={detailsLoading}
                    currentBranch={branchName}
                    onClose={() => setSelectedCommit(null)}
                    onCopyHash={(h) => navigator.clipboard.writeText(h)}
                    onSelectFile={(p) =>
                        setDiffTarget({ path: p, commitHash: selectedCommit.hash })
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
