import React, { useEffect, useState } from 'react';
import { X, FolderOpen, ExternalLink, Trash2, GripHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSessionController } from '../controllers/useSessionController';
import { truncatePath } from '../utils/pathUtils';
import { motion, useDragControls } from 'framer-motion';

interface ProjectsModalProps {
  repoPath: string;
  onClose: () => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({ repoPath, onClose }) => {
  const { t } = useTranslation();
  const controller = useSessionController();
  const [addedProjects, setAddedProjects] = useState<string[]>([]);
  const dragControls = useDragControls();

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
    await controller.launchProject(path);
    onClose();
  };

  const handleRemoveProject = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await controller.removeProject(path);
    loadProjects();
  };

  const handleLaunchProject = async (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await controller.launchProject(path);
    onClose();
  };
  
  const handleCloseProject = () => {
    controller.closeCurrentProject();
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200">
        <motion.div 
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800"
        >
            {/* Header */}
            <div 
                className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 cursor-move select-none group/header"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <div className="flex items-center gap-3">
                    <GripHorizontal className="w-5 h-5 text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                        <FolderOpen className="w-5 h-5 text-indigo-500" />
                        <span>{t("workspace.projects.title")}</span>
                    </h2>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-2">
                    {addedProjects.length > 0 ? (
                    addedProjects.map((path) => {
                        const name = path.split(/[/\\]/).pop() || path;
                        const isActive = path === repoPath;

                        return (
                        <div
                            key={path}
                            onClick={() => handleSwitchProject(path)}
                            className={`group flex flex-col px-4 py-3 rounded-lg transition-colors cursor-pointer border border-transparent ${
                            isActive
                                ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                        >
                            <div className="flex items-center justify-between min-w-0">
                            <span
                                className={`text-base font-medium truncate pr-2 ${
                                isActive
                                    ? "text-indigo-700 dark:text-indigo-400"
                                    : "text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100"
                                }`}
                            >
                                {name}
                            </span>

                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                {!isActive && (
                                <>
                                    <button
                                    onClick={(e) => handleLaunchProject(path, e)}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                    title={t("workspace.header.openNewWindow")}
                                    >
                                    <ExternalLink className="w-4 h-4" />
                                    </button>
                                    <button
                                    onClick={(e) => handleRemoveProject(path, e)}
                                    className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                                    title={t("workspace.header.removeProject")}
                                    >
                                    <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                                )}
                            </div>
                            </div>
                            <span className={`text-xs truncate w-full mt-1 transition-colors ${
                            isActive ? "text-indigo-400/70" : "text-slate-400 dark:text-slate-500"
                            }`} title={path}>
                            {truncatePath(path, 60)}
                            </span>
                        </div>
                        );
                    })
                    ) : (
                    <div className="py-12 text-center px-4">
                        <p className="text-sm text-slate-500">{t("dashboard.projects.empty")}</p>
                    </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
                <button
                onClick={handleCloseProject}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/20 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                <X className="w-4 h-4 shrink-0" />
                {t("workspace.projects.closeProject")}
                </button>
                <button
                onClick={handleOpenProject}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                <FolderOpen className="w-4 h-4 shrink-0" />
                {t("dashboard.addProject")}
                </button>
            </div>
        </motion.div>
    </div>
  );
};
