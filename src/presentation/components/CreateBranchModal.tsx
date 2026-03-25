import { useState, useRef, useEffect } from "react";
import { GitBranch, X, Check, GripHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, useDragControls } from "framer-motion";

interface CreateBranchModalProps {
  baseCommit: string;
  onClose: () => void;
  onSubmit: (branchName: string, checkout: boolean) => Promise<void>;
}

export function CreateBranchModal({
  baseCommit,
  onClose,
  onSubmit,
}: CreateBranchModalProps) {
  const [branchName, setBranchName] = useState("");
  const [checkout, setCheckout] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const inputRef = useRef<HTMLInputElement>(null);
  const dragControls = useDragControls();

  useEffect(() => {
    // Auto-focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(branchName.trim(), checkout);
      onClose();
    } catch (err: any) {
      setError(err.toString());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 cursor-move select-none group/header"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="flex items-center space-x-2.5">
            <GripHorizontal className="w-4 h-4 text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity absolute -left-1" />
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {t("createBranch.title")}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                {t("createBranch.from")} {baseCommit.substring(0, 7)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start">
              <span className="block">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="branchName"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-0.5"
              >
                {t("createBranch.nameLabel")}
              </label>
              <input
                ref={inputRef}
                id="branchName"
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder={t("createBranch.namePlaceholder")}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all placeholder:text-slate-500"
                autoComplete="off"
                disabled={isSubmitting}
              />
            </div>

            <label className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
              <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                <input
                  type="checkbox"
                  checked={checkout}
                  onChange={(e) => setCheckout(e.target.checked)}
                  className="peer appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-950 checked:bg-indigo-500 checked:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all cursor-pointer"
                  disabled={isSubmitting}
                />
                <Check
                  className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                  strokeWidth={3}
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("createBranch.checkoutLabel")}
                </span>
                <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {t("createBranch.checkoutDesc")}
                </span>
              </div>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {t("createBranch.cancel")}
            </button>
            <button
              type="submit"
              disabled={!branchName.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("createBranch.creating")}
                </>
              ) : (
                t("createBranch.submit")
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
