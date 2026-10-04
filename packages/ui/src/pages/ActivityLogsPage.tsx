import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { ActivityTable } from '../components/ActivityTable';
import { useActivity } from '../hooks/useActivity';
import type { OrganizeFailureGroup } from '../lib/tauri';

export function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { logs, loading, error, hasMore, loadMore, total, refresh } = useActivity(20, search, status);
  const [lastFailureGroups, setLastFailureGroups] = useState<OrganizeFailureGroup[]>([]);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem('harbor:lastOrganizeResult');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { failure_groups?: OrganizeFailureGroup[] };
      setLastFailureGroups(parsed.failure_groups ?? []);
    } catch {
      setLastFailureGroups([]);
    }
  }, []);

  return (
    <>
      <Header title="Activity Logs" subtitle={`${total} events recorded`}>
        <button onClick={refresh} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">
          Refresh
        </button>
      </Header>
      <div className="flex-1 p-12 overflow-auto">
        <div className="flex flex-wrap gap-3 mb-4">
          <input aria-label="Search activity" placeholder="Search files, folders or rules" value={search} onChange={event => setSearch(event.target.value)} className="border rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
          <select aria-label="Filter activity status" value={status} onChange={event => setStatus(event.target.value)} className="border rounded-lg p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
            <option value="">All activity</option><option value="success">Moved</option><option value="error">Errors</option><option value="recovered">Recovered</option><option value="undone">Undone</option>
          </select>
        </div>
        {error && (
          <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        {loading && logs.length === 0 ? (
          <div className="text-center p-8 text-slate-500">Loading activity...</div>
        ) : (
          <>
            <ActivityTable logs={logs} failureGroups={lastFailureGroups} />
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="h-1 bg-gradient-to-r from-primary/10 via-primary/60 to-primary/10 opacity-30"></div>
    </>
  );
}
