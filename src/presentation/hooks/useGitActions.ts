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

    const pushTags = async () => {
        if (!repoPath) return;
        await repository.pushTags(repoPath);
        onSuccess?.();
    };

    const deleteTag = async (name: string) => {
        if (!repoPath) return;
        await repository.deleteTag(repoPath, name);
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

    const commitAmend = async (message: string) => {
        if (!repoPath) return;
        return await repository.commitAmend(repoPath, message);
    };

    const getReflog = async () => {
        if (!repoPath) return [];
        return await repository.getReflog(repoPath);
    };

    const getTags = async () => {
        if (!repoPath) return [];
        return await repository.getTags(repoPath);
    };

    const getBranchesInfo = async () => {
        if (!repoPath) return [];
        return await repository.getBranchesInfo(repoPath);
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
        pushTags,
        deleteTag,
        createBranch,
        getCommitDetails,
        resolveConflict,
        getCommitTree,
        getFileContentAtCommit,
        searchCommits,
        commitAmend,
        getReflog,
        getTags,
        getBranchesInfo,
        getStashes: async () => repoPath ? await repository.getStashes(repoPath) : [],
        applyStash: async (index: string) => {
            if (repoPath) {
                await repository.applyStash(repoPath, index);
                onSuccess?.();
            }
        },
        dropStash: async (index: string) => {
            if (repoPath) {
                await repository.dropStash(repoPath, index);
                onSuccess?.();
            }
        },
        popStash: async () => {
             if (repoPath) {
                 await repository.stashPop(repoPath);
                 onSuccess?.();
             }
        },
        
        getRebaseState: async () => repoPath ? await repository.getRebaseState(repoPath) : false,
        rebaseInteractive: async (baseCommit: string, sequence: string) => {
             if (repoPath) {
                 await repository.rebaseInteractive(repoPath, baseCommit, sequence);
                 onSuccess?.();
             }
        },
        rebaseContinue: async () => {
             if (repoPath) {
                 await repository.rebaseContinue(repoPath);
                 onSuccess?.();
             }
        },
        rebaseAbort: async () => {
             if (repoPath) {
                 await repository.rebaseAbort(repoPath);
                 onSuccess?.();
             }
        },
    };
}
