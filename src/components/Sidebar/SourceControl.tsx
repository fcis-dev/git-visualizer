import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RefreshCw, Play, Check, X, ArrowUp, ArrowDown } from 'lucide-react';

interface FileStatus {
  path: string;
  status: string; // "modified", "staged", "new", "deleted"
}

interface SourceControlProps {
  repoPath: string | null;
}

export function SourceControl({ repoPath }: SourceControlProps) {
  const [stagedFiles, setStagedFiles] = useState<FileStatus[]>([]);
  const [changes, setChanges] = useState<FileStatus[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pushPullLoading, setPushPullLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (repoPath) {
      loadStatus();
    } else {
        setStagedFiles([]);
        setChanges([]);
    }
  }, [repoPath]);

  const loadStatus = async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const statuses = await invoke<FileStatus[]>('get_git_status', { path: repoPath });
      
      const staged: FileStatus[] = [];
      const changed: FileStatus[] = [];

      statuses.forEach(s => {
        if (s.status === 'staged') {
          staged.push(s);
        } else {
          changed.push(s);
        }
      });

      setStagedFiles(staged);
      setChanges(changed);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load status", err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleStage = async (file: string) => {
    if (!repoPath) return;
    try {
      await invoke('git_stage', { path: repoPath, files: [file] });
      loadStatus();
    } catch (err) {
      console.error("Failed to stage", err);
    }
  };

  const handleUnstage = async (file: string) => {
    if (!repoPath) return;
    try {
      await invoke('git_unstage', { path: repoPath, files: [file] });
      loadStatus();
    } catch (err) {
      console.error("Failed to unstage", err);
    }
  };

  const handleCommit = async () => {
    if (!repoPath || !commitMessage) return;
    try {
      await invoke('git_commit', { path: repoPath, message: commitMessage });
      setCommitMessage("");
      loadStatus();
    } catch (err: any) {
      console.error("Failed to commit", err);
      setError(err.toString());
    }
  };

  const handlePush = async () => {
    if (!repoPath) return;
    setPushPullLoading(true);
    try {
        await invoke('git_push', { path: repoPath });
        setError(null);
        alert("Push successful");
    } catch (err: any) {
        console.error("Failed to push", err);
        setError("Push failed: " + err.toString());
    } finally {
        setPushPullLoading(false);
    }
  };

  const handlePull = async () => {
    if (!repoPath) return;
    setPushPullLoading(true);
    try {
        await invoke('git_pull', { path: repoPath });
        setError(null);
        loadStatus(); // Reload status after pull
        alert("Pull successful");
    } catch (err: any) {
        console.error("Failed to pull", err);
        setError("Pull failed: " + err.toString());
    } finally {
        setPushPullLoading(false);
    }
  };

  if (!repoPath) {
    return <div className="p-4 text-center text-slate-500 text-sm">No repository open.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/40">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">SOURCE CONTROL</span>
        <div className="flex space-x-1">
             <button 
                onClick={loadStatus} 
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                disabled={loading}
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {error && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded break-words">
                {error}
            </div>
        )}

        {/* Sync Actions */}
        <div className="flex space-x-2">
            <button
                onClick={handlePull}
                disabled={pushPullLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded text-xs transition-colors"
            >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Pull</span>
            </button>
            <button
                onClick={handlePush}
                disabled={pushPullLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded text-xs transition-colors"
            >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Push</span>
            </button>
        </div>

        {/* Commit Input */}
        <div className="space-y-2">
            <textarea 
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Message (Ctrl+Enter to commit)"
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 min-h-[80px]"
                onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                        handleCommit();
                    }
                }}
            />
            <button 
                onClick={handleCommit}
                disabled={!commitMessage || stagedFiles.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-1.5 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
                <Check className="w-4 h-4" />
                Commit
            </button>
        </div>

        {/* Staged Changes */}
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1">
                <span>Staged Changes</span>
                <span className="bg-slate-800 px-1.5 rounded-full">{stagedFiles.length}</span>
            </div>
            {stagedFiles.map(file => (
                <div key={file.path} className="group flex items-center justify-between p-1 hover:bg-slate-800/50 rounded">
                    <span className="text-sm text-slate-300 truncate flex-1" title={file.path}>
                        {file.path}
                    </span>
                    <button 
                        onClick={() => handleUnstage(file.path)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-white"
                        title="Unstage changes"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>

        {/* Changes */}
        <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1">
                <span>Changes</span>
                <span className="bg-slate-800 px-1.5 rounded-full">{changes.length}</span>
            </div>
            {changes.map(file => (
                <div key={file.path} className="group flex items-center justify-between p-1 hover:bg-slate-800/50 rounded">
                    <span className={`text-sm truncate flex-1 ${
                        file.status === 'deleted' ? 'text-red-400 line-through' : 
                        file.status === 'new' ? 'text-green-400' : 'text-amber-400'
                    }`} title={file.path}>
                        {file.path}
                    </span>
                    <button 
                        onClick={() => handleStage(file.path)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-white"
                        title="Stage changes"
                    >
                        <Play className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}
