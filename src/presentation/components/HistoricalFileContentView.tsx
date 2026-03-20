import { useState, useEffect, startTransition, useMemo } from "react";
import { ArrowLeft, Copy, Check, Search, X } from "lucide-react";
import { useGitActions } from "../hooks/useGitActions";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTranslation } from 'react-i18next';
import { truncatePath } from '../utils/pathUtils';

interface HistoricalFileContentViewProps {
    repoPath: string;
    filePath: string;
    commitHash: string;
    onClose: () => void;
}

const DebouncedSearchInput = ({ onSearch, className = "w-40 mr-2" }: { onSearch: (query: string) => void, className?: string }) => {
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

export function HistoricalFileContentView({
    repoPath,
    filePath,
    commitHash,
    onClose
}: HistoricalFileContentViewProps) {
    const [content, setContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { t } = useTranslation();

    const { getFileContentAtCommit } = useGitActions(repoPath);

    const searchMatches = useMemo(() => {
        if (!content || !searchQuery) return [];
        const lines = content.split('\n');
        const matches: number[] = [];
        const query = searchQuery.toLowerCase();
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(query)) {
                matches.push(i);
            }
        }
        return matches;
    }, [content, searchQuery]);

    const totalLines = content ? content.split('\n').length : 1;

    useEffect(() => {
        // Detect dark mode based on the document class (Tailwind 'dark' strategy)
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };
        
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);



    useEffect(() => {
        let mounted = true;
        const loadContent = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const text = await getFileContentAtCommit(commitHash, filePath);
                if (mounted) {
                    setContent(text);
                }
            } catch (err: any) {
                if (mounted) {
                    setError(err.toString());
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        loadContent();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [repoPath, filePath, commitHash]);

    const handleCopy = () => {
        if (content) {
            navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

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
            case 'dart': return 'dart';
            case 'rb': return 'ruby';
            case 'php': return 'php';
            case 'sql': return 'sql';
            case 'swift': return 'swift';
            case 'kt':
            case 'kts': return 'kotlin';
            case 'xml': return 'xml';
            case 'vue': return 'vue';
            case 'svelte': return 'svelte';
            case 'graphql':
            case 'gql': return 'graphql';
            case 'dockerfile': return 'docker';
            case 'makefile':
            case 'mk': return 'makefile';
            case 'pl':
            case 'pm': return 'perl';
            case 'scala': return 'scala';
            case 'hs': return 'haskell';
            case 'lua': return 'lua';
            case 'r': return 'r';
            case 'm': return 'objectivec';
            case 'ps1':
            case 'psm1':
            case 'psd1': return 'powershell';
            case 'bat':
            case 'cmd': return 'batch';
            case 'ini': return 'ini';
            case 'properties': return 'properties';
            case 'diff':
            case 'patch': return 'diff';
            case 'less': return 'less';
            case 'scss':
            case 'sass': return 'sass';
            case 'styl': return 'stylus';
            case 'wasm': return 'wasm';
            case 'zig': return 'zig';
            case 'ex':
            case 'exs': return 'elixir';
            case 'erl':
            case 'hrl': return 'erlang';
            case 'clj':
            case 'cljs':
            case 'cljc': return 'clojure';
            case 'fs':
            case 'fsi':
            case 'fsx':
            case 'fsscript': return 'fsharp';
            default: return 'text';
        }
    };

    return (
        <div className="absolute inset-0 z-30 bg-white dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">
            <header className="h-12 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center space-x-2 overflow-hidden">
                    <button
                        onClick={onClose}
                        className="flex items-center space-x-1 p-1 -ml-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">{t('historicalFile.back')}</span>
                    </button>
                    <span className="text-slate-300 dark:text-slate-700 shrink-0">|</span>
                    <div className="flex flex-col min-w-0 flex-1">
                         <span 
                            className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate pr-2 block w-full" 
                            title={filePath}
                         >
                             {truncatePath(filePath)}
                         </span>
                         <span className="text-[10px] text-slate-500 font-mono truncate">
                             @ {commitHash.substring(0, 7)}
                         </span>
                    </div>
                </div>
                
                <div className="flex items-center space-x-2 shrink-0">
                    {/* SEARCH INPUT */}
                    <DebouncedSearchInput onSearch={setSearchQuery} />
                    <button
                        onClick={handleCopy}
                        disabled={!content || isLoading}
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                        title={t('historicalFile.copyFileContent')}
                    >
                         {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            <div className="flex-1 relative flex overflow-hidden bg-slate-50 dark:bg-slate-950">
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : error ? (
                        <div className="text-red-500 flex justify-center items-center h-full text-sm">
                            {t('historicalFile.failedToLoad')} {error}
                        </div>
                    ) : (
                        <div className="text-sm">
                            <SyntaxHighlighter
                                language={getLanguage(filePath)}
                                style={isDarkMode ? vscDarkPlus : vs}
                                customStyle={{
                                    margin: 0,
                                    padding: 0,
                                    background: 'transparent',
                                    fontSize: '13px',
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                                }}
                                showLineNumbers={true}
                                wrapLines={true}
                                lineProps={(lineNumber: number) => {
                                    if (!content || !searchQuery) return {};
                                    const line = (content || "").split('\n')[lineNumber - 1];
                                    if (line && line.toLowerCase().includes(searchQuery.toLowerCase())) {
                                        return {
                                            style: {
                                                display: "block",
                                                backgroundColor: isDarkMode ? "rgba(234, 179, 8, 0.4)" : "rgba(254, 240, 138, 0.5)"
                                            }
                                        };
                                    }
                                    return {};
                                }}
                            >
                                {content || ''}
                            </SyntaxHighlighter>
                        </div>
                    )}
                </div>
                {/* Scrollbar Minimap for Search Matches */}
                {searchMatches.length > 0 && (
                    <div className="absolute top-0 right-2 bottom-0 w-2 pointer-events-none z-10 opacity-70">
                        {searchMatches.map(lineIndex => (
                            <div 
                                key={lineIndex} 
                                className="absolute w-full bg-yellow-400 dark:bg-yellow-500 rounded-sm shadow-sm"
                                style={{ top: `${(lineIndex / totalLines) * 100}%`, height: '3px' }} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
