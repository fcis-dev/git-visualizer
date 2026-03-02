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
  onReset: (ref: string, mode: "soft" | "mixed" | "hard") => void;
  onDelete: (ref: string) => void;
}

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
  onReset,
  onDelete,
}: GraphBranchContextMenuProps) {
  if (!contextMenu.visible) return null;

  const ref = contextMenu.refName;
  const isCurrentBranch = ref === branchName;
  const isHeadRef = ref.toUpperCase().startsWith("HEAD");
  const isTag = false; // tags from graph start with "tag: " but we strip that in Graph
  const canDelete = !isCurrentBranch && !isHeadRef && !isTag;
  const canMergeRebaseEtc = !isCurrentBranch && !isHeadRef;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg min-w-[180px] text-sm overflow-hidden"
        style={{ top: contextMenu.y, left: contextMenu.x }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 truncate max-w-[220px]" title={ref}>
          {ref}
        </div>

        {!isHeadRef && (
          <button
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
            onClick={() => { onCheckout(ref); onClose(); }}
          >
            Checkout
          </button>
        )}

        <button
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
          onClick={() => { onCreateFrom(ref); onClose(); }}
        >
          Create branch from here…
        </button>

        <button
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
          onClick={() => { onCreateTag(ref); onClose(); }}
        >
          Create tag here…
        </button>

        {canMergeRebaseEtc && (
          <>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              onClick={() => { onMerge(ref); onClose(); }}
            >
              Merge into current
            </button>

            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              onClick={() => { onRebase(ref); onClose(); }}
            >
              Rebase current onto this
            </button>

            <button
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              onClick={() => { onCherryPick(ref); onClose(); }}
            >
              Cherry-pick tip
            </button>

            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
            <div className="px-4 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reset Current To Here</div>

            <button
              className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              onClick={() => { onReset(ref, "soft"); onClose(); }}
            >
              Soft (keep changes)
            </button>
            <button
              className="w-full text-left px-4 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              onClick={() => { onReset(ref, "mixed"); onClose(); }}
            >
              Mixed
            </button>
            <button
              className="w-full text-left px-4 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-600 dark:text-red-400 font-medium"
              onClick={() => { onReset(ref, "hard"); onClose(); }}
            >
              Hard (discard changes)
            </button>
          </>
        )}

        {canDelete && (
          <>
            <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
            <button
              className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-600 dark:text-red-400"
              onClick={() => { onDelete(ref); onClose(); }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </>
  );
}
