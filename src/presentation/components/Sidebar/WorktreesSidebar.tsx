import { useState, useEffect, useRef } from "react";
import {
  FolderTree,
  Trash2,
  Plus,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { WorktreeData } from "../../../domain/entities/GitEntities";
import { useGitActions } from "../../hooks/useGitActions";
import { useDialog } from "../../context/DialogContext";
import { useTranslation } from "react-i18next";

interface WorktreesSidebarProps {
  repoPath: string | null;
  onRefreshGraph: () => void;
  onOpenWorktree?: (path: string) => void;
}

export function WorktreesSidebar({
  repoPath,
  onRefreshGraph,
  onOpenWorktree,
}: WorktreesSidebarProps) {
  const [worktrees, setWorktrees] = useState<WorktreeData[]>([]);
  const [localBranches, setLocalBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPath, setNewPath] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const gitActions = useGitActions(repoPath || "", onRefreshGraph);
  const { showConfirm, showAlert } = useDialog();

  const loadWorktrees = async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const result = await gitActions.getWorktrees();
      setWorktrees(result);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorktrees();
    if (repoPath) {
      gitActions.getBranchesInfo().then(branches => {
        setLocalBranches(branches.filter(b => !b.is_remote).map(b => b.name));
      }).catch(e => console.error("Failed to load branches", e));
    }
  }, [repoPath]);

  const updateBranchAndPath = (value: string) => {
    if (repoPath) {
      const repoName = repoPath.split(/[\/\\]/).pop() || 'repo';
      const sanitizedOldBranch = newBranch ? newBranch.replace(/\//g, "-") : "";
      const expectedOldPath = newBranch ? `../${repoName}.worktrees/${sanitizedOldBranch}` : "";
      
      if (!newPath || newPath === expectedOldPath) {
        const sanitizedValue = value ? value.replace(/\//g, "-") : "";
        setNewPath(value ? `../${repoName}.worktrees/${sanitizedValue}` : "");
      }
    }
    setNewBranch(value);
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateBranchAndPath(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleAdd = async (e: React.FormEvent, force: boolean = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newPath.trim() || !repoPath) return;

    setIsAdding(true);
    setError(null);
    try {
      await gitActions.addWorktree(newPath.trim(), newBranch.trim(), force);
      setNewPath("");
      setNewBranch("");
      loadWorktrees();
    } catch (e: any) {
      const errorStr = e.toString();
      if (!force && errorStr.toLowerCase().includes("already exists")) {
        showConfirm(
          t('worktreesSidebar.overwriteTitle') || "Directory Exists",
          t('worktreesSidebar.overwriteConfirm', { path: newPath.trim() }) || `The directory ${newPath.trim()} already exists. Do you want to forcefully overwrite it?`,
          () => {
            handleAdd(e, true);
          }
        );
      } else {
        setError(errorStr);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = (worktreePath: string) => {
    showConfirm(
      t('worktreesSidebar.removeTitle'),
      t('worktreesSidebar.removeConfirm', { path: worktreePath }),
      async () => {
        try {
          await gitActions.removeWorktree(worktreePath);
          loadWorktrees();
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };

  const handlePrune = () => {
    showConfirm(
      t('worktreesSidebar.pruneTitle'),
      t('worktreesSidebar.pruneConfirm'),
      async () => {
        try {
          await gitActions.pruneWorktrees();
          loadWorktrees();
        } catch (e: any) {
          setError(e.toString());
        }
      },
    );
  };

  if (!repoPath) {
    return (
      <div className="p-4 text-center text-slate-600 dark:text-slate-400 text-sm">
        {t('worktreesSidebar.noRepo')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm shrink-0 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-indigo-500" />
          {t('worktreesSidebar.title')}
        </span>
        <div className="flex items-center space-x-2">
          {loading && (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>
          )}
          <button
            onClick={handlePrune}
            className="p-1 hover:bg-white dark:hover:bg-slate-700/50 rounded-md transition-colors text-slate-400 hover:text-indigo-500 shadow-xs"
            title={t('worktreesSidebar.pruneTooltip')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
        {/* Removed inline error rendering */}
        <div className="space-y-2">
          <form
            onSubmit={handleAdd}
            className="p-3 border border-slate-200/50 dark:border-slate-700/50 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 flex flex-col space-y-2 shadow-sm"
          >
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-1">
              {t('worktreesSidebar.addWorktree')}
            </span>
            <input
              type="text"
              placeholder={t('worktreesSidebar.pathPlaceholder')}
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-slate-700 dark:text-slate-300 placeholder-slate-500"
              required
            />
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                placeholder={t('worktreesSidebar.branchPlaceholder')}
                value={newBranch}
                onChange={handleBranchChange}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-slate-700 dark:text-slate-300 placeholder-slate-500"
              />
              {isDropdownOpen && localBranches.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-40 overflow-hidden animate-in slide-in-from-top-2 duration-150 max-h-48 overflow-y-auto custom-scrollbar">
                  {localBranches
                    .filter((b) => b.toLowerCase().includes(newBranch.toLowerCase()))
                    .map((branch) => (
                      <button
                        key={branch}
                        type="button"
                        onClick={() => {
                          updateBranchAndPath(branch);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center justify-between"
                      >
                        <span className="truncate">{branch}</span>
                      </button>
                    ))}
                    {localBranches.filter(b => b.toLowerCase().includes(newBranch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                         {t('worktreesSidebar.noBranches')}
                      </div>
                    )}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isAdding || !newPath.trim()}
              className="w-full py-2 flex items-center justify-center bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-all shadow-sm disabled:shadow-none mt-1"
            >
              {isAdding ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-400 dark:border-slate-500 border-t-transparent rounded-full animate-spin mr-1.5" />
              ) : (
                <Plus className="w-3.5 h-3.5 mr-1.5" />
              )}
              {t('worktreesSidebar.add')}
            </button>
          </form>
        </div>

        <div className="px-2 space-y-0.5 pb-4">
          {worktrees.length === 0 && !loading ? (
            <div className="text-xs text-slate-500 italic py-2 text-center">
              {t('worktreesSidebar.noWorktrees')}
            </div>
          ) : (
            worktrees.map((wt, i) => {
              const isMain = i === 0;
              return (
                <div
                  key={wt.path}
                  className="group flex flex-col p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FolderTree className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-indigo-500" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span
                            className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate"
                            title={wt.path}
                          >
                            {isMain || !wt.branch || wt.branch === "detached" ? wt.path.split(/[\/\\]/).pop() : wt.branch}
                          </span>
                          {isMain && (
                            <span className="text-[9px] uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-1 rounded font-bold">
                              {t('worktreesSidebar.main')}
                            </span>
                          )}
                        </div>
                        <div
                          className="text-[10px] text-slate-600 dark:text-slate-400 truncate w-full"
                          style={{ direction: 'rtl', textAlign: 'left' }}
                          title={wt.path}
                        >
                          &lrm;{wt.path}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pl-5">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">
                        {wt.commit.substring(0, 7)}
                      </span>
                      {wt.branch && wt.branch !== "detached" ? (
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1 rounded border border-emerald-200 dark:border-emerald-500/20">
                          {wt.branch}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700">
                          {t('worktreesSidebar.detached')}
                        </span>
                      )}
                    </div>
                    {!isMain && (
                      <div className="flex items-center space-x-1">
                        {onOpenWorktree && (
                          <button
                            onClick={() => onOpenWorktree(wt.path)}
                            className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 rounded border border-indigo-200 dark:border-indigo-500/20 transition-all"
                            title={t('worktreesSidebar.openWorkspaceTooltip')}
                          >
                            {t('worktreesSidebar.open')}{" "}
                            <ChevronRight className="w-3 h-3 inline -ml-0.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemove(wt.path)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all text-slate-500"
                          title={t('worktreesSidebar.removeTooltip')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
