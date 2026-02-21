import { useState, useEffect } from 'react';
import { X, RefreshCcw, AlertTriangle } from 'lucide-react';
import { ReflogEntry } from '../../domain/entities/GitEntities';
import { useGitActions } from '../hooks/useGitActions';
import { useDialog } from '../context/DialogContext';

interface ReflogModalProps {
  repoPath: string;
  onClose: () => void;
  onRestore: () => void; // Usually loadCommits to refresh graph
}

export function ReflogModal({ repoPath, onClose, onRestore }: ReflogModalProps) {
  const [entries, setEntries] = useState<ReflogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gitActions = useGitActions(repoPath);
  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    loadReflog();
  }, [repoPath]);

  const loadReflog = async () => {
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
          onClose();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <RefreshCcw className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Rescue Center (Git Reflog)
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0">
          {error && (
            <div className="m-4 flex items-center space-x-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded text-sm mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
             <div className="flex justify-center p-8">
               <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
             </div>
          ) : entries.length === 0 && !error ? (
             <div className="p-8 text-center text-slate-500">
               No reflog entries found.
             </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((entry, idx) => (
                <div key={`${entry.hash}-${idx}`} className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col min-w-0 flex-1 mr-4">
                     <div className="flex items-center space-x-2 text-sm mb-1">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                          {entry.index}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          {entry.hash.substring(0, 7)}
                        </span>
                     </div>
                     <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                        {entry.action}: {entry.message}
                     </span>
                  </div>
                  <div>
                    <button
                      onClick={() => handleRestore(entry)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 text-xs px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-medium rounded transition-all flex items-center space-x-1"
                      title="Hard Reset to this state"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
