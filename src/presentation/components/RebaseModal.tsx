import { useState, useEffect, useRef } from 'react';
import { GitMerge, Play, X, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react';
import { useGitActions } from '../hooks/useGitActions';
import { Commit } from '../../domain/entities/GitEntities';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface RebaseModalProps {
  repoPath: string;
  baseCommit: string; // The commit we are rebasing onto
  onClose: () => void;
  onRefreshGraph: () => void;
}

// Actions available in interactive rebase
type RebaseAction = 'pick' | 'drop' | 'edit' | 'reword' | 'fixup';

interface RebaseRow {
  commit: Commit;
  action: RebaseAction;
  newMessage?: string;
}

const ACTION_META: Record<RebaseAction, { label: string; dot: string; text: string; border: string; bg: string }> = {
  pick:   { label: 'Pick',   dot: 'bg-slate-400 dark:bg-slate-500',   text: 'text-slate-700 dark:text-slate-200',   border: 'border-slate-200 dark:border-slate-700',   bg: 'bg-white dark:bg-slate-800' },
  reword: { label: 'Reword', dot: 'bg-blue-400 dark:bg-blue-500',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-500/40',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
  edit:   { label: 'Edit',   dot: 'bg-amber-400 dark:bg-amber-500',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-500/40',bg: 'bg-amber-50 dark:bg-amber-900/20' },
  fixup:  { label: 'Fixup',  dot: 'bg-purple-400 dark:bg-purple-500',text: 'text-purple-700 dark:text-purple-300',border: 'border-purple-200 dark:border-purple-500/40',bg: 'bg-purple-50 dark:bg-purple-900/20' },
  drop:   { label: 'Drop',   dot: 'bg-red-400 dark:bg-red-500',      text: 'text-red-700 dark:text-red-400',      border: 'border-red-200 dark:border-red-500/40',    bg: 'bg-red-50 dark:bg-red-900/20' },
};

const ACTION_ORDER: RebaseAction[] = ['pick', 'reword', 'edit', 'fixup', 'drop'];

export function RebaseModal({ repoPath, baseCommit, onClose, onRefreshGraph }: RebaseModalProps) {
  const gitActions = useGitActions(repoPath);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState<RebaseRow[]>([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const dropdownRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { t } = useTranslation();

  // 1. Fetch commits between baseCommit..HEAD
  useEffect(() => {
    let active = true;
    const loadCommits = async () => {
      setLoading(true);
      try {
        // Unfortunately standard git doesn't easily return a straight log of base..HEAD out of the box with our existing endpoints.
        // But our `git_log` or `search_commits` returns commits from HEAD down to root.
        // We will fetch up to 100 commits, and slice array from HEAD up until we find baseCommit.
        // Then we REVERSE the array because rebase -i operates chronologically (oldest first).
        const history = await gitActions.searchCommits('', 'all'); 
        
        let targetIndex = -1;
        for (let i = 0; i < history.length; i++) {
          if (history[i].hash === baseCommit || history[i].hash.substring(0, 7) === baseCommit) {
            targetIndex = i;
            break;
          }
        }

        if (targetIndex === -1) {
            throw new Error(`Base commit ${baseCommit} not found in recent history. Cannot build rebase sequence.`);
        }

        // Commits from index 0 (HEAD) to targetIndex (exclusive). We reverse them.
        const commitsToRebase = history.slice(0, targetIndex).reverse();
        
        const initialRows: RebaseRow[] = commitsToRebase.map(c => ({
            commit: c,
            action: 'pick'
        }));

        if (active) setRows(initialRows);
      } catch (err: any) {
        if (active) setError(err.toString());
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCommits();
    return () => { active = false; };
  }, [repoPath, baseCommit]);

  const moveRow = (index: number, direction: 'up' | 'down') => {
      if (direction === 'up' && index > 0) {
          const newRows = [...rows];
          const temp = newRows[index];
          newRows[index] = newRows[index - 1];
          newRows[index - 1] = temp;
          setRows(newRows);
      } else if (direction === 'down' && index < rows.length - 1) {
          const newRows = [...rows];
          const temp = newRows[index];
          newRows[index] = newRows[index + 1];
          newRows[index + 1] = temp;
          setRows(newRows);
      }
  };

  const updateAction = (index: number, action: RebaseAction) => {
      const newRows = [...rows];
      newRows[index].action = action;
      if (action !== 'reword') {
          newRows[index].newMessage = undefined;
      } else {
          newRows[index].newMessage = newRows[index].commit.message; // Pre-fill with existing message
      }
      setRows(newRows);
  };

  const updateMessage = (index: number, msg: string) => {
      const newRows = [...rows];
      newRows[index].newMessage = msg;
      setRows(newRows);
  };

  const handleStartRebase = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
        // Compile the sequence string
        const sequenceLines: string[] = [];
        
        for (const row of rows) {
            const firstLineOfMessage = row.commit.message.split('\n')[0];
            
            if (row.action === 'reword' && row.newMessage) {
            // If it's a reword, Interactive Rebase normally halts the terminal and opens vim to edit the message.
            // Since we use GIT_EDITOR=true to bypass vim, that commit will keep its original message.
            // But wait! Rebase interactive also supports `exec <cmd>`.
            // So if action is 'reword', we will actually emit `pick <hash>\nexec git commit --amend -m "newMessage"`

                // We use pick instead of reword so we can manually amend the message using exec
                sequenceLines.push(`pick ${row.commit.hash} ${firstLineOfMessage}`);
                // Escape quotes in the new message
                const escapedMsg = row.newMessage.replace(/"/g, '\\"');
                sequenceLines.push(`exec git commit --amend -m "${escapedMsg}"`);
            } else {
                // For standard commands: action hash message
                sequenceLines.push(`${row.action} ${row.commit.hash} ${firstLineOfMessage}`);
            }
        }

        const sequenceText = sequenceLines.join('\n') + (sequenceLines.length > 0 ? '\n' : '');
        await gitActions.rebaseInteractive(baseCommit, sequenceText);
        
        onRefreshGraph();
        onClose();
    } catch (err: any) {
        setError(err.toString());
        // Even if it failed mid-way, graph might need refresh if it's in a Rebasing state now
        onRefreshGraph(); 
    } finally {
        setIsSubmitting(false);
    }
  };


  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg">
                <GitMerge className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {t('rebase.title')}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                    {t('rebase.rebasingDesc', { count: rows.length })} <b>{baseCommit.substring(0, 7)}</b>
                </p>
            </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-50 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 bg-slate-50 dark:bg-slate-900/50">
          {loading ? (
            <div className="flex items-center justify-center h-48 space-x-2 text-slate-500">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span>{t('rebase.analyzing')}</span>
            </div>
          ) : error ? (
            <div className="m-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
              <h3 className="font-bold mb-1">{t('rebase.errorTitle')}</h3>
              <p className="whitespace-pre-wrap font-mono text-xs">{error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="m-6 p-8 text-center text-slate-500 flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500 opacity-50" />
                <p>{t('rebase.noCommits')}</p>
                <p className="text-sm mt-1">{t('rebase.nothingToRebase')}</p>
            </div>
          ) : (
            <div className="p-6">
                <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 flex items-start space-x-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <span className="text-blue-500 font-bold">ℹ️</span>
                    <div>
                        {t('rebase.infoChronological')} <b>{t('rebase.infoOldestFirst')}</b>{t('rebase.infoReorder')} <span className="font-mono text-xs bg-black/10 px-1 rounded">{t('rebase.infoEdit')}</span> {t('rebase.infoPause')}
                    </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700/50 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                    {rows.map((row, index) => (
                        <div key={row.commit.hash} className="flex items-stretch border-b last:border-0 border-slate-100 dark:border-slate-700/50 group">
                            
                            {/* Sorting Controls */}
                            <div className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-800/80 border-r border-slate-100 dark:border-slate-700/50 w-12 shrink-0">
                                <button 
                                    onClick={() => moveRow(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition-colors"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => moveRow(index, 'down')}
                                    disabled={index === rows.length - 1}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 transition-colors"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Action Selector – custom dropdown */}
                            <div
                              className="p-2 flex items-center shrink-0 w-36 border-r border-slate-100 dark:border-slate-700/50"
                              ref={el => { dropdownRefs.current[index] = el; }}
                            >
                              <div className="relative w-full">
                                {/* Trigger */}
                                <div
                                  className={`flex items-center border rounded cursor-pointer select-none transition-colors ${ACTION_META[row.action].border} bg-white dark:bg-slate-800 hover:brightness-95`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownIndex(openDropdownIndex === index ? null : index);
                                  }}
                                >
                                  {/* colored left pill */}
                                  <span className={`w-1 self-stretch rounded-l shrink-0 ${ACTION_META[row.action].dot.replace('bg-', 'bg-').replace('dark:bg-', 'dark:bg-')}`} />
                                  <span className={`flex-1 pl-2 pr-1 py-1.5 text-xs font-semibold ${ACTION_META[row.action].text}`}>
                                    {t(`rebase.action${row.action.charAt(0).toUpperCase() + row.action.slice(1)}` as any) || ACTION_META[row.action].label}
                                  </span>
                                  <ChevronDown className={`w-3 h-3 mr-1.5 text-slate-500 transition-transform ${openDropdownIndex === index ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Dropdown panel */}
                                {openDropdownIndex === index && (
                                  <>
                                    {/* backdrop */}
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setOpenDropdownIndex(null)}
                                    />
                                    <div className="absolute left-0 top-full mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                                      {ACTION_ORDER.map(action => (
                                        <button
                                          key={action}
                                          onClick={() => {
                                            updateAction(index, action);
                                            setOpenDropdownIndex(null);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                                            row.action === action
                                              ? `${ACTION_META[action].bg} ${ACTION_META[action].text} font-semibold`
                                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                          }`}
                                        >
                                          <span className={`w-2 h-2 rounded-full shrink-0 ${ACTION_META[action].dot}`} />
                                          {t(`rebase.action${action.charAt(0).toUpperCase() + action.slice(1)}` as any) || ACTION_META[action].label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Commit Info */}
                            <div className="p-3 flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-mono text-xs font-bold text-indigo-500">{row.commit.hash.substring(0, 7)}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${row.action === 'drop' ? 'line-through text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {row.commit.author}
                                    </span>
                                </div>

                                {row.action === 'reword' ? (
                                    <input 
                                        type="text" 
                                        value={row.newMessage || ''}
                                        onChange={(e) => updateMessage(index, e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-500/50 rounded px-2 py-1 text-sm text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500/50 outline-none"
                                        placeholder={t('rebase.newCommitMessage')}
                                        autoFocus
                                    />
                                ) : (
                                    <div className={`text-sm font-medium truncate ${row.action === 'drop' ? 'line-through text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {row.commit.message.split('\n')[0]}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3 shrink-0 bg-slate-50 dark:bg-slate-900/80">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
          >
            {t('rebase.cancel')}
          </button>
          
          <button
            onClick={handleStartRebase}
            disabled={loading || rows.length === 0 || isSubmitting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
                <Play className="w-4 h-4 mr-2" />
            )}
            {t('rebase.startRebase')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
