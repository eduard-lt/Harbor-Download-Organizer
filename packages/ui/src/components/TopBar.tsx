import { NavLink } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-shell';
import { ListFilter, History, Settings2, BookOpen, Code2, Coffee, ArrowDownToLine } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useUpdateContext } from '../context/UpdateContext';
import { useEffect } from 'react';
import { setMonitoringCue, useMonitoringCue } from '../lib/monitoringCue';
import { formatPath } from '../lib/format';
import { Switch } from './Switch';

const REPO_URL = 'https://github.com/eduard-lt/Harbor-Download-Organizer';

const navItems = [
  { to: '/', icon: ListFilter, label: 'Rules' },
  { to: '/activity', icon: History, label: 'Activity' },
  { to: '/settings', icon: Settings2, label: 'Settings' },
  { to: '/info', icon: BookOpen, label: 'Info & Guide' },
];

/** Frosted Control Deck bar that sits under the native title bar on every page. */
export function TopBar() {
  const { serviceStatus, toggleService, loading, downloadDir } = useSettings();
  const { updateState, dismissNotification } = useUpdateContext();
  const { available, url, version } = updateState;
  const healthError = serviceStatus.configuration_error || serviceStatus.scan_error || serviceStatus.degraded_reason;
  const cuePending = useMonitoringCue();
  const running = serviceStatus.running;
  const showCue = cuePending && !loading && !running && !healthError;
  const restarting = serviceStatus.lifecycle_state === 'restarting';
  const folder = formatPath(downloadDir || '').leaf || 'Downloads';

  useEffect(() => {
    if (cuePending && !loading && running) setMonitoringCue(false);
  }, [cuePending, loading, running]);

  let tone = running ? 'ok' : 'calm';
  let title = running ? 'Monitoring' : 'Paused';
  let text = running ? `Watching ${folder}` : `New files stay in ${folder}`;
  if (loading) { tone = 'muted'; title = 'Checking…'; text = 'Reading status'; }
  else if (healthError) { tone = 'danger'; title = 'Needs attention'; text = healthError; }
  else if (restarting) { tone = 'warn'; title = 'Restarting'; text = 'Restarting the folder watcher'; }
  else if (showCue) { tone = 'accent'; title = 'Ready to start'; text = `Harbor will tidy ${folder}`; }

  return (
    <header className="topbar">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="brand">
        <img src="/harbor.svg" alt="" width="26" height="26" draggable="false" />
        <span>Harbor</span>
      </div>
      <nav aria-label="Main navigation" className="nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
            {available && to === '/info' && <span className="nav-badge" aria-label="Update available" />}
          </NavLink>
        ))}
      </nav>

      <div className="topbar-end">
        <section id="sidebar-service-toggle" className="monitor" aria-label="Monitoring" title={text}
          data-health={healthError && !loading ? 'error' : undefined} data-cue={showCue ? '' : undefined}>
          <span className="dot" data-tone={tone} aria-hidden="true" />
          <span className="monitor-label">
            <span className="monitor-title" role="status">{title}</span>
            {healthError && !loading
              ? <NavLink to="/settings" className="monitor-link">Review in Settings</NavLink>
              : <span className="monitor-text" role={undefined}>{text}</span>}
          </span>
          {healthError && !loading && <span className="sr-only" role="alert">{healthError}</span>}
          {showCue
            ? <button type="button" className="monitor-start" onClick={() => void toggleService()}>Start monitoring</button>
            : <Switch label="Active monitoring" checked={running} disabled={loading} onChange={() => void toggleService()} />}
        </section>

        {available && url && (
          <button type="button" className="side-link" data-emphasis="" title={`Download version ${version ?? ''}`}
            onClick={() => { void open(url); dismissNotification(); }}>
            <ArrowDownToLine size={17} aria-hidden="true" />
            <span>Update{version ? ` ${version}` : ''}</span>
          </button>
        )}
        <button type="button" className="side-link" aria-label="Source on GitHub" title="Source on GitHub"
          onClick={() => void open(REPO_URL)}>
          <Code2 size={19} aria-hidden="true" />
        </button>
        <button type="button" className="side-link" aria-label="Buy me a coffee" title="Buy me a coffee"
          onClick={() => void open('https://ko-fi.com/eduardolteanu')}>
          <Coffee size={19} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
