import { FolderOpen, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSessionController } from "../controllers/useSessionController";
import { useState, useEffect } from "react";
import { ProjectSettingsModal } from "./workspace/ProjectSettingsModal";
import { Trash2 } from "lucide-react";
import { truncatePath } from "../utils/pathUtils";

export function EmptyWorkspace() {
  const { t } = useTranslation();
  const controller = useSessionController();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [addedProjects, setAddedProjects] = useState<string[]>([]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const list = await controller.getAddedFolders();
    setAddedProjects(list);
  };

  const handleOpenProject = async () => {
    // We pass true to indicate it should load in the current empty window
    await controller.openLocalProject(true, true);
    loadProjects();
  };

  const handleOpenRecent = async (path: string) => {
    await controller.switchProject(path);
  };

  const handleRemoveProject = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await controller.removeProject(path);
    loadProjects();
  };

  return (
    <div 
      className="flex-1 w-full flex flex-col h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-hidden font-sans relative"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top right settings button */}
      <div className="absolute top-4 right-4 z-50 animate-in fade-in duration-300">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={t("workspace.header.settings", "Settings")}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300 relative z-10">
        <div className="w-20 h-20 mb-8 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shadow-inner border border-indigo-100 dark:border-indigo-500/20">
          <FolderOpen className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
        </div>
        
        <h1 className="text-3xl font-bold mb-3 tracking-tight text-slate-900 dark:text-white">
          Git Visualizer
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-sm text-center leading-relaxed">
          {t("dashboard.getStarted", "Open a Git repository to start visualizing your commits and managing your branches.")}
        </p>

        <button
          onClick={handleOpenProject}
          className="group relative flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-10 transition-opacity" />
          <FolderOpen className="w-5 h-5" />
          <span className="font-medium text-sm">{t("dashboard.addProject", "Open Folder")}</span>
        </button>

        {addedProjects.length > 0 && (
          <div className="mt-12 w-full max-w-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                {t("dashboard.projects.title", "Recent Projects")}
              </h2>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {addedProjects.map((path) => {
                const name = path.split(/[/\\]/).pop() || path;
                return (
                  <div
                    key={path}
                    onClick={() => handleOpenRecent(path)}
                    className="group flex items-center justify-between px-4 py-3 hover:bg-white dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800/50 last:border-0 transition-colors"
                  >
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {name}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate" title={path}>
                        {truncatePath(path, 70)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleRemoveProject(path, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      title={t("dashboard.removeFolder", "Remove")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Decorative background elements */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-linear-to-t from-slate-100/50 dark:from-slate-900/50 to-transparent pointer-events-none" />

      {isSettingsOpen && (
        <ProjectSettingsModal
          repoPath={null}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
