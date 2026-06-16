import { useState, useEffect } from "react";
import {
  Play,
  Check,
  X,
  Archive,
  Trash2,
  RotateCcw,
  RefreshCw,
  Plus,
  ExternalLink,
  Loader2,
  AlertTriangle,
  ArrowLeftToLine,
  ArrowRightToLine,
  FolderGit2,
  ChevronDown,
} from "lucide-react";
import { Commit } from "../../../domain/entities/GitEntities";
import { useSourceControlController } from "../../controllers/useSourceControlController";
import { useTranslation } from "react-i18next";
import { truncatePath } from "../../utils/pathUtils";

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
  const [showCommitOptions, setShowCommitOptions] = useState(false);
  const [isStagedExpanded, setIsStagedExpanded] = useState(true);
  const [isChangesExpanded, setIsChangesExpanded] = useState(true);

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
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm shrink-0 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-indigo-500" />
          <span>{t("sidebar.sourceControl.title")}</span>
        </span>
        {state.isLfsInstalled && (
          <button
            onClick={actions.handleLfsPull}
            className="p-1 px-2 text-[10px] uppercase font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title={t("sidebar.sourceControl.lfsPull")}
          >
            {t("sidebar.sourceControl.lfsPull")}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Removed inline error rendering */}

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

        {/* Removed Conflicted Files section, moved to Changes */}

        {/* Commit Input */}
        <div className="space-y-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none transition-opacity duration-500 opacity-0 group-focus-within:opacity-100" />
          {latestCommit && (
            <div className="flex justify-end mb-1 relative z-10">
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
                className={`flex items-center space-x-1.5 py-1 px-2.5 rounded-md text-xs transition-all font-medium border ${
                  state.isAmend
                    ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-500/30 shadow-sm"
                    : "bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
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
            className="w-full bg-transparent border-none rounded p-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none h-[80px] resize-none overflow-y-auto custom-scrollbar placeholder:text-slate-400 dark:placeholder:text-slate-500 relative z-10"
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "Enter") {
                actions.handleCommit();
              }
            }}
          />
          <div className="flex gap-1 relative z-10 w-full mb-1">
            <button
              onClick={() => actions.handleCommit(false)}
              disabled={
                state.commitLoading ||
                !state.commitMessage ||
                (!state.isAmend && state.stagedFiles.length === 0 && !state.lastMergeMsg)
              }
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white py-2 rounded-l-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:shadow-none"
            >
              {state.commitLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {state.isAmend ? t("sidebar.sourceControl.commitAmendButton") : t("sidebar.sourceControl.commitButton")}
            </button>
            <button
              onClick={() => setShowCommitOptions(!showCommitOptions)}
              disabled={
                state.commitLoading ||
                !state.commitMessage ||
                (!state.isAmend && state.stagedFiles.length === 0 && !state.lastMergeMsg)
              }
              className="bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-2 py-2 rounded-r-lg transition-all shadow-sm disabled:shadow-none flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showCommitOptions && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowCommitOptions(false)} 
                />
                <div className="absolute top-10 right-0 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md z-50 overflow-hidden py-1">
                  <button
                    onClick={() => {
                      actions.handleCommit(true);
                      setShowCommitOptions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {t("sidebar.sourceControl.commitNoVerify")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Staged Changes */}
        <div className="space-y-1">
          <div 
            className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5 bg-slate-100/50 dark:bg-slate-800/30 rounded-md cursor-pointer select-none hover:bg-slate-200/50 dark:hover:bg-slate-700/30 transition-colors"
            onClick={() => setIsStagedExpanded(!isStagedExpanded)}
          >
            <div className="flex items-center gap-1.5">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${!isStagedExpanded ? "-rotate-90" : ""}`} />
              <span>{t("sidebar.sourceControl.stagedChanges")}</span>
            </div>
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600 leading-none">
                {state.stagedFiles.length}
              </span>
              {state.stagedFiles.length > 0 && (
                <button
                  onClick={actions.handleUnstageAll}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title={t("sidebar.sourceControl.unstageAll")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {isStagedExpanded && (
            <div className="pl-1">
            {state.stagedFiles.map((file) => {
              const parts = file.path.split(/[/\\]/);
              const fileName = parts.pop();
              const dirPath = parts.join("/");
              const displayPath = dirPath ? truncatePath(dirPath, 25) : "";
              const isLfs = state.lfsFiles.includes(file.path);
              
              const statusColorClass = file.status === "staged_deleted"
                ? "text-red-500/80 dark:text-red-400/80 line-through"
                : "text-slate-700 dark:text-slate-300";

              return (
              <div
                key={file.path}
                className="group flex items-center justify-between p-1.5 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 rounded-md cursor-pointer transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/50"
                onClick={() => onSelectFile(file.path, true)}
                onContextMenu={(e) => handleContextMenu(file.path, e)}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${file.status === "staged_deleted" ? "bg-red-500" : file.status === "staged_new" ? "bg-green-500" : "bg-amber-500"}`} />
                  <div className="flex items-baseline min-w-0 flex-1 overflow-hidden" title={file.path}>
                    <span className={`text-xs truncate min-w-0 ${statusColorClass}`}>{fileName}</span>
                    {isLfs && <span className="ml-1.5 text-[9px] bg-slate-200 dark:bg-slate-700 px-1 rounded-sm font-semibold text-slate-600 dark:text-slate-400 shrink-0">LFS</span>}
                    {displayPath && <span className={`ml-1.5 text-[10px] truncate min-w-0 [direction:rtl] text-left ${file.status === "staged_deleted" ? "text-red-400/60 line-through" : "text-slate-400 dark:text-slate-500"}`}>&lrm;{displayPath}</span>}
                  </div>
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); actions.handleUnstage(file.path); }}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title={t("sidebar.sourceControl.unstage")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Changes */}
        <div className="space-y-1">
          <div 
            className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5 bg-slate-100/50 dark:bg-slate-800/30 rounded-md mt-4 cursor-pointer select-none hover:bg-slate-200/50 dark:hover:bg-slate-700/30 transition-colors"
            onClick={() => setIsChangesExpanded(!isChangesExpanded)}
          >
            <div className="flex items-center gap-1.5">
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${!isChangesExpanded ? "-rotate-90" : ""}`} />
              <span>{t("sidebar.sourceControl.changes")}</span>
            </div>
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
              <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600 leading-none">
                {state.changes.length}
              </span>
              {state.changes.length > 0 && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={actions.handleDiscardAll}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title={t("sidebar.sourceControl.discardAll")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={actions.handleStageAll}
                    className="p-1 text-slate-400 hover:text-green-500 transition-colors"
                    title={t("sidebar.sourceControl.stageAll")}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          {isChangesExpanded && (
            <div className="pl-1">
            {state.changes.map((file) => {
              const parts = file.path.split(/[/\\]/);
              const fileName = parts.pop();
              const dirPath = parts.join("/");
              const displayPath = dirPath ? truncatePath(dirPath, 25) : "";
              
              const statusColorClass = file.status === "deleted"
                ? "text-red-500/80 dark:text-red-400/80 line-through"
                : file.status === "conflicted"
                  ? "text-amber-600 dark:text-amber-400 font-bold"
                  : "text-slate-700 dark:text-slate-300";
              const isLfs = state.lfsFiles.includes(file.path);

              return (
              <div
                key={file.path}
                className="group flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-md cursor-pointer transition-colors"
                onClick={() => {
                  if (file.status === "conflicted" && onResolveConflict) {
                    onResolveConflict(file.path);
                  } else {
                    onSelectFile(file.path);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(file.path, e)}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {file.status === "conflicted" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${file.status === "deleted" ? "bg-red-500" : file.status === "new" ? "bg-green-500" : "bg-amber-500"}`} />
                  )}
                  <div className="flex items-baseline min-w-0 flex-1 overflow-hidden" title={file.path}>
                    <span className={`text-xs truncate min-w-0 ${statusColorClass}`}>
                      {fileName}
                    </span>
                    {isLfs && <span className="ml-1.5 text-[9px] bg-slate-200 dark:bg-slate-700 px-1 rounded-sm font-semibold text-slate-600 dark:text-slate-400 shrink-0">LFS</span>}
                    {displayPath && (
                      <span className={`ml-1.5 text-[10px] truncate min-w-0 [direction:rtl] text-left ${file.status === "deleted" ? "text-red-400/60 line-through" : "text-slate-400 dark:text-slate-500"}`}>
                        &lrm;{displayPath}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 space-x-1 shrink-0 transition-opacity">
                  {file.status === "conflicted" ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); actions.handleResolveConflict(file.path, "ours"); }}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                        title={t("sidebar.sourceControl.acceptCurrent")}
                      >
                        <ArrowLeftToLine className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); actions.handleResolveConflict(file.path, "theirs"); }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title={t("sidebar.sourceControl.acceptIncoming")}
                      >
                        <ArrowRightToLine className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); actions.handleDiscard(file.path); }}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title={t("sidebar.sourceControl.discard")}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); actions.handleStage(file.path); }}
                        className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        title={t("sidebar.sourceControl.stage")}
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
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

          {onViewFileHistory && (
            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              onClick={() => {
                onViewFileHistory(contextMenu.path!);
                setContextMenu({ ...contextMenu, visible: false });
              }}
            >
              {t("sidebar.sourceControl.viewFileHistory")}
            </button>
          )}

          {state.isLfsInstalled && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
              <button
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                onClick={() => {
                  actions.handleLfsTrack(contextMenu.path!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
              >
                {t("sidebar.sourceControl.lfsTrackWait")}
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                onClick={() => {
                  actions.handleLfsLock(contextMenu.path!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
              >
                {t("sidebar.sourceControl.lfsLock")}
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                onClick={() => {
                  actions.handleLfsUnlock(contextMenu.path!);
                  setContextMenu({ ...contextMenu, visible: false });
                }}
              >
                {t("sidebar.sourceControl.lfsUnlock")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
