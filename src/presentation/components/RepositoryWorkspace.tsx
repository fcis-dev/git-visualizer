import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeft } from "lucide-react";
import { SourceControl } from "./Sidebar/SourceControl";
import { BranchesSidebar } from "./Sidebar/BranchesSidebar";
import { TagsSidebar } from "./Sidebar/TagsSidebar";
import { RescueSidebar } from "./Sidebar/RescueSidebar";
import { Graph, GraphHandle } from "./Graph";
import { DiffView } from "./DiffView";
import { CommitDetails } from "./CommitDetails";
import { HistoricalFileContentView } from "./HistoricalFileContentView";
import { CreateBranchModal } from "./CreateBranchModal";
import { RepositoryStatsModal } from "./RepositoryStatsModal";
import { MergeConflictEditor } from "./MergeConflictEditor";
import { WorktreesSidebar } from "./Sidebar/WorktreesSidebar";
import { WorkspaceHeader } from "./workspace/WorkspaceHeader";
import { WorkspaceActivityBar } from "./workspace/WorkspaceActivityBar";
import { WorkspaceSearchBar } from "./workspace/WorkspaceSearchBar";
import { GraphBranchContextMenu } from "./workspace/GraphBranchContextMenu";
import { useGitActions } from "../hooks/useGitActions";
import { useDialog } from "../context/DialogContext";
import {
  Commit,
  CommitDetails as CommitDetailsType,
} from "../../domain/entities/GitEntities";

import { useRepositoryWorkspaceController } from "../controllers/useRepositoryWorkspaceController";
import { useGraphActionsController } from "../controllers/useGraphActionsController";

interface RepositoryWorkspaceProps {
  repoPath: string;
  onBack: () => void;
  onOpenSubmodule?: (absolutePath: string) => void;
}

