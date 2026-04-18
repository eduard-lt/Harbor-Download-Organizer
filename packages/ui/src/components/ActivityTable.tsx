import type { ActivityLog, OrganizeFailureGroup } from '../lib/tauri';

interface ActivityTableProps {
  logs: ActivityLog[];
  failureGroups?: OrganizeFailureGroup[];
  totalResults?: number;
  currentPage?: number;
  totalPages?: number;
}

function sanitizePathForUi(path?: string): string {
  if (!path) return 'N/A';
  const absolutePathPattern = /^[A-Za-z]:[\\/]|^\\\\|^\//;
  if (!absolutePathPattern.test(path)) {
    return path;
  }

  const separator = path.includes('\\') ? '\\' : '/';
  const parts = path.split(/[\\/]/).filter(Boolean);
  if (parts.length === 0) return path;
  if (parts.length === 1) return parts[0];

  return `${parts[parts.length - 2]}${separator}${parts[parts.length - 1]}`;
}


const statusClasses: Record<string, string> = {
  success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  conflict: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  ignored: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const statusDotClasses: Record<string, string> = {
  success: 'bg-emerald-500',
  conflict: 'bg-yellow-500',
  ignored: 'bg-slate-500',
  error: 'bg-red-500',
};

export function ActivityTable({
  logs,
  failureGroups = [],
  totalResults: _totalResults = 0,
  currentPage: _currentPage = 1,
  totalPages: _totalPages = 1,
}: ActivityTableProps) {
  return (
    <div className="space-y-4">
      {failureGroups.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Grouped Failures
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {failureGroups.map((group) => (
              <div key={group.code} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 dark:text-white">{group.code}</p>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {group.count} failure(s)
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{group.message}</p>
                <div className="space-y-2">
                  {group.failures.map((failure, index) => (
                    <div
                      key={`${group.code}-${index}`}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-sm"
                    >
                      <p className="font-medium text-slate-800 dark:text-white">
                        {sanitizePathForUi(failure.details.source_path)}
                      </p>
                      {failure.details.reason && (
                        <p className="text-slate-600 dark:text-slate-300">{failure.details.reason}</p>
                      )}
                      {failure.details.remediation_hint && (
                        <p className="text-amber-700 dark:text-amber-300">{failure.details.remediation_hint}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-3 w-[20%]">File</th>
              <th className="px-6 py-3 w-[50%]">Path</th>
              <th className="px-6 py-3 w-[15%] text-right">Rule</th>
              <th className="px-6 py-3 w-[15%] text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]" title={log.filename}>
                    {log.filename}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="material-icons-round text-[14px]">folder_open</span>
                      <span className="truncate max-w-[350px]" title={sanitizePathForUi(log.source_path)}>{sanitizePathForUi(log.source_path)}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span className="material-icons-round text-[16px]">arrow_forward</span>
                      <span className="truncate max-w-[350px]" title={sanitizePathForUi(log.dest_path)}>{sanitizePathForUi(log.dest_path)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {log.rule_name}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusClasses[log.status] || statusClasses['ignored']
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${statusDotClasses[log.status] || statusDotClasses['ignored']}`}
                    ></span>
                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No activity logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination - Simplified for now as backend pagination support is basic */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Showing {logs.length} results
          </p>
        </div>
      </div>
    </div>
  );
}
