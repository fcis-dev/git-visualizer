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

  const switchProject = async (path: string) => {
    const label = repository.getCurrentWindowLabel();
    await useCases.switchProject(label, path);
    // Use pushState to update URL without reload
    window.history.pushState(null, '', `?project=${encodeURIComponent(path)}`);
    // Notify App.tsx to update its state
    window.dispatchEvent(new CustomEvent('project-change'));
  };

  const launchProject = async (path: string) => {
    await useCases.launchProject(path);
  };


  return {
    registerCurrentWindow,
    launchProject,
    isMainWindow,
    openDashboard,
    getAddedFolders,
    switchProject,
  };
}
