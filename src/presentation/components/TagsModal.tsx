import { useState, useEffect } from 'react';
import { Tag, Trash2, X, AlertTriangle, UploadCloud } from 'lucide-react';
import { TagData } from '../../domain/entities/GitEntities';
import { useGitActions } from '../hooks/useGitActions';
import { useDialog } from '../context/DialogContext';

interface TagsModalProps {
  repoPath: string;
  onClose: () => void;
  onRefreshGraph: () => void;
}

export function TagsModal({ repoPath, onClose, onRefreshGraph }: TagsModalProps) {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const gitActions = useGitActions(repoPath);
  const { showConfirm, showAlert } = useDialog();

  useEffect(() => {
    loadTags();
  }, [repoPath]);

  const loadTags = async () => {
    setLoading(true);
    setError(null);
    try {
      const dbTags = await gitActions.getTags();
      // Sort tags simply by date descending
      dbTags.sort((a, b) => b.date - a.date);
      setTags(dbTags);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (tag: TagData) => {
    showConfirm(
      "Delete Tag",
      `Are you sure you want to delete the tag '${tag.name}'?`,
      async () => {
        try {
          await gitActions.deleteTag(tag.name);
          showAlert("Success", `Tag '${tag.name}' deleted.`);
          onRefreshGraph();
          await loadTags();
        } catch (e: any) {
          setError(e.toString());
        }
      }
    );
  };

  const handlePushTags = async () => {
    setLoading(true);
    setError(null);
    try {
      await gitActions.pushTags();
      showAlert("Success", "All local tags have been pushed to the remote repository.");
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Tags Manager
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <button
               onClick={handlePushTags}
               disabled={loading || tags.length === 0}
               className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
               title="Push all tags to remote"
            >
               <UploadCloud className="w-4 h-4" />
               <span>Push Tags</span>
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-transparent p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800">
            <input
              type="text"
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-indigo-500"
            />
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
          ) : tags.length === 0 && !error ? (
             <div className="p-8 text-center text-slate-500">
               No tags found. Select a commit to create one.
             </div>
          ) : (
            <>
              {tags.filter((tag) => 
                tag.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                tag.message.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No tags matching your search.
                </div>
              )}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {tags.filter((tag) => 
                  tag.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  tag.message.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((tag, idx) => (
                <div key={`${tag.name}-${idx}`} className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col min-w-0 flex-1 mr-4">
                     <div className="flex items-center space-x-2 text-sm mb-1">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                          {tag.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500">
                          {tag.hash.substring(0, 7)}
                        </span>
                     </div>
                     <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                        {tag.message || "No message."}
                     </span>
                     {tag.date > 0 && (
                       <span className="text-xs text-slate-400 mt-1">
                         {new Date(tag.date * 1000).toLocaleString()}
                       </span>
                     )}
                  </div>
                  <div>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded"
                      title="Delete Tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
