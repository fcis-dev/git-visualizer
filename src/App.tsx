import { useEffect, useState } from "react";
import { ThemeProvider } from "./presentation/context/ThemeContext";
import { DialogProvider } from "./presentation/context/DialogContext";
import { EmptyWorkspace } from "./presentation/components/EmptyWorkspace";
import { RepositoryWorkspace } from "./presentation/components/RepositoryWorkspace";
import { useSessionController } from "./presentation/controllers/useSessionController";
import { AnimatePresence, motion } from "framer-motion";

function App() {
  const [projectPath, setProjectPath] = useState<string | null>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('project');
  });

  const controller = useSessionController();

  useEffect(() => {
    const handleLocationChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      setProjectPath(searchParams.get('project'));
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('project-change' as any, handleLocationChange);
    
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('project-change' as any, handleLocationChange);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    if (projectPath) {
      controller.registerCurrentWindow(projectPath);
    }
  }, [projectPath]);

  const handleBack = () => {
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new CustomEvent('project-change'));
  };

  return (
    <ThemeProvider>
      <DialogProvider>
        <div className="h-dvh w-full overflow-hidden bg-white dark:bg-slate-950">
          <AnimatePresence mode="wait">
            {projectPath ? (
              <motion.div
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full"
              >
                <RepositoryWorkspace 
                    repoPath={projectPath} 
                    onBack={handleBack}
                    onOpenSubmodule={controller.launchProject}
                />
              </motion.div>
            ) : (

              <motion.div
                key="empty-workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full"
              >
                <EmptyWorkspace />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogProvider>
    </ThemeProvider>
  );
}

export default App;

