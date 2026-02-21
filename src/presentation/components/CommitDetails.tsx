import { GitCommit, Copy, GitPullRequest, RotateCcw, Tag, GitBranch, Check, ArrowUp, X, FileText, FolderTree, GitMerge } from 'lucide-react';
import { Commit, CommitDetails as CommitDetailsType } from '../../domain/entities/GitEntities';
import { useState, useEffect } from 'react';
import { useGitActions } from '../hooks/useGitActions';
import { FileTreeViewer } from './FileTreeViewer';
import { RebaseModal } from './RebaseModal';

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
    
    // Actions
    onCheckout: (hash: string) => void;
    onCreateBranch: (hash: string) => void;
    onCreateTag: (hash: string) => void;
    onMerge: (hash: string) => void;
    onRevert: (hash: string) => void;
    onCherryPick: (hash: string) => void;
    onRebase: (hash: string) => void;
    onReset: (hash: string, mode: "soft" | "mixed" | "hard") => void;
    onRefreshGraph: () => void;
}

export function CommitDetails({
    commit,
    details,
    detailsLoading,
    currentBranch,
    onClose,
    onCopyHash,
    onSelectFile,
    onCheckout,
    onCreateBranch,
    onCreateTag,
    onMerge,
    onRevert,
    onCherryPick,
    onRebase,
    onReset,
    onViewHistoricalFile,
    repoPath,
    onRefreshGraph
}: CommitDetailsProps) {
    const [activeTab, setActiveTab] = useState<'changes' | 'tree'>('changes');
    const [treeFiles, setTreeFiles] = useState<string[]>([]);
    const [treeLoading, setTreeLoading] = useState(false);
    const [isRebaseModalOpen, setIsRebaseModalOpen] = useState(false);
    const { getCommitTree } = useGitActions(repoPath);

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
        <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 border-l border-slate-200 dark:border-slate-800">
            {/* Header / Title */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between">
                 <div className="flex-1 min-w-0 mr-4">
                     <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                         Commit Details
                     </h2>
                 </div>
                 <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors text-slate-500">
                     <X className="w-5 h-5" />
                 </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                
                {/* Commit Info Block */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start space-x-3 mb-3">
                         <GitCommit className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
                         <div>
                             <p className="text-sm font-medium text-slate-900 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                 {commit.message}
                             </p>
                         </div>
                    </div>
                    
                    <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400 mt-2 pl-8">
                        <div className="flex items-center space-x-1 font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                             <span>{commit.hash.substring(0, 7)}</span>
                             <button onClick={() => onCopyHash(commit.hash)} title="Copy Hash" className="hover:text-indigo-500">
                                 <Copy className="w-3 h-3" />
                             </button>
                        </div>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{commit.author}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        <span>{new Date(commit.date * 1000).toLocaleString()}</span>
                    </div>

                    {/* Tags and Branches */}
                    {commit.refs && commit.refs.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pl-8">
                            {commit.refs.map(ref => {
                                const isTag = ref.startsWith("tag: ");
                                const isHead = ref.includes("HEAD");
                                const isOrigin = ref.includes("origin");
                                const displayName = isTag ? ref.substring(5) : ref;
                                
                                let baseStyles = "text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
                                
                                if (isHead) {
                                    baseStyles = "text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                                } else if (isTag) {
                                    baseStyles = "text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60";
                                } else if (isOrigin) {
                                    baseStyles = "text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60";
                                }
                                
                                return (
                                    <span key={ref} className={`px-1.5 py-0.5 rounded border flex items-center shadow-sm font-mono whitespace-nowrap ${baseStyles}`}>
                                        {isTag && <Tag className="w-2.5 h-2.5 mr-1" />}
                                        {!isTag && <GitBranch className="w-2.5 h-2.5 mr-1" />}
                                        {displayName}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Actions Section */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</h3>
                    
                    {/* Primary Actions */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onCheckout(commit.hash)}
                            className="flex items-center justify-center space-x-2 p-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-sm"
                            title="Checkout this commit (Detached HEAD)"
                        >
                            <Check className="w-3.5 h-3.5" />
                            <span>Checkout</span>
                        </button>
                         <button
                            onClick={() => onCreateBranch(commit.hash)}
                            className="flex items-center justify-center space-x-2 p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors shadow-sm"
                        >
                            <GitBranch className="w-3.5 h-3.5" />
                            <span>New Branch</span>
                        </button>
                    </div>

                    {/* Secondary Operations */}
                    <div className="grid grid-cols-3 gap-2">
                         <button
                            onClick={() => onCherryPick(commit.hash)}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                            title="Cherry Pick"
                         >
                            <GitPullRequest className="w-4 h-4" />
                            <span>Cherry Pick</span>
                         </button>
                         <button
                            onClick={() => onMerge(commit.hash)}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                            title={`Merge into ${currentBranch}`}
                         >
                            <GitPullRequest className="w-4 h-4 rotate-90" />
                            <span>Merge</span>
                         </button>
                         <button
                            onClick={() => onCreateTag(commit.hash)}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                         >
                            <Tag className="w-4 h-4" />
                            <span>Tag</span>
                         </button>
                    </div>

                    {/* Advanced / Danger Zone */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">History Operations (Advanced)</h4>
                        <div className="grid grid-cols-2 gap-2">
                             <button
                                onClick={() => onRevert(commit.hash)}
                                className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-100/50 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                                title="Revert this commit"
                             >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Revert</span>
                             </button>
                             <button
                                onClick={() => onRebase(commit.hash)}
                                className="flex items-center justify-center space-x-1.5 p-2 rounded bg-slate-100/50 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                                title="Rebase current branch onto this commit"
                             >
                                <ArrowUp className="w-3.5 h-3.5" />
                                <span>Rebase</span>
                             </button>
                             <button
                                onClick={() => setIsRebaseModalOpen(true)}
                                className="col-span-2 flex items-center justify-center space-x-1.5 p-2 rounded bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-400 font-medium transition-colors border border-indigo-200/50 dark:border-indigo-500/20"
                                title="Start an interactive rebase from this commit"
                             >
                                <GitMerge className="w-3.5 h-3.5" />
                                <span>Rebase Interactive from here...</span>
                             </button>
                        </div>
                        
                        {/* Reset Dropdown/Group */}
                        <div className="mt-2 text-center">
                            <div className="text-[10px] text-slate-400 mb-1">Reset {currentBranch} to this commit:</div>
                            <div className="flex border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
                                <button
                                    onClick={() => onReset(commit.hash, "soft")}
                                    className="flex-1 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800"
                                    title="Keep all changes staged"
                                >
                                    Soft
                                </button>
                                <button
                                    onClick={() => onReset(commit.hash, "mixed")}
                                    className="flex-1 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800"
                                    title="Keep changes unstaged"
                                >
                                    Mixed
                                </button>
                                <button
                                    onClick={() => onReset(commit.hash, "hard")}
                                    className="flex-1 py-1.5 text-xs bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium"
                                    title="Discard all changes"
                                >
                                    Hard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex space-x-4 mb-2">
                    <button
                        onClick={() => setActiveTab('changes')}
                        className={`flex items-center space-x-1.5 pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'changes' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Changes</span>
                        {activeTab === 'changes' && (
                             <span className="ml-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[10px]">
                                 {details?.files.length || 0}
                             </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('tree')}
                        className={`flex items-center space-x-1.5 pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'tree' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <FolderTree className="w-3.5 h-3.5" />
                        <span>File Tree</span>
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'changes' ? (
                    <div>
                        {detailsLoading ? (
                            <div className="flex justify-center py-4">
                                 <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                                 <span className="ml-2 text-xs text-slate-400">Loading details...</span>
                            </div>
                        ) : details && details.files.length > 0 ? (
                             <div className="space-y-0.5">
                                {details.files.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center space-x-2 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer group transition-colors"
                                        onClick={() => onSelectFile(file.path)}
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
                                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate" title={file.path}>
                                            {file.path}
                                        </span>
                                    </div>
                                ))}
                             </div>
                        ) : (
                            <div className="text-center py-4 text-xs text-slate-400">
                                 No files changed or failed to load.
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {treeLoading ? (
                            <div className="flex justify-center py-4">
                                 <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                                 <span className="ml-2 text-xs text-slate-400">Loading tree...</span>
                            </div>
                        ) : (
                            <FileTreeViewer files={treeFiles} onSelectFile={onViewHistoricalFile} />
                        )}
                    </div>
                )}

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
      </>
    );
}
