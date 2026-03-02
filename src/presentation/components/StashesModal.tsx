import { useState, useEffect } from 'react';
import { Archive, Trash2, X, Download, Play } from 'lucide-react';
import { StashEntry } from '../../domain/entities/GitEntities';
import { useGitActions } from '../hooks/useGitActions';
import { useDialog } from '../context/DialogContext';
import { createPortal } from 'react-dom';

interface StashesModalProps {
  repoPath: string;
  onClose: () => void;
  onRefreshGraph: () => void;
}

export function StashesModal({ repoPath, onClose, onRefreshGraph }: StashesModalProps) {
  const [stashes, setStashes] = useState<StashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const gitActions = useGitActions(repoPath, onRefreshGraph);
  const { showConfirm, showAlert } = useDialog();

  const loadStashes = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await gitActions.getStashes();
      setStashes(result);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStashes();
  }, [repoPath]);

  const handleApply = (index: string) => {
    showConfirm(
      "Apply Stash",
      `Are you sure you want to apply ${index}? This will merge the stashed changes into your working directory without dropping the stash.`,
      async () => {
        try {
          await gitActions.applyStash(index);
          showAlert("Stash Applied", `${index} has been applied to your working directory.`);
          onClose();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handlePop = (index: string) => {
    showConfirm(
      "Pop Stash",
      `Are you sure you want to pop ${index}? This will apply the stash and then permanently delete it from the stash list.`,
      async () => {
        try {
          // If picking a specific index we use apply + drop
          await gitActions.applyStash(index);
          await gitActions.dropStash(index);
          showAlert("Stash Popped", `${index} has been applied and dropped.`);
          onClose();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleDrop = (index: string) => {
    showConfirm(
      "Drop Stash",
      `Are you sure you want to permanently delete ${index}? This action cannot be undone.`,
      async () => {
        try {
          await gitActions.dropStash(index);
          loadStashes(); // Reload list
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Archive className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Stash Manager
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-transparent p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-500/20">
              <strong className="block font-bold mb-1">Error</strong>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : stashes.length === 0 ? (
            <div className="text-center py-12 text-slate-600 dark:text-slate-300">
              <Archive className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p>No stashes found in this repository.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stashes.map((stash) => (
                <div 
                  key={stash.index}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                        {stash.index}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {stash.hash.substring(0, 7)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {stash.message}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleApply(stash.index)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-md transition-colors"
                      title="Apply stash (keep in list)"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePop(stash.index)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded-md transition-colors"
                      title="Pop stash (apply and drop)"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDrop(stash.index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-md transition-colors"
                      title="Drop stash (delete permanently)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
