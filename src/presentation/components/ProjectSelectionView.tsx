import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  Folder,
  FolderPlus,
  GitBranch,
  Search,
  Trash2,
  ArrowRight,
  Settings,
  ArrowDown,
} from "lucide-react";
import { TauriGitRepository } from "../../data/repositories/TauriGitRepository";

interface RepoData {
  path: string;
  name: string;
  branch: string;
}

interface ProjectSelectionViewProps {
  onSelectRepo: (path: string) => void;
  onOpenSettings: () => void;
}

const repository = new TauriGitRepository();

export function ProjectSelectionView({
  onSelectRepo,
  onOpenSettings,
}: ProjectSelectionViewProps) {
  const [repos, setRepos] = useState<Record<string, RepoData[]>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  /** Path → number of commits behind remote (0 = up to date / unknown) */
  const [behindCounts, setBehindCounts] = useState<Record<string, number>>({});
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  // Flatten repos for display
  const allRepos = Object.values(repos)
    .flat()
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredRepos = allRepos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.path.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const emptyFolders = Object.keys(repos).filter(
    (folder) => repos[folder].length === 0,
  );
  const filteredEmptyFolders = emptyFolders.filter((folder) =>
    folder.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    loadFolders();
  }, []);

  /** After repos are loaded, silently fetch + check behind counts for all of them */
  const refreshBehindCounts = async (repoList: RepoData[]) => {
    if (repoList.length === 0) return;
    setIsFetchingAll(true);
    try {
      // Fire-and-forget fetch for every repo in parallel
      await Promise.allSettled(repoList.map((r) => repository.fetch(r.path)));
      // Now check behind counts in parallel
      const results = await Promise.allSettled(
        repoList.map((r) => repository.checkBehind(r.path)),
      );
      const counts: Record<string, number> = {};
      results.forEach((result, idx) => {
        counts[repoList[idx].path] =
          result.status === "fulfilled" ? result.value : 0;
      });
      setBehindCounts(counts);
    } finally {
      setIsFetchingAll(false);
    }
  };

  const loadFolders = async () => {
    setLoading(true);
    try {
      const loadedFolders = await invoke<string[]>("list_folders");

      const promises = loadedFolders.map((folder) =>
        loadReposForFolder(folder),
      );
      const folderResults = await Promise.all(promises);
      const flatRepos = folderResults.flat();
      // Kick off background fetch + behind-count check after repos are known
      refreshBehindCounts(flatRepos);
    } catch (error) {
      console.error("Failed to load folders", error);
    } finally {
      setLoading(false);
    }
  };

  const loadReposForFolder = async (folder: string): Promise<RepoData[]> => {
    try {
      const folderRepos = await invoke<RepoData[]>("get_repos_in_folder", {
        path: folder,
      });
      setRepos((prev) => ({ ...prev, [folder]: folderRepos }));
      return folderRepos;
    } catch (error) {
      console.error(`Failed to load repos for ${folder}`, error);
      return [];
    }
  };

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (selected && typeof selected === "string") {
        await invoke<string[]>("add_folder", { path: selected });
        // Correctly format path for different OS if needed
        const formattedPath = selected.replace(/\\/g, "/");
        await loadReposForFolder(formattedPath);
      }
    } catch (error) {
      console.error("Failed to add folder", error);
    }
  };

  const handleRemoveRepo = async (repoPath: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Find which folder contains this repo
    const parentFolder = Object.keys(repos).find((folder) =>
      repos[folder].some((r) => r.path === repoPath),
    );

    if (!parentFolder) return;

    try {
      await invoke<string[]>("remove_folder", { path: parentFolder });

      // Cleanup repos
      const newRepos = { ...repos };
      delete newRepos[parentFolder];
      setRepos(newRepos);
    } catch (error) {
      console.error("Failed to remove folder", error);
    }
  };

  const handleRemoveFolderDirect = async (folder: string) => {
    try {
      await invoke<string[]>("remove_folder", { path: folder });

      const newRepos = { ...repos };
      delete newRepos[folder];
      setRepos(newRepos);
    } catch (error) {
      console.error("Failed to remove folder", error);
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Projects
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Select a repository to start working
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleAddFolder}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
            >
              <FolderPlus className="w-5 h-5" />
              <span>Add Project</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm"
          />
        </div>

        {/* content */}
        {loading && allRepos.length === 0 && emptyFolders.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : filteredRepos.length > 0 || filteredEmptyFolders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-8 pr-2 custom-scrollbar">
            {filteredRepos.map((repo) => (
              <div
                key={repo.path}
                onClick={() => onSelectRepo(repo.path)}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 hover:shadow-lg dark:hover:shadow-indigo-500/5 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => handleRemoveRepo(repo.path, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-1.5 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors">
                      <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                    </div>
                  </div>
                </div>

                <h3
                  className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1 truncate"
                  title={repo.name}
                >
                  {repo.name}
                </h3>
                <p
                  className="text-sm text-slate-500 dark:text-slate-500 truncate mb-4"
                  title={repo.path}
                >
                  {repo.path}
                </p>

                <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                  <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-600 dark:text-slate-300">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[150px]">
                      {repo.branch || "..."}
                    </span>
                  </div>
                  {/* Behind-count badge */}
                  {isFetchingAll ? (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-400 dark:text-slate-500">
                      <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="31.4 31.4" />
                      </svg>
                      <span>Syncing…</span>
                    </div>
                  ) : (behindCounts[repo.path] ?? 0) > 0 ? (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <ArrowDown className="w-3 h-3" />
                      <span>{behindCounts[repo.path]} behind</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {filteredEmptyFolders.map((folder) => {
              const folderName = folder.split("/").pop() || folder;
              return (
                <div
                  key={folder}
                  className="group relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed rounded-xl p-5 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg">
                      <Folder className="w-6 h-6 opacity-50" />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFolderDirect(folder);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove Folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3
                    className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-1 truncate italic"
                    title={folderName}
                  >
                    {folderName}
                  </h3>
                  <p
                    className="text-sm text-slate-400 dark:text-slate-500 truncate mb-4"
                    title={folder}
                  >
                    {folder}
                  </p>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-medium text-slate-500 dark:text-slate-400">
                      <span>No Git Repositories Found</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
            <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <FolderPlus className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-lg font-medium mb-2">No projects found</p>
            <p className="text-sm max-w-xs text-center">
              {searchTerm
                ? "No projects match your search."
                : "Get started by adding a folder containing your Git repositories."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
