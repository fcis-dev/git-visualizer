import { SessionUseCases } from "../../domain/usecases/SessionUseCases";
import { TauriSessionRepository } from "../../data/repositories/TauriSessionRepository";

export function useSessionController() {
  const repository = new TauriSessionRepository();
  const useCases = new SessionUseCases(repository);

  const registerCurrentWindow = async (path: string) => {
    const label = repository.getCurrentWindowLabel();
    await useCases.registerProjectWindow(label, path);
  };

  const isMainWindow = () => {
    return repository.getCurrentWindowLabel() === "main";
  };

  const openDashboard = async () => {
    await useCases.openDashboard();
  };

  const getAddedFolders = async () => {
    return await useCases.getAddedFolders();
  };

  const removeProject = async (path: string) => {
    await useCases.removeFolder(path);
  };

  const switchProject = async (path: string) => {
    const label = repository.getCurrentWindowLabel();
    await useCases.switchProject(label, path);
    // Use pushState to update URL without reload
    window.history.pushState(null, '', `?project=${encodeURIComponent(path)}`);
    // Notify App.tsx to update its state
    window.dispatchEvent(new CustomEvent('project-change'));
  };

  const launchProject = async (path: string, replaceCurrentWindow: boolean = false) => {
    await useCases.launchProject(path, replaceCurrentWindow);
  };

  const openLocalProject = async (replaceCurrentWindow: boolean = false, openAfterAdd: boolean = true) => {
    try {
      const formattedPath = await useCases.selectLocalFolder();

      if (formattedPath) {
        await useCases.addFolder(formattedPath);
        
        if (openAfterAdd) {
          if (replaceCurrentWindow) {
            await switchProject(formattedPath);
          } else {
            await useCases.launchProject(formattedPath, false);
          }
        }
      }
    } catch (error) {
      console.error("Failed to open local project", error);
    }
  };

  const closeCurrentProject = async () => {
    const windows = await useCases.getAllWindows();
    if (windows.length > 1) {
      await useCases.closeCurrentWindow();
    } else {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new CustomEvent('project-change'));
    }
  };

  return {
    registerCurrentWindow,
    launchProject,
    openLocalProject,
    isMainWindow,
    openDashboard,
    getAddedFolders,
    removeProject,
    switchProject,
    closeCurrentProject,
  };
}
