import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";

export function useGitActions(repoPath: string, onSuccess?: () => void) {
    const repository = new TauriGitRepository();

    const checkoutCommit = async (hash: string) => {
        if (!repoPath) return;
        await repository.checkoutCommit(repoPath, hash);
        onSuccess?.();
    };

    const checkoutBranch = async (branch: string) => {
        if (!repoPath) return;
        await repository.checkoutBranch(repoPath, branch);
        onSuccess?.();
    };

    const fetch = async () => {
        if (!repoPath) return;
        await repository.fetch(repoPath);
        onSuccess?.();
    };

    const reset = async (hash: string, mode: 'soft' | 'mixed' | 'hard') => {
        if (!repoPath) return;
        await repository.reset(repoPath, hash, mode);
        onSuccess?.();
    };

    const rebase = async (branch: string) => {
        if (!repoPath) return;
        await repository.rebase(repoPath, branch);
        onSuccess?.();
    };

    const cherryPick = async (hash: string) => {
        if (!repoPath) return;
        await repository.cherryPick(repoPath, hash);
        onSuccess?.();
    };

    const revert = async (hash: string) => {
        if (!repoPath) return;
        await repository.revert(repoPath, hash);
        onSuccess?.();
    };

    const merge = async (branch: string) => {
        if (!repoPath) return;
        await repository.merge(repoPath, branch);
        onSuccess?.();
    };

    const createTag = async (name: string, hash?: string) => {
        if (!repoPath) return;
        await repository.createTag(repoPath, name, hash);
        onSuccess?.();
    };

    const createBranch = async (name: string, hash: string) => {
        if (!repoPath) return;
        await repository.createBranch(repoPath, name, hash);
        onSuccess?.();
    };

    return {
        checkoutCommit,
        checkoutBranch,
        fetch,
        reset,
        rebase,
        cherryPick,
        revert,
        merge,
        createTag,
        createBranch
    };
}
