import { NavLink } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-shell';
import { SlidersHorizontal, History, Settings, CircleHelp, Code2, Coffee } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useUpdateContext } from '../context/UpdateContext';
import { useEffect } from 'react';
import { setMonitoringCue, useMonitoringCue } from '../lib/monitoringCue';

const navItems = [
  { to: '/', icon: SlidersHorizontal, label: 'Rules' },
  { to: '/activity', icon: History, label: 'Activity Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/info', icon: CircleHelp, label: 'Info & Guide' },
];

export function Sidebar() {
  const { serviceStatus, toggleService, loading } = useSettings();
  const { updateState, dismissNotification } = useUpdateContext();
  const { available, url } = updateState;
  const healthError = serviceStatus.configuration_error || serviceStatus.scan_error || serviceStatus.degraded_reason;
  const cuePending = useMonitoringCue();
  const showCue = cuePending && !loading && !serviceStatus.running && !healthError;

  useEffect(() => {
    if (cuePending && !loading && serviceStatus.running) setMonitoringCue(false);
  }, [cuePending, loading, serviceStatus.running]);

  return (
    <aside className="harbor-navigation harbor-glass">
      <a className="harbor-skip-link" href="#main-content">Skip to content</a>
      <div className="harbor-brand">
        <img src="/harbor.svg" alt="" width="36" height="36" draggable="false" />
        <span>Harbor</span>
      </div>
      <nav aria-label="Main navigation" className="harbor-nav-links">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} aria-label={label}
            className={({ isActive }) => `harbor-nav-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={17} aria-hidden="true" /><span>{label}</span>
            {available && to === '/info' && <span className="harbor-update-dot bg-red-500" aria-label="Update available" />}
          </NavLink>
        ))}
      </nav>
      <div className="harbor-nav-status">
        <div id="sidebar-service-toggle" className={`harbor-monitor ${showCue ? 'harbor-monitor-cue' : ''}`}>
          <div className="harbor-monitor-status">
            <span aria-hidden="true" className={`harbor-status-dot ${serviceStatus.running ? 'is-running' : ''}`} />
            <div>
            {healthError ? <NavLink to="/settings" role="alert" className="harbor-health-warning">Needs attention</NavLink> : showCue ?
              <button className="harbor-monitor-start" onClick={() => void toggleService()}>Start monitoring</button> :
              <span className="harbor-monitor-label">{loading ? 'Checking…' : serviceStatus.running ? 'Active' : 'Stopped'}</span>}
            <span className="harbor-monitor-caption">{serviceStatus.running ? 'Monitoring' : 'Paused'}</span>
            </div>
          </div>
          <label className="harbor-switch">
            <input type="checkbox" aria-label="Active monitoring" checked={serviceStatus.running} disabled={loading}
              onChange={() => void toggleService()} />
            <span aria-hidden="true" />
          </label>
        </div>
        <button className="harbor-icon-button" aria-label={available ? 'Update Available' : 'GitHub'}
          title={available ? 'Update Available' : 'GitHub'} onClick={() => {
            if (available && url) { void open(url); dismissNotification(); }
            else void open('https://github.com/eduard-lt/Harbor-Download-Organizer');
          }}><Code2 size={17} aria-hidden="true" /></button>
        <button className="harbor-icon-button" aria-label="Buy me a coffee" title="Buy me a coffee"
          onClick={() => void open('https://ko-fi.com/eduardolteanu')}><Coffee size={17} aria-hidden="true" /></button>
      </div>
    </aside>
  );
}
