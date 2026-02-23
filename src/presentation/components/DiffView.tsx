import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DiffViewProps {
  repoPath: string;
  filePath: string;
  commitHash?: string;
  onClose: () => void;
}

export function DiffView({
  repoPath,
  filePath,
  commitHash,
  onClose,
}: DiffViewProps) {
  const [diff, setDiff] = useState<string>("");
  const [blame, setBlame] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"diff" | "blame">("diff");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

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

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (viewMode === "diff") {
      setBlame(null);
      invoke<string>("git_diff", {
        path: repoPath,
        file: filePath,
        hash: commitHash,
      })
        .then((d) => {
          setDiff(d);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err.toString());
          setLoading(false);
        });
    } else {
      setDiff("");
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
  }, [repoPath, filePath, viewMode, commitHash]);

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
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                    Blame information is not available because this file has not
                    been committed to the repository yet.
                  </p>
                </>
              ) : error.includes("ambiguous argument") || error.includes("Cannot lstat") || error.includes("No such file or directory") ? (
                <>
                  <div className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                    File Not Found
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
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
          ) : viewMode === "diff" && diff ? (
            <table className="w-full border-collapse font-mono text-xs">
              <tbody>
                {(() => {
                  let oldLine = 0;
                  let newLine = 0;

                  return diff.split("\n").map((line, i) => {
                    let colorClass = "text-slate-600 dark:text-slate-400";
                    let bgClass = "";
                    let oldLineNum: number | string = "";
                    let newLineNum: number | string = "";
                    if (line.startsWith("@@")) {
                      // Parse header: @@ -1,4 +1,5 @@
                      const match = /@@ -(\d+),?\d* \+(\d+),?\d* @@/.exec(line);
                      if (match) {
                        oldLine = parseInt(match[1]) - 1;
                        newLine = parseInt(match[2]) - 1;
                      }
                      return null;
                    } else if (
                      line.startsWith("+") &&
                      !line.startsWith("+++")
                    ) {
                      newLine++;
                      newLineNum = newLine;
                      colorClass = "text-green-700 dark:text-green-400";
                      bgClass = "bg-green-50 dark:bg-green-900/10";
                    } else if (
                      line.startsWith("-") &&
                      !line.startsWith("---")
                    ) {
                      oldLine++;
                      oldLineNum = oldLine;
                      colorClass = "text-red-700 dark:text-red-400";
                      bgClass = "bg-red-50 dark:bg-red-900/10";
                    } else if (line.startsWith(" ")) {
                      oldLine++;
                      newLine++;
                      oldLineNum = oldLine;
                      newLineNum = newLine;
                    } else if (
                      line.startsWith("diff") ||
                      line.startsWith("index") ||
                      line.startsWith("+++") ||
                      line.startsWith("---")
                    ) {
                      return null;
                    }

                    return (
                      <tr
                        key={i}
                        className={`${bgClass} hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors`}
                      >
                        <td className="w-10 px-2 text-right text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                          {oldLineNum}
                        </td>
                        <td className="w-10 px-2 text-right text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                          {newLineNum}
                        </td>
                        <td
                          className={`px-4 whitespace-pre ${colorClass} w-full`}
                        >
                          {line}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          ) : viewMode === "blame" && blame ? (
            <table className="w-full border-collapse text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 text-left">
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
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
                          <td className="py-0.5 px-4 text-slate-400 dark:text-slate-500 whitespace-nowrap text-[10px]">
                            {!isSameCommit && date}
                          </td>
                          <td className="py-0.5 px-4 text-slate-400 dark:text-slate-500 text-right font-mono text-xs select-none">
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
            <div className="text-center text-slate-500 dark:text-slate-400 mt-20">
              No data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
