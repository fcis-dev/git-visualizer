import { FolderGit2, GitBranch, Tag, FolderTree, LifeBuoy } from "lucide-react";

interface WorkspaceActivityBarProps {
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: any) => void;
  isWorktree: boolean;
  worktreeCount: number;
}

export function WorkspaceActivityBar({
  activeSidebarTab,
  setActiveSidebarTab,
  isWorktree,
  worktreeCount,
}: WorkspaceActivityBarProps) {
  return (
    <div className="w-14 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center py-4 z-20 space-y-4">
      <div className="flex-1 w-full flex flex-col items-center space-y-4">
        <button
          onClick={() => setActiveSidebarTab("changes")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "changes"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
              : "text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title="Changes"
        >
          <FolderGit2 className="w-6 h-6 stroke-[1.5]" />
          {activeSidebarTab === "changes" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full -ml-[9px]"></div>
          )}
        </button>

        <button
          onClick={() => setActiveSidebarTab("branches")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "branches"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
              : "text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title="Branches"
        >
          <GitBranch className="w-6 h-6 stroke-[1.5]" />
          {activeSidebarTab === "branches" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full -ml-[9px]"></div>
          )}
        </button>

        <button
          onClick={() => setActiveSidebarTab("tags")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "tags"
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm"
              : "text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title="Tags"
        >
          <Tag className="w-6 h-6 stroke-[1.5]" />
          {activeSidebarTab === "tags" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-600 dark:bg-emerald-500 rounded-r-full -ml-[9px]"></div>
          )}
        </button>
      </div>

      <div className="w-full flex flex-col items-center pb-2 space-y-4">
        {!isWorktree && (
          <button
            onClick={() => setActiveSidebarTab("worktrees")}
            className={`p-3 rounded-xl transition-all relative ${
              activeSidebarTab === "worktrees"
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
                : "text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={worktreeCount > 0 ? `Manage Worktrees (${worktreeCount})` : "Manage Worktrees"}
          >
            <FolderTree className="w-6 h-6 stroke-[1.5]" />
            {activeSidebarTab === "worktrees" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full -ml-[9px]"></div>
            )}
            {worktreeCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.2rem] text-[9px] font-bold rounded-full bg-indigo-500 text-white leading-none shadow-sm text-center">
                {worktreeCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveSidebarTab("rescue")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "rescue"
              ? "text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm"
              : "text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
          }`}
          title="Rescue (Reflog)"
        >
          <LifeBuoy className="w-6 h-6 stroke-[1.5]" />
          {activeSidebarTab === "rescue" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-amber-500 rounded-r-full -ml-[9px]"></div>
          )}
        </button>
      </div>
    </div>
  );
}
