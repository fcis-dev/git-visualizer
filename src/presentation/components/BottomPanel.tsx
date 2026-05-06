import { useEffect, useRef, useState } from "react";
import { X, Trash2, Terminal, AlertCircle, Info, ChevronDown, Filter } from "lucide-react";
import { appLogger, LogEntry, LogType } from "../../utils/AppLogger";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface BottomPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BottomPanel({ isOpen, onClose }: BottomPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const [activeFilter, setActiveFilter] = useState<LogType | 'all'>('all');
  const { t } = useTranslation();

  useEffect(() => {
    setLogs(appLogger.getLogs());
    return appLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen, activeFilter]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight - 100) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const formatDate = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500 dark:text-red-400';
      case 'warning': return 'text-amber-500 dark:text-amber-400';
      case 'command': return 'text-indigo-500 dark:text-indigo-400 font-mono';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'warning': return <Info className="w-3.5 h-3.5 text-amber-500" />;
      case 'command': return <Terminal className="w-3.5 h-3.5" />;
      default: return <Info className="w-3.5 h-3.5" />;
    }
  };

  const filteredLogs = logs.filter(log => activeFilter === 'all' || log.type === activeFilter);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height }}
          exit={{ height: 0 }}
          transition={{ duration: isDragging ? 0 : 0.2 }}
          className="w-full bg-white dark:bg-slate-950 flex flex-col z-20 shadow-2xl relative"
        >
          <div 
            className="absolute top-0 left-0 right-0 h-1 cursor-row-resize hover:bg-indigo-500/50 z-30 transition-colors"
            onMouseDown={handleMouseDown}
            onDoubleClick={() => setHeight(200)}
          />
          
          <div className="border-t border-slate-200 dark:border-slate-800 w-full h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 select-none">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    {t("bottomPanel.output")}
                  </span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full ml-1">
                    {filteredLogs.length}
                  </span>
                </div>

                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-2" />

                <div className="flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {(['all', 'command', 'error'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${
                        activeFilter === f 
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' 
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => appLogger.clear()}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  title={t("bottomPanel.clearLogs")}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                <button
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] bg-white dark:bg-slate-950 custom-scrollbar relative">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 italic">
                  <Terminal className="w-8 h-8 mb-2 opacity-50" />
                  {t("bottomPanel.noLogs")}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 italic">
                  <Filter className="w-8 h-8 mb-2 opacity-50" />
                  {t("bottomPanel.noLogsMatch")}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`flex items-start px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded group ${
                        log.type === 'error' ? 'bg-red-50 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <div className="w-20 shrink-0 text-slate-400 dark:text-slate-500 select-none">
                        [{formatDate(log.timestamp)}]
                      </div>
                      <div className={`w-6 shrink-0 flex justify-center mt-0.5 ${getLogColor(log.type)}`}>
                        {getLogIcon(log.type)}
                      </div>
                      <div className={`flex-1 break-all ${getLogColor(log.type)}`}>
                        {log.message}
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

