import { WindowSession } from "../entities/Session";

export interface ISessionRepository {
  /** Gets the active window sessions from the backend */
  getSessions(): Promise<WindowSession[]>;
  
  /** Registers the current window with its path */
  registerWindow(label: string, path: string): Promise<void>;
  
  /** Unregisters a window by label */
  unregisterWindow(label: string): Promise<void>;
  
  /** Gets the current window's label */
  getCurrentWindowLabel(): string;

  /** Gets all currently open windows */
  getAllWindows(): Promise<{ label: string }[]>;

  /** Opens a new project window */
  openProjectWindow(label: string, title: string, path: string): Promise<void>;

  /** Opens the main dashboard window */
  openDashboardWindow(): Promise<void>;

  /** Focuses an existing window */
  focusWindow(label: string): Promise<void>;

  /** Closes the current window */
  closeCurrentWindow(): Promise<void>;

  /** Gets the list of folders added to the application */
  getAddedFolders(): Promise<string[]>;
}
