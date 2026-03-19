import { ISessionRepository } from "../repositories/ISessionRepository";

export class SessionUseCases {
  constructor(private sessionRepository: ISessionRepository) {}

  /**
   * Synchronizes the Dashboard by restoring windows from the backend session
   * and closing the main window if necessary.
   */
  async syncDashboardWindows(): Promise<void> {
    const session = await this.sessionRepository.getSessions();
    const existingWindows = await this.sessionRepository.getAllWindows();
    const existingLabels = existingWindows.map((w) => w.label);

    let shouldShowMain = false;

    // 1. Re-open windows from session
    for (const { label, path } of session) {
      if (label === "main") {
        shouldShowMain = true;
      } else if (!existingLabels.includes(label)) {
        const title = `GitVi - ${path.split(/[/\\]/).pop()}`;
        await this.sessionRepository.openProjectWindow(label, title, path);
      }
    }

    // 2. Decide whether to show or close the main Dashboard window
    const searchParams = new URLSearchParams(window.location.search);
    const isExplicit = searchParams.get("explicit") === "true";

    if (shouldShowMain || session.length === 0 || isExplicit) {
      await this.sessionRepository.registerWindow("main", "main");
      await this.sessionRepository.focusWindow("main");
    } else {
      await this.sessionRepository.closeCurrentWindow();
    }
  }

  /**
   * Registers a project window.
   */
  async registerProjectWindow(label: string, path: string): Promise<void> {
     // We only register if it's NOT the main window (to avoid race conditions)
     if (label !== 'main') {
        await this.sessionRepository.registerWindow(label, path);
     }
  }

  /**
   * Launches or focuses a project window.
   */
  async launchProject(path: string): Promise<void> {
    const label = `project-${path.replace(/[^a-zA-Z0-9]/g, "")}`;
    const existingWindows = await this.sessionRepository.getAllWindows();
    
    if (existingWindows.some(w => w.label === label)) {
      await this.sessionRepository.focusWindow(label);
    } else {
      const title = `GitVi - ${path.split(/[/\\]/).pop()}`;
      // Register it immediately so it's persisted if the app closes before the window fully mounts
      await this.sessionRepository.registerWindow(label, path);
      await this.sessionRepository.openProjectWindow(label, title, path);
    }
  }

  /**
   * Opens the Dashboard window (or focuses it if it's already open).
   */
  async openDashboard(): Promise<void> {
    const existingWindows = await this.sessionRepository.getAllWindows();
    if (existingWindows.some(w => w.label === "main")) {
      await this.sessionRepository.focusWindow("main");
    } else {
      await this.sessionRepository.openDashboardWindow();
    }
  }

  /**
   * Gets the list of folders added to the application.
   */
  async getAddedFolders(): Promise<string[]> {
    return await this.sessionRepository.getAddedFolders();
  }

  /**
   * Switches the current window to a different project.
   */
  async switchProject(label: string, newPath: string): Promise<void> {
    await this.sessionRepository.registerWindow(label, newPath);
  }
}
