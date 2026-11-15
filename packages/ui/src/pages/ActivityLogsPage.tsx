import { useCallback, useEffect, useState } from 'react';
import { CircleAlert, RefreshCw, Search } from 'lucide-react';
import { Header } from '../components/Header';
import { ActivityTable } from '../components/ActivityTable';
import { useActivity } from '../hooks/useActivity';
import type { OrganizeFailureGroup } from '../lib/tauri';
import { LAST_ORGANIZE_KEY, ORGANIZE_EVENT } from '../context/FileActionsContext';

const filters = [
  { value: '', label: 'All' },
  { value: 'success', label: 'Moved' },
  { value: 'error', label: 'Failed' },
  { value: 'recovered', label: 'Recovered' },
  { value: 'undone', label: 'Undone' },
];

function readFailureGroups(): OrganizeFailureGroup[] {
  try {
    const raw = window.sessionStorage.getItem(LAST_ORGANIZE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { failure_groups?: OrganizeFailureGroup[] };
    return parsed.failure_groups ?? [];
  } catch {
    return [];
  }
}

export function ActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { logs, loading, error, hasMore, loadMore, total, refresh } = useActivity(20, search, status);
  const [lastFailureGroups, setLastFailureGroups] = useState<OrganizeFailureGroup[]>([]);

  useEffect(() => {
    const sync = () => setLastFailureGroups(readFailureGroups());
    sync();
    window.addEventListener(ORGANIZE_EVENT, sync);
    return () => window.removeEventListener(ORGANIZE_EVENT, sync);
  }, []);

  const dismissFailures = useCallback(() => {
    try { window.sessionStorage.removeItem(LAST_ORGANIZE_KEY); } catch { /* storage unavailable */ }
    setLastFailureGroups([]);
  }, []);

  const filtered = !!search.trim() || !!status;

  return (
    <div className="page">
      <Header title="Activity" subtitle={`${total.toLocaleString()} ${total === 1 ? 'event' : 'events'} recorded`}>
        <label className="search">
          <Search size={14} aria-hidden="true" />
          <input type="search" aria-label="Search activity" placeholder="Search files and rules" value={search}
            onChange={event => setSearch(event.target.value)} />
        </label>
        <button type="button" className="icon-btn" onClick={refresh} disabled={loading} aria-label="Refresh" title="Refresh">
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </Header>

      <div style={{ padding: '0 24px 10px' }} className="activity-toolbar">
        <div className="seg" role="group" aria-label="Filter by status">
          {filters.map(f => (
            <button key={f.value || 'all'} type="button" aria-pressed={status === f.value} onClick={() => setStatus(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body" aria-busy={loading}>
        {error && (
          <div role="alert" className="notice" data-tone="danger" style={{ marginBottom: 12 }}>
            <CircleAlert size={16} aria-hidden="true" /><span className="grow">Couldn’t load activity: {error}</span>
          </div>
        )}
        {loading && logs.length === 0 ? (
          <div className="empty" role="status"><p>Loading activity…</p></div>
        ) : (
          <>
            <ActivityTable logs={logs} failureGroups={lastFailureGroups} onDismissFailures={dismissFailures} filtered={filtered} />
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <button type="button" className="btn" onClick={loadMore} disabled={loading}>
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {logs.length > 0 && (
        <footer className="page-foot">
          <span className="grow num">Showing {logs.length.toLocaleString()} of {total.toLocaleString()}</span>
        </footer>
      )}
    </div>
  );
}
