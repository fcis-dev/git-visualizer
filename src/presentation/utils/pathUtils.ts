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
