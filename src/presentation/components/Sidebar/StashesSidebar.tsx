import { useState, useEffect } from 'react';
import { Archive, Trash2, Download, Play, Plus } from 'lucide-react';
import { StashEntry } from '../../../domain/entities/GitEntities';
import { useGitActions } from '../../hooks/useGitActions';
import { useDialog } from '../../context/DialogContext';
import { useTranslation } from "react-i18next";
import { invoke } from '@tauri-apps/api/core';

interface StashesSidebarProps {
  repoPath: string | null;
  onRefreshGraph: () => void;
}

export function StashesSidebar({ repoPath, onRefreshGraph }: StashesSidebarProps) {
  const [stashes, setStashes] = useState<StashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  
  const gitActions = useGitActions(repoPath || "", onRefreshGraph);
  const { showConfirm, showInput, showAlert } = useDialog();

  const loadStashes = async () => {
    if (!repoPath) return;
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
      t("stashes.applyTitle"),
      t("stashes.applyConfirm", { index }),
      async () => {
        try {
          await gitActions.applyStash(index);
          showAlert(t("stashes.applySuccessTitle"), t("stashes.applySuccessDesc", { index }));
          onRefreshGraph();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handlePop = (index: string) => {
    showConfirm(
      t("stashes.popTitle"),
      t("stashes.popConfirm", { index }),
      async () => {
        try {
          await gitActions.applyStash(index);
          await gitActions.dropStash(index);
          loadStashes();
          onRefreshGraph();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleDrop = (index: string) => {
    showConfirm(
      t("stashes.dropTitle"),
      t("stashes.dropConfirm", { index }),
      async () => {
        try {
          await gitActions.dropStash(index);
          loadStashes();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handleStashSave = () => {
    if (!repoPath) return;
    showInput(t('sidebar.sourceControl.stashTitle'), t('sidebar.sourceControl.stashMsg'), async (msg) => {
      setLoading(true);
      try {
        await invoke("git_stash_save", {
          path: repoPath,
          message: msg || null,
        });
        loadStashes();
        onRefreshGraph();
      } catch (err: any) {
        console.error("Failed to stash", err);
        setError(err.toString());
      } finally {
        setLoading(false);
      }
    });
  };

  if (!repoPath) {
    return <div className="p-4 text-center text-slate-600 dark:text-slate-400 text-sm">{t("stashes.noRepo")}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm shrink-0 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <Archive className="w-4 h-4 text-indigo-500" />
            <span>{t("stashes.title")}</span>
        </span>
        <div className="flex items-center space-x-2">
          {loading && (
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>
          )}
          <button
            onClick={handleStashSave}
            className="p-1 hover:bg-white dark:hover:bg-slate-700/50 rounded-md transition-colors text-slate-400 hover:text-indigo-500 shadow-xs"
            title={t("sidebar.sourceControl.stashTitle")}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {error && (
            <div className="p-2 mb-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded break-all">
                {error}
            </div>
        )}

        {!loading && stashes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 text-xs">
              <Archive className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p>{t("stashes.noStashes")}</p>
            </div>
        ) : (
            stashes.map((stash) => (
                <div 
                  key={stash.index}
                  className="group flex flex-col p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded leading-none">
                      {stash.index}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 leading-none">
                      {stash.hash.substring(0, 7)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mb-2 break-words">
                    {stash.message}
                  </p>
                  
                  <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-auto pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                    <button
                      onClick={() => handleApply(stash.index)}
                      className="flex-1 flex items-center justify-center space-x-1 py-1 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded transition-colors"
                      title={t("stashes.applyAction")}
                    >
                      <Play className="w-3 h-3" />
                      <span>{t("stashes.applyAction")}</span>
                    </button>
                    <button
                      onClick={() => handlePop(stash.index)}
                      className="flex-1 flex items-center justify-center space-x-1 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded transition-colors"
                      title={t("stashes.popAction")}
                    >
                      <Download className="w-3 h-3" />
                      <span>{t("stashes.popAction")}</span>
                    </button>
                    <button
                      onClick={() => handleDrop(stash.index)}
                      className="p-1 px-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded transition-colors"
                      title={t("stashes.dropAction")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
        )}
      </div>
    </div>
  );
}
