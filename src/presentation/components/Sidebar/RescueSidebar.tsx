import { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, GitBranch, Undo2, ChevronDown, ChevronUp } from 'lucide-react';
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

  const handleQuickUndo = () => {
    const entry = entries.find(e => e.index.includes("HEAD@{1}"));
    if (!entry) return;
    showConfirm(
      t('rescueSidebar.quickUndoTitle'),
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
            <RefreshCcw className="w-4 h-4 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-500">{t('rescueSidebar.title')}</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative">
        {/* Info Banner */}
        <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-400 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/20 blur-2xl rounded-full pointer-events-none" />
            <div className="font-bold flex items-center mb-2 drop-shadow-sm text-sm">
                <AlertTriangle className="w-4 h-4 mr-1.5" /> {t('rescueSidebar.reflog')}
            </div>
            <div className="opacity-90 leading-relaxed">
                {t('rescueSidebar.reflogDesc')}
            </div>
        </div>

        {/* Quick Undo Banner */}
        {!loading && entries.some(e => e.index.includes("HEAD@{1}")) && (
          <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-4 shadow-sm flex flex-col space-y-3">
             <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300">
               <Undo2 className="w-5 h-5" />
               <span className="font-bold text-sm">{t('rescueSidebar.quickUndoTitle')}</span>
             </div>
             <p className="text-xs text-indigo-600 dark:text-indigo-400">
               {t('rescueSidebar.quickUndoDesc')}
             </p>
             <button
                onClick={handleQuickUndo}
                className="w-full flex justify-center items-center space-x-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
             >
                <Undo2 className="w-4 h-4" />
                <span>{t('rescueSidebar.quickUndoAction')}</span>
             </button>
          </div>
        )}

        {/* Time Machine Timeline */}
        {loading ? (
             <div className="p-4 flex justify-center">
                 <RefreshCcw className="w-4 h-4 animate-spin text-slate-400" />
             </div>
        ) : entries.length === 0 && !error ? (
             <div className="p-4 text-center text-xs text-slate-500">
               {t('rescueSidebar.noEntries')}
             </div>
        ) : (
            <div className="relative pl-3 pt-2">
              {/* Vertical line connecting nodes */}
              <div className="absolute left-[17px] top-4 bottom-4 w-[2px] bg-slate-200 dark:bg-slate-800" />
              
              <div className="space-y-6">
                {entries.map((entry, idx) => (
                  <ReflogNode 
                     key={`${entry.hash}-${idx}`} 
                     entry={entry} 
                     idx={idx}
                     onSelect={() => onSelect?.(entry.hash)}
                     onRescue={(e: React.MouseEvent) => handleRescueBranch(entry, e)}
                     onRestore={(e: React.MouseEvent) => { e.stopPropagation(); handleRestore(entry); }}
                     translateAction={translateAction}
                     translateMessage={translateMessage}
                     t={t}
                  />
                ))}
              </div>
            </div>
        )}
      </div>
    </div>
  );
}

function ReflogNode({ entry, idx, onSelect, onRescue, onRestore, translateAction, translateMessage, t }: any) {
  const [expanded, setExpanded] = useState(idx === 0);
  const isHead = entry.index.includes("HEAD@{0}");

  const getRelativeTime = (timestamp: number) => {
    if (!timestamp) return "";
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const diffMs = (timestamp * 1000) - Date.now();
    const diffDays = Math.round(diffMs / 86400000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffMinutes = Math.round(diffMs / 60000);
 
    if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, 'minute');
    if (Math.abs(diffHours) < 24) return rtf.format(diffHours, 'hour');
    return rtf.format(diffDays, 'day');
  };

  return (
    <div className="relative flex flex-col group">
       {/* Node circle */}
       <div className={`absolute -left-[5px] mt-2.5 w-3.5 h-3.5 rounded-full border-[3px] border-white dark:border-slate-950 z-10 transition-colors ${isHead ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-amber-400'}`} />
       
       <div 
          className={`ml-6 bg-white dark:bg-slate-900 border rounded-xl overflow-hidden transition-all duration-200 ${expanded ? 'border-amber-200 dark:border-amber-900/50 shadow-md ring-1 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm cursor-pointer'}`}
          onClick={() => { if (!expanded) { setExpanded(true); onSelect?.(); } }}
       >
          {/* Header */}
          <div className={`p-3 flex items-center justify-between ${expanded ? 'bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800' : ''}`}>
             <div className="flex items-center space-x-2 flex-1 pr-2 min-w-0 overflow-hidden">
                <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isHead ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {entry.index}
                </span>
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                  {getRelativeTime(entry.timestamp)}
                </span>
                <span className="font-mono text-[10px] text-slate-500 shrink-0 hidden md:inline">
                  {entry.hash.substring(0, 7)}
                </span>
                {!expanded && (
                   <div className="text-xs text-slate-600 dark:text-slate-300 truncate pl-2 border-l border-slate-200 dark:border-slate-700 flex-1 min-w-0">
                      <span className="font-medium mr-1">{translateAction(entry.action)}</span>
                      <span className="opacity-80">{translateMessage(entry.message)}</span>
                   </div>
                )}
             </div>
             
             <button 
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors shrink-0"
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
             >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
             </button>
          </div>

          {/* Expanded Content */}
          {expanded && (
             <div className="p-3 bg-white dark:bg-slate-900 flex flex-col space-y-3 overflow-hidden">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed break-words">
                   <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] rounded mr-2 uppercase tracking-wide font-bold">
                     {translateAction(entry.action)}
                   </span>
                   <span className="font-mono text-xs text-slate-400 mr-2">{entry.hash.substring(0, 7)}</span>
                   {translateMessage(entry.message)}
                </div>

                {/* Big Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                   <button
                     onClick={onRescue}
                     className="flex justify-center items-center space-x-2 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-500/20 font-medium text-xs shadow-sm"
                     title={t('rescueSidebar.rescueTooltip')}
                   >
                     <GitBranch className="w-3.5 h-3.5" />
                     <span>{t('rescueSidebar.rescueBranchButton', 'Rescue Branch')}</span>
                   </button>
                   
                   <button
                     onClick={onRestore}
                     className="flex justify-center items-center space-x-2 py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg transition-colors border border-red-200 dark:border-red-500/20 font-medium text-xs shadow-sm"
                     title={t('rescueSidebar.hardResetTooltip')}
                   >
                     <RefreshCcw className="w-3.5 h-3.5" />
                     <span>{t('rescueSidebar.hardResetButton', 'Force Reset')}</span>
                   </button>
                </div>
             </div>
          )}
       </div>
    </div>
  );
}

