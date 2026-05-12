import { useState, useCallback, useEffect } from "react";
import { sourceControlUseCases, repository } from "../../domain/di/Container";
import { SubmoduleInfo } from "../../domain/entities/GitEntities";
import { useDialog } from "../context/DialogContext";
import { useGitActions } from "../hooks/useGitActions";
import { useTranslation } from "react-i18next";

export interface FileStatus {
  path: string;
  status: string;
}

export function useSourceControlController(
  repoPath: string | null,
  onCommit?: () => void,
  refreshTrigger?: any
) {
  const { t } = useTranslation();
  const [stagedFiles, setStagedFiles] = useState<FileStatus[]>([]);
  const [changes, setChanges] = useState<FileStatus[]>([]);
  const [commitMessage, setCommitMessage] = useState("");
  const [lastMergeMsg, setLastMergeMsg] = useState("");
  const [stashLoading, setStashLoading] = useState(false);
  const [rebaseLoading, setRebaseLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submodules, setSubmodules] = useState<SubmoduleInfo[]>([]);
  const [submodulesLoading, setSubmodulesLoading] = useState(false);
  const [isAddingSubmodule, setIsAddingSubmodule] = useState(false);
  const [stashesCount, setStashesCount] = useState(0);
  const [isAmend, setIsAmend] = useState(false);
  const [previousMessage, setPreviousMessage] = useState("");
  const [isRebasing, setIsRebasing] = useState(false);

  // Git LFS
  const [isLfsInstalled, setIsLfsInstalled] = useState(false);
  const [lfsFiles, setLfsFiles] = useState<string[]>([]);

  useEffect(() => {
    const checkLfs = () => {
      repository.isLfsInstalled().then(installed => {
        const lfsEnabled = localStorage.getItem("enableGitLfs") === "true";
        setIsLfsInstalled(installed && lfsEnabled);
      });
    };
    
    checkLfs();
    window.addEventListener("lfs-config-changed", checkLfs);
    return () => window.removeEventListener("lfs-config-changed", checkLfs);
  }, []);

  const { showConfirm, showInput, showAlert } = useDialog();
  const gitActions = useGitActions(repoPath || "");

  const loadStatus = useCallback(async () => {
    if (!repoPath) return;
    try {
      const [status, fetchedLfsFiles] = await Promise.all([
        repository.getSourceControlStatus(repoPath),
        isLfsInstalled ? repository.getLfsFiles(repoPath) : Promise.resolve([])
      ]);

      const staged: { path: string; status: string }[] = [];
      const changed: { path: string; status: string }[] = [];

      status.files.forEach((s) => {
        if (s.status === "staged") {
          staged.push(s);
        } else if (s.status === "conflicted") {
          changed.unshift(s);
        } else {
          changed.push(s);
        }
      });

      setStagedFiles(staged);
      setChanges(changed);
      setIsRebasing(status.is_rebasing);
      setSubmodules(status.submodules);
      setStashesCount(status.stash_count);
      setLfsFiles(fetchedLfsFiles);

      if (status.merge_msg && status.merge_msg !== lastMergeMsg) {
        setLastMergeMsg(status.merge_msg);
        if (commitMessage.trim() === "") {
          setCommitMessage(status.merge_msg);
        }
      } else if (!status.merge_msg && lastMergeMsg !== "") {
        if (commitMessage === lastMergeMsg) {
          setCommitMessage("");
        }
        setLastMergeMsg("");
      }
    } catch (err: any) {
      console.error("Failed to load status", err);
      setError(err.toString());
    }
  }, [repoPath, lastMergeMsg, commitMessage, isLfsInstalled]);

  useEffect(() => {
    if (repoPath) {
      loadStatus();

      const intervalId = setInterval(() => {
        loadStatus();
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [repoPath, refreshTrigger, loadStatus]);

  const handleStage = async (file: string) => {
    if (!repoPath) return;
    try {
      await sourceControlUseCases.stageFiles(repoPath, [file]);
      loadStatus();
    } catch (err) {
      console.error("Failed to stage", err);
    }
  };

  const handleStageAll = async () => {
    if (!repoPath || changes.length === 0) return;
    try {
      const files = changes.map((c) => c.path);
      await sourceControlUseCases.stageFiles(repoPath, files);
      loadStatus();
    } catch (err) {
      console.error("Failed to stage all", err);
    }
  };

  const handleUnstage = async (file: string) => {
    if (!repoPath) return;
    try {
      await sourceControlUseCases.unstageFiles(repoPath, [file]);
      loadStatus();
    } catch (err) {
      console.error("Failed to unstage", err);
    }
  };

  const handleUnstageAll = async () => {
    if (!repoPath || stagedFiles.length === 0) return;
    try {
      const files = stagedFiles.map((c) => c.path);
      await sourceControlUseCases.unstageFiles(repoPath, files);
      loadStatus();
    } catch (err: any) {
      setError(err.toString());
    }
  };

  const handleResolveConflict = async (
    file: string,
    strategy: "ours" | "theirs"
  ) => {
    if (!repoPath) return;
    try {
      await sourceControlUseCases.resolveConflict(repoPath, file, strategy);
      loadStatus();
    } catch (err: any) {
      console.error("Failed to resolve conflict", err);
      setError(t('sidebar.sourceControl.errorResolveFailed', { error: err.toString() }));
    }
  };

  const handleDiscard = async (file: string) => {
    if (!repoPath) return;
    showConfirm(
      t('sidebar.sourceControl.discardTitle'),
      t('sidebar.sourceControl.discardMsg', { file }),
      async () => {
        try {
          await sourceControlUseCases.discardChanges(repoPath, [file]);
          loadStatus();
        } catch (err: any) {
          console.error("Failed to discard", err);
          setError(err.toString());
        }
      }
    );
  };

  const handleDiscardAll = () => {
    if (!repoPath || changes.length === 0) return;
    showConfirm(
      t('sidebar.sourceControl.discardAllTitle'),
      t('sidebar.sourceControl.discardAllMsg', { count: changes.length }),
      async () => {
        try {
          const files = changes.map((c) => c.path);
          await sourceControlUseCases.discardChanges(repoPath, files);
          loadStatus();
        } catch (err: any) {
          setError(err.toString());
        }
      }
    );
  };

  const handleCommit = async (noVerify?: boolean) => {
    if (!repoPath || !commitMessage) return;
    setCommitLoading(true);
    try {
      if (isAmend) {
        await sourceControlUseCases.commitAmend(repoPath, commitMessage);
        setIsAmend(false);
      } else {
        await sourceControlUseCases.commit(repoPath, commitMessage, noVerify);
      }
      setCommitMessage("");
      loadStatus();
      if (onCommit) onCommit();
    } catch (err: any) {
      console.error("Failed to commit", err);
      let errMsg = err.toString();
      if (
        errMsg.includes("not fully merged index") ||
        errMsg.includes("Unmerged (-10)")
      ) {
        errMsg = t('sidebar.sourceControl.commitErrorConflicts');
      }
      setError(errMsg);
    } finally {
      setCommitLoading(false);
    }
  };

  const handleStashSave = () => {
    if (!repoPath) return;
    showInput(t('sidebar.sourceControl.stashTitle'), t('sidebar.sourceControl.stashMsg'), async (msg) => {
      setStashLoading(true);
      try {
        await sourceControlUseCases.stashSave(repoPath, msg || undefined);
        loadStatus();
      } catch (err: any) {
        console.error("Failed to stash", err);
        setError(err.toString());
      } finally {
        setStashLoading(false);
      }
    });
  };

  const handleRebaseAbort = async () => {
    if (!repoPath) return;
    try {
      setRebaseLoading(true);
      await sourceControlUseCases.rebaseAbort(repoPath);
      setCommitMessage("");
      loadStatus();
      if (onCommit) onCommit();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setRebaseLoading(false);
    }
  };

  const handleRebaseContinue = async () => {
    if (!repoPath) return;
    try {
      setRebaseLoading(true);
      await sourceControlUseCases.rebaseContinue(repoPath);
      loadStatus();
      if (onCommit) onCommit();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setRebaseLoading(false);
    }
  };

  const handleAddSubmodule = () => {
    showInput(
      t('sidebar.sourceControl.addSubmodule'),
      t('sidebar.sourceControl.addSubmodulePrompt'),
      async (url) => {
      if (!url) return;
      showInput(
        t('sidebar.sourceControl.addSubmodule'),
        t('sidebar.sourceControl.addSubmodulePathPrompt'),
        async (pathName) => {
          if (!pathName) return;
          try {
            setSubmodulesLoading(true);
            setIsAddingSubmodule(true);
            await gitActions.addSubmodule(url, pathName);
            loadStatus();
          } catch (e: any) {
            setError(e.toString());
            showAlert(t('sidebar.sourceControl.errorAddingSubmodule'), e.toString());
          } finally {
            setSubmodulesLoading(false);
            setIsAddingSubmodule(false);
          }
        }
      );
    });
  };

  const handleSyncSubmodules = async () => {
    try {
      setSubmodulesLoading(true);
      await gitActions.syncSubmodules();
      loadStatus();
    } finally {
      setSubmodulesLoading(false);
    }
  };

  const handleUpdateSubmodules = async () => {
    try {
      setSubmodulesLoading(true);
      await gitActions.updateSubmodules();
      loadStatus();
    } finally {
      setSubmodulesLoading(false);
    }
  };

  const handleRemoveSubmodule = (subPath: string, subName: string) => {
    showConfirm(
      t('sidebar.sourceControl.removeSubmoduleTitle'),
      t('sidebar.sourceControl.removeSubmoduleMsg', { name: subName }),
      async () => {
        try {
          setSubmodulesLoading(true);
          await gitActions.removeSubmodule(subPath);
          loadStatus();
        } catch (e: any) {
          console.error(e);
          setError(e.toString());
          showAlert(t('sidebar.sourceControl.errorRemovingSubmodule'), e.toString());
        } finally {
          setSubmodulesLoading(false);
        }
      }
    );
  };

  const handleLfsTrack = async (file: string) => {
    if (!repoPath) return;
    const parts = file.split(".");
    const ext = parts.length > 1 ? `*.${parts.pop()}` : file;
    showInput(t("sidebar.sourceControl.lfsTrackConfig"), t("sidebar.sourceControl.lfsTrackPattern", { ext }), async (pattern) => {
      if (!pattern) return;
      try {
        await repository.trackLfs(repoPath, pattern);
        loadStatus();
        showAlert("Git LFS", t("sidebar.sourceControl.lfsTrackSuccess", { pattern }));
      } catch (err: any) {
        setError(err.toString());
        showAlert(t("sidebar.sourceControl.lfsErrorTracking"), err.toString());
      }
    }, ext);
  };

  const handleLfsLock = async (file: string) => {
    if (!repoPath) return;
    try {
      await repository.lockLfs(repoPath, file);
      showAlert("Git LFS", t("sidebar.sourceControl.lfsLockSuccess", { file }));
    } catch (err: any) {
      setError(err.toString());
      showAlert(t("sidebar.sourceControl.lfsErrorLocking"), err.toString());
    }
  };

  const handleLfsUnlock = async (file: string) => {
    if (!repoPath) return;
    try {
      await repository.unlockLfs(repoPath, file);
      showAlert("Git LFS", t("sidebar.sourceControl.lfsUnlockSuccess", { file }));
    } catch (err: any) {
      setError(err.toString());
      showAlert(t("sidebar.sourceControl.lfsErrorUnlocking"), err.toString());
    }
  };

  const handleLfsPull = async () => {
    if (!repoPath) return;
    try {
      await repository.pullLfs(repoPath);
      loadStatus();
      showAlert("Git LFS", t("sidebar.sourceControl.lfsPullSuccess"));
    } catch (err: any) {
      setError(err.toString());
      showAlert(t("sidebar.sourceControl.lfsErrorPulling"), err.toString());
    }
  };

  return {
    state: {
      stagedFiles,
      changes,
      commitMessage,
      lastMergeMsg,
      stashLoading,
      rebaseLoading,
      error,
      submodules,
      submodulesLoading,
      isAddingSubmodule,
      stashesCount,
      isAmend,
      previousMessage,
      isRebasing,
      isLfsInstalled,
      lfsFiles,
      commitLoading,
    },
    actions: {
      setCommitMessage,
      setIsAmend,
      setPreviousMessage,
      loadStatus,
      handleStage,
      handleStageAll,
      handleUnstage,
      handleUnstageAll,
      handleResolveConflict,
      handleDiscard,
      handleDiscardAll,
      handleCommit,
      handleStashSave,
      handleRebaseAbort,
      handleRebaseContinue,
      handleAddSubmodule,
      handleSyncSubmodules,
      handleUpdateSubmodules,
      handleRemoveSubmodule,
      handleLfsTrack,
      handleLfsLock,
      handleLfsUnlock,
      handleLfsPull,
    }
  };
}
