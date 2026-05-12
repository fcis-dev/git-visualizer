import { FolderGit2, GitBranch, Tag, FolderTree, LifeBuoy, Archive, Box } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WorkspaceActivityBarProps {
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: any) => void;
  isLeftSidebarVisible: boolean;
  setIsLeftSidebarVisible: (visible: boolean) => void;
  isWorktree: boolean;
  worktreeCount: number;
}

export function WorkspaceActivityBar({
  activeSidebarTab,
  setActiveSidebarTab,
  isLeftSidebarVisible,
  setIsLeftSidebarVisible,
  isWorktree,
  worktreeCount,
}: WorkspaceActivityBarProps) {
  const { t } = useTranslation();

  const handleTabClick = (tab: string) => {
    setActiveSidebarTab(tab);
    setIsLeftSidebarVisible(true);
  };

  return (
    <div className="w-14 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center py-4 z-20 space-y-4">
      <div className="flex-1 w-full flex flex-col items-center space-y-4">


        <button
          onClick={() => handleTabClick("branches")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "branches"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
              : "text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title={t("workspace.activityBar.branches")}
        >
          <GitBranch className="w-6 h-6 stroke-[1.5]" />
          {activeSidebarTab === "branches" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full -ml-[9px]"></div>
          )}
        </button>

        <button
          onClick={() => handleTabClick("tags")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "tags"
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm"
              : "text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title={t("workspace.activityBar.tags")}
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
            onClick={() => handleTabClick("worktrees")}
            className={`p-3 rounded-xl transition-all relative ${
              activeSidebarTab === "worktrees"
                ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
                : "text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={worktreeCount > 0 ? t("workspace.activityBar.worktreesWithCount", { count: worktreeCount }) : t("workspace.activityBar.worktrees")}
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
          onClick={() => handleTabClick("stashes")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "stashes"
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm"
              : "text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title={t("stashes.title")}
        >
          <Archive className="w-6 h-6 stroke-[1.5]" />
          {activeSidebarTab === "stashes" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-500 rounded-r-full -ml-[9px]"></div>
          )}
        </button>

        <button
          onClick={() => handleTabClick("submodules")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "submodules"
              ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 shadow-sm"
              : "text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
          title={t("sidebar.sourceControl.submodules")}
        >
          <Box className="w-6 h-6 stroke-[1.5]" />
          {activeSidebarTab === "submodules" && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 dark:bg-blue-500 rounded-r-full -ml-[9px]"></div>
          )}
        </button>

        <button
          onClick={() => handleTabClick("rescue")}
          className={`p-3 rounded-xl transition-all relative ${
            activeSidebarTab === "rescue"
              ? "text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm"
              : "text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
          }`}
          title={t("workspace.activityBar.rescue")}
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
