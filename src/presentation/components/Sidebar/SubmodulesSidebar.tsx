import { Box, Plus, RefreshCw, Play, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useSourceControlController } from '../../controllers/useSourceControlController';
import { useDialog } from '../../context/DialogContext';
import { useGitActions } from '../../hooks/useGitActions';

interface SubmodulesSidebarProps {
  repoPath: string | null;
  onOpenSubmodule?: (absolutePath: string) => void;
  onRefreshGraph: () => void;
}

export function SubmodulesSidebar({ repoPath, onOpenSubmodule, onRefreshGraph }: SubmodulesSidebarProps) {
  const { t } = useTranslation();
  // We can reuse the same controller logic just for submodules for now,
  // or useGitActions directly. The controller is already built for this.
  const { state, actions } = useSourceControlController(repoPath, onRefreshGraph);

  if (!repoPath) {
    return <div className="p-4 text-center text-slate-600 dark:text-slate-400 text-sm">No repository loaded</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm shrink-0 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <Box className="w-4 h-4 text-blue-500" />
            <span>{t("sidebar.sourceControl.submodules")}</span>
        </span>
        <div className="flex items-center space-x-1">
          <button
            onClick={actions.handleAddSubmodule}
            disabled={state.submodulesLoading}
            className="p-1 hover:bg-white dark:hover:bg-slate-700/50 rounded-md transition-colors text-slate-400 hover:text-blue-500 shadow-xs disabled:opacity-50"
            title={t("sidebar.sourceControl.addSubmodule")}
          >
            {state.isAddingSubmodule ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={actions.handleSyncSubmodules}
            disabled={state.submodulesLoading}
             className="p-1 hover:bg-white dark:hover:bg-slate-700/50 rounded-md transition-colors text-slate-400 hover:text-indigo-500 shadow-xs disabled:opacity-50"
            title={t("sidebar.sourceControl.syncSubmodules")}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${state.submodulesLoading ? "animate-spin text-indigo-500" : ""}`}
            />
          </button>
          <button
            onClick={actions.handleUpdateSubmodules}
            disabled={state.submodulesLoading}
            className="p-1 hover:bg-white dark:hover:bg-slate-700/50 rounded-md transition-colors text-slate-400 hover:text-green-500 shadow-xs disabled:opacity-50"
            title={t("sidebar.sourceControl.updateSubmodules")}
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {state.error && (
            <div className="p-2 mb-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
                {state.error}
            </div>
        )}

        {!state.submodulesLoading && state.submodules.length === 0 && !state.isAddingSubmodule ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
              <Box className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p>{t("sidebar.sourceControl.submodules")}: 0</p>
            </div>
        ) : (
            state.submodules.map((sub, idx) => (
                <div
                    key={idx}
                    className="group flex flex-col p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-default"
                >
                    <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Box
                        className={`w-4 h-4 shrink-0 ${
                            sub.status === "+"
                            ? "text-amber-500"
                            : sub.status === "-"
                                ? "text-slate-500"
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
                            const fullPath = `${repoPath}/${sub.path}`.replace(
                                /\\/g,
                                "/",
                            );
                            onOpenSubmodule(fullPath);
                            }
                        }}
                        className="p-1 mr-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                        title={t("sidebar.sourceControl.openSubmoduleWorkspace")}
                        >
                        <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                        onClick={() => actions.handleRemoveSubmodule(sub.path, sub.name)}
                        className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title={t("sidebar.sourceControl.removeSubmodule")}
                        >
                        <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    </div>
                    <span className="text-[10px] text-slate-500 ml-6 truncate font-mono mt-0.5 leading-none">
                    {sub.status === "-"
                        ? `(${t("sidebar.sourceControl.uninitialized")})`
                        : sub.hash.substring(0, 7)}
                    </span>
                </div>
            ))
        )}
      </div>
    </div>
  );
}
