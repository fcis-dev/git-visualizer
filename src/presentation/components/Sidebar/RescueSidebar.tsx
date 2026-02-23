import { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import { ReflogEntry } from '../../../domain/entities/GitEntities';
import { useGitActions } from '../../hooks/useGitActions';
import { useDialog } from '../../context/DialogContext';

interface RescueSidebarProps {
  repoPath: string | null;
  onRestore: () => void;
}

export function RescueSidebar({ repoPath, onRestore }: RescueSidebarProps) {
  const [entries, setEntries] = useState<ReflogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gitActions = useGitActions(repoPath || "");
  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    if (repoPath) {
        loadReflog();
    } else {
        setEntries([]);
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
      "Restore State (Hard Reset)",
      `Are you sure you want to FORCE RESTORE the repository to ${entry.hash} (${entry.index})?\n\nThis will trigger a HARD RESET. Any uncommitted changes will be permanently lost!`,
      async () => {
        try {
          await gitActions.reset(entry.hash, "hard");
          showAlert("State Restored", `The repository has been successfully reverted to ${entry.hash}.`);
          onRestore();
          loadReflog();
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center space-x-2">
            <span>RESCUE CENTER</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {error && (
            <div className="p-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
                {error}
            </div>
        )}

        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded p-2 text-xs text-amber-800 dark:text-amber-400">
            <div className="font-bold flex items-center mb-1">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Reflog
            </div>
            Reflog records every change made to the local HEAD. You can forcefully reset to any previous state, but beware that uncommitted changes will be lost.
        </div>

        {loading ? (
             <div className="flex justify-center p-8">
               <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
             </div>
        ) : entries.length === 0 && !error ? (
             <div className="p-4 text-center text-xs text-slate-500">
               No reflog entries found.
             </div>
        ) : (
            <div className="space-y-1">
              {entries.map((entry, idx) => (
                <div 
                    key={`${entry.hash}-${idx}`} 
                    className="group flex flex-col p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50"
                >
                  <div className="flex items-center justify-between space-x-2 text-sm mb-1">
                     <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                       {entry.index}
                     </span>
                     <span className="font-mono text-xs text-slate-500 flex-1">
                       {entry.hash.substring(0, 7)}
                     </span>
                     <button
                       onClick={() => handleRestore(entry)}
                       className="opacity-0 group-hover:opacity-100 shrink-0 text-[10px] px-2 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-medium rounded transition-all flex items-center space-x-1 border border-red-200 dark:border-red-500/20"
                       title="Hard Reset to this state"
                     >
                       <RefreshCcw className="w-3 h-3" />
                       <span>Restore</span>
                     </button>
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-2">
                     <span className="text-slate-400 border-r border-slate-300 dark:border-slate-700 pr-1 mr-1">{entry.action}</span>
                     {entry.message}
                  </span>
                </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
