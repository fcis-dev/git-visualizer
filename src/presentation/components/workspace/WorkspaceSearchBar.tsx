import { useState } from "react";
import { GitBranch, Search, Filter, Check, ChevronDown, ChevronRight } from "lucide-react";
import { buildBranchTree, sortTreeNodes, BranchTreeNode } from "../../utils/branchTreeUtils";

interface WorkspaceSearchBarProps {
  graphBranches: string[];
  setGraphBranches: React.Dispatch<React.SetStateAction<string[]>>;
  isBranchFilterOpen: boolean;
  setIsBranchFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  availableBranches: string[];
  branchName: string;
  commitSearchQuery: string;
  setCommitSearchQuery: (q: string) => void;
  searchType: string;
  setSearchType: (t: any) => void;
  isSearching: boolean;
  onClearSearch: () => void;
}

export function WorkspaceSearchBar({
  graphBranches,
  setGraphBranches,
  isBranchFilterOpen,
  setIsBranchFilterOpen,
  availableBranches,
  branchName,
  commitSearchQuery,
  setCommitSearchQuery,
  searchType,
  setSearchType,
  isSearching,
  onClearSearch,
}: WorkspaceSearchBarProps) {
  return (
    <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex space-x-2 items-center">
      {/* Branch filter button */}
      <div className="relative shrink-0 flex items-center">
        <div
          className={`flex items-center border rounded transition-colors ${
            graphBranches.length > 0
              ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30"
              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div
            className={`pl-2.5 pr-2 border-r flex items-center self-stretch ${
              graphBranches.length > 0
                ? "border-indigo-200 dark:border-indigo-500/30 text-indigo-500"
                : "border-slate-200 dark:border-slate-800 text-slate-500"
            }`}
          >
            <GitBranch className="w-4 h-4" />
          </div>
          <button
            onClick={() => setIsBranchFilterOpen((v) => !v)}
            className={`py-2 pl-2 pr-2 text-sm focus:outline-none cursor-pointer flex items-center gap-1.5 ${
              graphBranches.length > 0
                ? "text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-slate-700 dark:text-slate-300"
            }`}
          >
            <span>
              {graphBranches.length === 0
                ? "All branches"
                : graphBranches.join(" + ")}
            </span>
            <svg
              className="w-3 h-3 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        {/* Dropdown */}
        {isBranchFilterOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsBranchFilterOpen(false)}
            />
            <div className="absolute left-0 top-full mt-1 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-40 overflow-hidden">
              <button
                onClick={() => {
                  setGraphBranches([]);
                  onClearSearch();
                  setIsBranchFilterOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                  graphBranches.length === 0
                    ? "text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50/50 dark:bg-indigo-500/5"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                <span
                  className={`w-4 h-4 flex items-center justify-center rounded border text-xs shrink-0 ${
                    graphBranches.length === 0
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {graphBranches.length === 0 && (
                    <Check className="w-3 h-3" />
                  )}
                </span>
                <span>All branches</span>
              </button>
              <div className="max-h-52 overflow-y-auto custom-scrollbar">
                {availableBranches.length > 0 && (
                  <FilterBranchNodeRenderer
                    node={buildBranchTree(availableBranches, (b) => b)}
                    graphBranches={graphBranches}
                    branchName={branchName}
                    onToggle={(b) => {
                      setGraphBranches((prev) =>
                        prev.includes(b)
                          ? prev.filter((x) => x !== b)
                          : [...prev, b],
                      );
                      onClearSearch();
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-500" />
        </div>
        <input
          type="text"
          placeholder={
            searchType === "all"
              ? "Search globally by message, author..."
              : searchType === "message"
                ? "Search commit messages globally..."
                : searchType === "author"
                  ? "Search by commit author globally..."
                  : "Search by changed file path globally..."
          }
          value={commitSearchQuery}
          onChange={(e) => setCommitSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-800 dark:text-slate-200 placeholder-slate-500 transition-colors"
        />
        {isSearching ? (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : commitSearchQuery.length > 0 ? (
          <button
            onClick={() => { setCommitSearchQuery(""); onClearSearch(); }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Clear search"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="relative shrink-0 flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
        <div className="pl-3 pr-2 border-r border-slate-200 dark:border-slate-800 text-slate-500">
          <Filter className="w-4 h-4" />
        </div>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as any)}
          className="py-2 pl-2 pr-6 text-sm bg-transparent border-none focus:outline-none focus:ring-0 text-slate-700 dark:text-slate-300 appearance-none cursor-pointer"
        >
          <option value="all">Everywhere</option>
          <option value="message">Message</option>
          <option value="author">Author</option>
          <option value="file">File Path</option>
        </select>
      </div>
    </div>
  );
}

function FilterBranchNodeRenderer({
  node,
  graphBranches,
  branchName,
  onToggle,
  level = 0,
}: {
  node: BranchTreeNode<string>;
  graphBranches: string[];
  branchName: string;
  onToggle: (b: string) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = sortTreeNodes(node);
  const isFolder = !node.isLeaf && children.length > 0;

  if (node.name === "root") {
    return (
      <>
        {children.map((child) => (
          <FilterBranchNodeRenderer
            key={child.path}
            node={child}
            graphBranches={graphBranches}
            branchName={branchName}
            onToggle={onToggle}
            level={level}
          />
        ))}
      </>
    );
  }

  if (isFolder) {
    return (
      <div className="flex flex-col">
        <button
          onClick={(e) => {
            e.preventDefault();
            setExpanded(!expanded);
          }}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center text-slate-600 dark:text-slate-300 font-medium"
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          type="button"
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 mr-1" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mr-1" />
          )}
          <span className="truncate">{node.name}/</span>
        </button>
        {expanded && (
          <div className="flex flex-col">
            {children.map((child) => (
              <FilterBranchNodeRenderer
                key={child.path}
                node={child}
                graphBranches={graphBranches}
                branchName={branchName}
                onToggle={onToggle}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const b = node.data!;
  const checked = graphBranches.includes(b);
  return (
    <button
      onClick={() => onToggle(b)}
      className={`w-full text-left pr-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
        checked
          ? "text-indigo-700 dark:text-indigo-300"
          : "text-slate-700 dark:text-slate-300"
      }`}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
      type="button"
    >
      <span
        className={`w-4 h-4 flex items-center justify-center rounded border shrink-0 transition-colors ${
          checked
            ? "bg-indigo-500 border-indigo-500 text-white"
            : "border-slate-300 dark:border-slate-600"
        }`}
      >
        {checked && <Check className="w-3 h-3" />}
      </span>
      <GitBranch className="w-3.5 h-3.5 shrink-0 text-slate-500" />
      <span className="truncate">{node.name}</span>
      {b === branchName && (
        <span className="ml-auto text-xs text-indigo-500 dark:text-indigo-400 shrink-0">
          current
        </span>
      )}
    </button>
  );
}
