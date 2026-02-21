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

    const getCommitDetails = async (hash: string) => {
        if (!repoPath) return null;
        return await repository.getCommitDetails(repoPath, hash);
    };

    const resolveConflict = async (file: string, strategy: 'ours' | 'theirs') => {
        if (!repoPath) return;
        await repository.resolveConflict(repoPath, file, strategy);
        onSuccess?.();
    };

    const getCommitTree = async (hash: string) => {
        if (!repoPath) return [];
        return await repository.getCommitTree(repoPath, hash);
    };

    const getFileContentAtCommit = async (hash: string, filePath: string) => {
        if (!repoPath) return "";
        return await repository.getFileContentAtCommit(repoPath, hash, filePath);
    };

    const searchCommits = async (query: string, searchType: "all" | "message" | "author" | "file") => {
        if (!repoPath) return [];
        return await repository.searchCommits(repoPath, query, searchType);
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
        createBranch,
        getCommitDetails,
        resolveConflict,
        getCommitTree,
        getFileContentAtCommit,
        searchCommits
    };
}
