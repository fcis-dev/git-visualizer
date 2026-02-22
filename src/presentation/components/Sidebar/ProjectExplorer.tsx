import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Folder, FolderPlus, Trash2 } from 'lucide-react';

interface RepoData {
  path: string;
  name: string;
  branch: string;
}

interface ProjectExplorerProps {
  onSelectRepo: (path: string) => void;
  activeRepoPath: string | null;
  onClearActiveRepo: () => void;
}

export function ProjectExplorer({ onSelectRepo, activeRepoPath, onClearActiveRepo }: ProjectExplorerProps) {
  const [repos, setRepos] = useState<Record<string, RepoData[]>>({});
  
  // Flatten repos for display
  const allRepos = Object.values(repos).flat().sort((a, b) => a.name.localeCompare(b.name));
  const emptyFolders = Object.keys(repos).filter(folder => repos[folder].length === 0);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    try {
      const loadedFolders = await invoke<string[]>('list_folders');
      
      // Load repos for each folder
      loadedFolders.forEach(folder => loadReposForFolder(folder));
    } catch (error) {
      console.error("Failed to load folders", error);
    }
  };

  const loadReposForFolder = async (folder: string) => {
    try {
      const folderRepos = await invoke<RepoData[]>('get_repos_in_folder', { path: folder });
      setRepos(prev => ({ ...prev, [folder]: folderRepos }));
    } catch (error) {
      console.error(`Failed to load repos for ${folder}`, error);
    }
  };

  const handleAddFolder = async () => {
    try {
        const selected = await open({
            directory: true,
            multiple: false,
        });
        
        if (selected && typeof selected === 'string') {
            await invoke<string[]>('add_folder', { path: selected });
            loadReposForFolder(selected.replace(/\\/g, '/')); // Trigger scan immediately
        }
    } catch (error) {
        console.error("Failed to add folder", error);
    }
  };

  const handleRemoveRepo = async (repoPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Find which folder contains this repo
    const parentFolder = Object.keys(repos).find(folder => 
        repos[folder].some(r => r.path === repoPath)
    );

    if (!parentFolder) return;

    try {
        await invoke<string[]>('remove_folder', { path: parentFolder });
        
        // If the active repo is inside the removed folder, clear it
        if (activeRepoPath && activeRepoPath.startsWith(parentFolder)) {
            onClearActiveRepo();
        }

        // Cleanup repos
        const newRepos = { ...repos };
        delete newRepos[parentFolder];
        setRepos(newRepos);
    } catch (error) {
        console.error("Failed to remove folder", error);
    }
  };

  const handleRemoveFolderDirect = async (folder: string) => {
    try {
        await invoke<string[]>('remove_folder', { path: folder });
        
        // If the active repo is inside the removed folder, clear it
        if (activeRepoPath && activeRepoPath.startsWith(folder)) {
            onClearActiveRepo();
        }

        const newRepos = { ...repos };
        delete newRepos[folder];
        setRepos(newRepos);
    } catch (error) {
        console.error("Failed to remove folder", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">PROJECTS</span>
        <button 
            onClick={handleAddFolder}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
            title="Add Project Folder"
        >
            <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {allRepos.length === 0 && emptyFolders.length === 0 && (
            <div className="text-center p-4 text-slate-500 text-sm">
                No projects found.<br/>Click + to add a folder containing projects.
            </div>
        )}

        {allRepos.map(repo => (
            <div 
                key={repo.path}
                className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors group ${
                    activeRepoPath === repo.path 
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                onClick={() => onSelectRepo(repo.path)}
                title={repo.path}
            >
                <Folder className={`w-4 h-4 ${activeRepoPath === repo.path ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{repo.name}</span>
                        {repo.branch && (
                             <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                activeRepoPath === repo.path 
                                    ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300' 
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                             }`}>
                                {repo.branch}
                             </span>
                        )}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-600 truncate">{repo.path}</div>
                </div>
                
                <button 
                    onClick={(e) => handleRemoveRepo(repo.path, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 text-slate-400 dark:text-slate-500 rounded transition-all"
                    title="Remove Project"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        ))}

        {emptyFolders.map(folder => {
            const folderName = folder.split('/').pop() || folder;
            return (
                <div 
                    key={folder}
                    className="flex items-center space-x-2 p-2 rounded transition-colors group text-slate-400 dark:text-slate-500"
                    title={`${folder} (No repos found)`}
                >
                    <Folder className="w-4 h-4 opacity-50" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between opacity-70">
                            <span className="text-sm font-medium truncate italic">{folderName}</span>
                        </div>
                        <div className="text-[10px] truncate">{folder}</div>
                    </div>
                    
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFolderDirect(folder);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 text-slate-400 dark:text-slate-500 rounded transition-all"
                        title="Remove Folder"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            );
        })}
      </div>
    </div>
  );
}
