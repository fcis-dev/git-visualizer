import { ISessionRepository } from "../repositories/ISessionRepository";

export class SessionUseCases {
  constructor(private sessionRepository: ISessionRepository) {}


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
  async launchProject(path: string, replaceCurrentWindow: boolean = false): Promise<void> {
    const sessions = await this.sessionRepository.getSessions();
    const existingSession = sessions.find(s => s.path === path);
    const existingWindows = await this.sessionRepository.getAllWindows();
    
    if (existingSession && existingWindows.some(w => w.label === existingSession.label)) {
      await this.sessionRepository.focusWindow(existingSession.label);
    } else {
      let label = `project-${path.replace(/[^a-zA-Z0-9]/g, "")}`;
      if (existingWindows.some(w => w.label === label)) {
        label = `${label}-${Date.now()}`;
      }
      const title = `GitVi - ${path.split(/[/\\]/).pop()}`;
      // Register it immediately so it's persisted if the app closes before the window fully mounts
      await this.sessionRepository.registerWindow(label, path);
      await this.sessionRepository.openProjectWindow(label, title, path);
    }

    if (replaceCurrentWindow && this.sessionRepository.getCurrentWindowLabel() === "main") {
      await this.sessionRepository.closeCurrentWindow();
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

  /**
   * Prompts the user to select a local folder.
   */
  async selectLocalFolder(): Promise<string | null> {
    return await this.sessionRepository.selectLocalFolder();
  }

  /**
   * Adds a folder to the application's list of projects.
   */
  async addFolder(path: string): Promise<string[]> {
    return await this.sessionRepository.addFolder(path);
  }

  /**
   * Removes a folder from the application's list of projects.
   */
  async removeFolder(path: string): Promise<string[]> {
    return await this.sessionRepository.removeFolder(path);
  }

  /**
   * Gets all currently open windows.
   */
  async getAllWindows(): Promise<{ label: string }[]> {
    return await this.sessionRepository.getAllWindows();
  }

  /**
   * Closes the current window.
   */
  async closeCurrentWindow(): Promise<void> {
    await this.sessionRepository.closeCurrentWindow();
  }
}
