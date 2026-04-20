import { useState, useEffect, startTransition, useMemo } from "react";
import { ArrowLeft, Copy, Check, Search, X } from "lucide-react";
import { useGitActions } from "../hooks/useGitActions";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTranslation } from 'react-i18next';
import { truncatePath, getLanguage } from '../utils/pathUtils';

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
                placeholder={t('common.search')}
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

    const { lines, searchMatches, totalLines } = useMemo(() => {
        if (!content) return { lines: [], searchMatches: [], totalLines: 1 };
        const splitLines = content.split('\n');
        const matches: number[] = [];
        const query = searchQuery.toLowerCase();
        for (let i = 0; i < splitLines.length; i++) {
            if (query && splitLines[i].toLowerCase().includes(query)) {
                matches.push(i);
            }
        }
        return { lines: splitLines, searchMatches: matches, totalLines: splitLines.length || 1 };
    }, [content, searchQuery]);

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

            <div className="flex-1 relative flex overflow-hidden bg-white dark:bg-slate-950">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : error ? (
                        <div className="text-red-500 flex justify-center items-center h-full text-sm">
                            {t('historicalFile.failedToLoad')} {error}
                        </div>
                    ) : (
                        <div className="text-xs font-mono">
                            {totalLines > 1500 ? (
                                <div className="p-4">
                                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-md text-amber-800 dark:text-amber-200 flex items-center justify-between">
                                        <p className="text-sm">{t('historicalFile.performanceMode')}</p>
                                    </div>
                                    <pre className="whitespace-pre overflow-visible text-slate-800 dark:text-slate-200 selection:bg-indigo-500/30">
                                        {content || ''}
                                    </pre>
                                </div>
                            ) : (
                                <SyntaxHighlighter
                                    language={getLanguage(filePath)}
                                    style={isDarkMode ? oneDark : oneLight}
                                    customStyle={{
                                        margin: 0,
                                        padding: 0,
                                        background: 'transparent',
                                        fontSize: 'inherit',
                                        lineHeight: 'inherit',
                                        fontFamily: 'inherit',
                                        wordBreak: 'break-all',
                                        whiteSpace: 'pre-wrap',
                                        overflowX: 'hidden'
                                    }}
                                    showLineNumbers={true}
                                    lineNumberStyle={{ 
                                        minWidth: "3.25em", 
                                        paddingRight: "0.75em", 
                                        marginRight: "0.75em",
                                        borderRight: isDarkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
                                        color: isDarkMode ? "#64748b" : "#94a3b8", 
                                        textAlign: "right", 
                                        userSelect: "none" 
                                    }}
                                    wrapLines={true}
                                    wrapLongLines={totalLines < 1000}
                                    codeTagProps={{ style: { whiteSpace: 'pre-wrap', wordBreak: 'break-all' } }}
                                    lineProps={() => ({})}
                                >
                                    {content || ''}
                                </SyntaxHighlighter>
                            )}
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
