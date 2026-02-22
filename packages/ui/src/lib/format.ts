/**
 * Formats a file path for display by splitting the last component onto a new line if needed.
 * This is useful for long paths that might break layout.
 *
 * @param path The full file path to format
 * @returns An object containing the parent path and the leaf (file/folder name)
 */
export function formatPath(path: string): { parent: string; leaf: string } {
    // Handle both Windows and Unix separators
    const separator = path.includes('\\') ? '\\' : '/';
    const parts = path.split(separator);

    if (parts.length <= 1) {
        return { parent: '', leaf: path };
    }

    const leaf = parts.pop() || '';
    const parent = parts.join(separator);

    return { parent, leaf };
}
