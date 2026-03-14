interface GraphBranchContextMenuProps {
  contextMenu: { visible: boolean; x: number; y: number; refName: string };
  onClose: () => void;
  branchName: string;
  onCheckout: (ref: string) => void;
  onCreateFrom: (ref: string) => void;
  onCreateTag: (ref: string) => void;
  onMerge: (ref: string) => void;
  onRebase: (ref: string) => void;
  onCherryPick: (ref: string) => void;
  onRevert: (ref: string) => void;
  onReset: (ref: string, mode: "soft" | "mixed" | "hard") => void;
  onDelete: (ref: string) => void;
}

import { useTranslation } from "react-i18next";
import { Check, GitBranch, Tag, GitPullRequest, ArrowUp, RotateCcw, Trash2 } from "lucide-react";

export function GraphBranchContextMenu({
  contextMenu,
  onClose,
  branchName,
  onCheckout,
  onCreateFrom,
  onCreateTag,
  onMerge,
  onRebase,
  onCherryPick,
  onRevert,
  onReset,
  onDelete,
}: GraphBranchContextMenuProps) {
  const { t } = useTranslation();
  if (!contextMenu.visible) return null;

  const isCommit = contextMenu.refName.startsWith("commit:");
  const isTag = !isCommit && contextMenu.refName.startsWith("tag: ");
  const isRemote = !isCommit && contextMenu.refName.includes("origin/");
  
  let ref = contextMenu.refName;
  if (isTag) ref = contextMenu.refName.substring(5);
  if (isCommit) ref = contextMenu.refName.substring(7);

  const isCurrentBranch = ref === branchName;
  const isHeadRef = ref.toUpperCase().startsWith("HEAD");
  
  const canDelete = !isCommit && !isCurrentBranch && !isHeadRef && !isTag;
  const canMergeRebaseEtc = !isCurrentBranch && !isHeadRef && !isTag;
  const canCheckout = !isCommit && !isHeadRef;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg min-w-[180px] text-sm overflow-hidden"
        style={{ top: contextMenu.y, left: contextMenu.x }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 truncate max-w-[220px]" title={ref}>
          {isCommit ? `${t("workspace.contextMenu.commitPrefix")} ${ref.substring(0, 7)}` : ref}
        </div>

        {canCheckout && (
          <button
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center gap-2"
            onClick={() => { onCheckout(ref); onClose(); }}
          >
            <Check className="w-3.5 h-3.5 text-slate-400" /> {t("workspace.contextMenu.checkout")}
          </button>
        )}

        <button
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center gap-2"
          onClick={() => { onCreateFrom(ref); onClose(); }}
        >
          <GitBranch className="w-3.5 h-3.5 text-slate-400" /> {t("workspace.contextMenu.createBranchFromHere")}
        </button>

        <button
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center gap-2"
          onClick={() => { onCreateTag(ref); onClose(); }}
        >
          <Tag className="w-3.5 h-3.5 text-slate-400" /> {t("workspace.contextMenu.createTagHere")}
        </button>

        {canMergeRebaseEtc && (
          <>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center gap-2"
              onClick={() => { onMerge(ref); onClose(); }}
            >
              <GitPullRequest className="w-3.5 h-3.5 text-slate-400 rotate-90" /> {t("workspace.contextMenu.mergeIntoCurrent")}
            </button>

            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center gap-2"
              onClick={() => { onRebase(ref); onClose(); }}
            >
              <ArrowUp className="w-3.5 h-3.5 text-slate-400" /> {t("workspace.contextMenu.rebaseOntoThis")}
            </button>

            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center gap-2"
              onClick={() => { onCherryPick(ref); onClose(); }}
            >
              <GitPullRequest className="w-3.5 h-3.5 text-slate-400" /> {t("workspace.contextMenu.cherryPick")}
            </button>

            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 flex items-center gap-2"
              onClick={() => { onRevert(ref); onClose(); }}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> {t("workspace.contextMenu.revert")}
            </button>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
            <div className="px-4 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t("workspace.contextMenu.resetCurrentToHere")}</div>
            <button
              className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 pl-9"
              onClick={() => { onReset(ref, "soft"); onClose(); }}
            >
              {t("workspace.contextMenu.softReset")}
            </button>
            <button
              className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 pl-9"
              onClick={() => { onReset(ref, "mixed"); onClose(); }}
            >
              {t("workspace.contextMenu.mixedReset")}
            </button>
            <button
              className="w-full text-left px-4 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-600 dark:text-red-400 font-medium pl-9"
              onClick={() => { onReset(ref, "hard"); onClose(); }}
            >
              {t("workspace.contextMenu.hardReset")}
            </button>
          </>
        )}

        {canDelete && (
          <>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
            <button
              className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-600 dark:text-red-400 flex items-center gap-2"
              onClick={() => { onDelete(ref); onClose(); }}
            >
              <Trash2 className="w-3.5 h-3.5 opacity-80" /> {t("workspace.contextMenu.delete")}
            </button>
          </>
        )}
      </div>
    </>
  );
}
