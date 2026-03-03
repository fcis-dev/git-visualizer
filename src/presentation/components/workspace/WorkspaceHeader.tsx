import { useState } from "react";
import {
  GitBranch,
  ArrowLeft,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Check
} from "lucide-react";
import { buildBranchTree, sortTreeNodes, BranchTreeNode } from "../../utils/branchTreeUtils";
import { useTranslation } from "react-i18next";

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

        {/* Branch Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
            className="flex items-center space-x-2 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded text-sm text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
            title={t("workspace.header.switchBranch")}
          >
            <GitBranch className="w-4 h-4" />
            <span>{branchName || "..."}</span>
          </button>

          {isBranchDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsBranchDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-40 overflow-hidden animate-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  {t("workspace.header.localBranches")}
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {availableBranches.length > 0 ? (
                    <DropdownBranchNodeRenderer
                      node={buildBranchTree(availableBranches, (b) => b)}
                      branchName={branchName}
                      checkoutingBranch={checkoutingBranch}
                      onCheckout={onCheckoutBranch}
                    />
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-slate-500">
                      {t("workspace.header.noBranches")}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

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
          disabled={isFetchingManual || isAutoFetching}
          className="flex flex-col items-center justify-center p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-wait"
          title={t("workspace.header.fetchWithPrune")}
        >
          <RefreshCw
            className={`w-4 h-4 ${isFetchingManual || isAutoFetching ? "animate-spin" : ""}`}
          />
        </button>

        <button
          onClick={onPull}
          disabled={isPulling}
          className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border disabled:opacity-60 disabled:cursor-wait ${
            behindCount > 0
              ? "bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
              : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent"
          }`}
          title={behindCount > 0 ? t("workspace.header.pullBehind", { count: behindCount }) : t("workspace.header.pull")}
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
          disabled={isPushing}
          className={`relative flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors border disabled:opacity-60 disabled:cursor-wait ${
            aheadCount > 0
              ? "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
              : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent"
          }`}
          title={aheadCount > 0 ? t("workspace.header.pushAhead", { count: aheadCount }) : t("workspace.header.push")}
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
    </header>
  );
}

function DropdownBranchNodeRenderer({
  node,
  branchName,
  checkoutingBranch,
  onCheckout,
  level = 0,
}: {
  node: BranchTreeNode<string>;
  branchName: string;
  checkoutingBranch: string | null;
  onCheckout: (b: string) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = sortTreeNodes(node);
  const isFolder = !node.isLeaf && children.length > 0;

  if (node.name === "root") {
    return (
      <>
        {children.map((child) => (
          <DropdownBranchNodeRenderer
            key={child.path}
            node={child}
            branchName={branchName}
            checkoutingBranch={checkoutingBranch}
            onCheckout={onCheckout}
            level={level}
          />
        ))}
      </>
    );
  }

  if (isFolder) {
    return (
      <div className="flex flex-col">
        <button
          onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center text-slate-600 dark:text-slate-300 font-medium"
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          type="button"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 mr-1" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mr-1" />
          )}
          <span className="truncate">{node.name}/</span>
        </button>
        {expanded && (
          <div className="flex flex-col">
            {children.map((child) => (
              <DropdownBranchNodeRenderer
                key={child.path}
                node={child}
                branchName={branchName}
                checkoutingBranch={checkoutingBranch}
                onCheckout={onCheckout}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const branch = node.data!;
  return (
    <button
      disabled={checkoutingBranch === branch}
      onClick={() => onCheckout(branch)}
      className={`w-full text-left pr-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between disabled:opacity-60 disabled:cursor-wait
                ${branch === branchName ? "text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-900/10" : "text-slate-700 dark:text-slate-300"}
            `}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      type="button"
    >
      <span className="truncate">{node.name}</span>
      {checkoutingBranch === branch ? (
        <svg
          className="animate-spin w-3.5 h-3.5 text-indigo-500"
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
      ) : branch === branchName ? (
        <Check className="w-3.5 h-3.5" />
      ) : null}
    </button>
  );
}
