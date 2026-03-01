import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";

export function useGitActions(repoPath: string, onSuccess?: () => void) {
    const repository = new TauriGitRepository();

    const checkoutCommit = async (hash: string) => {
        if (!repoPath) return;
        try {
            await repository.checkoutCommit(repoPath, hash);
        } finally {
            onSuccess?.();
        }
    };

    const checkoutBranch = async (branch: string) => {
        if (!repoPath) return;
        try {
            await repository.checkoutBranch(repoPath, branch);
        } finally {
            onSuccess?.();
        }
    };

    const fetch = async () => {
        if (!repoPath) return;
        await repository.fetch(repoPath);
        onSuccess?.();
    };

    const reset = async (hash: string, mode: 'soft' | 'mixed' | 'hard') => {
        if (!repoPath) return;
        try {
            await repository.reset(repoPath, hash, mode);
        } finally {
            onSuccess?.();
        }
    };

    const rebase = async (branch: string) => {
        if (!repoPath) return;
        try {
            await repository.rebase(repoPath, branch);
        } finally {
            onSuccess?.();
        }
    };

    const cherryPick = async (hash: string) => {
        if (!repoPath) return;
        try {
            await repository.cherryPick(repoPath, hash);
        } finally {
            onSuccess?.();
        }
    };

    const revert = async (hash: string) => {
        if (!repoPath) return;
        try {
            await repository.revert(repoPath, hash);
        } finally {
            onSuccess?.();
        }
    };

    const merge = async (branch: string) => {
        if (!repoPath) return;
        try {
            await repository.merge(repoPath, branch);
        } finally {
            onSuccess?.();
        }
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

    const renameBranch = async (oldName: string, newName: string) => {
        if (!repoPath) return;
        await repository.renameBranch(repoPath, oldName, newName);
        onSuccess?.();
    };

    const deleteBranch = async (name: string, force = false) => {
        if (!repoPath) return;
        await repository.deleteBranch(repoPath, name, force);
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

    const searchCommits = async (query: string, searchType: "all" | "message" | "author" | "file", branches?: string[], skip = 0, limit = 50) => {
        if (!repoPath) return [];
        return await repository.searchCommits(repoPath, query, searchType, branches, skip, limit);
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
        applyPatch: async (patch: string, reverse: boolean = false) => {
            if (repoPath) {
                await repository.applyPatch(repoPath, patch, reverse);
                onSuccess?.();
            }
        },
        createTag,
        pushTags,
        deleteTag,
        createBranch,
        renameBranch,
        deleteBranch,
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

        // Submodules
        getSubmodules: async () => repoPath ? await repository.getSubmodules(repoPath) : [],
        updateSubmodules: async () => {
             if (repoPath) {
                 await repository.updateSubmodules(repoPath);
                 onSuccess?.();
             }
        },
        syncSubmodules: async () => {
             if (repoPath) {
                 await repository.syncSubmodules(repoPath);
                 onSuccess?.();
             }
        },
        addSubmodule: async (url: string, name: string) => {
             if (repoPath) {
                 await repository.addSubmodule(repoPath, url, name);
                 onSuccess?.();
             }
        },
        removeSubmodule: async (name: string) => {
             if (repoPath) {
                 await repository.removeSubmodule(repoPath, name);
                 onSuccess?.();
             }
        },
        
        // Insights
        getRepositoryStats: async () => repoPath ? await repository.getRepositoryStats(repoPath) : null,

        // Worktrees
        getWorktrees: async () => repoPath ? await repository.getWorktrees(repoPath) : [],
        addWorktree: async (newPath: string, branch: string) => {
             if (repoPath) {
                 await repository.addWorktree(repoPath, newPath, branch);
                 onSuccess?.();
             }
        },
        removeWorktree: async (worktreePath: string) => {
             if (repoPath) {
                 await repository.removeWorktree(repoPath, worktreePath);
                 onSuccess?.();
             }
        },
        pruneWorktrees: async () => {
             if (repoPath) {
                 await repository.pruneWorktrees(repoPath);
                 onSuccess?.();
             }
        },
    };
}
