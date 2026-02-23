import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GitBranch, Trash2, Check, ChevronDown, ChevronRight, Search, Globe, Plus } from 'lucide-react';
import { BranchData } from '../../../domain/entities/GitEntities';
import { useGitActions } from '../../hooks/useGitActions';
import { useDialog } from '../../context/DialogContext';

interface BranchesSidebarProps {
  repoPath: string | null;
  currentBranch: string;
  onRefreshGraph: () => void;
}

export function BranchesSidebar({ repoPath, currentBranch, onRefreshGraph }: BranchesSidebarProps) {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isLocalExpanded, setIsLocalExpanded] = useState(true);
  const [isRemoteExpanded, setIsRemoteExpanded] = useState(true);
  const [isRemotesExpanded, setIsRemotesExpanded] = useState(true);
  const [remotes, setRemotes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const gitActions = useGitActions(repoPath || "");
  const { showAlert, showConfirm, showInput } = useDialog();

  useEffect(() => {
    if (repoPath) {
      loadBranches();
      loadRemotes();
    } else {
        setBranches([]);
        setRemotes([]);
    }
  }, [repoPath]);

  const loadBranches = async () => {
    setLoadingBranches(true);
    setError(null);
    try {
      const dbBranches = await gitActions.getBranchesInfo();
      dbBranches.sort((a, b) => b.date - a.date);
      setBranches(dbBranches);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleCheckoutBranch = async (branch: BranchData) => {
    try {
      if (branch.is_remote) {
        const parts = branch.name.split("/");
        const localName = parts.length > 1 ? parts.slice(1).join("/") : branch.name;
        
        showConfirm(
          "Checkout Remote Branch", 
          `Do you want to create and checkout a local tracking branch named '${localName}'?`,
          async () => {
            try {
              await gitActions.createBranch(localName, branch.hash);
              await gitActions.checkoutBranch(localName);
              showAlert("Success", `Created and checked out local branch '${localName}'.`);
              onRefreshGraph();
              loadBranches();
            } catch (err: any) {
              setError(err.toString());
            }
          }
        );
        return;
      } else {
        await gitActions.checkoutBranch(branch.name);
        showAlert("Success", `Checked out ${branch.name}.`);
      }
      
      onRefreshGraph();
      loadBranches();
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const handleDeleteBranch = async (branch: BranchData, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm(
      "Delete Branch",
      `Are you sure you want to delete branch '${branch.name}'? This cannot be undone.`,
      async () => {
        try {
          await gitActions.deleteBranch(branch.name, false);
          await loadBranches();
          onRefreshGraph();
        } catch (e: any) {
          const msg = e.toString();
          if (msg.includes("not fully merged")) {
            showConfirm(
              "Force Delete Branch",
              `Branch '${branch.name}' is not fully merged. Force-delete it anyway?`,
              async () => {
                try {
                  await gitActions.deleteBranch(branch.name, true);
                  await loadBranches();
                  onRefreshGraph();
                } catch (fe: any) {
                  setError(fe.toString());
                }
              }
            );
          } else {
            setError(msg);
          }
        }
      }
    );
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

  const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const localBranches = filteredBranches.filter(b => !b.is_remote);
  const remoteBranches = filteredBranches.filter(b => b.is_remote);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/40 shrink-0 space-y-3">
        <div className="flex items-center justify-between h-7">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                <span>BRANCHES</span>
            </span>
            {loadingBranches && <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>}
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-slate-700 dark:text-slate-300 placeholder-slate-400"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
        {error && (
            <div className="p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
                {error}
            </div>
        )}

        <div className="space-y-1">
            <div 
                className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer select-none transition-colors"
                onClick={() => setIsLocalExpanded(!isLocalExpanded)}
            >
                <div className="flex items-center space-x-1">
                    {isLocalExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>Local ({localBranches.length})</span>
                </div>
            </div>
            
            {isLocalExpanded && !loadingBranches && (
                <div className="pl-2 pr-1 py-1 space-y-0.5">
                    {localBranches.length > 0 ? localBranches.map((branch, idx) => {
                        const isActive = branch.name === currentBranch;
                        return (
                            <div 
                                key={`local-${branch.name}-${idx}`} 
                                onClick={() => !isActive && handleCheckoutBranch(branch)}
                                className={`group flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                            >
                                <div className="flex items-center space-x-2 truncate flex-1 md:max-w-[200px]">
                                    <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                    <span className={`text-sm truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-600 dark:text-slate-300'}`} title={branch.name}>
                                        {branch.name}
                                    </span>
                                </div>
                                <div className="flex space-x-1">
                                    {isActive ? (
                                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-500 mr-1" />
                                    ) : (
                                        <>
                                         <button 
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors text-slate-400"
                                            title="Checkout Branch"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteBranch(branch, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-slate-400"
                                            title="Delete Branch"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-xs text-slate-400 italic px-2 py-1">No local branches found</div>
                    )}
                </div>
            )}
        </div>

        <div className="space-y-1">
            <div 
                className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer select-none transition-colors"
                onClick={() => setIsRemoteExpanded(!isRemoteExpanded)}
            >
                <div className="flex items-center space-x-1">
                    {isRemoteExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>Remote ({remoteBranches.length})</span>
                </div>
            </div>
            
            {isRemoteExpanded && !loadingBranches && (
                <div className="pl-2 pr-1 py-1 space-y-0.5 pt-1">
                    {remoteBranches.length > 0 ? remoteBranches.map((branch, idx) => (
                        <div 
                            key={`remote-${branch.name}-${idx}`} 
                            onClick={() => handleCheckoutBranch(branch)}
                            className="group flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded cursor-pointer transition-colors"
                        >
                            <div className="flex items-center space-x-2 truncate flex-1 md:max-w-[200px]">
                                <GitBranch className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-300 truncate" title={branch.name}>
                                    {branch.name}
                                </span>
                            </div>
                            <div className="flex space-x-1">
                                    <button 
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors text-slate-400"
                                        title="Checkout Remote Branch"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteBranch(branch, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-slate-400"
                                        title="Delete Remote Branch"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                            </div>
                        </div>
                    )) : (
                        <div className="text-xs text-slate-400 italic px-2 py-1">No remote branches found</div>
                    )}
                </div>
            )}
        </div>

        <div className="space-y-1">
            <div 
                className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer select-none transition-colors"
                onClick={() => setIsRemotesExpanded(!isRemotesExpanded)}
            >
                <div className="flex items-center space-x-1">
                    {isRemotesExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>Remotes ({remotes.length})</span>
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAddRemote();
                    }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    title="Add Remote"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
            
            {isRemotesExpanded && (
                <div className="pl-2 pr-1 py-1 space-y-0.5 pt-1">
                    {remotes.length > 0 ? remotes.map((remote) => (
                        <div 
                            key={remote} 
                            className="group flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors"
                        >
                            <div className="flex items-center space-x-2 truncate flex-1 md:max-w-[200px]">
                                <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="text-sm text-slate-600 dark:text-slate-300 truncate" title={remote}>
                                    {remote}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveRemote(remote);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transaction-colors text-slate-400"
                                title="Remove Remote"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )) : (
                        <div className="text-xs text-slate-400 italic px-2 py-1">No remotes found</div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
