import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface FileTreeViewerProps {
    files: string[];
    onSelectFile: (path: string) => void;
    onViewFileHistory?: (path: string) => void;
}

interface TreeNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: TreeNode[];
}

function buildTree(paths: string[]): TreeNode[] {
    const root: TreeNode[] = [];

    paths.forEach(path => {
        const parts = path.split('/');
        let currentLevel = root;
        let currentPath = "";

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const isLast = index === parts.length - 1;

            let existingNode = currentLevel.find(n => n.name === part);

            if (!existingNode) {
                existingNode = {
                    name: part,
                    path: currentPath,
                    isDirectory: !isLast,
                    children: isLast ? undefined : []
                };
                currentLevel.push(existingNode);
            }

            if (!isLast) {
                currentLevel = existingNode.children!;
            }
        });
    });

    // Optionally sort: directories first
    const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach(node => {
            if (node.children) sortNodes(node.children);
        });
    };

    sortNodes(root);
    return root;
}

function TreeNodeView({ node, onSelectFile, onViewFileHistory }: { node: TreeNode, onSelectFile: (path: string) => void, onViewFileHistory?: (path: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!node.isDirectory) {
        return (
            <div 
                className="flex items-center space-x-2 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer text-xs text-slate-700 dark:text-slate-300 ml-4 group"
                onClick={() => onSelectFile(node.path)}
                onContextMenu={(e) => {
                    if (onViewFileHistory) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Special event payload to let the parent handle the right-click menu positioning
                        const customEvent = new CustomEvent('file-tree-context-menu', {
                            detail: {
                                path: node.path,
                                x: e.clientX,
                                y: e.clientY
                            }
                        });
                        document.dispatchEvent(customEvent);
                    }
                }}
                title={node.path}
            >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center opacity-0"></div>
                <File className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-500 shrink-0" />
                <span className="truncate">{node.name}</span>
            </div>
        );
    }

    return (
        <div className="ml-4">
            <div 
                className="flex items-center space-x-2 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer text-xs text-slate-800 dark:text-slate-200 font-medium select-none group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-500">
                    {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </div>
                <Folder className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-indigo-500' : 'text-indigo-400 dark:text-indigo-500/70'}`} fill={isOpen ? "currentColor" : "none"} />
                <span className="truncate">{node.name}</span>
            </div>
            
            {isOpen && node.children && (
                <div className="border-l border-slate-200 dark:border-slate-800 ml-[11px] mt-0.5">
                    {node.children.map(child => (
                        <TreeNodeView key={child.path} node={child} onSelectFile={onSelectFile} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FileTreeViewer({ files, onSelectFile, onViewFileHistory }: FileTreeViewerProps) {
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        path: string | null;
    }>({ visible: false, x: 0, y: 0, path: null });

    // Handle custom context menu event from tree nodes
    useEffect(() => {
        const handleCustomMenu = (e: any) => {
            const { path, x, y } = e.detail;
            setContextMenu({ visible: true, x, y, path });
        };
        const closeContextMenu = () => setContextMenu(prev => ({ ...prev, visible: false }));
        
        document.addEventListener('file-tree-context-menu', handleCustomMenu);
        document.addEventListener('click', closeContextMenu);
        
        return () => {
            document.removeEventListener('file-tree-context-menu', handleCustomMenu);
            document.removeEventListener('click', closeContextMenu);
        };
    }, []);

    const tree = buildTree(files);
    const { t } = useTranslation();

    if (files.length === 0) {
       return <div className="p-4 text-xs text-slate-500 text-center">{t("fileTreeViewer.noFiles")}</div>;
    }

    return (
        <div className="py-2 -ml-4 custom-scrollbar overflow-x-auto relative">
            {tree.map(node => (
                <TreeNodeView key={node.path} node={node} onSelectFile={onSelectFile} onViewFileHistory={onViewFileHistory} />
            ))}
            
            {/* File History Context Menu */}
            {contextMenu.visible && contextMenu.path && onViewFileHistory && (
              <div 
                className="fixed z-50 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg min-w-[160px] text-sm overflow-hidden"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 truncate max-w-[200px]" title={contextMenu.path}>
                  {contextMenu.path.split('/').pop()}
                </div>
                
                <button 
                  className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
                  onClick={() => {
                    onViewFileHistory(contextMenu.path!);
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                >
                  {t("fileTreeViewer.viewFileHistory")}
                </button>
              </div>
            )}
        </div>
    );
}
