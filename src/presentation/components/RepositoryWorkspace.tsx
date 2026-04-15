import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { ProjectSettingsModal } from "./workspace/ProjectSettingsModal";
import { MergeConflictEditor } from "./MergeConflictEditor";
import { WorktreesSidebar } from "./Sidebar/WorktreesSidebar";
import { StashesSidebar } from "./Sidebar/StashesSidebar";
import { SubmodulesSidebar } from "./Sidebar/SubmodulesSidebar";
import { ProjectsSidebar } from "./Sidebar/ProjectsSidebar";
import { WorkspaceHeader } from "./workspace/WorkspaceHeader";
import { WorkspaceActivityBar } from "./workspace/WorkspaceActivityBar";
import { WorkspaceSearchBar } from "./workspace/WorkspaceSearchBar";
import { GraphBranchContextMenu } from "./workspace/GraphBranchContextMenu";
import { DragDropActionModal } from "./DragDropActionModal";
import { useGitActions } from "../hooks/useGitActions";
import { useDialog } from "../context/DialogContext";
import {
  Commit,
  CommitDetails as CommitDetailsType,
} from "../../domain/entities/GitEntities";

import { useRepositoryWorkspaceController } from "../controllers/useRepositoryWorkspaceController";
import { useGraphActionsController } from "../controllers/useGraphActionsController";
import { useTranslation } from "react-i18next";

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
    leftSidebarWidth,
    rightSidebarWidth,
    isLeftSidebarVisible,
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
    isAutoFetching,
    hasRemote,
    isProjectSettingsModalOpen
  } = state;

  const {
    setCommitSearchQuery,
    setSelectedCommit,
    setIsStatsModalOpen,
    setDiffTarget,
    setContentTarget,
    setConflictTarget,
    setActiveSidebarTab,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    setIsLeftSidebarVisible,
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
    setIsProjectSettingsModalOpen,
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

  const { t } = useTranslation();
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
  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);

  const [dragDropModal, setDragDropModal] = useState<{
    visible: boolean;
    x: number;
    y: number;
    sourceCommit: Commit | null;
    targetCommit: Commit | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    sourceCommit: null,
    targetCommit: null,
  });

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
        showAlert(t('repositoryWorkspace.headNotFoundTitle'), t('repositoryWorkspace.headNotFoundMsg'));
      }
    } finally {
      actions.setIsScrollingToHead(false);
    }
  };

  const handleCheckoutCommit = (hash: string) => {
    showConfirm(t('repositoryWorkspace.checkoutCommitTitle'), t('repositoryWorkspace.checkoutCommitMsg', { hash: hash.substring(0, 7) }), async () => {
      try {
        await gitActions.checkoutCommit(hash);
      } catch (e: any) {
        showAlert(t('repositoryWorkspace.errorTitle'), e.toString());
      }
    });
  };

  const repoName = repoPath.split(/[\/\\]/).pop() || t('common.repository');

  const handleGraphBranchCheckout = (refName: string) => {
    // Check if it starts with origin/ to be safer, or check against available branches
    const isRemote = refName.startsWith("origin/") || refName.startsWith("refs/remotes/");
    if (isRemote) {
      const parts = refName.split("/");
      const remoteName = parts[0]; // e.g. origin
      const localName = parts.slice(1).join("/");
      showConfirm(t('repositoryWorkspace.checkoutRemoteTitle'), t('repositoryWorkspace.checkoutRemoteMsg', { localName }), async () => {
        try {
          await gitActions.createBranch(localName, refName);
          await gitActions.checkoutBranch(localName);
          onActionSuccess();
        } catch (e: any) { showAlert(t('repositoryWorkspace.errorTitle'), e.toString()); }
      });
    } else {
      showConfirm(t('repositoryWorkspace.checkoutBranchTitle'), t('repositoryWorkspace.checkoutBranchMsg', { refName }), async () => {
        try {
          await gitActions.checkoutBranch(refName);
          onActionSuccess();
        } catch (e: any) { showAlert(t('repositoryWorkspace.errorTitle'), e.toString()); }
      });
    }
  };

  const handleGraphBranchMerge = (refName: string) => {
    graphActions.handleMerge(refName);
  };

  const handleGraphBranchCreateFrom = (refName: string) => {
    actions.setCreateBranchTarget(refName);
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

  const handleGraphBranchRevert = (refName: string) => {
      graphActions.handleRevert(refName);
  };

  const handleGraphBranchReset = (refName: string, mode: "soft" | "mixed" | "hard") => {
      graphActions.handleReset(refName, mode);
  };

  const handleGraphBranchDelete = (refName: string) => {
    showConfirm(t('repositoryWorkspace.deleteBranchTitle'), t('repositoryWorkspace.deleteBranchMsg', { refName }), async () => {
      try {
        const isRemoteMatch = refName.startsWith("origin/") || refName.startsWith("refs/remotes/");
        const actuallyIsRemote = isRemoteMatch && !availableBranches.includes(refName);

        if (actuallyIsRemote) {
          const parts = refName.split("/");
          const remote = parts[0];
          const name = parts.slice(1).join("/");
          await gitActions.deleteBranchRemote(remote, name);
        } else {
          await gitActions.deleteBranch(refName, false);
        }
        onActionSuccess();
      } catch (e: any) {
        const msg = e.toString();
        const actuallyIsRemote = refName.startsWith("origin/") || refName.startsWith("refs/remotes/");
        if (!actuallyIsRemote && msg.includes("not fully merged")) {
          showConfirm(t('repositoryWorkspace.forceDeleteTitle'), t('repositoryWorkspace.forceDeleteMsg', { refName }), async () => {
            try {
              await gitActions.deleteBranch(refName, true);
              onActionSuccess();
            } catch (fe: any) { showAlert(t('repositoryWorkspace.errorTitle'), fe.toString()); }
          });
        } else {
          showAlert(t('repositoryWorkspace.errorTitle'), msg);
        }
      }
    });
  };

  return (
    <div className="flex-1 w-full flex flex-col h-dvh min-w-0 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 overflow-hidden">
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
          } catch (e: any) {
            setIsBranchDropdownOpen(false);
            showAlert(t('repositoryWorkspace.checkoutFailedTitle'), e.toString());
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
        hasRemote={hasRemote}
        setIsProjectSettingsModalOpen={setIsProjectSettingsModalOpen}
        activeSidebarTab={activeSidebarTab}
        onToggleProjectsSidebar={() => {
          if (activeSidebarTab === "projects") {
            actions.setIsLeftSidebarVisible(!isLeftSidebarVisible);
          } else {
            actions.setActiveSidebarTab("projects");
            actions.setIsLeftSidebarVisible(true);
          }
        }}
      />

      {/* Main Content (Activity Bar + Sidebar + Main Area) */}
      <main className="flex-1 overflow-hidden relative flex bg-slate-50 dark:bg-slate-900">
        {/* Activity Bar (Leftmost Column) */}
        <WorkspaceActivityBar
          activeSidebarTab={activeSidebarTab}
          setActiveSidebarTab={setActiveSidebarTab}
          isLeftSidebarVisible={isLeftSidebarVisible}
          setIsLeftSidebarVisible={setIsLeftSidebarVisible}
          isWorktree={isWorktree}
          worktreeCount={worktreeCount}
        />

        {/* Dynamic Sidebar (Changes / Branches / Rescue) */}
        {isLeftSidebarVisible && (
        <div 
          ref={leftSidebarRef}
          style={{ width: leftSidebarWidth }} 
          className="shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col z-10 relative"
        >
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
              refreshTrigger={refreshDate}
              onCreateBranch={actions.setCreateBranchTarget}
            />
          )}

          {activeSidebarTab === "tags" && (
            <TagsSidebar repoPath={repoPath} onRefreshGraph={loadCommits} hasRemote={hasRemote} refreshTrigger={refreshDate} />
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

          {activeSidebarTab === "stashes" && (
            <StashesSidebar
              repoPath={repoPath}
              onRefreshGraph={loadCommits}
              onSelectStash={(index, rawDiff) => {
                setDiffTarget({ path: "Stash Content", stashIndex: index, rawDiff });
              }}
            />
          )}

          {activeSidebarTab === "submodules" && (
            <SubmodulesSidebar
              repoPath={repoPath}
              onOpenSubmodule={onOpenSubmodule}
              onRefreshGraph={loadCommits}
            />
          )}

          {activeSidebarTab === "projects" && (
            <ProjectsSidebar
              repoPath={repoPath}
            />
          )}

          {/* Resize Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
            onDoubleClick={() => setLeftSidebarWidth(320)}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startWidth = leftSidebarRef.current ? leftSidebarRef.current.getBoundingClientRect().width : leftSidebarWidth;
              let currentWidth = startWidth;
              let animationFrameId: number | null = null;
              
              if (leftSidebarRef.current) {
                leftSidebarRef.current.style.transition = 'none';
              }
              
              const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
                if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
                animationFrameId = requestAnimationFrame(() => {
                  currentWidth = Math.max(200, Math.min(800, startWidth + moveEvent.clientX - startX));
                  if (leftSidebarRef.current) {
                    leftSidebarRef.current.style.width = `${currentWidth}px`;
                  }
                  animationFrameId = null;
                });
              };
              const onMouseUp = () => {
                if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (leftSidebarRef.current) {
                  leftSidebarRef.current.style.transition = '';
                }
                setLeftSidebarWidth(currentWidth);
              };
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          />
        </div>
        )}

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
            <AnimatePresence mode="wait">
              <motion.div
                key={repoPath}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-hidden flex flex-col"
              >
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
                  onDropCommit={(sourceCommit, targetCommit, x, y) => {
                    setDragDropModal({
                      visible: true,
                      x,
                      y,
                      sourceCommit,
                      targetCommit,
                    });
                  }}
                />
              </motion.div>
            </AnimatePresence>


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
              onRevert={handleGraphBranchRevert}
              onReset={handleGraphBranchReset}
              onDelete={handleGraphBranchDelete}
            />
          </div>



          {/* Historical File Content View Overlay */}
          {contentTarget && (
            <HistoricalFileContentView
              repoPath={repoPath}
              filePath={contentTarget.path}
              commitHash={contentTarget.commitHash}
              onClose={() => setContentTarget(null)}
            />
          )}

          {/* Diff View Overlay */}
          {diffTarget && (
            <DiffView
                repoPath={repoPath}
                filePath={diffTarget.path}
                commitHash={diffTarget.commitHash}
                cached={diffTarget.cached}
                rawDiff={diffTarget.rawDiff}
                stashIndex={diffTarget.stashIndex}
                onClose={() => setDiffTarget(null)}
                onRefresh={onActionSuccess}
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
          <div 
            ref={rightSidebarRef}
            style={{ width: rightSidebarWidth }} 
            className="shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 animate-in slide-in-from-right duration-200 z-10 shadow-xl overflow-y-auto relative"
          >
            {/* Resize Handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors"
              onDoubleClick={() => setRightSidebarWidth(384)}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = rightSidebarRef.current ? rightSidebarRef.current.getBoundingClientRect().width : rightSidebarWidth;
                let currentWidth = startWidth;
                let animationFrameId: number | null = null;
                
                if (rightSidebarRef.current) {
                  rightSidebarRef.current.style.transition = 'none';
                }
                
                const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
                  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
                  animationFrameId = requestAnimationFrame(() => {
                    currentWidth = Math.max(250, Math.min(800, startWidth - (moveEvent.clientX - startX)));
                    if (rightSidebarRef.current) {
                      rightSidebarRef.current.style.width = `${currentWidth}px`;
                    }
                    animationFrameId = null;
                  });
                };
                const onMouseUp = () => {
                  if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                  if (rightSidebarRef.current) {
                    rightSidebarRef.current.style.transition = '';
                  }
                  setRightSidebarWidth(currentWidth);
                };
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            />
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
            }
            onActionSuccess();
          }}
        />
      )}

      {isStatsModalOpen && (
        <RepositoryStatsModal
          repoPath={repoPath}
          onClose={() => setIsStatsModalOpen(false)}
        />
      )}

      {isProjectSettingsModalOpen && (
        <ProjectSettingsModal
          repoPath={repoPath}
          onClose={() => setIsProjectSettingsModalOpen(false)}
        />
      )}

      {dragDropModal.visible && dragDropModal.sourceCommit && dragDropModal.targetCommit && (() => {
        const getCommitBranchName = (commit: Commit): string | null => {
          if (!commit.refs) return null;
          return commit.refs.find(r => !r.includes("HEAD") && !r.includes("origin/") && !r.startsWith("tag: ")) || null;
        };

        const srcHash = dragDropModal.sourceCommit.hash;
        const tgtHash = dragDropModal.targetCommit.hash;
        const srcBranch = getCommitBranchName(dragDropModal.sourceCommit);
        const tgtBranch = getCommitBranchName(dragDropModal.targetCommit);
        const tgtName = tgtBranch || tgtHash.substring(0, 7);
        const srcName = srcBranch || srcHash.substring(0, 7);

        return (
          <DragDropActionModal
            x={dragDropModal.x}
            y={dragDropModal.y}
            sourceCommitHash={srcHash}
            targetCommitHash={tgtHash}
            targetBranchName={tgtName}
            onClose={() => setDragDropModal(prev => ({ ...prev, visible: false }))}
            onSelectAction={(action) => {
              setDragDropModal(prev => ({ ...prev, visible: false }));

              if (action === "merge") {
                showConfirm(
                  t('graphActions.mergeTitle', 'Merge'),
                  `Merge ${srcHash.substring(0, 7)} into ${tgtName}?`,
                  async () => {
                    try {
                      // We want to merge src into tgt. So checkout tgt, then merge src.
                      const needsCheckout = tgtBranch ? tgtBranch !== branchName : tgtHash !== headHash;
                      if (needsCheckout) {
                        if (tgtBranch) await gitActions.checkoutBranch(tgtBranch);
                        else await gitActions.checkoutCommit(tgtHash);
                      }
                      await gitActions.merge(srcHash);
                      onActionSuccess();
                    } catch (e: any) {
                      showAlert(t('graphActions.errorTitle'), e.toString());
                    }
                  }
                );
              } else if (action === "rebase") {
                showConfirm(
                  t('graphActions.rebaseTitle', 'Rebase'),
                  `Rebase ${srcName} onto ${tgtName}?`,
                  async () => {
                    try {
                      // We want to rebase src onto tgt. So checkout src, then rebase tgt.
                      const needsCheckout = srcBranch ? srcBranch !== branchName : srcHash !== headHash;
                      if (needsCheckout) {
                        if (srcBranch) await gitActions.checkoutBranch(srcBranch);
                        else await gitActions.checkoutCommit(srcHash);
                      }
                      await gitActions.rebase(tgtBranch || tgtHash);
                      onActionSuccess();
                    } catch (e: any) {
                      showAlert(t('graphActions.errorTitle'), e.toString());
                    }
                  }
                );
              } else if (action === "cherryPick") {
                showConfirm(
                  t('graphActions.cherryPickTitle', 'Cherry-Pick'),
                  `Cherry-pick ${srcHash.substring(0, 7)} onto ${tgtName}?`,
                  async () => {
                    try {
                      // We want to cherryPick src onto tgt. So checkout tgt, then cherryPick src.
                      const needsCheckout = tgtBranch ? tgtBranch !== branchName : tgtHash !== headHash;
                      if (needsCheckout) {
                        if (tgtBranch) await gitActions.checkoutBranch(tgtBranch);
                        else await gitActions.checkoutCommit(tgtHash);
                      }
                      await gitActions.cherryPick(srcHash);
                      onActionSuccess();
                    } catch (e: any) {
                      showAlert(t('graphActions.errorTitle'), e.toString());
                    }
                  }
                );
              }
            }}
          />
        );
      })()}

    </div>
  );
}
