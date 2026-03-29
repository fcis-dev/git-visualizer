import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { ISessionRepository } from "../../domain/repositories/ISessionRepository";
import { WindowSession } from "../../domain/entities/Session";

export class TauriSessionRepository implements ISessionRepository {
  async getSessions(): Promise<WindowSession[]> {
    return await invoke<WindowSession[]>("get_session");
  }

  async registerWindow(label: string, path: string): Promise<void> {
    await invoke("register_window", { label, path });
  }

  async unregisterWindow(label: string): Promise<void> {
    await invoke("unregister_window", { label });
  }

  getCurrentWindowLabel(): string {
    return getCurrentWindow().label;
  }

  async getAllWindows(): Promise<{ label: string }[]> {
    return await WebviewWindow.getAll();
  }

  async openProjectWindow(label: string, title: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const win = new WebviewWindow(label, {
        title,
        url: `index.html?project=${encodeURIComponent(path)}`,
        width: 1024,
        height: 768,
      });
      win.once('tauri://created', () => resolve());
      win.once('tauri://error', (e) => reject(new Error(e.payload as string)));
    });
  }

  async openDashboardWindow(): Promise<void> {
    return new Promise((resolve, reject) => {
      const win = new WebviewWindow("main", {
        title: "GitVi",
        url: "index.html?explicit=true",
        width: 800,
        height: 600,
      });
      win.once('tauri://created', () => resolve());
      win.once('tauri://error', (e) => reject(new Error(e.payload as string)));
    });
  }

  async focusWindow(label: string): Promise<void> {
    const current = getCurrentWindow();
    let win: any = null;
    if (current.label === label) {
      win = current;
    } else {
      win = await WebviewWindow.getByLabel(label);
    }
    
    if (win) {
      await win.unminimize();
      await win.show();
      await win.setFocus();
    } else {
      console.warn(`Window with label ${label} not found to focus.`);
    }
  }

  async closeCurrentWindow(): Promise<void> {
    const win = getCurrentWindow();
    await win.close();
  }

  async getAddedFolders(): Promise<string[]> {
    return await invoke<string[]>("list_folders");
  }

  async selectLocalFolder(): Promise<string | null> {
    const selected = await open({
      directory: true,
      multiple: false,
    });

    if (selected && typeof selected === "string") {
      // Correctly format path for different OS
      return selected.replace(/\\/g, "/");
    }
    return null;
  }

  async addFolder(path: string): Promise<string[]> {
    return await invoke<string[]>("add_folder", { path });
  }

  async removeFolder(path: string): Promise<string[]> {
    return await invoke<string[]>("remove_folder", { path });
  }
}
