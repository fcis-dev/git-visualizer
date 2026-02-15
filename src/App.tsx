import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { GitBranch, GitCommit, GitPullRequest, Calendar, Files, Settings } from 'lucide-react';
import { CommitData } from './types';
import { Graph } from './components/Graph';
import { ProjectExplorer } from './components/Sidebar/ProjectExplorer';
import { SourceControl } from './components/Sidebar/SourceControl';

type ActiveView = 'explorer' | 'source-control';

function App() {
  const [commits, setCommits] = useState<CommitData[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<CommitData | null>(null);
  const [repoPath, setRepoPath] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('explorer');

  const loadCommits = async (path: string) => {
    try {
      setError(null);
      setRepoPath(path);
      
      const [commitsData, branch] = await Promise.all([
        invoke<CommitData[]>('get_git_graph', { path }),
        invoke<string>('get_current_branch', { path })
      ]);

      setCommits(commitsData);
      setBranchName(branch);
    } catch (err: any) {
      console.error(err);
      setError(err.toString());
      setCommits([]);
      setBranchName("");
    }
  };

  const repoName = repoPath ? repoPath.split('/').pop() : "Git Visualizer";

  return (
    <div 
        className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
    >
      
      {/* Activity Bar (Leftmost narrow strip) */}
      <nav className="w-12 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 space-y-4 z-30">
        <button 
            onClick={() => setActiveView('explorer')}
            className={`p-2 rounded-lg transition-colors ${activeView === 'explorer' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`} 
            title="Explorer"
        >
          <Files className="w-6 h-6" />
        </button>
        <button 
            onClick={() => setActiveView('source-control')}
            className={`p-2 rounded-lg transition-colors ${activeView === 'source-control' ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'}`} 
            title="Source Control"
        >
           <GitBranch className="w-6 h-6" />
        </button>

        <div className="w-8 h-px bg-slate-800" />
        
        <div className="flex-1" />
        <button className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors" title="Settings">
           <Settings className="w-5 h-5" />
        </button>
      </nav>

      {/* Sidebar (Explorer / Details) */}
      <aside className="w-80 bg-slate-900/50 border-r border-slate-800 flex flex-col z-20">
        {activeView === 'explorer' && (
            <ProjectExplorer 
                onSelectRepo={loadCommits} 
                activeRepoPath={repoPath}
                onClearActiveRepo={() => {
                    setRepoPath("");
                    setCommits([]);
                    setBranchName("");
                    setSelectedCommit(null);
                }}
            />
        )}
        {activeView === 'source-control' && (
            <SourceControl repoPath={repoPath || null} />
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950/80 relative">
        {/* Top Header */}
        <header className="h-12 border-b border-slate-800/80 flex items-center justify-between px-4 bg-slate-900/30 backdrop-blur-md">
           <div className="flex items-center space-x-2 overflow-hidden">
             <span className="text-sm font-medium text-slate-300 truncate max-w-[400px]">
               {repoName}
             </span>
             {repoPath && (
                <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-600 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">Git</span>
                    {branchName && (
                        <div className="flex items-center space-x-1 text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            <GitBranch className="w-3 h-3" />
                            <span>{branchName}</span>
                        </div>
                    )}
                </div>
             )}
           </div>


        </header>

        {/* Git Graph Visualization or Commit Details */}
        <main className="flex-1 overflow-hidden relative flex">
          
          {/* Graph View */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
              {error && (
                <div className="absolute top-4 left-4 right-4 z-50 p-3 bg-red-500/10 text-red-200 border border-red-500/20 rounded backdrop-blur-md">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {error}
                  </p>
                </div>
              )}

              {repoPath ? (
                commits.length > 0 ? (
                  <Graph 
                    commits={commits} 
                    selectedCommit={selectedCommit}
                    onSelectCommit={(commit) => {
                      if (selectedCommit?.hash === commit.hash) {
                        setSelectedCommit(null);
                      } else {
                        setSelectedCommit(commit);
                      }
                    }} 
                  />
                ) : (
                  <div className="flex items-center justify-center flex-1">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-600">
                   <GitBranch className="w-16 h-16 mb-4 opacity-20" />
                   <p className="text-sm font-medium">No repository open</p>
                </div>
              )}
          </div>

          {/* Commit Details Panel (Right side if selected) */}
          {selectedCommit && (
              <div className="w-80 border-l border-slate-800 bg-slate-900/30 overflow-y-auto p-4 animate-in slide-in-from-right duration-300">
                   <div className="space-y-6">
                       {/* Commit Status */}
                       <div>
                          <div className="flex items-start space-x-3">
                            <div className="mt-1">
                              <GitCommit className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-slate-200 leading-snug">
                                {selectedCommit.message}
                              </h3>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className="text-[10px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                                  {selectedCommit.hash.substring(0, 7)}
                                </span>
                              </div>
                            </div>
                          </div>
                       </div>

                       <div className="w-full h-px bg-slate-800" />

                       {/* Author Info */}
                       <div className="space-y-2">
                         <h4 className="text-xs font-bold text-slate-500 uppercase">Author</h4>
                         <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-linear-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                              {selectedCommit.author.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-300">{selectedCommit.author}</span>
                         </div>
                         <div className="flex items-center space-x-2 text-xs text-slate-500 pl-8">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(selectedCommit.date * 1000).toLocaleDateString()}</span>
                         </div>
                       </div>

                       <div className="w-full h-px bg-slate-800" />

                       {/* Parents */}
                       <div className="space-y-2">
                         <h4 className="text-xs font-bold text-slate-500 uppercase">Parents</h4>
                         <div className="flex flex-col space-y-1">
                           {selectedCommit.parents.map(p => (
                             <div key={p} className="flex items-center space-x-2 text-xs font-mono text-slate-400 hover:text-indigo-300 cursor-pointer transition-colors">
                               <GitPullRequest className="w-3 h-3" />
                               <span>{p.substring(0, 7)}</span>
                             </div>
                           ))}
                           {selectedCommit.parents.length === 0 && (
                             <span className="text-xs text-slate-600">No parents (Root)</span>
                           )}
                         </div>
                       </div>
                     </div>
              </div>
          )}

        </main>
      </div>

    </div>
  );
}

export default App;
