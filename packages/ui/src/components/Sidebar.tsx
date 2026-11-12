import { NavLink } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-shell';
import { ListFilter, History, Settings2, BookOpen, Code2, Coffee, ArrowDownToLine } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useUpdateContext } from '../context/UpdateContext';
import { useEffect } from 'react';
import { setMonitoringCue, useMonitoringCue } from '../lib/monitoringCue';
import { formatPath } from '../lib/format';

const REPO_URL = 'https://github.com/eduard-lt/Harbor-Download-Organizer';

const navItems = [
  { to: '/', icon: ListFilter, label: 'Rules' },
  { to: '/activity', icon: History, label: 'Activity' },
  { to: '/settings', icon: Settings2, label: 'Settings' },
  { to: '/info', icon: BookOpen, label: 'Info & Guide' },
];

export function Sidebar() {
  const { serviceStatus, toggleService, loading, downloadDir } = useSettings();
  const { updateState, dismissNotification } = useUpdateContext();
  const { available, url, version } = updateState;
  const healthError = serviceStatus.configuration_error || serviceStatus.scan_error || serviceStatus.degraded_reason;
  const cuePending = useMonitoringCue();
  const running = serviceStatus.running;
  const showCue = cuePending && !loading && !running && !healthError;
  const restarting = serviceStatus.lifecycle_state === 'restarting';
  const folder = formatPath(downloadDir || '').leaf || 'your Downloads folder';

  useEffect(() => {
    if (cuePending && !loading && running) setMonitoringCue(false);
  }, [cuePending, loading, running]);

  let tone = running ? 'ok' : 'warn';
  let title = running ? 'Monitoring' : 'Paused';
  let text = running
    ? `Watching ${folder}. New files move as they arrive.`
    : `New downloads stay in ${folder} until you turn monitoring on.`;
  if (loading) { tone = 'muted'; title = 'Checking…'; text = 'Reading Harbor’s status.'; }
  else if (healthError) { tone = 'danger'; title = 'Needs attention'; text = healthError; }
  else if (restarting) { tone = 'warn'; title = 'Restarting'; text = 'Harbor is restarting the folder watcher.'; }

  return (
    <aside className="sidebar" aria-label="Harbor">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="brand">
        <img src="/harbor.svg" alt="" width="22" height="22" draggable="false" />
        <span>Harbor</span>
      </div>
      <nav aria-label="Main navigation" className="nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
            {available && to === '/info' && <span className="nav-badge" aria-label="Update available" />}
          </NavLink>
        ))}
      </nav>

      <section id="sidebar-service-toggle" className="monitor" aria-label="Monitoring"
        data-health={healthError && !loading ? 'error' : undefined} data-cue={showCue ? '' : undefined}>
        <div className="monitor-head">
          <span className="dot" data-tone={tone} aria-hidden="true" />
          <span className="monitor-title" role="status">{title}</span>
          <label className="switch">
            <input type="checkbox" role="switch" aria-label="Active monitoring" checked={running} disabled={loading}
              onChange={() => void toggleService()} />
            <span className="switch-track" aria-hidden="true" />
          </label>
        </div>
        <p className="monitor-text" role={healthError && !loading ? 'alert' : undefined}>{text}</p>
        {healthError && !loading && <NavLink to="/settings" className="monitor-link">Review in Settings</NavLink>}
        {showCue && <button type="button" className="monitor-start" onClick={() => void toggleService()}>Start monitoring</button>}
      </section>

      <div className="side-links">
        {available && url && (
          <button type="button" className="side-link" data-emphasis=""
            onClick={() => { void open(url); dismissNotification(); }}>
            <ArrowDownToLine size={15} aria-hidden="true" />
            <span>Update available{version ? ` · ${version}` : ''}</span>
          </button>
        )}
        <button type="button" className="side-link" onClick={() => void open(REPO_URL)}>
          <Code2 size={15} aria-hidden="true" /><span>Source on GitHub</span>
        </button>
        <button type="button" className="side-link" onClick={() => void open('https://ko-fi.com/eduardolteanu')}>
          <Coffee size={15} aria-hidden="true" /><span>Buy me a coffee</span>
        </button>
      </div>
    </aside>
  );
}
