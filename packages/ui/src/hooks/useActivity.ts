import { useState, useEffect, useCallback } from 'react';
import type { ActivityLog, ActivityStats } from '../lib/tauri';
import { getActivityLogs, getActivityStats, clearActivityLogs } from '../lib/tauri';

export function useActivity(pageSize = 20) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [stats, setStats] = useState<ActivityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    const fetchLogs = useCallback(async (pageNum: number, reset = false) => {
        try {
            setLoading(true);
            const offset = pageNum * pageSize;
            const data = await getActivityLogs(pageSize, offset);

            setLogs((prev) => reset ? data.logs : [...prev, ...data.logs]);
            setTotal(data.total);
            setHasMore(data.has_more);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch activity logs:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getActivityStats();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch activity stats:', err);
        }
    }, []);

    const refresh = useCallback(() => {
        setPage(0);
        fetchLogs(0, true);
        fetchStats();
    }, [fetchLogs, fetchStats]);

    const loadMore = useCallback(() => {
        if (!hasMore || loading) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchLogs(nextPage, false);
    }, [hasMore, loading, page, fetchLogs]);

    const clearLogs = async () => {
        try {
            await clearActivityLogs();
            refresh();
        } catch (err) {
            console.error("Failed to clear logs:", err);
            throw err;
        }
    }

    useEffect(() => {
        refresh();
    }, []); // Initial load

    return {
        logs,
        stats,
        loading,
        error,
        hasMore,
        total,
        refresh,
        loadMore,
        clearLogs,
    };
}