export function RepositoryWorkspace({
  repoPath,
  onBack,
  onOpenSubmodule,
}: RepositoryWorkspaceProps) {
  const { state, actions } = useRepositoryWorkspaceController(repoPath, onBack);

  const {
    commitSearchQuery,
    selectedCommit,
    commitDetails,
    detailsLoading,
    isStatsModalOpen,
    diffTarget,
    contentTarget,
    conflictTarget,
    activeSidebarTab,
    createBranchTarget,
    graphBranchContextMenu,
    refreshDate,
    searchType,
    isSearching,
    hasMoreSearch,
    isLoadingMoreSearch,
    isBranchDropdownOpen,
    isScrollingToHead,
    graphBranches,
    isBranchFilterOpen,
    isPulling,
    isPushing,
    isFetchingManual,
    checkoutingBranch,
    commits,
    branchName,
    availableBranches,
    headHash,
    isLoadingMore,
    hasMore,
    isWorktree,
    worktreeCount,
    displayCommits,
    aheadCount,
    behindCount,
    isAutoFetching
  } = state;

  const {
    setCommitSearchQuery,
    setSelectedCommit,
    setIsStatsModalOpen,
    setDiffTarget,
    setContentTarget,
    setConflictTarget,
    setActiveSidebarTab,
    setCreateBranchTarget,
    setGraphBranchContextMenu,
    setSearchType,
    setIsBranchDropdownOpen,
    setGraphBranches,
    setIsBranchFilterOpen,
    setCheckoutingBranch,
    setCommitDetails,
    setDetailsLoading,
    setRefreshDate,
    loadCommits,
    loadMoreCommits,
    checkoutBranch,
    handleViewFileHistory,
    loadMoreSearchResults,
    handleFetch,
    handlePull,
    handlePush,
    onActionSuccess
  } = actions;

  const graphActions = useGraphActionsController(repoPath, branchName, onActionSuccess);
  
  const {
      handleCreateTag,
      handleMerge,
      handleRevert,
      handleCherryPick,
      handleRebase,
      handleReset
  } = graphActions;
  
  const handleCreateBranch = (hash: string) => {
    graphActions.handleCreateBranch(hash, actions.setCreateBranchTarget);
  };

  const gitActions = useGitActions(repoPath, onActionSuccess);
  const { showConfirm, showInput, showAlert } = useDialog();
  const graphRef = useRef<GraphHandle>(null);

  // Scroll the graph to the HEAD commit of the current branch.
  const handleScrollToHead = async () => {
    if (isScrollingToHead) return;

    const isHead = (c: Commit) => {
      if (headHash && c.hash === headHash) return true;
      if (!c.refs) return false;
      return c.refs.some((r) => r === "HEAD" || r.toUpperCase().startsWith("HEAD ->"));
    };

    const foundLocal = commits.find(isHead);
    if (foundLocal) {
      const found = graphRef.current?.scrollToHash(foundLocal.hash);
      if (found) return;
    }

    actions.setIsScrollingToHead(true);
    let pagesSearched = 0;
    const MAX_PAGES = 10;
    try {
      while (hasMore && pagesSearched < MAX_PAGES) {
        if (isLoadingMore) {
          await new Promise((r) => setTimeout(r, 300));
          continue;
        }
        await loadMoreCommits();
        pagesSearched++;
        await new Promise((r) => setTimeout(r, 50));
        const headCommit = commits.find(isHead);
        if (headCommit) {
          graphRef.current?.scrollToHash(headCommit.hash);
          return;
        }
      }
      graphRef.current?.scrollToTop();
      if (pagesSearched >= MAX_PAGES && !commits.find(isHead)) {
        showAlert("HEAD no encontrado", "No se encontró el commit HEAD en el gráfico actual.");
      }
    } finally {
      actions.setIsScrollingToHead(false);
    }
  };

  const handleCheckoutCommit = (hash: string) => {
    showConfirm("Checkout Commit", `Checkout ${hash.substring(0, 7)}? Detached HEAD.`, async () => {
      try {
        await gitActions.checkoutCommit(hash);
        showAlert("Checked Out", `Checked out ${hash.substring(0, 7)}`);
      } catch (e: any) {
        showAlert("Error", e.toString());
      }
    });
  };

  const repoName = repoPath.split(/[\/\\]/).pop() || "Repository";

  const handleGraphBranchCheckout = (refName: string) => {
    const isRemote = refName.includes("/");
    if (isRemote) {
      const parts = refName.split("/");
      const localName = parts.slice(1).join("/");
      showConfirm("Checkout Remote Branch", `Create and checkout local tracking branch '${localName}'?`, async () => {
        try {
          await gitActions.createBranch(localName, refName);
          await gitActions.checkoutBranch(localName);
          showAlert("Success", `Created and checked out '${localName}'.`);
          onActionSuccess();
        } catch (e: any) { showAlert("Error", e.toString()); }
      });
    } else {
      showConfirm("Checkout Branch", `Checkout branch '${refName}'?`, async () => {
        try {
          await gitActions.checkoutBranch(refName);
          showAlert("Success", `Checked out '${refName}'.`);
          onActionSuccess();
        } catch (e: any) { showAlert("Error", e.toString()); }
      });
    }
  };

  const handleGraphBranchMerge = (refName: string) => {
    graphActions.handleMerge(refName);
  };

  const handleGraphBranchCreateFrom = (refName: string) => {
    showInput("Create Branch", `New branch name (from ${refName}):`, async (newName) => {
      if (!newName) return;
      try {
        await gitActions.createBranch(newName, refName);
        showAlert("Success", `Created branch '${newName}' from '${refName}'.`);
        onActionSuccess();
      } catch (e: any) { showAlert("Error", e.toString()); }
    });
  };

  const handleGraphBranchCreateTag = (refName: string) => {
      graphActions.handleCreateTag(refName);
  };

  const handleGraphBranchRebase = (refName: string) => {
      graphActions.handleRebase(refName);
  };

  const handleGraphBranchCherryPick = (refName: string) => {
      graphActions.handleCherryPick(refName);
  };

  const handleGraphBranchReset = (refName: string, mode: "soft" | "mixed" | "hard") => {
      graphActions.handleReset(refName, mode);
  };

  const handleGraphBranchDelete = (refName: string) => {
    showConfirm("Delete Branch", `Delete branch '${refName}'? This cannot be undone.`, async () => {
      try {
        await gitActions.deleteBranch(refName, false);
        onActionSuccess();
      } catch (e: any) {
        const msg = e.toString();
        if (msg.includes("not fully merged")) {
          showConfirm("Force Delete", `Branch '${refName}' is not fully merged. Force-delete anyway?`, async () => {
            try {
              await gitActions.deleteBranch(refName, true);
              onActionSuccess();
            } catch (fe: any) { showAlert("Error", fe.toString()); }
          });
        } else {
          showAlert("Error", msg);
        }
      }
    });
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full min-w-0 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-hidden">
      {/* Header */}
      <WorkspaceHeader
        repoName={repoName}
        repoPath={repoPath}
        onBack={onBack}
        branchName={branchName}
        isBranchDropdownOpen={isBranchDropdownOpen}
        setIsBranchDropdownOpen={setIsBranchDropdownOpen}
        availableBranches={availableBranches}
        checkoutingBranch={checkoutingBranch}
        onCheckoutBranch={async (branch) => {
          try {
            setCheckoutingBranch(branch);
            await checkoutBranch(branch);
            setIsBranchDropdownOpen(false);
            showAlert("Branch Switched", `Successfully checked out ${branch}`);
          } catch (e: any) {
            setIsBranchDropdownOpen(false);
            showAlert("Checkout Failed", e.toString());
          } finally {
            setCheckoutingBranch(null);
          }
        }}
        commitsLength={commits.length}
        isScrollingToHead={isScrollingToHead}
        onScrollToHead={handleScrollToHead}
        setIsStatsModalOpen={setIsStatsModalOpen}
        isFetchingManual={isFetchingManual}
        isAutoFetching={isAutoFetching}
        onFetch={handleFetch}
        isPulling={isPulling}
        behindCount={behindCount}
        onPull={handlePull}
        isPushing={isPushing}
        aheadCount={aheadCount}
        onPush={handlePush}
      />

      {/* Main Content (Activity Bar + Sidebar + Main Area) */}
      <main className="flex-1 overflow-hidden relative flex bg-slate-50 dark:bg-slate-900">
        {/* Activity Bar (Leftmost Column) */}
        <WorkspaceActivityBar
          activeSidebarTab={activeSidebarTab}
          setActiveSidebarTab={setActiveSidebarTab}
          isWorktree={isWorktree}
          worktreeCount={worktreeCount}
        />

        {/* Dynamic Sidebar (Changes / Branches / Rescue) */}
        <div className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-10 transition-all">
          {activeSidebarTab === "changes" && (
            <SourceControl
              repoPath={repoPath}
              latestCommit={commits.length > 0 ? commits[0] : null}
              onSelectFile={(file, cached) => {
                setDiffTarget({ path: file, cached });
              }}
              onViewFileHistory={handleViewFileHistory}
              onOpenSubmodule={onOpenSubmodule}
              onCommit={loadCommits}
              isAutoFetching={isAutoFetching || isFetchingManual}
              onFetch={handleFetch}
              onResolveConflict={(path) => setConflictTarget(path)}
              refreshTrigger={refreshDate}
            />
          )}

          {activeSidebarTab === "branches" && (
            <BranchesSidebar
              repoPath={repoPath}
              currentBranch={branchName}
              onRefreshGraph={loadCommits}
            />
          )}

          {activeSidebarTab === "tags" && (
            <TagsSidebar repoPath={repoPath} onRefreshGraph={loadCommits} />
          )}

          {activeSidebarTab === "rescue" && (
            <RescueSidebar 
              repoPath={repoPath} 
              onRestore={loadCommits} 
              onSelect={async (hash) => {
                  try {
                      setDetailsLoading(true);
                      const commit = await invoke<Commit>("get_commit_details", { path: repoPath, hash });
                      setSelectedCommit(commit);
                      const detailsInfo = await invoke<CommitDetailsType>("get_commit_details_info", { path: repoPath, hash });
                      setCommitDetails(detailsInfo);
                  } catch(e) {
                      console.error("Failed to fetch reflog commit details", e);
                  } finally {
                      setDetailsLoading(false);
                  }
              }}
            />
          )}

          {activeSidebarTab === "worktrees" && !isWorktree && (
            <WorktreesSidebar
               repoPath={repoPath}
               onRefreshGraph={loadCommits}
               onOpenWorktree={onOpenSubmodule}
            />
          )}
        </div>

        {/* Middle Column: History Graph & Search (and Overlay Diff) */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-slate-950">
          {/* Search Bar — includes branch filter button */}
          <WorkspaceSearchBar
            graphBranches={graphBranches}
            setGraphBranches={setGraphBranches}
            isBranchFilterOpen={isBranchFilterOpen}
            setIsBranchFilterOpen={setIsBranchFilterOpen}
            availableBranches={availableBranches}
            branchName={branchName}
            commitSearchQuery={commitSearchQuery}
            setCommitSearchQuery={setCommitSearchQuery}
            searchType={searchType}
            setSearchType={setSearchType}
            isSearching={isSearching}
            onClearSearch={() => {
              setSelectedCommit(null);
              setCommitSearchQuery("");
            }}
          />

          {/* Graph */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            <Graph
              ref={graphRef}
              commits={displayCommits}
              selectedCommit={selectedCommit}
              onSelectCommit={setSelectedCommit}
              onLoadMore={
                commitSearchQuery.trim().length > 0
                  ? hasMoreSearch
                    ? loadMoreSearchResults
                    : undefined
                  : loadMoreCommits
              }
              isLoadingMore={
                commitSearchQuery.trim().length > 0
                  ? isLoadingMoreSearch
                  : isLoadingMore
              }
              hasMore={
                commitSearchQuery.trim().length > 0 ? hasMoreSearch : hasMore
              }
              isSearchResult={commitSearchQuery.trim().length > 0}
              onBranchContextMenu={(refName, x, y) => {
                setGraphBranchContextMenu({ visible: true, x, y, refName });
              }}
            />

            <GraphBranchContextMenu
              contextMenu={graphBranchContextMenu}
              onClose={() => setGraphBranchContextMenu(prev => ({ ...prev, visible: false }))}
              branchName={branchName}
              onCheckout={handleGraphBranchCheckout}
              onCreateFrom={handleGraphBranchCreateFrom}
              onCreateTag={handleGraphBranchCreateTag}
              onMerge={handleGraphBranchMerge}
              onRebase={handleGraphBranchRebase}
              onCherryPick={handleGraphBranchCherryPick}
              onReset={handleGraphBranchReset}
              onDelete={handleGraphBranchDelete}
            />
          </div>

          {/* Diff View Overlay (over the middle column) */}
          {diffTarget && (
            <div className="absolute inset-0 z-20 bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-bottom-4 duration-200 shadow-2xl">
              <header className="h-12 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setDiffTarget(null)}
                    className="flex items-center space-x-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-xl">
                    {diffTarget.path}
                  </span>
                </div>
              </header>
              <div className="flex-1 overflow-hidden">
                  <DiffView
                      repoPath={repoPath}
                      filePath={diffTarget.path}
                      commitHash={diffTarget.commitHash}
                      cached={diffTarget.cached}
                      onClose={() => setDiffTarget(null)}
                      onRefresh={onActionSuccess}
                  />
              </div>
            </div>
          )}

          {/* Historical File Content View Overlay */}
          {contentTarget && (
            <HistoricalFileContentView
              repoPath={repoPath}
              filePath={contentTarget.path}
              commitHash={contentTarget.commitHash}
              onClose={() => setContentTarget(null)}
            />
          )}

          {/* Merge Conflict Editor Overlay */}
          {conflictTarget && (
             <MergeConflictEditor
               repoPath={repoPath}
               filePath={conflictTarget}
               onResolved={() => {
                 setConflictTarget(null);
                 setRefreshDate(new Date());
                 loadCommits();
               }}
               onCancel={() => setConflictTarget(null)}
             />
          )}
        </div>

        {/* Right Column: Commit Details */}
        {selectedCommit && (
          <div className="w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-in slide-in-from-right duration-200 z-10 shadow-xl overflow-y-auto">
            <CommitDetails
              repoPath={repoPath}
              commit={selectedCommit}
              details={commitDetails}
              detailsLoading={detailsLoading}
              currentBranch={branchName}
              fileFilter={
                searchType === "file" && commitSearchQuery.trim().length > 0
                  ? commitSearchQuery.trim()
                  : undefined
              }
              onClose={() => setSelectedCommit(null)}
              onCopyHash={(h) => navigator.clipboard.writeText(h)}
              onSelectFile={(p) =>
                setDiffTarget({
                  path: p,
                  commitHash: selectedCommit.hash,
                  cached: false,
                })
              }
              onViewHistoricalFile={(p) =>
                setContentTarget({ path: p, commitHash: selectedCommit.hash })
              }
              onViewFileHistory={handleViewFileHistory}
              onCheckout={handleCheckoutCommit}
              onCreateBranch={handleCreateBranch}
              onCreateTag={handleCreateTag}
              onMerge={handleMerge}
              onRevert={handleRevert}
              onCherryPick={handleCherryPick}
              onRebase={handleRebase}
              onReset={handleReset}
              onRefreshGraph={() => loadCommits()}
            />
          </div>
        )}
      </main>

      {/* Overlays */}
      {createBranchTarget && (
        <CreateBranchModal
          baseCommit={createBranchTarget}
          onClose={() => setCreateBranchTarget(null)}
          onSubmit={async (name, checkout) => {
            await gitActions.createBranch(name, createBranchTarget);
            if (checkout) {
              await gitActions.checkoutBranch(name);
              showAlert("Success", `Branch '${name}' created and checked out.`);
              loadCommits();
            } else {
              showAlert("Success", `Branch '${name}' created.`);
            }
          }}
        />
      )}

      {isStatsModalOpen && (
        <RepositoryStatsModal
          repoPath={repoPath}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}
    </div>
  );
}
