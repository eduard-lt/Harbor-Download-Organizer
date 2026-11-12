import { Fragment } from 'react';
import { ArrowRight, CircleAlert, History, X } from 'lucide-react';
import type { ActivityLog, OrganizeFailureGroup } from '../lib/tauri';
import { dayLabel, parseLogTimestamp, shortPath } from '../lib/format';
import { fileIcon } from '../lib/icons';

interface ActivityTableProps {
  logs: ActivityLog[];
  failureGroups?: OrganizeFailureGroup[];
  onDismissFailures?: () => void;
  /** True when a search or filter is narrowing the list. */
  filtered?: boolean;
}

/** Shows the last two path segments; full paths stay in titles. */
function sanitizePathForUi(path?: string): string {
  if (!path) return 'N/A';
  const absolutePathPattern = /^[A-Za-z]:[\\/]|^\\\\|^\//;
  if (!absolutePathPattern.test(path)) return path;
  return shortPath(path, 2).replace(/^…[\\/]/, '');
}

const statusInfo: Record<string, { label: string; tone: string }> = {
  success: { label: 'Moved', tone: 'ok' },
  recovered: { label: 'Recovered', tone: 'ok' },
  undone: { label: 'Undone', tone: 'muted' },
  ignored: { label: 'Skipped', tone: 'muted' },
  conflict: { label: 'Conflict', tone: 'warn' },
  error: { label: 'Failed', tone: 'danger' },
};

function status(value: string) {
  return statusInfo[value] ?? { label: value.charAt(0).toUpperCase() + value.slice(1), tone: 'muted' };
}

export function FailureGroups({ groups, onDismiss }: { groups: OrganizeFailureGroup[]; onDismiss?: () => void }) {
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  return (
    <section className="notice" data-tone="danger" aria-label="Failures from the last organize run" style={{ marginBottom: 14 }}>
      <CircleAlert size={16} aria-hidden="true" />
      <div className="grow">
        <strong>{total} {total === 1 ? 'file' : 'files'} couldn’t be moved in the last organize run</strong>
        {groups.map(group => (
          <div key={group.code} style={{ marginTop: 8 }}>
            <div style={{ color: 'var(--ink)' }}>{group.message} <code className="cell-muted">{group.code}</code></div>
            <ul style={{ margin: '4px 0 0', paddingLeft: 0, listStyle: 'none' }}>
              {group.failures.map((failure, index) => (
                <li key={`${group.code}-${index}`} style={{ padding: '3px 0', color: 'var(--ink-2)' }}>
                  <span className="allow-select" style={{ color: 'var(--ink)', fontWeight: 500 }} title={failure.details.source_path}>
                    {sanitizePathForUi(failure.details.source_path)}
                  </span>
                  {failure.details.reason && <span>: {failure.details.reason}</span>}
                  {failure.details.remediation_hint && <span style={{ display: 'block' }}>{failure.details.remediation_hint}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {onDismiss && (
        <button type="button" className="icon-btn" aria-label="Dismiss failures" onClick={onDismiss}>
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

export function ActivityTable({ logs, failureGroups = [], onDismissFailures, filtered }: ActivityTableProps) {
  let lastDay: string | null = null;
  return (
    <>
      {failureGroups.length > 0 && <FailureGroups groups={failureGroups} onDismiss={onDismissFailures} />}
      {logs.length > 0 && (
        <table className="table activity-table" aria-label="Activity">
          <colgroup>
            <col className="c-file" /><col className="c-rule" /><col /><col className="c-status" /><col className="c-time" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">File</th>
              <th scope="col">Rule</th>
              <th scope="col">Moved to</th>
              <th scope="col">Status</th>
              <th scope="col" className="c-time-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const when = parseLogTimestamp(log.timestamp);
              const showDay = when && when.day !== lastDay;
              if (when) lastDay = when.day;
              const Icon = fileIcon(log.icon);
              const s = status(log.status);
              return (
                <Fragment key={log.id}>
                  {showDay && (
                    <tr className="day-row"><th scope="colgroup" colSpan={5}>{dayLabel(when.day)}</th></tr>
                  )}
                  <tr>
                    <td>
                      <div className="name-cell" title={log.source_path}>
                        <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                        <span className="name">{log.filename}</span>
                      </div>
                    </td>
                    <td className="cell-trunc cell-muted" title={log.rule_name}>{log.rule_name}</td>
                    <td className="cell-trunc allow-select" title={log.dest_path}>
                      <span className="sr-only">From {sanitizePathForUi(log.source_path)} </span>
                      <ArrowRight size={12} aria-hidden="true" style={{ display: 'inline', marginRight: 6, color: 'var(--ink-3)' }} />
                      <code>{sanitizePathForUi(log.dest_path)}</code>
                    </td>
                    <td><span className="status" data-tone={s.tone === 'danger' ? 'danger' : undefined}>
                      <span className="dot" data-tone={s.tone} aria-hidden="true" />{s.label}
                    </span></td>
                    <td className="c-time-cell cell-muted num">
                      {when ? <time dateTime={log.timestamp.replace(' ', 'T')}>{when.time}</time> : (log.timestamp || '')}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
      {logs.length === 0 && (
        <div className="empty">
          <History size={22} aria-hidden="true" />
          <h2>{filtered ? 'Nothing matches' : 'No activity yet'}</h2>
          <p>{filtered
            ? 'Try another search or status.'
            : 'Files Harbor moves, skips, or can’t move will show up here.'}</p>
        </div>
      )}
    </>
  );
}
