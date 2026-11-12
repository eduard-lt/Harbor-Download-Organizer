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

/**
 * Keeps the last `keep` segments of a path, prefixed with an ellipsis when
 * anything was dropped. The full path stays available to callers for titles.
 */
export function shortPath(path: string, keep = 2): string {
    if (!path) return '';
    const separator = path.includes('\\') ? '\\' : '/';
    const parts = path.split(/[\\/]/).filter(Boolean);
    if (parts.length <= keep) return path;
    return `…${separator}${parts.slice(-keep).join(separator)}`;
}

/** Splits a "YYYY-MM-DD HH:MM:SS" activity timestamp into a day key and a time. */
export function parseLogTimestamp(timestamp?: string): { day: string; time: string } | null {
    const match = timestamp?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    if (!match) return null;
    return { day: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` };
}

/** Labels a day key as Today, Yesterday, or a short local date. */
export function dayLabel(day: string, now = new Date()): string {
    const [y, m, d] = day.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    });
}
