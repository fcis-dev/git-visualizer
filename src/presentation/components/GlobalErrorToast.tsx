import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { appLogger, LogEntry } from "../../utils/AppLogger";
import { AlertCircle, X, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GlobalErrorToastProps {
  onOpenLogPanel: () => void;
}

export function GlobalErrorToast({ onOpenLogPanel }: GlobalErrorToastProps) {
  const [toast, setToast] = useState<LogEntry | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    let prevLogsCount = appLogger.getLogs().length;

    const unsubscribe = appLogger.subscribe((logs) => {
      if (logs.length > prevLogsCount) {
        const newLogs = logs.slice(prevLogsCount);
        const lastError = newLogs.slice().reverse().find(l => l.type === 'error');
        if (lastError) {
          setToast(lastError);
          // Auto-hide after 8 seconds
          setTimeout(() => {
            setToast((current) => current?.id === lastError.id ? null : current);
          }, 8000);
        }
      }
      prevLogsCount = logs.length;
    });

    return unsubscribe;
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-14 right-4 z-50 max-w-sm w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 shadow-2xl rounded-lg overflow-hidden flex cursor-pointer group"
          onClick={() => {
            onOpenLogPanel();
            setToast(null);
          }}
        >
          <div className="w-1.5 bg-red-500 shrink-0" />
          <div className="p-3 flex-1 min-w-0 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t("globalErrorToast.errorTitle")}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {toast.message}
              </p>
              <div className="mt-2 text-[10px] font-semibold text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                {t("globalErrorToast.clickToView")}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setToast(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
