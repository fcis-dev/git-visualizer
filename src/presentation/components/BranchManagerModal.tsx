import { useState, useEffect } from 'react';
import { GitBranch, X, AlertTriangle, Check } from 'lucide-react';
import { BranchData } from '../../domain/entities/GitEntities';
import { useGitActions } from '../hooks/useGitActions';
import { useDialog } from '../context/DialogContext';

interface BranchManagerModalProps {
  repoPath: string;
  onClose: () => void;
  onRefreshGraph: () => void;
  currentBranch: string;
}

export function BranchManagerModal({ repoPath, onClose, onRefreshGraph, currentBranch }: BranchManagerModalProps) {
  const [branches, setBranches] = useState<BranchData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const gitActions = useGitActions(repoPath);
  const { showAlert, showConfirm } = useDialog();

  useEffect(() => {
    loadBranches();
  }, [repoPath]);

  const loadBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const dbBranches = await gitActions.getBranchesInfo();
      // Sort branches by date descending
      dbBranches.sort((a, b) => b.date - a.date);
      setBranches(dbBranches);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (branch: BranchData) => {
    try {
      if (branch.is_remote) {
        // e.g. "origin/feature/foo" -> "feature/foo"
        const parts = branch.name.split("/");
        const localName = parts.length > 1 ? parts.slice(1).join("/") : branch.name;
        
        showConfirm(
          "Checkout Remote Branch", 
          `Do you want to create and checkout a local tracking branch named '${localName}'?`,
          async () => {
            try {
              await gitActions.createBranch(localName, branch.hash);
              await gitActions.checkoutBranch(localName);
              showAlert("Success", `Created and checked out local branch '${localName}'.`);
              onRefreshGraph();
              onClose();
            } catch (err: any) {
              setError(err.toString());
            }
          }
        );
        return; // Early return because actions happen in callback
      } else {
        await gitActions.checkoutBranch(branch.name);
        showAlert("Success", `Checked out ${branch.name}.`);
      }
      
      onRefreshGraph();
      onClose();
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const handleDelete = async (branch: BranchData) => {
    showConfirm(
      "Delete Branch",
      `Are you sure you want to delete branch '${branch.name}'? This cannot be undone.`,
      async () => {
        try {
          await gitActions.deleteBranch(branch.name, false);
          await loadBranches();
          onRefreshGraph();
        } catch (e: any) {
          const msg = e.toString();
          if (msg.includes("not fully merged")) {
            // Offer force-delete
            showConfirm(
              "Force Delete Branch",
              `Branch '${branch.name}' is not fully merged. Force-delete it anyway?`,
              async () => {
                try {
                  await gitActions.deleteBranch(branch.name, true);
                  await loadBranches();
                  onRefreshGraph();
                } catch (fe: any) {
                  setError(fe.toString());
                }
              }
            );
          } else {
            setError(msg);
          }
        }
      }
    );
  };

  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Branch Manager
            </h2>
          </div>
          <div className="flex items-center space-x-4">
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
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-indigo-500"
            />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
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
          ) : branches.length === 0 && !error ? (
             <div className="p-8 text-center text-slate-500">
               No branches found.
             </div>
          ) : (
             <div className="p-8 text-center text-slate-500" style={{display: filteredBranches.length === 0 ? "block" : "none"}}>
               No branches matching your search.
             </div>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredBranches.map((branch, idx) => {
              const isActive = branch.name === currentBranch;
              return (
                <div key={`${branch.name}-${idx}`} className="group flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col min-w-0 flex-1 mr-4">
                     <div className="flex items-center space-x-2 text-sm mb-1">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center space-x-1">
                          {isActive && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                          <span>{branch.name}</span>
                        </span>
                        {branch.is_remote && (
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                remote
                            </span>
                        )}
                        <span className="font-mono text-xs text-slate-500">
                          {branch.hash.substring(0, 7)}
                        </span>
                     </div>
                     <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                        {branch.message || "No message."}
                     </span>
                     {branch.date > 0 && (
                       <span className="text-xs text-slate-400 mt-1">
                         {new Date(branch.date * 1000).toLocaleString()}
                       </span>
                     )}
                  </div>
                  <div className="flex space-x-2">
                     {!isActive && !branch.is_remote && (
                       <button
                         onClick={() => handleDelete(branch)}
                         className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-all"
                         title="Delete branch"
                       >
                         <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <polyline points="3 6 5 6 21 6" />
                           <path d="M19 6l-1 14H6L5 6" />
                           <path d="M10 11v6M14 11v6" />
                           <path d="M9 6V4h6v2" />
                         </svg>
                       </button>
                     )}
                     {!isActive && (
                       <button
                         onClick={() => handleCheckout(branch)}
                         className="opacity-0 group-hover:opacity-100 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors rounded text-sm font-medium"
                       >
                         Checkout
                       </button>
                     )}
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
