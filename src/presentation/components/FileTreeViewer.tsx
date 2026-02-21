import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';

interface FileTreeViewerProps {
    files: string[];
    onSelectFile: (path: string) => void;
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

function TreeNodeView({ node, onSelectFile }: { node: TreeNode, onSelectFile: (path: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!node.isDirectory) {
        return (
            <div 
                className="flex items-center space-x-2 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer text-sm text-slate-700 dark:text-slate-300 ml-4 group"
                onClick={() => onSelectFile(node.path)}
                title={node.path}
            >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center opacity-0"></div>
                <File className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                <span className="truncate">{node.name}</span>
            </div>
        );
    }

    return (
        <div className="ml-4">
            <div 
                className="flex items-center space-x-2 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer text-sm text-slate-800 dark:text-slate-200 font-medium select-none group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-400">
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

export function FileTreeViewer({ files, onSelectFile }: FileTreeViewerProps) {
    const tree = buildTree(files);

    if (files.length === 0) {
       return <div className="p-4 text-xs text-slate-500 text-center">No files in tree</div>;
    }

    return (
        <div className="py-2 -ml-4 custom-scrollbar overflow-x-auto">
            {tree.map(node => (
                <TreeNodeView key={node.path} node={node} onSelectFile={onSelectFile} />
            ))}
        </div>
    );
}
