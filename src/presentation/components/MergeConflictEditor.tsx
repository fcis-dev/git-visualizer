import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Edit2, Save, AlertTriangle, RotateCcw } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vs,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import Editor from "@monaco-editor/react";
// @ts-ignore
import createElement from "react-syntax-highlighter/dist/esm/create-element";
import { useTranslation } from "react-i18next";

const countLines = (str: string) => (str ? str.split("\n").length : 0);

const applyConflictRenderer = (
  mode: "normal" | "current" | "incoming" | "both" | "manual",
  startCurrent: number,
  startIncoming: number,
  currentLineCount: number = 0,
) => {
  return ({ rows, stylesheet, useInlineStyles }: any) => (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((row: any, i: number) => {
          let displayLine: number | string = "";
          let lineClass = "";
          let bgClass = "";

          if (mode === "normal") {
            displayLine = startCurrent + i;
          } else if (mode === "current") {
            displayLine = startCurrent + i;
            lineClass = "text-green-700 dark:text-green-400";
            bgClass = "bg-green-50/50 dark:bg-green-900/10";
          } else if (mode === "incoming") {
            displayLine = startIncoming + i;
            lineClass = "text-blue-700 dark:text-blue-400";
            bgClass = "bg-blue-50/50 dark:bg-blue-900/10";
          } else if (mode === "both") {
            if (i < currentLineCount) {
              displayLine = startCurrent + i;
              lineClass = "text-green-700 dark:text-green-400";
              bgClass = "bg-green-50/50 dark:bg-green-900/10";
            } else {
              displayLine = startIncoming + (i - currentLineCount);
              lineClass = "text-blue-700 dark:text-blue-400";
              bgClass = "bg-blue-50/50 dark:bg-blue-900/10";
            }
          }

          return (
            <tr
              key={`line-${i}`}
              className={`group hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors ${bgClass}`}
            >
              <td className="w-12 px-2 text-right text-slate-600 dark:text-slate-400 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                {displayLine}
              </td>
              <td
                className={`px-4 whitespace-pre pt-0.5 pb-0.5 w-full ${lineClass}`}
              >
                {createElement({
                  node: row,
                  stylesheet,
                  useInlineStyles,
                  key: `code-${i}`,
                })}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

interface TextBlock {
  type: "text";
  content: string;
  currentStartLine: number;
  incomingStartLine: number;
}

interface ConflictBlock {
  type: "conflict";
  id: string;
  startIndex: number;
  endIndex: number; // index in the blocks array
  currentChangeLabel: string;
  currentContent: string;
  currentStartLine: number;
  incomingChangeLabel: string;
  incomingContent: string;
  incomingStartLine: number;
  resolvedContent: string | null;
  resolutionType: "current" | "incoming" | "both" | "manual" | null;
  isManualEditing: boolean;
}

type ParsedContent = TextBlock | ConflictBlock;

const getLanguage = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "rs":
      return "rust";
    case "py":
      return "python";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    case "md":
      return "markdown";
    case "yml":
    case "yaml":
      return "yaml";
    case "go":
      return "go";
    case "java":
      return "java";
    case "cpp":
    case "c":
    case "h":
    case "hpp":
      return "cpp";
    case "cs":
      return "csharp";
    case "sh":
      return "bash";
    case "toml":
      return "toml";
    default:
      return "text";
  }
};

interface MergeConflictEditorProps {
  repoPath: string;
  filePath: string;
  onResolved: () => void;
  onCancel: () => void;
}

export function MergeConflictEditor({
  repoPath,
  filePath,
  onResolved,
  onCancel,
}: MergeConflictEditorProps) {
  const [parsedBlocks, setParsedBlocks] = useState<ParsedContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const checkDarkMode = () =>
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadFile();
  }, [repoPath, filePath]);

  const loadFile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const absolutePath = `${repoPath}/${filePath}`.replace(/\\/g, "/");
      const rawContent: string = await invoke("git_read_file", {
        path: absolutePath,
      });

      const blocks = parseConflictMarkers(rawContent);
      setParsedBlocks(blocks);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setIsLoading(false);
    }
  };

  const parseConflictMarkers = (text: string): ParsedContent[] => {
    const lines = text.split("\n");
    const blocks: ParsedContent[] = [];

    let currentBlock: string[] = [];
    let state: "normal" | "current" | "incoming" = "normal";

    let conflictObj: Partial<ConflictBlock> = {};
    let tempCurrentContent: string[] = [];
    let tempIncomingContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("<<<<<<< ")) {
        if (currentBlock.length > 0) {
          blocks.push({
            type: "text",
            content: currentBlock.join("\n"),
            currentStartLine: 1, // assigned in pass 2
            incomingStartLine: 1, // assigned in pass 2
          });
          currentBlock = [];
        }
        state = "current";
        conflictObj = {
          type: "conflict",
          id: `conflict-${i}`,
          startIndex: blocks.length,
          currentChangeLabel: line.replace("<<<<<<< ", "").trim(),
          currentStartLine: 1, // assigned in pass 2
          incomingStartLine: 1, // assigned in pass 2
        };
        tempCurrentContent = [];
      } else if (line.startsWith("=======")) {
        state = "incoming";
        tempIncomingContent = [];
      } else if (line.startsWith(">>>>>>> ")) {
        state = "normal";
        conflictObj.incomingChangeLabel = line.replace(">>>>>>> ", "").trim();
        conflictObj.currentContent = tempCurrentContent.join("\n");
        conflictObj.incomingContent = tempIncomingContent.join("\n");
        conflictObj.resolvedContent = null;
        conflictObj.resolutionType = null;
        conflictObj.isManualEditing = false;

        blocks.push(conflictObj as ConflictBlock);
        conflictObj = {};
      } else {
        if (state === "normal") {
          // Keep trailing newlines for exact matching but join them properly
          currentBlock.push(line);
        } else if (state === "current") {
          tempCurrentContent.push(line);
        } else if (state === "incoming") {
          tempIncomingContent.push(line);
        }
      }
    }

    if (currentBlock.length > 0) {
      blocks.push({
        type: "text",
        content: currentBlock.join("\n"),
        currentStartLine: 1, // assigned in pass 2
        incomingStartLine: 1, // assigned in pass 2
      });
    }

    // Pass 2: Assign perfectly continuous virtual line numbers, hiding marker jumps
    let currentLine = 1;
    let incomingLine = 1;
    for (const block of blocks) {
      if (block.type === "text") {
        block.currentStartLine = currentLine;
        block.incomingStartLine = incomingLine;
        const lineCount = countLines(block.content);
        currentLine += lineCount;
        incomingLine += lineCount;
      } else if (block.type === "conflict") {
        block.currentStartLine = currentLine;
        const currentLineCount = countLines(block.currentContent);
        currentLine += currentLineCount;

        block.incomingStartLine = incomingLine;
        const incomingLineCount = countLines(block.incomingContent);
        incomingLine += incomingLineCount;
      }
    }

    return blocks;
  };

  const remainingConflicts = useMemo(() => {
    return parsedBlocks.filter(
      (b) => b.type === "conflict" && b.resolutionType === null,
    ).length;
  }, [parsedBlocks]);

  const handleResolve = (
    index: number,
    type: "current" | "incoming" | "both",
  ) => {
    setParsedBlocks((prev) => {
      const newBlocks = [...prev];
      const block = newBlocks[index] as ConflictBlock;

      let resolvedContent = "";
      if (type === "current") resolvedContent = block.currentContent;
      else if (type === "incoming") resolvedContent = block.incomingContent;
      else if (type === "both")
        resolvedContent =
          block.currentContent +
          (block.currentContent && block.incomingContent ? "\n" : "") +
          block.incomingContent;

      newBlocks[index] = {
        ...block,
        resolutionType: type,
        resolvedContent,
        isManualEditing: false,
      };
      return newBlocks;
    });
  };

  const toggleManualEdit = (index: number) => {
    setParsedBlocks((prev) => {
      const newBlocks = [...prev];
      const block = newBlocks[index] as ConflictBlock;
      newBlocks[index] = {
        ...block,
        isManualEditing: !block.isManualEditing,
        resolutionType: block.resolutionType || "manual", // Default to manual if unset so it marks as resolved
      };
      // If turning on manual edit without prior resolution, default to current content
      if (newBlocks[index].isManualEditing && block.resolvedContent === null) {
        (newBlocks[index] as ConflictBlock).resolvedContent =
          block.currentContent;
      }
      return newBlocks;
    });
  };

  const handleManualEditChange = (index: number, value: string) => {
    setParsedBlocks((prev) => {
      const newBlocks = [...prev];
      const block = newBlocks[index] as ConflictBlock;
      newBlocks[index] = {
        ...block,
        resolvedContent: value,
        resolutionType: "manual",
      };
      return newBlocks;
    });
  };

  const handleSaveAndStage = async () => {
    if (remainingConflicts > 0) {
      setError(
        t('mergeConflictEditor.cannotSave', { count: remainingConflicts }),
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const finalContent = parsedBlocks
        .map((block) => {
          if (block.type === "text") return block.content;
          return block.resolvedContent || "";
        })
        .join("\n"); // Reassemble file accurately

      const absolutePath = `${repoPath}/${filePath}`.replace(/\\/g, "/");
      await invoke("git_write_file", {
        path: absolutePath,
        content: finalContent,
      });

      // Stage the resolved file
      await invoke("git_stage", { path: repoPath, files: [filePath] });

      onResolved();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setSaving(false);
    }
  };

  // (Inside the component function, replace the return statement)
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 absolute inset-0 z-10 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2
            className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-md"
            title={filePath}
          >
            {t('mergeConflictEditor.title')} {filePath.split("/").pop()}
          </h2>
          {remainingConflicts > 0 && (
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 text-xs px-2 py-0.5 rounded-full font-bold ml-2">
              {t('mergeConflictEditor.remaining', { count: remainingConflicts })}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
          >
            {t('mergeConflictEditor.cancel')}
          </button>
          <button
            onClick={handleSaveAndStage}
            disabled={saving || remainingConflicts > 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? t('mergeConflictEditor.saving') : t('mergeConflictEditor.saveAndStage')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border-b border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500 mb-4"></div>
            <p>{t('mergeConflictEditor.loading')}</p>
          </div>
        ) : (
          <div className="font-mono text-[13px] max-w-5xl mx-auto bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden pb-10">
            {parsedBlocks.map((block, index) => {
              if (block.type === "text") {
                return (
                  <div
                    key={`text-${index}`}
                    className="px-4 py-2 text-slate-800 dark:text-slate-300"
                  >
                    <SyntaxHighlighter
                      language={getLanguage(filePath)}
                      style={isDarkMode ? vscDarkPlus : vs}
                      customStyle={{
                        margin: 0,
                        padding: 0,
                        background: "transparent",
                        fontSize: "inherit",
                        lineHeight: "inherit",
                        fontFamily: "inherit",
                      }}
                      PreTag="div"
                      renderer={applyConflictRenderer(
                        "normal",
                        block.currentStartLine,
                        block.incomingStartLine,
                      )}
                    >
                      {block.content}
                    </SyntaxHighlighter>
                  </div>
                );
              }

              // It's a ConflictBlock
              const isResolved = block.resolutionType !== null;

              if (isResolved && !block.isManualEditing) {
                return (
                  <div
                    key={block.id}
                    className="relative group border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex space-x-2 transition-opacity z-10">
                      <button
                        onClick={() => toggleManualEdit(index)}
                        className="p-1 px-2 bg-slate-800 text-white text-xs rounded hover:bg-slate-700 flex items-center space-x-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{t('mergeConflictEditor.editResult')}</span>
                      </button>
                      <button
                        onClick={() => {
                          setParsedBlocks((prev) => {
                            const newBlocks = [...prev];
                            newBlocks[index] = {
                              ...block,
                              resolutionType: null,
                              resolvedContent: null,
                            };
                            return newBlocks;
                          });
                        }}
                        className="p-1 px-2 bg-slate-800 text-white text-xs rounded hover:bg-slate-700 flex items-center space-x-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{t('mergeConflictEditor.undo')}</span>
                      </button>
                    </div>
                    <div className="px-4 py-2 text-slate-900 dark:text-slate-100 bg-transparent">
                      <SyntaxHighlighter
                        language={getLanguage(filePath)}
                        style={isDarkMode ? vscDarkPlus : vs}
                        customStyle={{
                          margin: 0,
                          padding: 0,
                          background: "transparent",
                          fontSize: "inherit",
                          lineHeight: "inherit",
                          fontFamily: "inherit",
                        }}
                        PreTag="div"
                        renderer={applyConflictRenderer(
                          block.resolutionType as any,
                          block.currentStartLine,
                          block.incomingStartLine,
                          countLines(block.currentContent),
                        )}
                      >
                        {block.resolvedContent || " "}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                );
              }

              if (block.isManualEditing) {
                return (
                  <div
                    key={block.id}
                    className="border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 flex flex-col"
                  >
                    <div className="flex items-center justify-between p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs font-bold">
                      <span className="flex items-center space-x-1">
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{t('mergeConflictEditor.manualEditMode')}</span>
                      </span>
                      <button
                        onClick={() => toggleManualEdit(index)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 hover:underline"
                      >
                        {t('mergeConflictEditor.doneEditing')}
                      </button>
                    </div>
                    <div className="h-48 border-y border-slate-200 dark:border-slate-700">
                      <Editor
                        height="100%"
                        defaultLanguage="plaintext" // Depending on extension we could make this dynamic
                        theme="vs-dark"
                        value={block.resolvedContent || ""}
                        onChange={(val: string | undefined) =>
                          handleManualEditChange(index, val || "")
                        }
                        options={{
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          lineNumbers: "off",
                          glyphMargin: false,
                          folding: false,
                          lineDecorationsWidth: 0,
                          lineNumbersMinChars: 0,
                        }}
                      />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={block.id}
                  className="border-y-2 border-slate-300 dark:border-slate-700 my-4 shadow-sm bg-white dark:bg-slate-950"
                >
                  <div className="flex items-center p-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs space-x-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase">
                      {t('mergeConflictEditor.resolveConflict')}
                    </span>
                    <div className="flex-1"></div>
                    <button
                      onClick={() => handleResolve(index, "current")}
                      className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/50 dark:hover:bg-green-900 dark:text-green-300 rounded transition-colors border border-green-200 dark:border-green-800 font-medium whitespace-nowrap"
                    >
                      {t('mergeConflictEditor.acceptCurrent')}
                    </button>
                    <button
                      onClick={() => handleResolve(index, "incoming")}
                      className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/50 dark:hover:bg-blue-900 dark:text-blue-300 rounded transition-colors border border-blue-200 dark:border-blue-800 font-medium whitespace-nowrap"
                    >
                      {t('mergeConflictEditor.acceptIncoming')}
                    </button>
                    <button
                      onClick={() => handleResolve(index, "both")}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded transition-colors font-medium whitespace-nowrap"
                    >
                      {t('mergeConflictEditor.acceptBoth')}
                    </button>
                    <button
                      onClick={() => toggleManualEdit(index)}
                      className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded transition-colors border border-indigo-200 dark:border-indigo-800 font-medium whitespace-nowrap flex items-center space-x-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{t('mergeConflictEditor.editManually')}</span>
                    </button>
                  </div>

                  {/* Current Change */}
                  <div className="relative border-l-4 border-green-500 bg-green-50/50 dark:bg-green-900/10">
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200 text-xs font-bold rounded-bl">
                      {t('mergeConflictEditor.current')} {block.currentChangeLabel}
                    </div>
                    <div className="px-4 py-3 min-h-8 text-slate-800 dark:text-slate-300 bg-transparent">
                      {block.currentContent ? (
                        <SyntaxHighlighter
                          language={getLanguage(filePath)}
                          style={isDarkMode ? vscDarkPlus : vs}
                          customStyle={{
                            margin: 0,
                            padding: 0,
                            background: "transparent",
                            fontSize: "inherit",
                            lineHeight: "inherit",
                            fontFamily: "inherit",
                          }}
                          PreTag="div"
                          renderer={applyConflictRenderer(
                            "current",
                            block.currentStartLine,
                            block.incomingStartLine,
                          )}
                        >
                          {block.currentContent}
                        </SyntaxHighlighter>
                      ) : (
                        <span className="italic text-slate-500">
                          {"<empty>"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-px w-full bg-slate-200 dark:bg-slate-700 relative">
                    <span className="absolute left-1/2 -ml-3 -top-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] px-1 rounded-full font-bold">
                      VS
                    </span>
                  </div>

                  {/* Incoming Change */}
                  <div className="relative border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10">
                    <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200 text-xs font-bold rounded-bl">
                      {t('mergeConflictEditor.incoming')} {block.incomingChangeLabel}
                    </div>
                    <div className="px-4 py-3 min-h-8 text-slate-800 dark:text-slate-300 bg-transparent">
                      {block.incomingContent ? (
                        <SyntaxHighlighter
                          language={getLanguage(filePath)}
                          style={isDarkMode ? vscDarkPlus : vs}
                          customStyle={{
                            margin: 0,
                            padding: 0,
                            background: "transparent",
                            fontSize: "inherit",
                            lineHeight: "inherit",
                            fontFamily: "inherit",
                          }}
                          PreTag="div"
                          renderer={applyConflictRenderer(
                            "incoming",
                            block.currentStartLine,
                            block.incomingStartLine,
                          )}
                        >
                          {block.incomingContent}
                        </SyntaxHighlighter>
                      ) : (
                        <span className="italic text-slate-500">
                          {t('mergeConflictEditor.empty')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
