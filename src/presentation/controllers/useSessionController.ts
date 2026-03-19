import { SessionUseCases } from "../../domain/usecases/SessionUseCases";
import { TauriSessionRepository } from "../../data/repositories/TauriSessionRepository";

export function useSessionController() {
  const repository = new TauriSessionRepository();
  const useCases = new SessionUseCases(repository);

  const syncDashboardWindows = async () => {
    await useCases.syncDashboardWindows();
  };

  const registerCurrentWindow = async (path: string) => {
    const label = repository.getCurrentWindowLabel();
    await useCases.registerProjectWindow(label, path);
  };

  const launchProject = async (path: string) => {
    await useCases.launchProject(path);
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
    window.location.search = `?project=${encodeURIComponent(path)}`;
  };

  return {
    syncDashboardWindows,
    registerCurrentWindow,
    launchProject,
    isMainWindow,
    openDashboard,
    getAddedFolders,
    switchProject,
  };
}
