import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActivityLog, ActivityStats } from '../lib/tauri';
import { getActivityLogs, getActivityStats, clearActivityLogs } from '../lib/tauri';

export function useActivity(pageSize = 20) {
    const requestRef = useRef(0);
    const busyRef = useRef(false);
    const pageRef = useRef(0);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [stats, setStats] = useState<ActivityStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);

    const fetchLogs = useCallback(async (pageNum: number) => {
        const request = ++requestRef.current;
        busyRef.current = true;
        try {
            setLoading(true);
            // Re-fetch the visible prefix so new moves cannot shift offsets and
            // duplicate rows while loading another page.
            const data = await getActivityLogs((pageNum + 1) * pageSize, 0);
            if (request !== requestRef.current) return;
            setLogs(data.logs);
            setPage(pageNum);
            pageRef.current = pageNum;
            setTotal(data.total);
            setHasMore(data.has_more);
            setError(null);
        } catch (err) {
            if (request !== requestRef.current) return;
            console.error('Failed to fetch activity logs:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            if (request === requestRef.current) {
                busyRef.current = false;
                setLoading(false);
            }
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
        fetchLogs(0);
        fetchStats();
    }, [fetchLogs, fetchStats]);

    const loadMore = useCallback(() => {
        if (!hasMore || loading) return;
        const nextPage = page + 1;
        fetchLogs(nextPage);
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
    }, [refresh]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (!busyRef.current && document.visibilityState !== 'hidden') {
                void fetchLogs(pageRef.current);
                void fetchStats();
            }
        }, 5000);
        return () => { window.clearInterval(timer); requestRef.current += 1; };
    }, [fetchLogs, fetchStats]);

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
