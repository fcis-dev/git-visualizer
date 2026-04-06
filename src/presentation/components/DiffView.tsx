import { useEffect, useState, useMemo, memo, useCallback, startTransition } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Play, RotateCcw, Search, ArrowLeft } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGitActions } from "../hooks/useGitActions";
import { useTranslation } from "react-i18next";
import { truncatePath, getLanguage } from "../utils/pathUtils";
interface DiffViewProps {
  repoPath: string;
  filePath: string;
  commitHash?: string;
  cached?: boolean;
  rawDiff?: string;
  stashIndex?: string;
  onClose: () => void;
  onRefresh?: () => void;
}

interface HunkLine {
    content: string;
    type: 'add' | 'delete' | 'context' | 'header';
    oldLine?: number;
    newLine?: number;
}

interface Hunk {
    header: string;
    lines: HunkLine[];
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
}

/** Memoized diff row — prevents SyntaxHighlighter from re-tokenizing on unrelated re-renders. */
interface DiffLineProps {
  line: HunkLine;
  filePath: string;
  language: string;
  isDarkMode: boolean;
  commitHash?: string;
  cached: boolean;
  stashIndex?: string;
  hunk: Hunk;
  searchQuery: string;
  onStageHunk: (hunk: Hunk) => void;
}

const DiffLine = memo(function DiffLine({
  line,
  language,
  isDarkMode,
  commitHash,
  cached,
  stashIndex,
  hunk,
  searchQuery,
  onStageHunk,
}: DiffLineProps) {
  const { t } = useTranslation();
  let colorClass = "text-slate-600 dark:text-slate-400";
  let bgClass = "";

  const isMatch = searchQuery && line.content.toLowerCase().includes(searchQuery.toLowerCase());

  if (line.type === "add") {
    colorClass = "text-green-700 dark:text-green-400";
    bgClass = isMatch ? "bg-yellow-200/50 dark:bg-yellow-900/40" : "bg-green-50 dark:bg-green-900/10";
  } else if (line.type === "delete") {
    colorClass = "text-red-700 dark:text-red-400";
    bgClass = isMatch ? "bg-yellow-200/50 dark:bg-yellow-900/40" : "bg-red-50 dark:bg-red-900/10";
  } else if (isMatch) {
    bgClass = "bg-yellow-200/50 dark:bg-yellow-900/40";
  }

  const handleStageLine = () => {
    const singleLineHunk: Hunk = {
      header: hunk.header,
      oldStart: hunk.oldStart,
      oldCount: hunk.oldCount,
      newStart: hunk.newStart,
      newCount: hunk.newCount,
      lines: hunk.lines.map((hLine) => {
        if (hLine === line) return hLine;
        if (hLine.type === "add")
          return { content: hLine.content.substring(1), type: "context" as const };
        if (hLine.type === "delete")
          return { content: " " + hLine.content.substring(1), type: "context" as const };
        return hLine;
      }),
    };
    onStageHunk(singleLineHunk);
  };

  return (
    <tr className={`group ${bgClass} hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative`}>
      <td className="w-10 px-2 text-right text-slate-600 dark:text-slate-400 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {line.oldLine || ""}
      </td>
      <td className="w-10 px-2 text-right text-slate-600 dark:text-slate-400 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {line.newLine || ""}
      </td>
      <td className={`px-4 whitespace-pre-wrap break-all pt-0.5 pb-0.5 ${colorClass} w-full relative`}>
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: 0,
            background: "transparent",
            fontSize: "inherit",
            lineHeight: "inherit",
            fontFamily: "inherit",
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
            overflowX: "hidden"
          }}
          PreTag="div"
          wrapLines={true}
          wrapLongLines={true}
          codeTagProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }}
        >
          {line.content || " "}
        </SyntaxHighlighter>

        {/* Line-level staging button */}
        {!commitHash && !stashIndex && (line.type === "add" || line.type === "delete") && (
          <button
            onClick={handleStageLine}
            className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-[10px] rounded border bg-white dark:bg-slate-800 z-10 font-bold ${
              cached
                ? "hover:bg-red-50 text-red-600 border-red-200 dark:border-red-900/50 dark:hover:bg-red-900/30"
                : "hover:bg-green-50 text-green-700 border-green-200 dark:border-green-900/50 dark:hover:bg-green-900/30"
            }`}
          >
            {cached ? t("diffView.unstageLine") : t("diffView.stageLine")}
          </button>
        )}
      </td>
    </tr>
  );
});

const DebouncedSearchInput = ({ onSearch, className = "w-48 ml-4 mr-2" }: { onSearch: (query: string) => void, className?: string }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        onSearch(input);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [input, onSearch]);

  return (
    <div className={`flex items-center relative ${className}`}>
      <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400" />
      <input
        type="text"
        placeholder={t('common.search', 'Search...')}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="pl-7 pr-6 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
      />
      {input && (
        <button onClick={() => setInput("")} className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export function DiffView({
  repoPath,
  filePath,
  commitHash,
  cached = false,
  rawDiff,
  stashIndex,
  onClose,
  onRefresh,
}: DiffViewProps) {
  const { t } = useTranslation();
  const [blame, setBlame] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"diff" | "blame">("diff");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [parsedHunks, setParsedHunks] = useState<Hunk[]>([]);
  const [diffHeaders, setDiffHeaders] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const gitActions = useGitActions(repoPath, onRefresh);

  const { searchMatchesDiff, totalDiffLines } = useMemo(() => {
      if (!parsedHunks.length || !searchQuery) return { searchMatchesDiff: [], totalDiffLines: 1 };
      
      let totalLines = 0;
      const matches: number[] = [];
      const query = searchQuery.toLowerCase();
      
      for (const hunk of parsedHunks) {
          totalLines++; // Header
          for (const line of hunk.lines) {
              if (line.content.toLowerCase().includes(query)) {
                  matches.push(totalLines);
              }
              totalLines++;
          }
      }
      return { searchMatchesDiff: matches, totalDiffLines: totalLines || 1 };
  }, [parsedHunks, searchQuery]);

  const { blameLines, searchMatchesBlame, totalBlameLines } = useMemo(() => {
    if (!blame) return { blameLines: [], searchMatchesBlame: [], totalBlameLines: 1 };
    const lines = blame.split('\n');
    const matches: number[] = [];
    const query = searchQuery.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
        if (query && lines[i].toLowerCase().includes(query)) {
            matches.push(i);
        }
    }
    return { blameLines: lines, searchMatchesBlame: matches, totalBlameLines: lines.length || 1 };
  }, [blame, searchQuery]);

  // Memoize the language to avoid recomputing it on every line render
  const language = useMemo(() => getLanguage(filePath), [filePath]);

  useEffect(() => {
      const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
      checkDarkMode();
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
  }, []);


  const parseDiff = (diffString: string) => {
      const lines = diffString.split('\n');
      const hunks: Hunk[] = [];
      const headers: string[] = [];
      let currentHunk: Hunk | null = null;
      let inHunks = false;
      let oldLine = 0;
      let newLine = 0;

      for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          if (line.startsWith('@@')) {
              inHunks = true;
              if (currentHunk) {
                  hunks.push(currentHunk);
              }
              const match = /@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/.exec(line);
              if (match) {
                  oldLine = parseInt(match[1]);
                  const oldCount = parseInt(match[2] || "1");
                  newLine = parseInt(match[3]);
                  const newCount = parseInt(match[4] || "1");
                  currentHunk = {
                      header: line,
                      oldStart: oldLine,
                      oldCount,
                      newStart: newLine,
                      newCount,
                      lines: []
                  };
              }
          } else if (!inHunks) {
              headers.push(line);
          } else if (currentHunk) {
              if (line.startsWith('+') && !line.startsWith('+++')) {
                  currentHunk.lines.push({ content: line, type: 'add', newLine: newLine++ });
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                  currentHunk.lines.push({ content: line, type: 'delete', oldLine: oldLine++ });
              } else if (line.startsWith(' ')) {
                  currentHunk.lines.push({ content: line, type: 'context', oldLine: oldLine++, newLine: newLine++ });
              } else if (line.startsWith('\\ No newline')) {
                  currentHunk.lines.push({ content: line, type: 'context' });
              }
          }
      }
      if (currentHunk) hunks.push(currentHunk);
      setParsedHunks(hunks);
      setDiffHeaders(headers);
  };

  const loadDiff = () => {
    setLoading(true);
    setError(null);

    if (rawDiff) {
      parseDiff(rawDiff);
      setLoading(false);
      return;
    }

    if (viewMode === "diff") {
      setBlame(null);
      invoke<string>("git_diff", {
        path: repoPath,
        file: filePath,
        hash: commitHash,
        cached: commitHash ? null : cached,
      })
        .then((d) => {
          parseDiff(d);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err.toString());
          setLoading(false);
        });
    } else {
      invoke<string>("git_blame", {
        path: repoPath,
        file: filePath,
        hash: commitHash,
      })
        .then((b) => {
          setBlame(b);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err.toString());
          setLoading(false);
        });
    }
  };

  useEffect(() => {
     loadDiff();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoPath, filePath, viewMode, commitHash, cached]);

  const generatePatchForHunk = useCallback((hunk: Hunk) => {
      let patch = diffHeaders.join('\n') + '\n';
      patch += hunk.header + '\n';
      hunk.lines.forEach(l => {
          patch += l.content + '\n';
      });
      return patch;
  }, [diffHeaders]);

  const handleStageHunk = useCallback(async (hunk: Hunk) => {
      try {
          const patch = generatePatchForHunk(hunk);
          await gitActions.applyPatch(patch, cached);
          loadDiff();
          onRefresh?.();
      } catch (err: any) {
          setError(t('diffView.errorApplyPatchFailed', { error: err.toString() }));
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatePatchForHunk, cached]);

  const handleApplyStash = async () => {
    if (!stashIndex) return;
    try {
      setLoading(true);
      await invoke("git_stash_apply", { path: repoPath, index: stashIndex });
      onRefresh?.();
      onClose();
    } catch (err: any) {
      setError(err.toString());
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-white dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">
      <div className="flex items-center justify-between h-12 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-x-4 cursor-default select-none">
        
        <div className="flex items-center space-x-2 overflow-hidden">
            <button
                onClick={onClose}
                className="flex items-center space-x-1 p-1 -ml-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{t('historicalFile.back', 'Back')}</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700 shrink-0">|</span>
            <div className="flex flex-col min-w-0 flex-1">
                 <span 
                    className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate pr-2 block w-full" 
                    title={filePath}
                 >
                     {truncatePath(filePath)}
                 </span>
                 {commitHash && (
                   <span className="text-[10px] text-slate-500 font-mono truncate">
                       @ {commitHash.substring(0, 7)}
                   </span>
                 )}
            </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
            {/* Search Input */}
            <DebouncedSearchInput onSearch={setSearchQuery} className="w-48" />
            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setViewMode("diff")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === "diff" ? "bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                {t("diffView.diffTab")}
              </button>
              {!rawDiff && (
                <button
                  onClick={() => setViewMode("blame")}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === "blame" ? "bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                  {t("diffView.blameTab")}
                </button>
              )}
            </div>

            {stashIndex && (
              <button
                onClick={handleApplyStash}
                disabled={loading}
                className="flex items-center space-x-1.5 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm transition-colors font-medium disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{t("stashes.apply", "Apply Stash")}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 relative flex overflow-hidden bg-white dark:bg-slate-950">
          <div className={`flex-1 overflow-auto custom-scrollbar ${viewMode === "diff" ? "p-4" : ""}`}>
            {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              {error.includes("no such path") ||
              error.includes("Not Committed Yet") ? (
                <>
                  <div className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t("diffView.notCommittedTitle")}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                    {t("diffView.notCommittedDesc")}
                  </p>
                </>
              ) : error.includes("ambiguous argument") || error.includes("Cannot lstat") || error.includes("No such file or directory") ? (
                <>
                  <div className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t("diffView.fileNotFoundTitle")}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                    {t("diffView.fileNotFoundDesc")}
                  </p>
                </>
              ) : (
                <div className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/20 max-w-2xl break-all">
                  {error}
                </div>
              )}
            </div>
          ) : viewMode === "diff" && parsedHunks.length > 0 ? (
            <div className="w-full font-mono text-xs flex flex-col pb-10">
              {parsedHunks.map((hunk, hIdx) => (
                <div key={hIdx} className="w-full flex flex-col mb-4 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
                  {/* Hunk Header */}
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">{hunk.header}</span>
                    {!commitHash && !stashIndex && (
                      <button
                        onClick={() => handleStageHunk(hunk)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-md shadow-sm transition-colors font-medium border ${
                           cached 
                            ? "bg-white hover:bg-red-50 text-red-600 border-red-200 dark:bg-slate-900 dark:border-red-900/30 dark:hover:bg-red-900/20 dark:text-red-400" 
                            : "bg-white hover:bg-green-50 text-green-700 border-green-200 dark:bg-slate-900 dark:border-green-900/30 dark:hover:bg-green-900/20 dark:text-green-400"
                        }`}
                        title={cached ? t("diffView.unstageBlockTooltip") : t("diffView.stageBlockTooltip")}
                      >
                        {cached ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{cached ? t("diffView.unstageHunk") : t("diffView.stageHunk")}</span>
                      </button>
                    )}
                  </div>
                  {/* Hunk Lines — each row is memoized to avoid re-rendering unchanged lines */}
                  <table className="w-full border-collapse table-fixed">
                    <tbody>
                      {hunk.lines.map((line, lIdx) => (
                        <DiffLine
                          key={lIdx}
                          line={line}
                          filePath={filePath}
                          language={language}
                          isDarkMode={isDarkMode}
                          commitHash={commitHash}
                          cached={cached}
                          stashIndex={stashIndex}
                          hunk={hunk}
                          searchQuery={searchQuery}
                          onStageHunk={handleStageHunk}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : viewMode === "blame" && blame ? (
            <table className="w-full border-collapse text-xs font-mono table-fixed">
              <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 text-left">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <th className="py-2 px-4 font-medium w-48">{t("diffView.headerDate")} / {t("diffView.headerAuthor")}</th>
                  <th className="py-2 px-4 font-medium w-12 text-right">
                    {t("diffView.headerLine")}
                  </th>
                  <th className="py-2 px-4 font-medium">{t("diffView.headerContent")}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                    let prevHash = "";
                    return blameLines.map((line, i) => {
                      if (!line) return null;
                      // Regex: optional ^, hash, optional filepath, (author date line) content
                      const match =
                        /^[\^]?([a-f0-9]+)\s+(?:[^(]+\s+)?\((.*?)\s+(\d{4}-\d{2}-\d{2})\s+(\d+)\)\s(.*)$/.exec(
                          line,
                        );

                      if (match) {
                        const [, hash, author, date, lineNum, content] = match;
                        const shortHash = hash.substring(0, 7);
                        const isSameCommit = shortHash === prevHash;
                        prevHash = shortHash;

                        // Generate a color from the hash
                        const getColor = (str: string) => {
                          let hash = 0;
                          for (let i = 0; i < str.length; i++) {
                            hash = str.charCodeAt(i) + ((hash << 5) - hash);
                          }
                          const hue = Math.abs(hash % 360);
                          return `hsl(${hue}, 70%, 50%)`;
                        };
                        const commitColor = getColor(shortHash);

                        let isMatch = false;
                        if (searchQuery && content.toLowerCase().includes(searchQuery.toLowerCase())) {
                            isMatch = true;
                        }
                        const rowClass = isMatch ? "bg-yellow-200/50 dark:bg-yellow-900/30" : "hover:bg-indigo-50 dark:hover:bg-indigo-900/10";

                        return (
                          <tr
                            key={i}
                            className={`${rowClass} transition-colors border-b border-transparent`}
                          >
                            <td className="py-0.5 px-4 relative align-top min-w-0" style={{ maxWidth: '16rem' }}>
                              {/* Vertical line for improved visual grouping */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-1 opacity-30"
                                style={{ backgroundColor: commitColor }}
                              />
                              {!isSameCommit && (
                                <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden pr-2">
                                  <span className="text-slate-500 text-[10px] shrink-0">
                                    {date}
                                  </span>
                                  <span className="text-slate-700 dark:text-slate-300 font-medium text-xs truncate" title={author}>
                                    {author}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-0.5 px-4 text-slate-600 dark:text-slate-400 text-right font-mono text-xs select-none">
                              {lineNum}
                            </td>
                            <td className="py-0.5 px-0 text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all w-full font-mono text-xs leading-tight border-l border-slate-100 dark:border-slate-800 uppercase-first">
                              {totalBlameLines > 500 ? (
                                <div className="px-4 py-0.5 whitespace-pre-wrap break-all">
                                  {content || ' '}
                                </div>
                              ) : (
                                <SyntaxHighlighter
                                  language={language}
                                  style={isDarkMode ? oneDark : oneLight}
                                  customStyle={{
                                    margin: 0,
                                    padding: '2px 16px',
                                    background: 'transparent',
                                    fontSize: 'inherit',
                                    lineHeight: 'inherit',
                                    fontFamily: 'inherit',
                                    wordBreak: 'break-all',
                                    whiteSpace: 'pre-wrap',
                                    overflowX: 'hidden'
                                  }}
                                  PreTag="div"
                                  wrapLines={true}
                                  wrapLongLines={content.length < 5000}
                                  codeTagProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }}
                                >
                                  {content || ' '}
                                </SyntaxHighlighter>
                              )}
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={i}>
                          <td colSpan={3} className="py-1 px-4 text-slate-500">
                            {line}
                          </td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          ) : (
            <div className="text-center text-slate-600 dark:text-slate-300 mt-20">
              {t("diffView.noData")}
            </div>
          )}
          </div>

          {/* Scrollbar Minimap for Search Matches (Diff) */}
          {viewMode === "diff" && searchMatchesDiff.length > 0 && (
              <div className="absolute top-0 right-2 bottom-0 w-2 pointer-events-none z-10 opacity-70">
                  {searchMatchesDiff.map(lineIndex => (
                      <div
                          key={lineIndex}
                          className="absolute w-full bg-yellow-400 dark:bg-yellow-500 rounded-sm shadow-sm"
                          style={{ top: `${(lineIndex / totalDiffLines) * 100}%`, height: '3px' }}
                      />
                  ))}
              </div>
          )}

          {/* Scrollbar Minimap for Search Matches (Blame) */}
          {viewMode === "blame" && searchMatchesBlame.length > 0 && (
              <div className="absolute top-0 right-2 bottom-0 w-2 pointer-events-none z-10 opacity-70">
                  {searchMatchesBlame.map(lineIndex => (
                      <div
                          key={lineIndex}
                          className="absolute w-full bg-yellow-400 dark:bg-yellow-500 rounded-sm shadow-sm"
                          style={{ top: `${(lineIndex / totalBlameLines) * 100}%`, height: '3px' }}
                      />
                  ))}
              </div>
          )}
        </div>
    </div>
  );
}
