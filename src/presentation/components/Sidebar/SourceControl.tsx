import { useState, useEffect } from "react";
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
import { Commit } from "../../../domain/entities/GitEntities";
import { StashesModal } from "../StashesModal";
import { useSourceControlController } from "../../controllers/useSourceControlController";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { state, actions } = useSourceControlController(repoPath, onCommit, refreshTrigger);

  const [isStashesModalOpen, setIsStashesModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    path: string | null;
  }>({ visible: false, x: 0, y: 0, path: null });

  useEffect(() => {
    const closeContextMenu = () =>
      setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", closeContextMenu);
    return () => document.removeEventListener("click", closeContextMenu);
  }, []);

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
      <div className="p-4 text-center text-slate-600 dark:text-slate-400 text-sm">
        {t("sidebar.sourceControl.noRepo")}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
          {t("sidebar.sourceControl.title")}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {state.error && (
          <div className="p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
            {state.error}
          </div>
        )}

        {state.isRebasing && (
          <div className="flex flex-col p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-lg">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400 font-bold mb-2 text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span>{t("sidebar.sourceControl.rebaseInProgress")}</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-500 mb-3 leading-tight font-medium">
              {t("sidebar.sourceControl.rebaseInstructions")}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={actions.handleRebaseAbort}
                disabled={state.rebaseLoading}
                className="flex-1 py-1.5 text-xs rounded font-bold transition-colors bg-white hover:bg-red-50 text-red-600 border border-red-200 dark:bg-amber-950/50 dark:hover:bg-red-900/50 dark:border-red-800 dark:text-red-400 disabled:opacity-50"
              >
                {t("sidebar.sourceControl.abort")}
              </button>
              <button
                onClick={actions.handleRebaseContinue}
                disabled={state.rebaseLoading}
                className="flex-2 py-1.5 text-xs rounded font-bold transition-colors bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow-sm disabled:opacity-50"
              >
                {t("sidebar.sourceControl.continueRebase")}
              </button>
            </div>
          </div>
        )}

        {/* Stash Actions */}
        <div className="flex space-x-2">
          <button
            onClick={actions.handleStashSave}
            disabled={state.stashLoading}
            className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-1.5 rounded text-xs transition-colors"
            title={t("sidebar.sourceControl.stashTitle")}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{t("sidebar.sourceControl.stash")}</span>
          </button>
          <button
            onClick={() => setIsStashesModalOpen(true)}
            disabled={state.stashLoading}
            className="flex-2 flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 py-1.5 rounded text-xs transition-colors font-medium border border-emerald-200/50 dark:border-emerald-500/20"
            title={t("sidebar.sourceControl.stashesTitle")}
          >
            <span>{t("sidebar.sourceControl.stashes")}</span>
            {state.stashesCount > 0 && (
              <span className="bg-emerald-200 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold ml-1">
                {state.stashesCount}
              </span>
            )}
          </button>
        </div>

        {/* Removed Conflicted Files section, moved to Changes */}

        {/* Commit Input */}
        <div className="space-y-2">
          {latestCommit && (
            <div className="flex justify-end mb-1">
              <button
                onClick={() => {
                  const checked = !state.isAmend;
                  actions.setIsAmend(checked);
                  if (checked) {
                    actions.setPreviousMessage(state.commitMessage);
                    actions.setCommitMessage(latestCommit.message);
                  } else {
                    actions.setCommitMessage(state.previousMessage);
                  }
                }}
                className={`flex items-center space-x-1.5 py-1 px-2.5 rounded text-xs transition-colors font-medium border ${
                  state.isAmend
                    ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/20"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                }`}
                title={t("sidebar.sourceControl.amendTitle")}
              >
                {state.isAmend && <Check className="w-3 h-3" />}
                <span>{t("sidebar.sourceControl.amend")}</span>
              </button>
            </div>
          )}
          <textarea
            value={state.commitMessage}
            onChange={(e) => actions.setCommitMessage(e.target.value)}
            placeholder={t("sidebar.sourceControl.commitPlaceholder")}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 min-h-[80px]"
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "Enter") {
                actions.handleCommit();
              }
            }}
          />
          <button
            onClick={actions.handleCommit}
            disabled={
              !state.commitMessage ||
              (!state.isAmend && state.stagedFiles.length === 0 && !state.lastMergeMsg)
            }
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {state.isAmend ? t("sidebar.sourceControl.commitAmendButton") : t("sidebar.sourceControl.commitButton")}
          </button>
        </div>

        {/* Staged Changes */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1">
            <span>{t("sidebar.sourceControl.stagedChanges")}</span>
            <div className="flex items-center space-x-2">
              <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded-full text-slate-700 dark:text-slate-300">
                {state.stagedFiles.length}
              </span>
              {state.stagedFiles.length > 0 && (
                <button
                  onClick={actions.handleUnstageAll}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  title={t("sidebar.sourceControl.unstageAll")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {state.stagedFiles.map((file) => (
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
                  onClick={(e) => { e.stopPropagation(); actions.handleUnstage(file.path); }}
                  className="p-1 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded"
                  title={t("sidebar.sourceControl.unstage")}
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
            <span>{t("sidebar.sourceControl.changes")}</span>
            <div className="flex items-center space-x-2">
              <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded-full text-slate-700 dark:text-slate-300">
                {state.changes.length}
              </span>
              {state.changes.length > 0 && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={actions.handleDiscardAll}
                    className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title={t("sidebar.sourceControl.discardAll")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={actions.handleStageAll}
                    className="p-1 text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                    title={t("sidebar.sourceControl.stageAll")}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {state.changes.map((file) => (
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
                      onClick={(e) => { e.stopPropagation(); actions.handleResolveConflict(file.path, "ours"); }}
                      className="p-1 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      title={t("sidebar.sourceControl.acceptCurrent")}
                    >
                      <ArrowLeftToLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); actions.handleResolveConflict(file.path, "theirs"); }}
                      className="p-1 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title={t("sidebar.sourceControl.acceptIncoming")}
                    >
                      <ArrowRightToLine className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); actions.handleDiscard(file.path); }}
                      className="p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title={t("sidebar.sourceControl.discard")}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); actions.handleStage(file.path); }}
                      className="p-1 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      title={t("sidebar.sourceControl.stage")}
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
            <span>{t("sidebar.sourceControl.submodules")}</span>
            <div className="flex items-center space-x-2">
              <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded-full text-slate-700 dark:text-slate-300">
                {state.submodules.length}
              </span>
              <div className="flex border-l border-slate-300 dark:border-slate-700 pl-1 ml-1 space-x-1">
                <button
                  onClick={actions.handleAddSubmodule}
                  disabled={state.submodulesLoading}
                  className="p-1 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
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
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50"
                  title={t("sidebar.sourceControl.syncSubmodules")}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${state.submodulesLoading ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  onClick={actions.handleUpdateSubmodules}
                  disabled={state.submodulesLoading}
                  className="p-1 text-slate-500 hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50 flex items-center"
                  title={t("sidebar.sourceControl.updateSubmodules")}
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          {state.submodules.map((sub, idx) => (
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
                        // Normalize path separators just in case
                        const fullPath = `${repoPath}/${sub.path}`.replace(
                          /\\/g,
                          "/",
                        );
                        onOpenSubmodule(fullPath);
                      }
                    }}
                    className="p-1 mr-1 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                    title={t("sidebar.sourceControl.openSubmoduleWorkspace")}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => actions.handleRemoveSubmodule(sub.path, sub.name)}
                    className="p-1 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title={t("sidebar.sourceControl.removeSubmodule")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <span className="text-xs text-slate-500 ml-6 truncate font-mono mt-0.5">
                {sub.status === "-"
                  ? `(${t("sidebar.sourceControl.uninitialized")})`
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
            actions.loadStatus();
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
            {t("sidebar.sourceControl.viewFileHistory")}
          </button>
        </div>
      )}
    </div>
  );
}
