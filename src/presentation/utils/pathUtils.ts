/**
 * Truncates a file path from the beginning if it exceeds the maximum length.
 * It tries to keep the last segments of the path intact.
 * 
 * @param path The full path to truncate
 * @param maxLength The maximum allowed length (default: 40)
 * @returns The truncated path with leading ellipsis if necessary
 */
export function truncatePath(path: string, maxLength: number = 40): string {
  if (!path || path.length <= maxLength) return path;

  // Use / as separator for consistency (Tauri paths usually work with / even on Windows)
  const normalizedPath = path.replace(/\\/g, '/');
  const parts = normalizedPath.split('/');
  
  if (parts.length <= 1) {
    // If no separators, just cut from the start
    return '...' + path.slice(-(maxLength - 3));
  }

  // Keep the last few segments that fit
  let result = parts[parts.length - 1];
  let i = parts.length - 2;
  
  while (i >= 0) {
    const nextPart = parts[i] + '/' + result;
    // Check if adding the next segment + leading ".../" fits
    if (nextPart.length + 4 > maxLength) break;
    result = nextPart;
    i--;
  }

  // If even the last part is too long (rare but possible)
  if (result.length + 4 > maxLength) {
     return '...' + result.slice(-(maxLength - 3));
  }

  return '.../' + result;
}

export function getLanguage(path: string): string {
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
}
