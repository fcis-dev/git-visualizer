import { useState } from "react";
import { GitBranch, ChevronDown, ChevronRight, Check } from "lucide-react";
import { buildBranchTree, sortTreeNodes, BranchTreeNode } from "../../utils/branchTreeUtils";
import { useTranslation } from "react-i18next";

export interface WorkspaceHeaderBranchSwitcherProps {
  branchName: string;
  isBranchDropdownOpen: boolean;
  setIsBranchDropdownOpen: (open: boolean) => void;
  availableBranches: string[];
  checkoutingBranch: string | null;
  onCheckoutBranch: (branch: string) => Promise<void>;
}

export function WorkspaceHeaderBranchSwitcher({
  branchName,
  isBranchDropdownOpen,
  setIsBranchDropdownOpen,
  availableBranches,
  checkoutingBranch,
  onCheckoutBranch,
}: WorkspaceHeaderBranchSwitcherProps) {
  const { t } = useTranslation();

  return (
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
