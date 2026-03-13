import { useState, useEffect } from 'react';
import { Tag, Trash2, UploadCloud, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { TagData } from '../../../domain/entities/GitEntities';
import { useGitActions } from '../../hooks/useGitActions';
import { useDialog } from '../../context/DialogContext';
import { useTranslation } from 'react-i18next';

interface TagsSidebarProps {
  repoPath: string | null;
  onRefreshGraph: () => void;
  hasRemote: boolean;
  refreshTrigger?: Date;
}

export function TagsSidebar({ repoPath, onRefreshGraph, hasRemote, refreshTrigger }: TagsSidebarProps) {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const gitActions = useGitActions(repoPath || "");
  const { showAlert, showConfirm } = useDialog();

  useEffect(() => {
    if (repoPath) {
      loadTags();
    } else {
      setTags([]);
    }
  }, [repoPath, refreshTrigger]);

  const loadTags = async () => {
    setLoadingTags(true);
    setError(null);
    try {
      const dbTags = await gitActions.getTags();
      dbTags.sort((a, b) => b.date - a.date);
      setTags(dbTags);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoadingTags(false);
    }
  };

  const handleDeleteTag = (tag: TagData, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm(
      t('tagsSidebar.deleteTagTitle'),
      t('tagsSidebar.deleteTagConfirm', { tagName: tag.name }),
      async () => {
        try {
          await gitActions.deleteTag(tag.name);
          showAlert(t('tagsSidebar.successTitle'), t('tagsSidebar.tagDeleted', { tagName: tag.name }));
          onRefreshGraph();
          await loadTags();

          if (hasRemote) {
            setTimeout(() => {
              showConfirm(
                t('tagsSidebar.deleteTagRemoteTitle'),
                t('tagsSidebar.deleteTagRemoteConfirm', { tagName: tag.name }),
                async () => {
                  try {
                    setLoadingTags(true);
                    await gitActions.deleteTagRemote(tag.name);
                    showAlert(t('tagsSidebar.successTitle'), t('tagsSidebar.tagDeleted', { tagName: tag.name }) + " (Remote)");
                  } catch (e: any) {
                    setError(e.toString());
                  } finally {
                    setLoadingTags(false);
                  }
                }
              );
            }, 500); // Small delay to let the first alert close if it was an alert, actually we can just overwrite the alert
          }

        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handlePushTags = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingTags(true);
    setError(null);
    try {
      await gitActions.pushTags();
      showAlert(t('tagsSidebar.successTitle'), t('tagsSidebar.pushTagsSuccess'));
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoadingTags(false);
    }
  };

  if (!repoPath) {
    return <div className="p-4 text-center text-slate-600 dark:text-slate-400 text-sm">{t('tagsSidebar.noRepo')}</div>;
  }

  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm shrink-0 flex flex-col space-y-3 sticky top-0 z-10">
        <div className="flex items-center justify-between h-7">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                <span>{t('tagsSidebar.title')}</span>
            </span>
            <div className="flex items-center space-x-2">
                {tags.length > 0 && (
                     <button
                        onClick={handlePushTags}
                        disabled={loadingTags || !hasRemote}
                        className="p-1 hover:bg-white dark:hover:bg-slate-700/50 rounded-md transition-colors text-slate-400 hover:text-indigo-500 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!hasRemote ? t("workspace.header.noRemote") : t('tagsSidebar.pushTagsTooltip')}
                     >
                        <UploadCloud className="w-3.5 h-3.5" />
                     </button>
                )}
                {loadingTags && (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>
                )}
            </div>
        </div>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <input
                type="text"
                placeholder={t('tagsSidebar.searchPlaceholder')}
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
                onClick={() => setIsTagsExpanded(!isTagsExpanded)}
            >
                <div className="flex items-center space-x-1">
                    {isTagsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{t('tagsSidebar.tagsCount', { count: filteredTags.length })}</span>
                </div>
            </div>
            
            {isTagsExpanded && !loadingTags && (
                <div className="pl-2 pr-1 py-1 space-y-0.5">
                    {filteredTags.map((tag, idx) => (
                        <div 
                            key={`tag-${tag.name}-${idx}`} 
                            className="group flex items-center justify-between p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors"
                        >
                            <div className="flex items-center space-x-2 truncate flex-1 md:max-w-[200px]">
                                <Tag className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={tag.name}>
                                    {tag.name}
                                </span>
                            </div>
                            <button 
                                onClick={(e) => handleDeleteTag(tag, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-slate-500"
                                title={t('tagsSidebar.deleteTagTooltip')}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}

                    {filteredTags.length === 0 && (
                        <div className="text-xs text-slate-500 italic px-2 py-1">{t('tagsSidebar.noTags')}</div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
