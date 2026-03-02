import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Play, RotateCcw } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGitActions } from "../hooks/useGitActions";

interface DiffViewProps {
  repoPath: string;
  filePath: string;
  commitHash?: string;
  cached?: boolean;
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

export function DiffView({
  repoPath,
  filePath,
  commitHash,
  cached = false,
  onClose,
  onRefresh,
}: DiffViewProps) {
  const [blame, setBlame] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"diff" | "blame">("diff");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [parsedHunks, setParsedHunks] = useState<Hunk[]>([]);
  const [diffHeaders, setDiffHeaders] = useState<string[]>([]);
  const gitActions = useGitActions(repoPath, onRefresh);

  useEffect(() => {
      const checkDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
      checkDarkMode();
      const observer = new MutationObserver(checkDarkMode);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
  }, []);

  const getLanguage = (path: string) => {
      const ext = path.split('.').pop()?.toLowerCase();
      switch (ext) {
          case 'js':
          case 'jsx': return 'javascript';
          case 'ts':
          case 'tsx': return 'typescript';
          case 'rs': return 'rust';
          case 'py': return 'python';
          case 'json': return 'json';
          case 'html': return 'html';
          case 'css': return 'css';
          case 'md': return 'markdown';
          case 'yml':
          case 'yaml': return 'yaml';
          case 'go': return 'go';
          case 'java': return 'java';
          case 'cpp':
          case 'c':
          case 'h':
          case 'hpp': return 'cpp';
          case 'cs': return 'csharp';
          case 'sh': return 'bash';
          case 'toml': return 'toml';
          default: return 'text';
      }
  };

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

  const generatePatchForHunk = (hunk: Hunk) => {
      let patch = diffHeaders.join('\n') + '\n';
      patch += hunk.header + '\n';
      hunk.lines.forEach(l => {
          patch += l.content + '\n';
      });
      return patch;
  };

  const handleStageHunk = async (hunk: Hunk) => {
      try {
          const patch = generatePatchForHunk(hunk);
          // If we are viewing unstaged changes, applying the patch STAGES it.
          // If we are viewing staged changes, applying it in reverse UNSTAGES it.
          await gitActions.applyPatch(patch, cached);
          loadDiff();
          onRefresh?.();
      } catch (err: any) {
          setError("Failed to apply patch: " + err.toString());
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[90vw] h-[90vh] bg-white dark:bg-slate-950 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm text-slate-700 dark:text-slate-300 font-semibold">
              {filePath}
            </span>
            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("diff")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === "diff" ? "bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Diff
              </button>
              <button
                onClick={() => setViewMode("blame")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === "blame" ? "bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-medium" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                Blame
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 custom-scrollbar">
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
                    Not Committed Yet
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                    Blame information is not available because this file has not
                    been committed to the repository yet.
                  </p>
                </>
              ) : error.includes("ambiguous argument") || error.includes("Cannot lstat") || error.includes("No such file or directory") ? (
                <>
                  <div className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                    File Not Found
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-sm">
                    Blame information is not available because this file was
                    deleted, moved, or did not exist in this commit.
                  </p>
                </>
              ) : (
                <div className="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/20 max-w-2xl break-all">
                  {error}
                </div>
              )}
            </div>
          ) : viewMode === "diff" && parsedHunks.length > 0 ? (
            <div className="w-full font-mono text-[13px] flex flex-col pb-10">
              {parsedHunks.map((hunk, hIdx) => (
                <div key={hIdx} className="w-full flex flex-col mb-4 border border-slate-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
                  {/* Hunk Header */}
                  <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/80 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">{hunk.header}</span>
                    {!commitHash && (
                      <button
                        onClick={() => handleStageHunk(hunk)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-md shadow-sm transition-colors font-medium border ${
                           cached 
                            ? "bg-white hover:bg-red-50 text-red-600 border-red-200 dark:bg-slate-900 dark:border-red-900/30 dark:hover:bg-red-900/20 dark:text-red-400" 
                            : "bg-white hover:bg-green-50 text-green-700 border-green-200 dark:bg-slate-900 dark:border-green-900/30 dark:hover:bg-green-900/20 dark:text-green-400"
                        }`}
                        title={cached ? "Unstage this entire block" : "Stage this entire block"}
                      >
                        {cached ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{cached ? "Unstage Hunk" : "Stage Hunk"}</span>
                      </button>
                    )}
                  </div>
                  {/* Hunk Lines */}
                  <table className="w-full border-collapse">
                    <tbody>
                      {hunk.lines.map((line, lIdx) => {
                        let colorClass = "text-slate-600 dark:text-slate-400";
                        let bgClass = "";
                        
                        if (line.type === 'add') {
                           colorClass = "text-green-700 dark:text-green-400";
                           bgClass = "bg-green-50 dark:bg-green-900/10";
                        } else if (line.type === 'delete') {
                           colorClass = "text-red-700 dark:text-red-400";
                           bgClass = "bg-red-50 dark:bg-red-900/10";
                        }

                        return (
                          <tr
                            key={lIdx}
                            className={`group ${bgClass} hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative`}
                          >
                            <td className="w-10 px-2 text-right text-slate-600 dark:text-slate-400 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                              {line.oldLine || ""}
                            </td>
                            <td className="w-10 px-2 text-right text-slate-600 dark:text-slate-400 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                              {line.newLine || ""}
                            </td>
                            <td className={`px-4 whitespace-pre pt-0.5 pb-0.5 ${colorClass} w-full relative`}>
                               <SyntaxHighlighter
                                 language={getLanguage(filePath)}
                                 style={isDarkMode ? vscDarkPlus : vs}
                                 customStyle={{
                                   margin: 0,
                                   padding: 0,
                                   background: 'transparent',
                                   fontSize: 'inherit',
                                   lineHeight: 'inherit',
                                   fontFamily: 'inherit'
                                 }}
                                 PreTag="div"
                               >
                                 {line.content || ' '}
                               </SyntaxHighlighter>
                               
                               {/* Line-level staging button (only show on add/delete lines) */}
                               {!commitHash && (line.type === 'add' || line.type === 'delete') && (
                                  <button
                                     onClick={() => {
                                        // Line staging logic
                                        const singleLineHunk: Hunk = {
                                            header: hunk.header,
                                            oldStart: hunk.oldStart,
                                            oldCount: hunk.oldCount,
                                            newStart: hunk.newStart,
                                            newCount: hunk.newCount,
                                            lines: hunk.lines.map(hLine => {
                                                if (hLine === line) return hLine;
                                                // Convert other add/delete lines to context to ONLY stage/unstage this line
                                                if (hLine.type === 'add') return { content: hLine.content.substring(1), type: 'context' };
                                                if (hLine.type === 'delete') return { content: ' ' + hLine.content.substring(1), type: 'context' };
                                                return hLine;
                                            })
                                        };
                                        handleStageHunk(singleLineHunk);
                                     }}
                                     className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 text-[10px] rounded border bg-white dark:bg-slate-800 z-10 font-bold ${
                                        cached 
                                         ? "hover:bg-red-50 text-red-600 border-red-200 dark:border-red-900/50 dark:hover:bg-red-900/30" 
                                         : "hover:bg-green-50 text-green-700 border-green-200 dark:border-green-900/50 dark:hover:bg-green-900/30"
                                     }`}
                                  >
                                     {cached ? "Unstage Line" : "Stage Line"}
                                  </button>
                               )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : viewMode === "blame" && blame ? (
            <table className="w-full border-collapse text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 text-left">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <th className="py-2 px-4 font-medium w-24">Commit</th>
                  <th className="py-2 px-4 font-medium w-32">Author</th>
                  <th className="py-2 px-4 font-medium w-24">Date</th>
                  <th className="py-2 px-4 font-medium w-12 text-right">
                    Line
                  </th>
                  <th className="py-2 px-4 font-medium">Content</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let prevHash = "";
                  return blame.split("\n").map((line, i) => {
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

                      return (
                        <tr
                          key={i}
                          className="hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors border-b border-transparent"
                        >
                          <td className="py-0.5 px-4 font-mono select-none relative">
                            {!isSameCommit && (
                              <span
                                style={{ color: commitColor }}
                                className="font-bold"
                              >
                                {shortHash}
                              </span>
                            )}
                            {/* Vertical line for improved visual grouping */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 opacity-30"
                              style={{ backgroundColor: commitColor }}
                            />
                          </td>
                          <td
                            className="py-0.5 px-4 font-medium truncate max-w-[150px]"
                            title={author}
                          >
                            {!isSameCommit && (
                              <span className="text-slate-700 dark:text-slate-200">
                                {author}
                              </span>
                            )}
                          </td>
                          <td className="py-0.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap text-[10px]">
                            {!isSameCommit && date}
                          </td>
                          <td className="py-0.5 px-4 text-slate-600 dark:text-slate-400 text-right font-mono text-xs select-none">
                            {lineNum}
                          </td>
                          <td className="py-0.5 px-0 text-slate-700 dark:text-slate-300 whitespace-pre w-full font-mono text-xs leading-tight border-l border-slate-100 dark:border-slate-800">
                            <SyntaxHighlighter
                              language={getLanguage(filePath)}
                              style={isDarkMode ? vscDarkPlus : vs}
                              customStyle={{
                                margin: 0,
                                padding: '2px 16px',
                                background: 'transparent',
                                fontSize: 'inherit',
                                lineHeight: 'inherit',
                                fontFamily: 'inherit'
                              }}
                              PreTag="div"
                            >
                              {content || ' '}
                            </SyntaxHighlighter>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={i}>
                        <td colSpan={5} className="py-1 px-4 text-slate-500">
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
              No data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
