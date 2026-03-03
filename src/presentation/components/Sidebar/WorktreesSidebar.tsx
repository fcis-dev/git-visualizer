import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPath, setNewPath] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { t } = useTranslation();

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
  }, [repoPath]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim() || !repoPath) return;

    setIsAdding(true);
    setError(null);
    try {
      await gitActions.addWorktree(newPath.trim(), newBranch.trim());
      setNewPath("");
      setNewBranch("");
      loadWorktrees();
      showAlert(t('worktreesSidebar.successTitle', 'Success'), t('worktreesSidebar.addSuccess'));
    } catch (e: any) {
      setError(e.toString());
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
          showAlert(t('worktreesSidebar.successTitle', 'Success'), t('worktreesSidebar.removeSuccess'));
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
          showAlert(t('worktreesSidebar.successTitle', 'Success'), t('worktreesSidebar.pruneSuccess'));
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
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/40 shrink-0 space-y-3">
        <div className="flex items-center justify-between h-7">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center space-x-2">
            <span>{t('worktreesSidebar.title')}</span>
          </span>
          <div className="flex items-center space-x-2">
            {loading && (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>
            )}
            <button
              onClick={handlePrune}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              title={t('worktreesSidebar.pruneTooltip')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
        {error && (
          <div className="p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
            {error}
          </div>
        )}

        <div className="px-2 pt-2">
          <form
            onSubmit={handleAdd}
            className="p-3 border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-800/50 flex flex-col space-y-2"
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
            <input
              type="text"
              placeholder={t('worktreesSidebar.branchPlaceholder')}
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-slate-700 dark:text-slate-300 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={isAdding || !newPath.trim()}
              className="w-full py-1.5 flex items-center justify-center bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isAdding ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />
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
                    <div className="flex items-center space-x-2 truncate flex-1 md:max-w-[200px]">
                      <FolderTree className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-indigo-500" />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center space-x-2">
                          <span
                            className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate"
                            title={wt.path}
                          >
                            {wt.path.split(/[\/\\]/).pop()}
                          </span>
                          {isMain && (
                            <span className="text-[9px] uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-1 rounded font-bold">
                              {t('worktreesSidebar.main')}
                            </span>
                          )}
                        </div>
                        <span
                          className="text-[10px] text-slate-600 dark:text-slate-400 truncate"
                          title={wt.path}
                        >
                          {wt.path}
                        </span>
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
