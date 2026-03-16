import { RefreshCw, ArrowDown, ArrowUp, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface WorkspaceHeaderSyncActionsProps {
  setIsStatsModalOpen: (open: boolean) => void;
  isFetchingManual: boolean;
  isAutoFetching: boolean;
  onFetch: (prune?: boolean) => void;
  isPulling: boolean;
  behindCount: number;
  onPull: () => void;
  isPushing: boolean;
  aheadCount: number;
  onPush: () => void;
  hasRemote: boolean;
}

export function WorkspaceHeaderSyncActions({
  setIsStatsModalOpen,
  isFetchingManual,
  isAutoFetching,
  onFetch,
  isPulling,
  behindCount,
  onPull,
  isPushing,
  aheadCount,
  onPush,
  hasRemote,
}: WorkspaceHeaderSyncActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center space-x-2">
      {/* Insights Action */}
      <button
        onClick={() => setIsStatsModalOpen(true)}
        className="flex flex-col items-center justify-center p-1.5 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 rounded hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
        title={t("workspace.header.repoStats")}
      >
        <TrendingUp className="w-4 h-4" />
      </button>

      <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

      {/* Sync Actions (Fetch, Pull, Push) */}
      <button
        onClick={() => onFetch(true)}
        disabled={isFetchingManual || isAutoFetching || !hasRemote}
        className="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={!hasRemote ? t("workspace.header.noRemote") : t("workspace.header.fetchWithPrune")}
      >
        <RefreshCw
          className={`w-4 h-4 ${isFetchingManual || isAutoFetching ? "animate-spin" : ""}`}
        />
      </button>

      <button
        onClick={onPull}
        disabled={isPulling || !hasRemote}
        className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border disabled:opacity-60 disabled:cursor-not-allowed ${
          behindCount > 0 && hasRemote
            ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
            : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent"
        }`}
        title={!hasRemote ? t("workspace.header.noRemote") : behindCount > 0 ? t("workspace.header.pullBehind", { count: behindCount }) : t("workspace.header.pull")}
      >
        {isPulling ? (
          <svg
            className="animate-spin w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              strokeWidth="3"
              strokeDasharray="31.4 31.4"
            />
          </svg>
        ) : (
          <ArrowDown className="w-3.5 h-3.5" />
        )}
        <span>{t("workspace.header.pull")}</span>
        {behindCount > 0 && !isPulling && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.2rem] text-[9px] font-bold rounded-full bg-amber-500 text-white leading-none shadow-sm text-center">
            {behindCount}
          </span>
        )}
      </button>

      <button
        onClick={onPush}
        disabled={isPushing || !hasRemote}
        className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border disabled:opacity-60 disabled:cursor-not-allowed ${
          aheadCount > 0 && hasRemote
            ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
            : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent"
        }`}
        title={!hasRemote ? t("workspace.header.noRemote") : aheadCount > 0 ? t("workspace.header.pushAhead", { count: aheadCount }) : t("workspace.header.push")}
      >
        {isPushing ? (
          <svg
            className="animate-spin w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              strokeWidth="3"
              strokeDasharray="31.4 31.4"
            />
          </svg>
        ) : (
          <ArrowUp className="w-3.5 h-3.5" />
        )}
        <span>{t("workspace.header.push")}</span>
        {aheadCount > 0 && !isPushing && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.2rem] text-[9px] font-bold rounded-full bg-indigo-500 text-white leading-none shadow-sm text-center">
            {aheadCount}
          </span>
        )}
      </button>
    </div>
  );
}
