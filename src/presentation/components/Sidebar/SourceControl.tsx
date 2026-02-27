import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Play,
  Check,
  X,
  Archive,
  Trash2,
  RotateCcw,
  Box,
  RefreshCw,
  Plus,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ArrowLeftToLine,
  ArrowRightToLine,
} from "lucide-react";
import { useDialog } from "../../context/DialogContext";
import { Commit, SubmoduleInfo } from "../../../domain/entities/GitEntities";
import { useGitActions } from "../../hooks/useGitActions";
import { StashesModal } from "../StashesModal";

interface FileStatus {
  path: string;
  status: string; // "modified", "staged", "new", "deleted"
}

interface SourceControlProps {
  repoPath: string | null;
  latestCommit?: Commit | null;
  onSelectFile: (file: string, cached?: boolean) => void;
  onCommit?: () => void;
  isAutoFetching?: boolean;
  onFetch?: (withPrune?: boolean) => Promise<void>;
  onViewFileHistory?: (path: string) => void;
  onOpenSubmodule?: (absolutePath: string) => void;
  onResolveConflict?: (path: string) => void;
  refreshTrigger?: any;
}

export function SourceControl({
  repoPath,
  latestCommit,
  onSelectFile,
  onCommit,
  onViewFileHistory,
  onOpenSubmodule,
  onResolveConflict,
  refreshTrigger,
}: SourceControlProps) {
  const [stagedFiles, setStagedFiles] = useState<FileStatus[]>([]);
  const [changes, setChanges] = useState<FileStatus[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [lastMergeMsg, setLastMergeMsg] = useState("");
  const [stashLoading, setStashLoading] = useState(false);
  const [rebaseLoading, setRebaseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([]);
  const [submodulesLoading, setSubmodulesLoading] = useState(false);
  const [isAddingSubmodule, setIsAddingSubmodule] = useState(false);

  const [isAmend, setIsAmend] = useState(false);
  const [previousMessage, setPreviousMessage] = useState("");

  const [isStashesModalOpen, setIsStashesModalOpen] = useState(false);
  const [isRebasing, setIsRebasing] = useState(false);

  // Context menu for file history
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    path: string | null;
  }>({ visible: false, x: 0, y: 0, path: null });

  const { showInput, showConfirm, showAlert } = useDialog();
  const gitActions = useGitActions(repoPath || "");

  useEffect(() => {
    const closeContextMenu = () =>
      setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", closeContextMenu);
    return () => document.removeEventListener("click", closeContextMenu);
  }, []);

  useEffect(() => {
    if (repoPath) {
      loadStatus();
      setStagedFiles([]);
      setChanges([]);
      setSubmodules([]);

      // Automatically poll for new changes on disk (e.g., from VS Code or terminal)
      const intervalId = setInterval(() => {
        loadStatus();
      }, 3000);

      return () => clearInterval(intervalId);
    }
  }, [repoPath, refreshTrigger]);

  const loadStatus = async () => {
    if (!repoPath) return;
    try {
      const statuses = await invoke<FileStatus[]>("get_git_status", {
        path: repoPath,
      });

      const staged: FileStatus[] = [];
      const changed: FileStatus[] = [];

      statuses.forEach((s) => {
        if (s.status === "staged") {
          staged.push(s);
        } else if (s.status === "conflicted") {
          changed.unshift(s); // Push to the top of changes list too
        } else {
          changed.push(s);
        }
      });

      setStagedFiles(staged);
      setChanges(changed);
      const rebasing = await invoke<boolean>("git_get_rebase_state", {
        path: repoPath,
      });
      setIsRebasing(rebasing);

      // Check for an active merge message and pre-fill if the input is empty
      try {
        const mergeMsgPath = `${repoPath}/.git/MERGE_MSG`.replace(/\\/g, '/');
        const mergeMsg = await invoke<string>("git_read_file", { path: mergeMsgPath });
        if (mergeMsg && mergeMsg !== lastMergeMsg) {
            setLastMergeMsg(mergeMsg);
            if (commitMessage.trim() === "") {
                setCommitMessage(mergeMsg.trim());
            }
        }
      } catch (e) {
        // MERGE_MSG does not exist, not in a merge state. Reset last merge msg tracking.
        if (lastMergeMsg !== "") setLastMergeMsg("");
      }

      try {
        const subs = await gitActions.getSubmodules();
        setSubmodules(subs);
      } catch (e) {
        console.error("Could not fetch submodules", e);
      }

    } catch (err: any) {
      console.error("Failed to load status", err);
      setError(err.toString());
    }
  };

  const handleStage = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!repoPath) return;
    try {
      await invoke("git_stage", { path: repoPath, files: [file] });
      loadStatus();
    } catch (err) {
      console.error("Failed to stage", err);
    }
  };

  const handleUnstage = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!repoPath) return;
    try {
      await invoke("git_unstage", { path: repoPath, files: [file] });
      loadStatus();
    } catch (err) {
      console.error("Failed to unstage", err);
    }
  };

  const handleUnstageAll = async () => {
    if (!repoPath || stagedFiles.length === 0) return;
    try {
      const files = stagedFiles.map((c) => c.path);
      await invoke("git_unstage", { path: repoPath, files });
      loadStatus();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleResolveConflict = async (
    file: string,
    strategy: "ours" | "theirs",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!repoPath) return;
    try {
      await invoke("git_resolve_conflict", { path: repoPath, file, strategy });
      loadStatus();
    } catch (err: any) {
      console.error("Failed to resolve conflict", err);
      setError("Resolve failed: " + err.toString());
    }
  };

  const handleDiscard = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!repoPath) return;

    showConfirm(
      "Discard Changes",
      `Are you sure you want to discard changes in ${file}? This cannot be undone.`,
      async () => {
        try {
          await invoke("git_discard_changes", {
            path: repoPath,
            files: [file],
          });
          loadStatus();
        } catch (err: any) {
          console.error("Failed to discard", err);
          setError(err.toString());
        }
      },
    );
  };

  const handleDiscardAll = () => {
    if (!repoPath || changes.length === 0) return;
    showConfirm(
      "Discard All Changes",
      `Are you sure you want to discard ALL ${changes.length} changes? This cannot be undone.`,
      async () => {
        try {
          const files = changes.map((c) => c.path);
          await invoke("git_discard_changes", { path: repoPath, files });
          loadStatus();
        } catch (err: any) {
          setError(err.toString());
        }
      },
    );
  };

  const handleCommit = async () => {
    if (!repoPath || !commitMessage) return;
    try {
      if (isAmend) {
        await invoke("git_commit_amend", {
          path: repoPath,
          message: commitMessage,
        });
        setIsAmend(false);
      } else {
        await invoke("git_commit", { path: repoPath, message: commitMessage });
      }
      setCommitMessage("");
      loadStatus();
      if (onCommit) onCommit();
    } catch (err: any) {
      console.error("Failed to commit", err);
      let errMsg = err.toString();
      if (errMsg.includes("not fully merged index") || errMsg.includes("Unmerged (-10)")) {
        errMsg = "Cannot commit: You must stage all files and resolve conflicts first.";
      }
      setError(errMsg);
    }
  };

  const handleStashSave = () => {
    if (!repoPath) return;
    showInput("Stash Changes", "Stash message (optional):", async (msg) => {
      setStashLoading(true);
      try {
        await invoke("git_stash_save", {
          path: repoPath,
          message: msg || null,
        });
        loadStatus();
      } catch (err: any) {
        console.error("Failed to stash", err);
        setError(err.toString());
      } finally {
        setStashLoading(false);
      }
    });
  };

  const handleContextMenu = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      path,
    });
  };

  if (!repoPath) {
    return (
      <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-sm">
        No repository open.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          SOURCE CONTROL
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {error && (
          <div className="p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
            {error}
          </div>
        )}

        {isRebasing && (
          <div className="flex flex-col p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-lg">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400 font-bold mb-2 text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span>Rebase in Progress</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-500 mb-3 leading-tight font-medium">
              Resolve any conflicts below, stage them, and then continue. Or
              abort to cancel.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={async () => {
                  try {
                    setRebaseLoading(true);
                    await invoke("git_rebase_abort", { path: repoPath });
                    loadStatus();
                    if (onCommit) onCommit();
                  } catch (e: any) {
                    setError(e.toString());
                  } finally {
                    setRebaseLoading(false);
                  }
                }}
                disabled={rebaseLoading}
                className="flex-1 py-1.5 text-xs rounded font-bold transition-colors bg-white hover:bg-red-50 text-red-600 border border-red-200 dark:bg-amber-950/50 dark:hover:bg-red-900/50 dark:border-red-800 dark:text-red-400 disabled:opacity-50"
              >
                Abort
              </button>
              <button
                onClick={async () => {
                  try {
                    setRebaseLoading(true);
                    await invoke("git_rebase_continue", { path: repoPath });
                    loadStatus();
                    if (onCommit) onCommit();
                  } catch (e: any) {
                    setError(e.toString());
                  } finally {
                    setRebaseLoading(false);
                  }
                }}
                disabled={rebaseLoading}
                className="flex-2 py-1.5 text-xs rounded font-bold transition-colors bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow-sm disabled:opacity-50"
              >
                Continue Rebase
              </button>
            </div>
          </div>
        )}

        {/* Stash Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleStashSave}
            disabled={stashLoading}
            className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-1.5 rounded text-xs transition-colors"
            title="Stash Changes"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Stash</span>
          </button>
          <button
            onClick={() => setIsStashesModalOpen(true)}
            disabled={stashLoading}
            className="flex-2 flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 py-1.5 rounded text-xs transition-colors font-medium border border-emerald-200/50 dark:border-emerald-500/20"
            title="Manage Stashes"
          >
            <span>Stashes</span>
          </button>
        </div>

        {/* Removed Conflicted Files section, moved to Changes */}

        {/* Commit Input */}
        <div className="space-y-2">
          {latestCommit && (
            <div className="flex justify-end mb-1">
              <button
                onClick={() => {
                  const checked = !isAmend;
                  setIsAmend(checked);
                  if (checked) {
                    setPreviousMessage(commitMessage);
                    setCommitMessage(latestCommit.message);
                  } else {
                    setCommitMessage(previousMessage);
                  }
                }}
                className={`flex items-center space-x-1.5 py-1 px-2.5 rounded text-xs transition-colors font-medium border ${
                  isAmend
                    ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                }`}
                title="Amend previous commit"
              >
                {isAmend && <Check className="w-3 h-3" />}
                <span>Amend</span>
              </button>
            </div>
          )}
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Message (Ctrl+Enter to commit)"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 min-h-[80px]"
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "Enter") {
                handleCommit();
              }
            }}
          />
          <button
            onClick={handleCommit}
            disabled={!commitMessage || (!isAmend && stagedFiles.length === 0 && !lastMergeMsg)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isAmend ? "Commit Amend" : "Commit"}
          </button>
        </div>

        {/* Staged Changes */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1">
            <span>Staged Changes</span>
            <div className="flex items-center space-x-2">
              <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded-full text-slate-700 dark:text-slate-300">
                {stagedFiles.length}
              </span>
              {stagedFiles.length > 0 && (
                <button
                  onClick={handleUnstageAll}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  title="Unstage All"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {stagedFiles.map((file) => (
            <div
              key={file.path}
              className="group flex items-center justify-between p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded cursor-pointer"
              onClick={() => onSelectFile(file.path, true)}
              onContextMenu={(e) => handleContextMenu(file.path, e)}
            >
              <span
                className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1"
                title={file.path}
              >
                {file.path}
              </span>
              <div className="flex opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => handleUnstage(file.path, e)}
                  className="p-1 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded"
                  title="Unstage changes"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Changes */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1">
            <span>Changes</span>
            <div className="flex items-center space-x-2">
              <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded-full text-slate-700 dark:text-slate-300">
                {changes.length}
              </span>
              {changes.length > 0 && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleDiscardAll}
                    className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Discard All Changes"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (repoPath) {
                        try {
                          const files = changes.map((c) => c.path);
                          await invoke("git_stage", { path: repoPath, files });
                          loadStatus();
                        } catch (e) {}
                      }
                    }}
                    className="p-1 text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                    title="Stage All"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {changes.map((file) => (
            <div
              key={file.path}
              className="group flex items-center justify-between p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded cursor-pointer"
              onClick={() => {
                if (file.status === "conflicted" && onResolveConflict) {
                  onResolveConflict(file.path);
                } else {
                  onSelectFile(file.path);
                }
              }}
              onContextMenu={(e) => handleContextMenu(file.path, e)}
            >
              <div className="flex items-center space-x-1.5 min-w-0 flex-1">
                {file.status === "conflicted" && (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span
                  className={`text-xs truncate ${
                    file.status === "deleted"
                      ? "text-red-500 dark:text-red-400 line-through"
                      : file.status === "new"
                        ? "text-green-600 dark:text-green-400"
                        : file.status === "conflicted"
                          ? "text-amber-600 dark:text-amber-400 font-medium"
                          : "text-amber-600 dark:text-amber-400"
                  }`}
                  title={file.path}
                >
                  {file.path}
                </span>
              </div>
              <div className="flex opacity-0 group-hover:opacity-100 space-x-1 shrink-0">
                {file.status === "conflicted" ? (
                  <>
                    <button
                      onClick={(e) => handleResolveConflict(file.path, "ours", e)}
                      className="p-1 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      title="Accept Current (Ours)"
                    >
                      <ArrowLeftToLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleResolveConflict(file.path, "theirs", e)}
                      className="p-1 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="Accept Incoming (Theirs)"
                    >
                      <ArrowRightToLine className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => handleDiscard(file.path, e)}
                      className="p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title="Discard changes"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleStage(file.path, e)}
                      className="p-1 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      title="Stage changes"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Submodules */}
        <div className="space-y-1 mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1">
            <span>Submodules</span>
            <div className="flex items-center space-x-2">
              <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded-full text-slate-700 dark:text-slate-300">
                {submodules.length}
              </span>
              <div className="flex border-l border-slate-300 dark:border-slate-700 pl-1 ml-1 space-x-1">
                <button
                  onClick={() => {
                    showInput(
                      "Add Submodule",
                      "Enter the Submodule URL:",
                      async (url) => {
                        if (!url) return;
                        showInput(
                          "Add Submodule",
                          "Enter the target path (e.g. 'vendors/lib'):",
                          async (pathName) => {
                            if (!pathName) return;
                            try {
                              setSubmodulesLoading(true);
                              setIsAddingSubmodule(true);
                              await gitActions.addSubmodule(url, pathName);
                              loadStatus();
                            } catch (e: any) {
                              setError(e.toString());
                              showAlert("Error Adding Submodule", e.toString());
                            } finally {
                              setSubmodulesLoading(false);
                              setIsAddingSubmodule(false);
                            }
                          },
                        );
                      },
                    );
                  }}
                  disabled={submodulesLoading}
                  className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                  title="Add Submodule"
                >
                  {isAddingSubmodule ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={async () => {
                    try {
                      setSubmodulesLoading(true);
                      await gitActions.syncSubmodules();
                      loadStatus();
                    } finally {
                      setSubmodulesLoading(false);
                    }
                  }}
                  disabled={submodulesLoading}
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                  title="Sync Submodules"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${submodulesLoading ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  onClick={async () => {
                    try {
                      setSubmodulesLoading(true);
                      await gitActions.updateSubmodules();
                      loadStatus();
                    } finally {
                      setSubmodulesLoading(false);
                    }
                  }}
                  disabled={submodulesLoading}
                  className="p-1 text-slate-500 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50 flex items-center"
                  title="Update & Init Submodules"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          {submodules.map((sub, idx) => (
            <div
              key={idx}
              className="group flex flex-col p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded mb-1 cursor-default"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Box
                    className={`w-4 h-4 shrink-0 ${
                      sub.status === "+"
                        ? "text-amber-500"
                        : sub.status === "-"
                          ? "text-slate-400"
                          : sub.status === "U"
                            ? "text-red-500"
                            : "text-green-500"
                    }`}
                  />
                  <span
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]"
                    title={sub.path}
                  >
                    {sub.name}
                  </span>
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      if (onOpenSubmodule) {
                        // Normalize path separators just in case
                        const fullPath = `${repoPath}/${sub.path}`.replace(
                          /\\/g,
                          "/",
                        );
                        onOpenSubmodule(fullPath);
                      }
                    }}
                    className="p-1 mr-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                    title="Open Submodule Workspace"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      showConfirm(
                        "Remove Submodule",
                        `Are you sure you want to completely remove the submodule '${sub.name}'? This deletes it from the working tree and .git/modules.`,
                        async () => {
                          try {
                            setSubmodulesLoading(true);
                            await gitActions.removeSubmodule(sub.path);
                            loadStatus();
                          } catch (e: any) {
                            console.error(e);
                            setError(e.toString());
                            showAlert("Error Removing Submodule", e.toString());
                          } finally {
                            setSubmodulesLoading(false);
                          }
                        },
                      );
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Remove Submodule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <span className="text-xs text-slate-500 ml-6 truncate font-mono mt-0.5">
                {sub.status === "-"
                  ? "(Uninitialized)"
                  : sub.hash.substring(0, 7)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isStashesModalOpen && repoPath && (
        <StashesModal
          repoPath={repoPath}
          onClose={() => setIsStashesModalOpen(false)}
          onRefreshGraph={() => {
            loadStatus();
            if (onCommit) onCommit(); // Trigger graph reload
          }}
        />
      )}

      {/* File History Context Menu */}
      {contextMenu.visible && contextMenu.path && onViewFileHistory && (
        <div
          className="fixed z-50 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg min-w-[160px] text-sm overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 truncate max-w-[200px]"
            title={contextMenu.path}
          >
            {contextMenu.path.split("/").pop()}
          </div>

          <button
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
            onClick={() => {
              onViewFileHistory(contextMenu.path!);
              setContextMenu({ ...contextMenu, visible: false });
            }}
          >
            View file history
          </button>
        </div>
      )}
    </div>
  );
}
