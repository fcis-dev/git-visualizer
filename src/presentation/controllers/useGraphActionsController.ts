import { useDialog } from "../context/DialogContext";
import { ExecuteGitActionUseCase } from "../../domain/usecases/ExecuteGitActionUseCase";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";
import { useTranslation } from "react-i18next";

// We instantiate the use case directly if no DI framework is present.
const gitRepository = new TauriGitRepository();
const executeGitActionUseCase = new ExecuteGitActionUseCase(gitRepository);

export function useGraphActionsController(
  repoPath: string,
  branchName: string,
  onActionSuccess: () => void
) {
  const { showConfirm, showInput, showAlert } = useDialog();
  const { t } = useTranslation();

  const handleCreateBranch = (hash: string, onSetTarget: (hash: string) => void) => {
    onSetTarget(hash);
  };

  const handleCreateTag = (hash: string) => {
    showInput(t('graphActions.createTagTitle'), t('graphActions.createTagPrompt'), async (name) => {
      if (!name) return;
      try {
        await executeGitActionUseCase.createTag(repoPath, name, hash);
        onActionSuccess();
      } catch (e: any) {
        showAlert(t('graphActions.errorTitle'), e.toString());
      }
    });
  };

  const handleMerge = (hash: string) => {
    showConfirm(
      "Merge",
      `Merge ${hash.substring(0, 7)} into ${branchName}?`,
      async () => {
        try {
          await executeGitActionUseCase.merge(repoPath, hash);
          onActionSuccess();
        } catch (e: any) {
          showAlert(t('graphActions.errorTitle'), e.toString());
        }
      },
    );
  };

  const handleRevert = (hash: string) => {
    showConfirm(t('graphActions.revertTitle'), t('graphActions.revertConfirm', { hash: hash.substring(0, 7) }), async () => {
      try {
        await executeGitActionUseCase.revert(repoPath, hash);
        onActionSuccess();
      } catch (e: any) {
        showAlert(t('graphActions.errorTitle'), e.toString());
      }
    });
  };

  const handleCherryPick = (hash: string) => {
    showConfirm(
      "Cherry Pick",
      `Cherry-pick ${hash.substring(0, 7)}?`,
      async () => {
        try {
          await executeGitActionUseCase.cherryPick(repoPath, hash);
          onActionSuccess();
        } catch (e: any) {
          showAlert(t('graphActions.errorTitle'), e.toString());
        }
      }
    );
  };

  const handleRebase = (hash: string) => {
    showConfirm(
      "Rebase",
      `Rebase ${branchName} onto ${hash.substring(0, 7)}?`,
      async () => {
        try {
          await executeGitActionUseCase.rebase(repoPath, hash);
          showAlert(t('graphActions.rebaseCompleteTitle'), t('graphActions.rebaseCompleteMsg'));
          onActionSuccess();
        } catch (e: any) {
          showAlert(t('graphActions.errorTitle'), e.toString());
        }
      }
    );
  };

  const handleReset = (hash: string, mode: "soft" | "mixed" | "hard") => {
    showConfirm(
      `Reset (${mode})`,
      `Reset to ${hash.substring(0, 7)}?`,
      async () => {
        try {
          await executeGitActionUseCase.reset(repoPath, hash, mode);
          showAlert(t('graphActions.resetCompleteTitle'), t('graphActions.resetCompleteMsg'));
          onActionSuccess();
        } catch (e: any) {
          showAlert(t('graphActions.errorTitle'), e.toString());
        }
      }
    );
  };

  return {
    handleCreateBranch,
    handleCreateTag,
    handleMerge,
    handleRevert,
    handleCherryPick,
    handleRebase,
    handleReset,
  };
}
