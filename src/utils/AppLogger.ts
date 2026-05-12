import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type LogType = 'info' | 'error' | 'warning' | 'command';

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: LogType;
  message: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  log(type: LogType, message: string) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      type,
      message,
    };
    this.logs = [...this.logs, entry];
    this.notify();
  }

  getLogs() {
    return this.logs;
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    listener(this.logs);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.logs));
  }

  clear() {
    this.logs = [];
    this.notify();
  }
}

export const appLogger = new Logger();

function formatGitCommand(cmd: string, args?: any): string | null {
  // Ignore purely internal / non-git commands
  if (cmd.startsWith("register_window") || cmd.startsWith("unregister_window")) return null;

  let baseCmd = cmd.replace(/^(get_)?git_/, "").replace(/_/g, "-");
  
  // Ignore polling / read-only aggregated commands so they don't spam the log
  if (
    cmd === "get_initial_repo_data" ||
    cmd === "get_branches_and_remotes" ||
    cmd === "get_source_control_status" ||
    cmd === "get_git_hooks" ||
    cmd === "git_check_ahead" ||
    cmd === "git_check_behind" ||
    cmd === "git_get_pruned_branches"
  ) {
    return null;
  }

  if (!args) return `git ${baseCmd}`;

  const argParts: string[] = [];
  const skipKeys = ['path', 'limit', 'skip'];

  // Handle specific well-known commands for prettier output
  if (cmd === "git_checkout_branch" && args.branch) {
    return `git checkout ${args.branch}`;
  }
  if (cmd === "git_checkout_commit" && args.hash) {
    return `git checkout ${args.hash}`;
  }
  if (cmd === "git_commit" && args.message) {
    let extra = args.noVerify ? ' --no-verify' : '';
    return `git commit -m "${args.message}"${extra}`;
  }
  if (cmd === "git_push") return "git push";
  if (cmd === "git_pull") return "git pull";
  if (cmd === "git_fetch_prune") return "git fetch --prune";
  if (cmd === "git_stage" && args.files) {
    return `git add ${args.files.join(" ")}`;
  }
  if (cmd === "git_unstage" && args.files) {
    return `git restore --staged ${args.files.join(" ")}`;
  }

  // Generic arg formatter
  for (const [key, value] of Object.entries(args)) {
    if (skipKeys.includes(key)) continue;
    
    if (Array.isArray(value)) {
      argParts.push(`--${key} ${value.join(",")}`);
    } else if (typeof value === "boolean") {
      if (value) argParts.push(`--${key}`);
    } else if (typeof value === "string" || typeof value === "number") {
      // Don't format raw JSON if it looks like a hash or branch name, just append it
      if (key === "branch" || key === "hash" || key === "name") {
        argParts.push(`${value}`);
      } else {
        argParts.push(`--${key}="${value}"`);
      }
    }
  }

  const argStr = argParts.length > 0 ? ` ${argParts.join(" ")}` : "";
  return `git ${baseCmd}${argStr}`;
}

export async function invoke<T>(cmd: string, args?: any): Promise<T> {
  const formattedCmd = formatGitCommand(cmd, args);
  
  if (formattedCmd) {
    appLogger.log('command', formattedCmd);
  }
  
  try {
    const res = await tauriInvoke<T>(cmd, args);
    return res;
  } catch (err: any) {
    const errorMsg = err?.toString() || 'Unknown error';
    if (formattedCmd) {
      appLogger.log('error', `Error executing '${formattedCmd}': ${errorMsg}`);
    } else {
      appLogger.log('error', `Error in internal command ${cmd}: ${errorMsg}`);
    }
    throw err;
  }
}

