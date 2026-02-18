import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RefreshCw, Play, Check, X, ArrowUp, ArrowDown, Archive, ArchiveRestore, Globe, Plus, Trash2 } from 'lucide-react';
import { useDialog } from '../../context/DialogContext';

interface FileStatus {
  path: string;
  status: string; // "modified", "staged", "new", "deleted"
}

interface SourceControlProps {
  repoPath: string | null;
  onSelectFile: (file: string) => void;
}

export function SourceControl({ repoPath, onSelectFile }: SourceControlProps) {
  const [stagedFiles, setStagedFiles] = useState<FileStatus[]>([]);
  const [changes, setChanges] = useState<FileStatus[]>([]);
  const [conflictedFiles, setConflictedFiles] = useState<FileStatus[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pushPullLoading, setPushPullLoading] = useState(false);
  const [stashLoading, setStashLoading] = useState(false);
  const [remotes, setRemotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { showInput, showAlert, showConfirm } = useDialog();

  useEffect(() => {
    if (repoPath) {
      loadStatus();
      loadRemotes();
    } else {
        setStagedFiles([]);
        setChanges([]);
        setConflictedFiles([]);
        setRemotes([]);
    }
  }, [repoPath]);

  const loadStatus = async () => {
    if (!repoPath) return;
    setLoading(true);
    try {
      const statuses = await invoke<FileStatus[]>('get_git_status', { path: repoPath });
      
      const staged: FileStatus[] = [];
      const changed: FileStatus[] = [];
      const conflicted: FileStatus[] = [];

      statuses.forEach(s => {
        if (s.status === 'staged') {
          staged.push(s);
        } else if (s.status === 'conflicted') {
          conflicted.push(s);
        } else {
          changed.push(s);
        }
      });

      setStagedFiles(staged);
      setChanges(changed);
      setConflictedFiles(conflicted);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load status", err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleStage = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!repoPath) return;
    try {
      await invoke('git_stage', { path: repoPath, files: [file] });
      loadStatus();
    } catch (err) {
      console.error("Failed to stage", err);
    }
  };

  const handleUnstage = async (file: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!repoPath) return;
    try {
      await invoke('git_unstage', { path: repoPath, files: [file] });
      loadStatus();
    } catch (err) {
      console.error("Failed to unstage", err);
    }
  };

  const handleResolveConflict = async (file: string, strategy: 'ours' | 'theirs', e: React.MouseEvent) => {
      e.stopPropagation();
      if (!repoPath) return;
      try {
          await invoke('git_resolve_conflict', { path: repoPath, file, strategy });
          loadStatus();
      } catch (err: any) {
          console.error("Failed to resolve conflict", err);
          setError("Resolve failed: " + err.toString());
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
        showAlert("Push Successful", "Changes pushed to remote successfully.");
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
        showAlert("Pull Successful", "Changes pulled from remote successfully.");
    } catch (err: any) {
        console.error("Failed to pull", err);
        setError("Pull failed: " + err.toString());
    } finally {
        setPushPullLoading(false);
    }
  };

  const handleStashSave = () => {
    if (!repoPath) return;
    showInput(
        "Stash Changes", 
        "Stash message (optional):", 
        async (msg) => {
            setStashLoading(true);
            try {
                await invoke('git_stash_save', { path: repoPath, message: msg || null });
                loadStatus();
            } catch (err: any) {
                console.error("Failed to stash", err);
                setError(err.toString());
            } finally {
                setStashLoading(false);
            }
        }
    );
  };

  const handleStashPop = async () => {
    if (!repoPath) return;
    setStashLoading(true);
    try {
        await invoke('git_stash_pop', { path: repoPath });
        loadStatus();
    } catch (err: any) {
        console.error("Failed to pop stash", err);
        setError(err.toString());
    } finally {
        setStashLoading(false);
    }
  };

  const loadRemotes = async () => {
      if (!repoPath) return;
      try {
          const remoteList = await invoke<string[]>('git_remote_list', { path: repoPath });
          setRemotes(remoteList);
      } catch (e) {
          console.error("Failed to load remotes", e);
      }
  };

  const handleAddRemote = () => {
      if (!repoPath) return;
      showInput(
          "Add Remote",
          "Remote Name:",
          (name) => {
              if (!name) return;
              showInput(
                  "Add Remote",
                  "Remote URL:",
                  async (url) => {
                      if (!url) return;
                      try {
                        await invoke('git_remote_add', { path: repoPath, name, url });
                        loadRemotes();
                        showAlert("Success", "Remote added successfully.");
                      } catch (e: any) {
                        setError("Add remote failed: " + e.toString());
                      }
                  }
              );
          }
      );
  };

  const handleRemoveRemote = (remoteLine: string) => {
      if (!repoPath) return;
      const name = remoteLine.split(/\s+/)[0]; // "origin https://..." -> "origin"
      showConfirm(
          "Remove Remote",
          `Are you sure you want to remove remote '${name}'?`,
          async () => {
              try {
                  await invoke('git_remote_remove', { path: repoPath, name });
                  loadRemotes();
              } catch (e: any) {
                  setError(e.toString());
              }
          }
      );
  };

  if (!repoPath) {
    return <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-sm">No repository open.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">SOURCE CONTROL</span>
        <div className="flex space-x-1">
             <button 
                onClick={loadStatus} 
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                disabled={loading}
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {error && (
            <div className="p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
                {error}
            </div>
        )}

        {/* Sync Actions */}
        <div className="flex space-x-2">
            <button
                onClick={handlePull}
                disabled={pushPullLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-1.5 rounded text-xs transition-colors"
            >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Pull</span>
            </button>
            <button
                onClick={handlePush}
                disabled={pushPullLoading}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-1.5 rounded text-xs transition-colors"
            >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Push</span>
            </button>
        </div>

        {/* Stash Actions */}
        <div className="flex space-x-2">
            <button
                onClick={handleStashSave}
                disabled={stashLoading}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-1.5 rounded text-xs transition-colors"
                title="Stash Changes"
            >
                <Archive className="w-3.5 h-3.5" />
                <span>Stash</span>
            </button>
            <button
                onClick={handleStashPop}
                disabled={stashLoading}
                className="flex-1 flex items-center justify-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-1.5 rounded text-xs transition-colors"
                title="Pop Stash"
            >
                <ArchiveRestore className="w-3.5 h-3.5" />
                <span>Pop</span>
            </button>
        </div>

        {/* Conflicted Files */}
        {conflictedFiles.length > 0 && (
            <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-red-500 uppercase px-1">
                    <span>Conflicted</span>
                    <span className="bg-red-100 dark:bg-red-900/30 px-1.5 rounded-full text-red-600 dark:text-red-300">{conflictedFiles.length}</span>
                </div>
                {conflictedFiles.map(file => (
                    <div 
                        key={file.path} 
                        className="group flex flex-col p-1.5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                        <div 
                            className="flex items-center justify-between cursor-pointer mb-1"
                            onClick={() => onSelectFile(file.path)}
                        >
                            <span className="text-sm text-red-600 dark:text-red-300 truncate font-medium" title={file.path}>
                                {file.path}
                            </span>
                        </div>
                        <div className="flex space-x-1">
                            <button 
                                onClick={(e) => handleResolveConflict(file.path, 'ours', e)}
                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs py-1 px-2 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-slate-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                title="Accept Current (Ours)"
                            >
                                Accept Current
                            </button>
                            <button 
                                onClick={(e) => handleResolveConflict(file.path, 'theirs', e)}
                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs py-1 px-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Accept Incoming (Theirs)"
                            >
                                Accept Incoming
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Commit Input */}
        <div className="space-y-2">

            <textarea 
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Message (Ctrl+Enter to commit)"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500/50 min-h-[80px]"
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
                <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded-full text-slate-700 dark:text-slate-300">{stagedFiles.length}</span>
            </div>
            {stagedFiles.map(file => (
                <div 
                    key={file.path} 
                    className="group flex items-center justify-between p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded cursor-pointer"
                    onClick={() => onSelectFile(file.path)}
                >
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate flex-1" title={file.path}>
                        {file.path}
                    </span>
                    <button 
                        onClick={(e) => handleUnstage(file.path, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-slate-900 dark:hover:text-white"
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
                <span className="bg-slate-200 dark:bg-slate-800 px-1.5 rounded-full text-slate-700 dark:text-slate-300">{changes.length}</span>
            </div>
            {changes.map(file => (
                <div 
                    key={file.path} 
                    className="group flex items-center justify-between p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded cursor-pointer"
                    onClick={() => onSelectFile(file.path)}
                >
                    <span className={`text-sm truncate flex-1 ${
                        file.status === 'deleted' ? 'text-red-500 dark:text-red-400 line-through' : 
                        file.status === 'new' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                    }`} title={file.path}>
                        {file.path}
                    </span>
                    <button 
                        onClick={(e) => handleStage(file.path, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-slate-900 dark:hover:text-white"
                        title="Stage changes"
                    >
                        <Play className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>

        {/* Remotes */}
        <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1">
                <span>Remotes</span>
                <button 
                    onClick={handleAddRemote}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    title="Add Remote"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
            {remotes.map(remote => (
                <div 
                    key={remote} 
                    className="group flex items-center justify-between p-1 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded"
                >
                    <div className="flex items-center space-x-2 truncate flex-1 md:max-w-[200px]">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm text-slate-600 dark:text-slate-300 truncate" title={remote}>
                            {remote}
                        </span>
                    </div>
                    <button 
                        onClick={() => handleRemoveRemote(remote)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transaction-colors"
                        title="Remove Remote"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
             {remotes.length === 0 && (
                <div className="text-xs text-slate-400 italic px-2">No remotes</div>
            )}
        </div>

      </div>
    </div>
  );
}
