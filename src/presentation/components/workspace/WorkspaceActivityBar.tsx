import { FolderGit2, GitBranch, Tag, FolderTree, LifeBuoy, Archive, Box } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WorkspaceActivityBarProps {
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: any) => void;
  isWorktree: boolean;
  worktreeCount: number;
}

interface ActivityBarButtonProps {
  id: string;
  activeId: string;
  onClick: (id: string) => void;
  icon: React.ElementType;
  title: string;
  theme: "indigo" | "emerald" | "blue" | "amber";
  hoverMode?: "default" | "brand";
  badgeCount?: number;
}

const THEME_CONFIG = {
  indigo: {
    active: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm",
    brandHover: "hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800",
    indicator: "bg-indigo-600 dark:bg-indigo-500",
    badge: "bg-indigo-500 text-white",
  },
  emerald: {
    active: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 shadow-sm",
    brandHover: "hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800",
    indicator: "bg-emerald-600 dark:bg-emerald-500",
    badge: "bg-emerald-500 text-white",
  },
  blue: {
    active: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 shadow-sm",
    brandHover: "hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800",
    indicator: "bg-blue-600 dark:bg-blue-500",
    badge: "bg-blue-500 text-white",
  },
  amber: {
    active: "text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm",
    brandHover: "hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10",
    indicator: "bg-amber-500",
    badge: "bg-amber-500 text-white",
  },
};

function ActivityBarButton({
  id,
  activeId,
  onClick,
  icon: Icon,
  title,
  theme,
  hoverMode = "default",
  badgeCount,
}: ActivityBarButtonProps) {
  const isActive = activeId === id;
  const config = THEME_CONFIG[theme];

  const defaultHover = "hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800";
  const hoverClass = hoverMode === "brand" ? config.brandHover : defaultHover;

  return (
    <button
      onClick={() => onClick(id)}
      className={`p-3 rounded-xl transition-all relative ${
        isActive ? config.active : `text-slate-500 ${hoverClass}`
      }`}
      title={title}
    >
      <Icon className="w-6 h-6 stroke-[1.5]" />
      {isActive && (
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 ${config.indicator} rounded-r-full -ml-[9px]`}></div>
      )}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[1.2rem] text-[9px] font-bold rounded-full ${config.badge} leading-none shadow-sm text-center`}>
          {badgeCount}
        </span>
      )}
    </button>
  );
}

export function WorkspaceActivityBar({
  activeSidebarTab,
  setActiveSidebarTab,
  isWorktree,
  worktreeCount,
}: WorkspaceActivityBarProps) {
  const { t } = useTranslation();
  return (
    <div className="w-14 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col items-center py-4 z-20 space-y-4">
      <div className="flex-1 w-full flex flex-col items-center space-y-4">
        <ActivityBarButton
          id="changes"
          activeId={activeSidebarTab}
          onClick={setActiveSidebarTab}
          icon={FolderGit2}
          title={t("workspace.activityBar.changes")}
          theme="indigo"
          hoverMode="default"
        />

        <ActivityBarButton
          id="branches"
          activeId={activeSidebarTab}
          onClick={setActiveSidebarTab}
          icon={GitBranch}
          title={t("workspace.activityBar.branches")}
          theme="indigo"
          hoverMode="default"
        />

        <ActivityBarButton
          id="tags"
          activeId={activeSidebarTab}
          onClick={setActiveSidebarTab}
          icon={Tag}
          title={t("workspace.activityBar.tags")}
          theme="emerald"
          hoverMode="default"
        />
      </div>

      <div className="w-full flex flex-col items-center pb-2 space-y-4">
        {!isWorktree && (
          <ActivityBarButton
            id="worktrees"
            activeId={activeSidebarTab}
            onClick={setActiveSidebarTab}
            icon={FolderTree}
            title={worktreeCount > 0 ? t("workspace.activityBar.worktreesWithCount", { count: worktreeCount }) : t("workspace.activityBar.worktrees")}
            theme="indigo"
            hoverMode="brand"
            badgeCount={worktreeCount}
          />
        )}

        <ActivityBarButton
          id="stashes"
          activeId={activeSidebarTab}
          onClick={setActiveSidebarTab}
          icon={Archive}
          title={t("stashes.title")}
          theme="indigo"
          hoverMode="brand"
        />

        <ActivityBarButton
          id="submodules"
          activeId={activeSidebarTab}
          onClick={setActiveSidebarTab}
          icon={Box}
          title={t("sidebar.sourceControl.submodules")}
          theme="blue"
          hoverMode="brand"
        />

        <ActivityBarButton
          id="rescue"
          activeId={activeSidebarTab}
          onClick={setActiveSidebarTab}
          icon={LifeBuoy}
          title={t("workspace.activityBar.rescue")}
          theme="amber"
          hoverMode="brand"
        />
      </div>
    </div>
  );
}
