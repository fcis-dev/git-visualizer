import { GitCommit, Copy, GitPullRequest, RotateCcw, Tag, GitBranch, Check, ArrowUp, X, FileText, FolderTree, GitMerge, MoreVertical } from 'lucide-react';
import { Commit, CommitDetails as CommitDetailsType } from '../../domain/entities/GitEntities';
import { useState, useEffect } from 'react';
import { useGitActions } from '../hooks/useGitActions';
import { FileTreeViewer } from './FileTreeViewer';
import { RebaseModal } from './RebaseModal';
import { useTranslation } from 'react-i18next';

interface CommitDetailsProps {
    commit: Commit;
    details: CommitDetailsType | null;
    detailsLoading?: boolean;
    currentBranch: string;
    onClose: () => void;
    onCopyHash: (hash: string) => void;
    onSelectFile: (path: string) => void;
    onViewHistoricalFile: (path: string) => void;
    repoPath: string;
    
    onRefreshGraph: () => void;
    onViewFileHistory?: (path: string) => void;
    fileFilter?: string;
}

export function CommitDetails({
    commit,
    details,
    detailsLoading,
    currentBranch,
    onClose,
    onCopyHash,
    onSelectFile,
    onViewHistoricalFile,
    repoPath,
    onRefreshGraph,
    onViewFileHistory,
    fileFilter
}: CommitDetailsProps) {
    const [activeTab, setActiveTab] = useState<'changes' | 'tree'>('changes');
    const [treeFiles, setTreeFiles] = useState<string[]>([]);
    const [treeLoading, setTreeLoading] = useState(false);
    const [isRebaseModalOpen, setIsRebaseModalOpen] = useState(false);
    
    // Context menu for file history
    const [fileContextMenu, setFileContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        path: string | null;
    }>({ visible: false, x: 0, y: 0, path: null });

    const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);

    const { getCommitTree } = useGitActions(repoPath);
    const { t } = useTranslation();

    useEffect(() => {
        const closeDropdowns = () => {
            setFileContextMenu(prev => ({ ...prev, visible: false }));
            setActionsDropdownOpen(false);
        };
        document.addEventListener("click", closeDropdowns);
        return () => document.removeEventListener("click", closeDropdowns);
    }, []);

    useEffect(() => {
        let mounted = true;
        if (activeTab === 'tree' && commit.hash) {
            setTreeLoading(true);
            getCommitTree(commit.hash)
                .then(files => {
                    if (mounted) {
                        setTreeFiles(files);
                        setTreeLoading(false);
                    }
                })
                .catch(err => {
                    console.error("Failed to load tree:", err);
                    if (mounted) {
                        setTreeLoading(false);
                    }
                });
        }
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, commit.hash, repoPath]);

    return (
        <>
        <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
            {/* Header / Title */}
            <div className="p-2.5 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                 <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                     {t('commitDetails.title')}
                 </h2>
                 <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500">
                     <X className="w-5 h-5" />
                 </button>
            </div>

            <div className="flex-1 flex flex-row overflow-hidden">
                {/* Left side: Commit Details */}
                <div className="w-1/3 min-w-[300px] border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-4 custom-scrollbar shrink-0">

                {/* Premium Commit Info Card */}
                <div className="relative bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-sm overflow-hidden group">
                    {/* Subtle background decoration */}
                    <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full blur-3xl opacity-60 pointer-events-none transition-opacity duration-500 group-hover:opacity-100" />

                    {/* Author & Date Header */}
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center space-x-3">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm ring-2 ring-white dark:ring-slate-950">
                                {commit.author ? commit.author.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                    {commit.author}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                    {new Date(commit.date * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                </span>
                            </div>
                        </div>

                        {/* Hash Pill */}
                        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700/50 group/hash shadow-sm">
                            <GitCommit className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover/hash:text-indigo-500 transition-colors" />
                            <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {commit.hash.substring(0, 7)}
                            </span>
                            <button onClick={() => onCopyHash(commit.hash)} title={t('commitDetails.copyHash')} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none ml-1">
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Commit Message */}
                    <div className="relative z-10 mb-4 pl-[48px]">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {commit.message}
                        </p>
                    </div>

                    {/* Tags and Branches */}
                    {commit.refs && commit.refs.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 pl-[48px] relative z-10">
                            {commit.refs.map(ref => {
                                const isTag = ref.startsWith("tag: ");
                                const isHead = ref.includes("HEAD");
                                const isOrigin = ref.includes("origin");
                                const displayName = isTag ? ref.substring(5) : ref;
                                
                                let baseStyles = "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80";
                                
                                if (isHead) {
                                    baseStyles = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20";
                                } else if (isTag) {
                                    baseStyles = "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30";
                                } else if (isOrigin) {
                                    baseStyles = "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20";
                                }
                                
                                return (
                                    <span key={ref} className={`px-2 py-1 rounded-md border flex items-center shadow-sm text-[11px] font-semibold break-all backdrop-blur-sm transition-transform hover:scale-105 duration-200 ${baseStyles}`}>
                                        {isTag && <Tag className="w-3 h-3 shrink-0 mr-1.5 opacity-80" />}
                                        {!isTag && <GitBranch className="w-3 h-3 shrink-0 mr-1.5 opacity-80" />}
                                        <span>{displayName}</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
                </div>

                {/* Right side: Files */}
                <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-950/50">
                {/* FileFilter Banner */}
                {fileFilter && (
                    <div className="mx-4 mb-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded flex flex-col p-3">
                        <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-400 font-medium text-sm mb-2">
                            <FileText className="w-4 h-4" />
                            <span className="truncate" title={fileFilter}>{t('commitDetails.viewingHistory')} {fileFilter.split('/').pop()}</span>
                        </div>
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => onSelectFile(fileFilter)}
                                className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                            >
                                {t('commitDetails.viewDiff')}
                            </button>
                            <button 
                                onClick={() => onViewHistoricalFile(fileFilter)}
                                className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                            >
                                {t('commitDetails.viewFile')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="pt-2 flex space-x-4 px-4 mb-2">
                    <button
                        onClick={() => setActiveTab('changes')}
                        className={`flex items-center space-x-1.5 pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'changes' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{t('commitDetails.changes')}</span>
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'changes' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            {details?.files.length || 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('tree')}
                        className={`flex items-center space-x-1.5 pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'tree' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <FolderTree className="w-3.5 h-3.5" />
                        <span>{t('commitDetails.fileTree')}</span>
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'changes' ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                        {detailsLoading ? (
                            <div className="flex justify-center py-4">
                                 <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                                 <span className="ml-2 text-xs text-slate-500">{t('commitDetails.loadingDetails')}</span>
                            </div>
                        ) : details && details.files.length > 0 ? (
                             <div className="space-y-0.5">
                                {details.files.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer group transition-colors"
                                        onClick={() => onSelectFile(file.path)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setFileContextMenu({
                                                visible: true,
                                                x: e.clientX,
                                                y: e.clientY,
                                                path: file.path
                                            });
                                        }}
                                    >
                                        <span className={`
                                            w-4 h-4 flex items-center justify-center rounded text-[10px] font-bold shrink-0
                                            ${file.status === "M" ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20" : ""}
                                            ${file.status === "A" ? "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20" : ""}
                                            ${file.status === "D" ? "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20" : ""}
                                            ${file.status === "R" ? "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20" : ""}
                                        `}>
                                            {file.status}
                                        </span>
                                        <span 
                                            className="text-xs text-slate-700 dark:text-slate-300 truncate" 
                                            title={file.path}
                                            dir="rtl"
                                            style={{ textAlign: "left" }}
                                        >
                                            &lrm;{file.path}
                                        </span>
                                    </div>
                                ))}
                             </div>
                        ) : (
                            <div className="text-center py-4 text-xs text-slate-500">
                                 {t('commitDetails.noFilesChanged')}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                        {treeLoading ? null : (
                            <FileTreeViewer files={treeFiles} onSelectFile={onViewHistoricalFile} onViewFileHistory={onViewFileHistory} />
                        )}
                    </div>
                )}

                </div>
            </div>
        </div>

        {isRebaseModalOpen && commit && (
            <RebaseModal
                repoPath={repoPath}
                baseCommit={commit.hash}
                onClose={() => setIsRebaseModalOpen(false)}
                onRefreshGraph={onRefreshGraph}
            />
        )}
        
        {/* File History Context Menu */}
        {fileContextMenu.visible && fileContextMenu.path && onViewFileHistory && (
          <div 
            className="fixed z-50 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg min-w-[160px] text-sm overflow-hidden"
            style={{ top: fileContextMenu.y, left: fileContextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 truncate max-w-[200px]" title={fileContextMenu.path}>
              {fileContextMenu.path.split('/').pop()}
            </div>
            
            <button 
              className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
              onClick={() => {
                onViewFileHistory(fileContextMenu.path!);
                setFileContextMenu({ ...fileContextMenu, visible: false });
              }}
            >
              {t('commitDetails.viewFileHistory')}
            </button>
          </div>
        )}
      </>
    );
}
