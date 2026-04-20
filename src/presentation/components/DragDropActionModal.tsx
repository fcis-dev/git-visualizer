import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { CopyPlus, GitCommit, GitMerge } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DragDropActionModalProps {
  x: number;
  y: number;
  sourceCommitHash: string;
  targetCommitHash: string;
  targetBranchName: string;
  onClose: () => void;
  onSelectAction: (action: "merge" | "rebase" | "cherryPick") => void;
}

export function DragDropActionModal({
  x,
  y,
  sourceCommitHash,
  targetCommitHash,
  targetBranchName,
  onClose,
  onSelectAction,
}: DragDropActionModalProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture to avoid immediate close if another element consumes pointer up
    document.addEventListener("mousedown", handleDown, true);
    return () => {
      document.removeEventListener("mousedown", handleDown, true);
    };
  }, [onClose]);

  const shortHash = sourceCommitHash.substring(0, 7);
  const targetLabel = targetBranchName || targetCommitHash.substring(0, 7);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <AnimatePresence>
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{ 
            left: Math.min(x, window.innerWidth - 250), 
            top: Math.min(y, window.innerHeight - 200) 
          }}
          className="absolute shadow-xl border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col bg-white dark:bg-slate-900 pointer-events-auto min-w-[240px]"
        >
          <div className="bg-slate-100 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            {t("graphActions.dropMenuTitle", { hash: shortHash, target: targetLabel, defaultValue: `Action for ${shortHash}` })}
          </div>
          
          <button
            onClick={() => onSelectAction("merge")}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors w-full text-left focus:outline-none"
          >
            <GitMerge size={16} className="text-indigo-500" />
            <div className="flex flex-col">
              <span className="font-medium">{t("graphActions.mergeTitle")}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{`Merge into ${targetLabel}`}</span>
            </div>
          </button>
          
          <button
            onClick={() => onSelectAction("rebase")}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors w-full text-left focus:outline-none border-t border-slate-100 dark:border-slate-800/50"
          >
            <GitCommit size={16} className="text-pink-500" />
            <div className="flex flex-col">
              <span className="font-medium">{t("graphActions.rebaseTitle")}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{`Rebase onto ${targetLabel}`}</span>
            </div>
          </button>
          
          <button
            onClick={() => onSelectAction("cherryPick")}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 transition-colors w-full text-left focus:outline-none border-t border-slate-100 dark:border-slate-800/50"
          >
            <CopyPlus size={16} className="text-emerald-500" />
            <div className="flex flex-col">
              <span className="font-medium">{t("graphActions.cherryPickTitle")}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{`Cherry-pick ${shortHash}`}</span>
            </div>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
