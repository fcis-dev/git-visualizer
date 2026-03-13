import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GitBranch, Trash2, Check, ChevronDown, ChevronRight, Search, Globe, Plus, Folder, FolderOpen } from 'lucide-react';
import { BranchData } from '../../../domain/entities/GitEntities';
import { TauriGitRepository } from '../../../data/repositories/TauriGitRepository';
import { useGitActions } from '../../hooks/useGitActions';
import { useDialog } from '../../context/DialogContext';
import { buildBranchTree, sortTreeNodes, BranchTreeNode } from '../../utils/branchTreeUtils';
import { useTranslation } from "react-i18next";
import { GraphBranchContextMenu } from "../workspace/GraphBranchContextMenu";

// Module-level singleton — avoids recreating on every render
const repository = new TauriGitRepository();

interface BranchesSidebarProps {
  repoPath: string | null;
  currentBranch: string;
  onRefreshGraph: () => void;
  refreshTrigger?: Date;
}

export function BranchesSidebar({ repoPath, currentBranch, onRefreshGraph, refreshTrigger }: BranchesSidebarProps) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isLocalExpanded, setIsLocalExpanded] = useState(true);
  const [isRemoteExpanded, setIsRemoteExpanded] = useState(true);
  const [isRemotesExpanded, setIsRemotesExpanded] = useState(true);
  const [remotes, setRemotes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    branch: BranchData | null;
  }>({ visible: false, x: 0, y: 0, branch: null });

  const gitActions = useGitActions(repoPath || "");
  const { showAlert, showConfirm, showInput } = useDialog();


  useEffect(() => {
    const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener("click", closeContextMenu);
    return () => document.removeEventListener("click", closeContextMenu);
  }, []);

  useEffect(() => {
    if (repoPath) {
      loadBranchesAndRemotes();
    } else {
        setBranches([]);
        setRemotes([]);
    }
  }, [repoPath, refreshTrigger]);

  // Single aggregated call: branches (local + remote) + remotes list
  const loadBranchesAndRemotes = async () => {
    setLoadingBranches(true);
    setError(null);
    try {
      const data = await repository.getBranchesAndRemotes(repoPath!);
      data.branches.sort((a, b) => b.date - a.date);
      setBranches(data.branches);
      setRemotes(data.remotes);
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
        
        const localExists = branches.find(b => !b.is_remote && b.name === localName);
        if (localExists) {
          showConfirm(
            "Branch Exists",
            `A local branch named '${localName}' already exists. Do you want to switch to it instead?`,
            async () => {
              try {
                await gitActions.checkoutBranch(localName);
                showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successCheckedOut', { name: localName }));
                onRefreshGraph();
                loadBranchesAndRemotes();
              } catch (err: any) {
                setError(err.toString());
              }
            }
          );
          return;
        }

        showConfirm(
          "Checkout Remote Branch", 
          `Do you want to create and checkout a local tracking branch named '${localName}'?`,
          async () => {
            try {
              await gitActions.createBranch(localName, branch.hash);
              await gitActions.checkoutBranch(localName);
              showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successCreatedAndCheckedOut', { name: localName }));
              onRefreshGraph();
              loadBranchesAndRemotes();
            } catch (err: any) {
              setError(err.toString());
            }
          }
        );
        return;
      } else {
        await gitActions.checkoutBranch(branch.name);
        showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successCheckedOut', { name: branch.name }));
      }
      
      onRefreshGraph();
      loadBranchesAndRemotes();
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
          await loadBranchesAndRemotes();
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
                  await loadBranchesAndRemotes();
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

  const handleMergeBranch = async (branch: BranchData) => {
    showConfirm(
      "Merge Branch",
      `Merge '${branch.name}' into current branch '${currentBranch}'?`,
      async () => {
        try {
          await gitActions.merge(branch.name);
          showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successMerged', { name: branch.name }));
          onRefreshGraph();
          loadBranchesAndRemotes();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleRenameBranch = async (branch: BranchData) => {
    showInput(
      "Rename Branch",
      "New branch name:",
      async (newName) => {
        if (!newName || newName === branch.name) return;
        try {
          await gitActions.renameBranch(branch.name, newName);
          showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successRenamed', { name: newName }));
          onRefreshGraph();
          loadBranchesAndRemotes();
        } catch (e: any) {
          setError(e.toString());
        }
      },
      branch.name
    );
  };

  const handleCreateBranchFrom = (branch: BranchData) => {
    showInput(
      "Create Branch",
      `New branch name (from ${branch.name}):`,
      async (newName) => {
        if (!newName) return;
        try {
          await gitActions.createBranch(newName, branch.hash);
          showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successCreatedBranchFrom', { newName, name: branch.name }));
          onRefreshGraph();
          loadBranchesAndRemotes();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleCreateTagFrom = (branch: BranchData) => {
    showInput(
      "Create Tag",
      `New tag name (at ${branch.name}):`,
      async (tagName) => {
        if (!tagName) return;
        try {
          await gitActions.createTag(tagName, branch.hash);
          showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successCreatedTagAt', { tagName, name: branch.name }));
          onRefreshGraph();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleCherryPickBranch = (branch: BranchData) => {
    showConfirm(
      "Cherry Pick",
      `Cherry pick the tip commit of '${branch.name}' (${branch.hash.substring(0, 7)}) into current branch?`,
      async () => {
        try {
          await gitActions.cherryPick(branch.hash);
          showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successCherryPicked', { name: branch.name }));
          onRefreshGraph();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleRebaseOnto = (branch: BranchData) => {
    showConfirm(
      "Rebase",
      `Rebase current branch '${currentBranch}' onto '${branch.name}'?`,
      async () => {
        try {
          await gitActions.rebase(branch.name);
          showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successRebasedOnto', { name: branch.name }));
          onRefreshGraph();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleResetTo = (branch: BranchData, mode: "soft" | "mixed" | "hard") => {
    const isHard = mode === "hard";
    const msg = isHard 
        ? `Are you sure you want to HARD reset current branch to '${branch.name}'? ALL uncommitted changes will be lost.`
        : `Reset current branch to '${branch.name}' using ${mode} mode?`;
        
    showConfirm(
      `Reset to ${branch.name}`,
      msg,
      async () => {
        try {
          await gitActions.reset(branch.hash, mode);
          showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successReset', { name: branch.name, mode }));
          onRefreshGraph();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleContextMenu = (branch: BranchData, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      branch
    });
  };

  // Replace the old separate loadRemotes function — now integrated into loadBranchesAndRemotes
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
                        loadBranchesAndRemotes();
                        showAlert(t('sidebar.branches.successTitle'), t('sidebar.branches.successRemoteAdded'));
                      } catch (e: any) {
                        setError(t('sidebar.branches.errorAddRemoteFailed', { error: e.toString() }));
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
                  loadBranchesAndRemotes();
              } catch (e: any) {
                  setError(e.toString());
              }
          }
      );
  };

  if (!repoPath) {
    return <div className="p-4 text-center text-slate-600 dark:text-slate-400 text-sm">{t("sidebar.branches.noRepo")}</div>;
  }

  const filteredBranches = branches.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const localBranches = filteredBranches.filter(b => !b.is_remote);
  const remoteBranches = filteredBranches.filter(b => b.is_remote);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm shrink-0 flex flex-col space-y-3 sticky top-0 z-10">
        <div className="flex items-center justify-between h-7">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-indigo-500" />
                <span>{t("sidebar.branches.title")}</span>
            </span>
            {loadingBranches && <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>}
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <input
                type="text"
                placeholder={t("sidebar.branches.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors text-slate-700 dark:text-slate-300 placeholder-slate-500 shadow-sm"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
        {error && (
            <div className="p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
                {error}
            </div>
        )}

        <div className="space-y-1 mt-2">
            <div 
                className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5 bg-slate-100/50 dark:bg-slate-800/30 rounded-md cursor-pointer select-none transition-colors"
                onClick={() => setIsLocalExpanded(!isLocalExpanded)}
            >
                <div className="flex items-center space-x-1">
                    {isLocalExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{t("sidebar.branches.local")}</span>
                </div>
                <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600 leading-none">
                    {localBranches.length}
                </span>
            </div>
            
            {isLocalExpanded && !loadingBranches && (
                <div className="space-y-0.5">
                    {localBranches.length > 0 ? (
                        <BranchNodeRenderer 
                            node={buildBranchTree(localBranches, b => b.name)} 
                            currentBranch={currentBranch}
                            onCheckout={handleCheckoutBranch}
                            onDelete={handleDeleteBranch}
                            onContextMenu={handleContextMenu}
                        />
                    ) : (
                        <div className="text-xs text-slate-500 italic px-2 py-1">{t("sidebar.branches.noLocalBranches")}</div>
                    )}
                </div>
            )}
        </div>

        <div className="space-y-1 mt-4">
            <div 
                className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5 bg-slate-100/50 dark:bg-slate-800/30 rounded-md cursor-pointer select-none transition-colors"
                onClick={() => setIsRemoteExpanded(!isRemoteExpanded)}
            >
                <div className="flex items-center space-x-1">
                    {isRemoteExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{t("sidebar.branches.remote")}</span>
                </div>
                <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600 leading-none">
                    {remoteBranches.length}
                </span>
            </div>
            
            {isRemoteExpanded && !loadingBranches && (
                <div className="space-y-0.5 pt-1">
                    {remoteBranches.length > 0 ? (
                        <BranchNodeRenderer 
                            node={buildBranchTree(remoteBranches, b => b.name)} 
                            currentBranch={currentBranch}
                            onCheckout={handleCheckoutBranch}
                            onDelete={handleDeleteBranch}
                            onContextMenu={handleContextMenu}
                            isRemote={true}
                        />
                    ) : (
                        <div className="text-xs text-slate-500 italic px-2 py-1">{t("sidebar.branches.noRemoteBranches")}</div>
                    )}
                </div>
            )}
        </div>

        <div className="space-y-1 mt-4">
            <div 
                className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5 bg-slate-100/50 dark:bg-slate-800/30 rounded-md cursor-pointer select-none transition-colors"
                onClick={() => setIsRemotesExpanded(!isRemotesExpanded)}
            >
                <div className="flex items-center space-x-1">
                    {isRemotesExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{t("sidebar.branches.remotes")}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-600 leading-none">
                        {remotes.length}
                    </span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAddRemote();
                        }}
                        className="p-1 hover:bg-white dark:hover:bg-slate-700/50 rounded-md transition-colors text-slate-400 hover:text-indigo-500 shadow-xs"
                        title={t("sidebar.branches.addRemote")}
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            
            {isRemotesExpanded && (
                <div className="pl-2 pr-1 py-1 space-y-0.5 pt-1">
                    {remotes.length > 0 ? remotes.map((remote) => (
                        <div 
                            key={remote} 
                            className="group flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors"
                        >
                            <div className="flex items-center space-x-2 truncate flex-1 md:max-w-[200px]">
                                <Globe className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                                <span className="text-sm text-slate-600 dark:text-slate-300 truncate" title={remote}>
                                    {remote}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveRemote(remote);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transaction-colors text-slate-500"
                                title={t("sidebar.branches.removeRemote")}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )) : (
                        <div className="text-xs text-slate-500 italic px-2 py-1">{t("sidebar.branches.noRemotes")}</div>
                    )}
                </div>
            )}
        </div>
      </div>

      {contextMenu.visible && contextMenu.branch && (
        <GraphBranchContextMenu
          contextMenu={{
            visible: contextMenu.visible,
            x: contextMenu.x,
            y: contextMenu.y,
            refName: contextMenu.branch.name
          }}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
          branchName={currentBranch}
          onCheckout={(ref) => handleCheckoutBranch({ ...contextMenu.branch!, name: ref })}
          onCreateFrom={(ref) => handleCreateBranchFrom({ ...contextMenu.branch!, name: ref })}
          onCreateTag={(ref) => handleCreateTagFrom({ ...contextMenu.branch!, name: ref })}
          onMerge={(ref) => handleMergeBranch({ ...contextMenu.branch!, name: ref })}
          onRebase={(ref) => handleRebaseOnto({ ...contextMenu.branch!, name: ref })}
          onCherryPick={(ref) => handleCherryPickBranch({ ...contextMenu.branch!, name: ref })}
          onRevert={(ref) => { /* Sub-branches context menu doesn't need revert yet, or we hook it up if needed */ }}
          onReset={(ref, mode) => handleResetTo({ ...contextMenu.branch!, name: ref }, mode)}
          onDelete={(ref) => handleDeleteBranch({ ...contextMenu.branch!, name: ref }, { stopPropagation: () => {} } as any)}
        />
      )}
    </div>
  );
}

function BranchNodeRenderer({
    node,
    currentBranch,
    onCheckout,
    onDelete,
    onContextMenu,
    isRemote = false,
    level = 0
}: {
    node: BranchTreeNode<BranchData>;
    currentBranch: string;
    onCheckout: (b: BranchData) => void;
    onDelete: (b: BranchData, e: React.MouseEvent) => void;
    onContextMenu: (b: BranchData, e: React.MouseEvent) => void;
    isRemote?: boolean;
    level?: number;
}) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false); // Default collapsed
    
    const children = sortTreeNodes(node);
    const isFolder = !node.isLeaf && children.length > 0;
    
    if (node.name === "root") {
        return (
            <div className="space-y-0.5">
                {children.map(child => (
                    <BranchNodeRenderer 
                        key={child.path} 
                        node={child} 
                        currentBranch={currentBranch}
                        onCheckout={onCheckout}
                        onDelete={onDelete}
                        onContextMenu={onContextMenu}
                        isRemote={isRemote}
                        level={level} 
                    />
                ))}
            </div>
        );
    }

    if (isFolder) {
        return (
            <div className="flex flex-col mb-0.5">
                <div 
                    onClick={() => setExpanded(!expanded)}
                    className="group flex items-center space-x-1.5 py-1.5 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-md cursor-pointer select-none transition-colors"
                    style={{ paddingLeft: `${level * 12 + 2}px` }}
                >
                    <div className="flex items-center justify-center w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
                        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </div>
                    {expanded ? (
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-500 shrink-0" />
                    ) : (
                        <Folder className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-500 shrink-0" />
                    )}
                    <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate" title={node.path}>
                        {node.name}
                    </span>
                </div>
                {expanded && (
                    <div className="flex flex-col space-y-0.5 pt-0.5">
                        {children.map(child => (
                            <BranchNodeRenderer 
                                key={child.path} 
                                node={child} 
                                currentBranch={currentBranch}
                                onCheckout={onCheckout}
                                onDelete={onDelete}
                                onContextMenu={onContextMenu}
                                isRemote={isRemote}
                                level={level + 1} 
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const branch = node.data!;
    const isActive = branch.name === currentBranch && !isRemote;

    return (
        <div 
            onClick={() => !isActive && onCheckout(branch)}
            onContextMenu={(e) => onContextMenu(branch, e)}
            className={`group flex items-center justify-between py-1.5 pr-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded cursor-pointer transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
            style={{ paddingLeft: `${level * 12 + (node.isLeaf && level === 0 ? 8 : 22)}px` }}
        >
            <div className="flex items-center space-x-2 truncate flex-1 md:max-w-[200px]">
                {isActive && <div className="absolute left-0 w-0.5 h-4 bg-indigo-500 rounded-r"></div>}
                <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`} />
                <span className={`text-sm truncate ${isActive ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-600 dark:text-slate-300'}`} title={branch.name}>
                    {node.name}
                </span>
            </div>
            <div className="flex space-x-1 pl-2">
                {isActive ? (
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-500 mr-1" />
                ) : (
                    <>
                     <button 
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors text-slate-500"
                        title={isRemote ? t("sidebar.branches.checkoutRemoteBranch") : t("sidebar.branches.checkoutBranch")}
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => onDelete(branch, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-slate-500"
                        title={isRemote ? t("sidebar.branches.deleteRemoteBranch") : t("sidebar.branches.deleteBranch")}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    </>
                )}
            </div>
        </div>
    );
}
