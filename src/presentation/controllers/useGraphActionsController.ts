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
      t('graphActions.mergeTitle'),
      t('graphActions.mergeConfirm', { hash: hash.substring(0, 7), branch: branchName }),
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
      t('graphActions.cherryPickTitle'),
      t('graphActions.cherryPickConfirm', { hash: hash.substring(0, 7) }),
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
      t('graphActions.rebaseTitle'),
      t('graphActions.rebaseConfirm', { branch: branchName, hash: hash.substring(0, 7) }),
      async () => {
        try {
          await executeGitActionUseCase.rebase(repoPath, hash);
          onActionSuccess();
        } catch (e: any) {
          showAlert(t('graphActions.errorTitle'), e.toString());
        }
      }
    );
  };

  const handleReset = (hash: string, mode: "soft" | "mixed" | "hard") => {
    showConfirm(
      t('graphActions.resetTitle', { mode }),
      t('graphActions.resetConfirm', { hash: hash.substring(0, 7) }),
      async () => {
        try {
          await executeGitActionUseCase.reset(repoPath, hash, mode);
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
