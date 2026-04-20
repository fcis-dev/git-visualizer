import { useEffect, useState } from "react";
import { FolderOpen, ExternalLink, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSessionController } from "../../controllers/useSessionController";
import { truncatePath } from "../../utils/pathUtils";

interface ProjectsSidebarProps {
  repoPath: string;
}

export function ProjectsSidebar({ repoPath }: ProjectsSidebarProps) {
  const { t } = useTranslation();
  const controller = useSessionController();
  const [addedProjects, setAddedProjects] = useState<string[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const list = await controller.getAddedFolders();
    setAddedProjects(list);
  };

  const handleOpenProject = async () => {
    await controller.openLocalProject(false, false);
    loadProjects();
  };

  const handleSwitchProject = async (path: string) => {
    if (path === repoPath) return; // Ya estamos en este proyecto
    await controller.switchProject(path);
  };

  const handleRemoveProject = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await controller.removeProject(path);
    loadProjects();
  };

  const handleLaunchProject = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await controller.launchProject(path);
  };
  
  const handleCloseProject = () => {
    controller.closeCurrentProject();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/40">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider">
          {t("workspace.projects.title")}
        </h2>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto px-2 pt-3 pb-2 space-y-1 custom-scrollbar">
        {addedProjects.length > 0 ? (
          addedProjects.map((path) => {
            const name = path.split(/[/\\]/).pop() || path;
            const isActive = path === repoPath;

            return (
              <div
                key={path}
                onClick={() => handleSwitchProject(path)}
                className={`group flex flex-col px-3 py-2 rounded-md transition-colors cursor-pointer border border-transparent ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20"
                    : "hover:bg-slate-200/50 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between min-w-0">
                  <span
                    className={`text-sm font-medium truncate pr-2 ${
                      isActive
                        ? "text-indigo-700 dark:text-indigo-400"
                        : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                    }`}
                  >
                    {name}
                  </span>

                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!isActive && (
                      <>
                        <button
                          onClick={(e) => handleLaunchProject(path, e)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                          title={t("workspace.header.openNewWindow")}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleRemoveProject(path, e)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                          title={t("workspace.header.removeProject")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] truncate w-full mt-0.5 transition-colors ${
                  isActive ? "text-indigo-400/70" : "text-slate-400 dark:text-slate-500"
                }`} title={path}>
                  {truncatePath(path, 40)}
                </span>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center px-4">
             <p className="text-xs text-slate-500">{t("dashboard.projects.empty")}</p>
          </div>
        )}
      </div>

      <div className="p-3 shrink-0 flex flex-col gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <button
          onClick={handleOpenProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          <FolderOpen className="w-4 h-4 shrink-0" />
          {t("dashboard.addProject")}
        </button>
        <button
          onClick={handleCloseProject}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/20 text-slate-600 dark:text-slate-300 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          <X className="w-4 h-4 shrink-0" />
          {t("workspace.projects.closeProject")}
        </button>
      </div>
    </div>
  );
}
