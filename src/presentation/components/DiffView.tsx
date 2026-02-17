import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X } from 'lucide-react';

interface DiffViewProps {
    repoPath: string;
    filePath: string;
    onClose: () => void;
}

export function DiffView({ repoPath, filePath, onClose }: DiffViewProps) {
    const [diff, setDiff] = useState<string>("");
    const [blame, setBlame] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'diff' | 'blame'>('diff');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        if (viewMode === 'diff') {
            invoke<string>('git_diff', { path: repoPath, file: filePath })
                .then(d => {
                    setDiff(d);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setError(err.toString());
                    setLoading(false);
                });
        } else {
            invoke<string>('git_blame', { path: repoPath, file: filePath })
                .then(b => {
                    setBlame(b);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setError(err.toString());
                    setLoading(false);
                });
        }
    }, [repoPath, filePath, viewMode]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[90vw] h-[90vh] bg-white dark:bg-slate-950 rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm text-slate-700 dark:text-slate-300 font-semibold">{filePath}</span>
                        <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-0.5">
                            <button 
                                onClick={() => setViewMode('diff')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'diff' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Diff
                            </button>
                            <button 
                                onClick={() => setViewMode('blame')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'blame' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
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
                        <div className="flex items-center justify-center h-full text-red-500 dark:text-red-400">
                            {error}
                        </div>
                    ) : diff ? (
                        <table className="w-full border-collapse font-mono text-xs">
                            <tbody>
                                {(() => {
                                    let oldLine = 0;
                                    let newLine = 0;
                                    
                                    return diff.split('\n').map((line, i) => {
                                        let colorClass = "text-slate-600 dark:text-slate-400";
                                        let bgClass = "";
                                        let oldLineNum: number | string = "";
                                        let newLineNum: number | string = "";
                                        if (line.startsWith('@@')) {
                                            // Parse header: @@ -1,4 +1,5 @@
                                            const match = /@@ -(\d+),?\d* \+(\d+),?\d* @@/.exec(line);
                                            if (match) {
                                                oldLine = parseInt(match[1]) - 1;
                                                newLine = parseInt(match[2]) - 1;
                                            }
                                            colorClass = "text-indigo-600 dark:text-indigo-400 font-bold";
                                            bgClass = "bg-indigo-50 dark:bg-indigo-900/10 border-y border-indigo-100 dark:border-indigo-900/20";
                                        } else if (line.startsWith('+') && !line.startsWith('+++')) {
                                            newLine++;
                                            newLineNum = newLine;
                                            colorClass = "text-green-700 dark:text-green-400";
                                            bgClass = "bg-green-50 dark:bg-green-900/10";
                                        } else if (line.startsWith('-') && !line.startsWith('---')) {
                                            oldLine++;
                                            oldLineNum = oldLine;
                                            colorClass = "text-red-700 dark:text-red-400";
                                            bgClass = "bg-red-50 dark:bg-red-900/10";
                                        } else if (line.startsWith(' ')) {
                                            oldLine++;
                                            newLine++;
                                            oldLineNum = oldLine;
                                            newLineNum = newLine;
                                        } else if (line.startsWith('diff') || line.startsWith('index') || line.startsWith('+++') || line.startsWith('---')) {
                                            colorClass = "text-slate-400 dark:text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 pb-1 mb-1 block";
                                        }

                                        return (
                                            <tr key={i} className={`${bgClass} hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors`}>
                                                <td className="w-10 px-2 text-right text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">{oldLineNum}</td>
                                                <td className="w-10 px-2 text-right text-slate-400 dark:text-slate-600 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">{newLineNum}</td>
                                                <td className={`px-4 whitespace-pre ${colorClass} w-full`}>{line}</td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    ) : viewMode === 'blame' && blame ? (
                        <table className="w-full border-collapse text-xs font-mono">
                            <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 text-left">
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                                    <th className="py-2 px-4 font-medium w-24">Commit</th>
                                    <th className="py-2 px-4 font-medium w-32">Author</th>
                                    <th className="py-2 px-4 font-medium w-32">Date</th>
                                    <th className="py-2 px-4 font-medium">Content</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let prevHash = "";
                                    return blame.split('\n').map((line, i) => {
                                        if (!line) return null;
                                        // Regex: hash (author date line) content
                                        const match = /^([a-f0-9]+)\s+\((.*?)\s+(\d{4}-\d{2}-\d{2})\s+.*?\)\s(.*)$/.exec(line);
                                        
                                        if (match) {
                                            const [, hash, author, date, content] = match;
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
                                                <tr key={i} className="hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors border-b border-transparent">
                                                    <td className="py-0.5 px-4 font-mono select-none relative">
                                                        {!isSameCommit && (
                                                            <span style={{ color: commitColor }} className="font-bold">
                                                                {shortHash}
                                                            </span>
                                                        )}
                                                        {/* Vertical line for improved visual grouping */}
                                                        <div 
                                                            className="absolute right-0 top-0 bottom-0 w-1 opacity-30" 
                                                            style={{ backgroundColor: commitColor }}
                                                        />
                                                    </td>
                                                    <td className="py-0.5 px-4 font-medium truncate max-w-[150px]" title={author}>
                                                        {!isSameCommit && (
                                                            <span className="text-slate-700 dark:text-slate-200">
                                                                {author}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-0.5 px-4 text-slate-400 dark:text-slate-500 whitespace-nowrap text-[10px]">
                                                        {!isSameCommit && date}
                                                    </td>
                                                    <td className="py-0.5 px-4 text-slate-700 dark:text-slate-300 whitespace-pre w-full font-mono text-sm leading-tight border-l border-slate-100 dark:border-slate-800">
                                                        {content}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        return (
                                            <tr key={i}>
                                                <td colSpan={4} className="py-1 px-4 text-slate-500">{line}</td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 mt-20">No data available.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
