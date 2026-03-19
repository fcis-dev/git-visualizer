import { useEffect } from "react";
import { ThemeProvider } from "./presentation/context/ThemeContext";
import { DialogProvider } from "./presentation/context/DialogContext";
import { Dashboard } from "./presentation/pages/Dashboard";
import { RepositoryWorkspace } from "./presentation/components/RepositoryWorkspace";
import { useSessionController } from "./presentation/controllers/useSessionController";

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const projectPath = searchParams.get('project');
  const controller = useSessionController();

  useEffect(() => {
    if (projectPath) {
      controller.registerCurrentWindow(projectPath);
    }
  }, [projectPath]);

  return (
    <ThemeProvider>
      <DialogProvider>
        {projectPath ? (
           <RepositoryWorkspace 
              repoPath={projectPath} 
              onBack={() => {}}
              onOpenSubmodule={controller.launchProject}
           />
        ) : (
           <Dashboard />
        )}
      </DialogProvider>
    </ThemeProvider>
  );
}

export default App;
