import { Header } from '../components/Header';
import { ActivityTable } from '../components/ActivityTable';
import { useActivity } from '../hooks/useActivity';

export function ActivityLogsPage() {
  const { logs, loading, error, hasMore, loadMore, total } = useActivity();

  return (
    <>
      <Header title="Activity Logs" subtitle={`${total} moves recorded`} />
      <div className="flex-1 p-12 overflow-auto">
        {error && (
          <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
        {loading && logs.length === 0 ? (
          <div className="text-center p-8 text-slate-500">Loading activity...</div>
        ) : (
          <>
            <ActivityTable logs={logs} />
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
