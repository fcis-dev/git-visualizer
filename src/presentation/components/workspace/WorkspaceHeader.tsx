import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WorkspaceHeaderBranchSwitcher } from "./WorkspaceHeaderBranchSwitcher";
import { WorkspaceHeaderSyncActions } from "./WorkspaceHeaderSyncActions";

interface WorkspaceHeaderProps {
  repoName: string;
  repoPath: string;
  onBack: () => void;
  branchName: string;
  isBranchDropdownOpen: boolean;
  setIsBranchDropdownOpen: (open: boolean) => void;
  availableBranches: string[];
  checkoutingBranch: string | null;
  onCheckoutBranch: (branch: string) => Promise<void>;
  commitsLength: number;
  isScrollingToHead: boolean;
  onScrollToHead: () => void;
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

export function WorkspaceHeader({
  repoName,
  repoPath,
  onBack,
  branchName,
  isBranchDropdownOpen,
  setIsBranchDropdownOpen,
  availableBranches,
  checkoutingBranch,
  onCheckoutBranch,
  commitsLength,
  isScrollingToHead,
  onScrollToHead,
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
}: WorkspaceHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="relative h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-slate-950 z-20">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          title={t("workspace.header.backToProjects")}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {repoName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[300px]">
            {repoPath}
          </p>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

        <WorkspaceHeaderBranchSwitcher
          branchName={branchName}
          isBranchDropdownOpen={isBranchDropdownOpen}
          setIsBranchDropdownOpen={setIsBranchDropdownOpen}
          availableBranches={availableBranches}
          checkoutingBranch={checkoutingBranch}
          onCheckoutBranch={onCheckoutBranch}
        />

        {/* Scroll to HEAD button */}
        {commitsLength > 0 && (
          <button
            onClick={onScrollToHead}
            disabled={isScrollingToHead}
            className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              isScrollingToHead
                ? t("workspace.header.locateHead")
                : t("workspace.header.scrollToHead")
            }
          >
            {isScrollingToHead ? (
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <polyline points="8 12 12 8 16 12" />
                <line x1="12" y1="8" x2="12" y2="16" />
              </svg>
            )}
            <span>{t("workspace.header.head")}</span>
          </button>
        )}
      </div>

      <WorkspaceHeaderSyncActions
        setIsStatsModalOpen={setIsStatsModalOpen}
        isFetchingManual={isFetchingManual}
        isAutoFetching={isAutoFetching}
        onFetch={onFetch}
        isPulling={isPulling}
        behindCount={behindCount}
        onPull={onPull}
        isPushing={isPushing}
        aheadCount={aheadCount}
        onPush={onPush}
        hasRemote={hasRemote}
      />
    </header>
  );
}
