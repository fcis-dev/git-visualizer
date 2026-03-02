import { useState } from "react";
import { ProjectSelectionView } from "../components/ProjectSelectionView";
import { RepositoryWorkspace } from "../components/RepositoryWorkspace";
import { SettingsModal } from "../components/SettingsModal";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useDialog } from "../context/DialogContext";
import { ChevronRight, Home } from "lucide-react";

export function Dashboard() {
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Dialog context is used by sub-components but we might need it here too
  const {} = useDialog();

  const currentPath = pathHistory.length > 0 ? pathHistory[pathHistory.length - 1] : "";

  const handleBack = () => {
      setPathHistory(prev => prev.slice(0, prev.length - 1));
  };

  const handleOpenSubmodule = (absolutePath: string) => {
      setPathHistory(prev => [...prev, absolutePath]);
  };

  return (
    <div
      className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        repoPath={currentPath}
      />

      {/* Breadcrumb Header when in Submodules */}
      {pathHistory.length > 1 && (
        <div className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-sm">
            <button 
                onClick={() => setPathHistory([pathHistory[0]])}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center space-x-1"
                title="Back to root project"
            >
                <Home className="w-4 h-4" />
            </button>
            {pathHistory.map((path, idx) => {
                const isLast = idx === pathHistory.length - 1;
                const pathParts = path.replace(/\\/g, '/').split('/');
                const folderName = pathParts[pathParts.length - 1] || path;
                return (
                    <div key={idx} className="flex items-center">
                        <ChevronRight className="w-4 h-4 text-slate-500 mx-1" />
                        <button
                            onClick={() => setPathHistory(prev => prev.slice(0, idx + 1))}
                            className={`${isLast ? 'font-semibold text-slate-900 dark:text-slate-100 cursor-default' : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                            disabled={isLast}
                        >
                            {folderName}
                        </button>
                    </div>
                );
            })}
        </div>
      )}

      {/* Main Content Switcher */}
      <div className="flex-1 overflow-hidden relative">
          {!currentPath ? (
            <ProjectSelectionView 
                onSelectRepo={(path) => setPathHistory([path])} 
                onOpenSettings={() => setIsSettingsOpen(true)}
            />
          ) : (
            <ErrorBoundary>
              <RepositoryWorkspace
                key={currentPath} // Force remount on path change
                repoPath={currentPath}
                onBack={handleBack}
                onOpenSubmodule={handleOpenSubmodule}
              />
            </ErrorBoundary>
          )}
      </div>
    </div>
  );
}
