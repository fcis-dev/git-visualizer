import { useDialog } from "../context/DialogContext";
import { ExecuteGitActionUseCase } from "../../domain/usecases/ExecuteGitActionUseCase";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";

// We instantiate the use case directly if no DI framework is present.
const gitRepository = new TauriGitRepository();
const executeGitActionUseCase = new ExecuteGitActionUseCase(gitRepository);

export function useGraphActionsController(
  repoPath: string,
  branchName: string,
  onActionSuccess: () => void
) {
  const { showConfirm, showInput, showAlert } = useDialog();

  const handleCreateBranch = (hash: string, onSetTarget: (hash: string) => void) => {
    onSetTarget(hash);
  };

  const handleCreateTag = (hash: string) => {
    showInput("Create Tag", "Tag name:", async (name) => {
      if (!name) return;
      try {
        await executeGitActionUseCase.createTag(repoPath, name, hash);
        onActionSuccess();
      } catch (e: any) {
        showAlert("Error", e.toString());
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
          showAlert("Error", e.toString());
        }
      },
    );
  };

  const handleRevert = (hash: string) => {
    showConfirm("Revert", `Revert ${hash.substring(0, 7)}?`, async () => {
      try {
        await executeGitActionUseCase.revert(repoPath, hash);
        onActionSuccess();
      } catch (e: any) {
        showAlert("Error", e.toString());
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
          showAlert("Error", e.toString());
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
          showAlert("Rebase Complete", "Success.");
          onActionSuccess();
        } catch (e: any) {
          showAlert("Error", e.toString());
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
          showAlert("Reset Complete", "Success.");
          onActionSuccess();
        } catch (e: any) {
          showAlert("Error", e.toString());
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
