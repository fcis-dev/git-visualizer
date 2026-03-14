import React, { useEffect, useState } from 'react';
import { X, TrendingUp, Users, GitCommit, Loader2 } from 'lucide-react';
import { useGitActions } from '../hooks/useGitActions';
import { RepositoryStats } from '../../domain/entities/GitEntities';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useTranslation } from 'react-i18next';

interface RepositoryStatsModalProps {
    repoPath: string;
    onClose: () => void;
}

export const RepositoryStatsModal: React.FC<RepositoryStatsModalProps> = ({ repoPath, onClose }) => {
    const gitActions = useGitActions(repoPath);
    const [stats, setStats] = useState<RepositoryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                const data = await gitActions.getRepositoryStats();
                if (data) {
                    // Enrich dates for the tooltip/XAxis
                    const enrichedTimeline = data.timeline.map(item => ({
                        ...item,
                        dateLabel: new Date(item.timestamp * 1000).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                        })
                    }));
                    setStats({ ...data, timeline: enrichedTimeline });
                }
            } catch (err: any) {
                console.error("Failed to load repository stats:", err);
                setError(err.toString());
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [repoPath]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                            <span>{t('repoStats.title')}</span>
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate max-w-xl">
                            {repoPath}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                            <p>{t('repoStats.analyzing')}</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-red-500">
                            <p>{t('repoStats.errorLoading')}</p>
                            <p className="text-sm font-mono mt-2 bg-red-50 dark:bg-red-950 p-2 rounded">{error}</p>
                        </div>
                    ) : stats ? (
                        <div className="space-y-8">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg mr-4 text-indigo-600 dark:text-indigo-400">
                                        <GitCommit className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('repoStats.totalCommits')}</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_commits.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center">
                                    <div className="bg-emerald-100 dark:bg-emerald-900/50 p-3 rounded-lg mr-4 text-emerald-600 dark:text-emerald-400">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('repoStats.contributors')}</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.top_contributors.length}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center">
                                    <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg mr-4 text-blue-600 dark:text-blue-400">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('repoStats.activeDays')}</p>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.timeline.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Activity Timeline Chart */}
                                <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-6">{t('repoStats.activityChartTitle')}</h3>
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                                <XAxis 
                                                    dataKey="dateLabel" 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                                    minTickGap={30}
                                                />
                                                <YAxis 
                                                    axisLine={false} 
                                                    tickLine={false} 
                                                    tick={{ fontSize: 12, fill: '#64748b' }} 
                                                />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                                />
                                                <Area type="monotone" dataKey="count" name={t('repoStats.commits')} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Top Contributors Chart */}
                                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-6">{t('repoStats.topContributorsTitle')}</h3>
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.top_contributors.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={80} />
                                                <Tooltip 
                                                    cursor={{ fill: 'transparent' }}
                                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                                                    itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                                />
                                                <Bar dataKey="commits" name={t('repoStats.commits')} fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {stats.top_contributors.length > 5 && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 px-2 space-y-2 max-h-32 overflow-y-auto">
                                            {stats.top_contributors.slice(5).map((contributor, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{contributor.name}</span>
                                                    <span className="text-slate-900 dark:text-slate-200 font-medium">{contributor.commits}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
