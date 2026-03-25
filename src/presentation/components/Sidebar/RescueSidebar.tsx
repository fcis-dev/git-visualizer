import { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, GitBranch } from 'lucide-react';
import { ReflogEntry } from '../../../domain/entities/GitEntities';
import { useGitActions } from '../../hooks/useGitActions';
import { useDialog } from '../../context/DialogContext';
import { useTranslation } from 'react-i18next';

interface RescueSidebarProps {
  repoPath: string | null;
  onRestore: () => void;
  onSelect?: (hash: string) => void;
}

export function RescueSidebar({ repoPath, onRestore, onSelect }: RescueSidebarProps) {
  const [entries, setEntries] = useState<ReflogEntry[]>([]);
  const [loading, setLoading] = useState(!!repoPath);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const gitActions = useGitActions(repoPath || "");
  const { showConfirm, showAlert, showInput } = useDialog();

  useEffect(() => {
    if (repoPath) {
        loadReflog();
    } else {
        setEntries([]);
        setLoading(false);
    }
  }, [repoPath]);

  const loadReflog = async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const logs = await gitActions.getReflog();
      setEntries(logs);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (entry: ReflogEntry) => {
    showConfirm(
      t('rescueSidebar.restoreStateTitle'),
      t('rescueSidebar.restoreStateConfirm', { hash: entry.hash, index: entry.index }),
      async () => {
        try {
          await gitActions.reset(entry.hash, "hard");
          onRestore();
          loadReflog();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleRescueBranch = (entry: ReflogEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    showInput(
      t('rescueSidebar.rescueBranchTitle'),
      t('rescueSidebar.rescueBranchPrompt', { hash: entry.hash }),
      async (branchName) => {
        if (!branchName) return;
        try {
          await gitActions.createBranch(branchName, entry.hash);
          showConfirm(
            t('rescueSidebar.branchCreatedTitle'),
            t('rescueSidebar.branchCreatedConfirm', { branchName, hash: entry.hash }),
            async () => {
                await gitActions.checkoutBranch(branchName);
                onRestore(); // trigger graph refresh
            }
          );
        } catch (err: any) {
          setError(err.toString());
        }
      }
    );
  };

  const translateAction = (action: string) => {
    // Handle complex actions like "rebase (onto master)"
    if (action.includes("(onto ")) {
      const match = action.match(/(.+) \(onto (.+)\)/);
      if (match) {
        const baseAction = match[1].toLowerCase().replace(/[^a-z0-9]/g, "");
        const target = match[2];
        return t("reflogActions.rebaseOnto", { target });
      }
    }

    const normalized = action.toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `reflogActions.${normalized}`;
    const translated = t(key);
    return translated !== key ? translated : action;
  };

  const translateMessage = (message: string) => {
    if (!message) return "";

    // moving from refs/heads/master to master
    if (message.includes("moving from")) {
      const match = message.match(/moving from (.+) to (.+)/);
      if (match) {
        let from = match[1].replace("refs/heads/", "");
        let to = match[2].replace("refs/heads/", "");
        return t("reflogActions.movingFrom", { from, to });
      }
    }

    if (message.startsWith("Deleted branch ")) {
      return t("reflogActions.branchDeleted", {
        name: message.replace("Deleted branch ", ""),
      });
    }
    if (message.startsWith("Deleted refs/heads/")) {
      return t("reflogActions.branchDeleted", {
        name: message.replace("Deleted refs/heads/", ""),
      });
    }
    if (message.startsWith("Created from ")) {
      return t("reflogActions.branchCreated", {
        name: "",
        from: message.replace("Created from ", ""),
      });
    }
    if (message.includes("clone: from ")) {
       return message.replace("clone: from ", t("reflogActions.created") + ": ");
    }

    return message;
  };

  if (!repoPath) {
    return <div className="p-4 text-center text-slate-600 dark:text-slate-400 text-sm">{t('rescueSidebar.noRepo')}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm shrink-0 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-indigo-500" />
            <span>{t('rescueSidebar.title')}</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {error && (
            <div className="p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
                {error}
            </div>
        )}

        <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-400 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/20 blur-2xl rounded-full pointer-events-none" />
            <div className="font-bold flex items-center mb-1 drop-shadow-sm">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {t('rescueSidebar.reflog')}
            </div>
            <div className="opacity-90 leading-relaxed">
                {t('rescueSidebar.reflogDesc')}
            </div>
        </div>

        {loading ? null : entries.length === 0 && !error ? (
             <div className="p-4 text-center text-xs text-slate-500">
               {t('rescueSidebar.noEntries')}
             </div>
        ) : (
            <div className="space-y-1">
              {entries.map((entry, idx) => (
                <div 
                    key={`${entry.hash}-${idx}`} 
                    className="group flex flex-col p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50 cursor-pointer"
                    onClick={() => onSelect?.(entry.hash)}
                >
                  <div className="flex items-center justify-between space-x-2 text-sm mb-1">
                     <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                       {entry.index}
                     </span>
                     <span className="font-mono text-xs text-slate-500 flex-1">
                       {entry.hash.substring(0, 7)}
                     </span>
                     <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-all">
                       <button
                         onClick={(e) => handleRescueBranch(entry, e)}
                         className="shrink-0 text-[10px] px-2 py-1 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 font-medium rounded flex items-center space-x-1 border border-green-200 dark:border-green-500/20"
                         title={t('rescueSidebar.rescueTooltip')}
                       >
                         <GitBranch className="w-3 h-3" />
                         <span>{t('rescueSidebar.rescue')}</span>
                       </button>
                       <button
                         onClick={(e) => { e.stopPropagation(); handleRestore(entry); }}
                         className="shrink-0 text-[10px] px-2 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-medium rounded flex items-center space-x-1 border border-red-200 dark:border-red-500/20"
                         title={t('rescueSidebar.hardResetTooltip')}
                       >
                         <RefreshCcw className="w-3 h-3" />
                       </button>
                     </div>
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2">
                     <span className="text-slate-500 border-r border-slate-300 dark:border-slate-700 pr-1 mr-1">{translateAction(entry.action)}</span>
                     {translateMessage(entry.message)}
                  </span>
                </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
