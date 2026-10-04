import { NavLink } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-shell';
import { SlidersHorizontal, History, Settings, CircleHelp, Code2, Heart, X } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useUpdateContext } from '../context/UpdateContext';
import { useState, useEffect } from 'react';

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
  const [showCoachMark, setShowCoachMark] = useState(false);

  useEffect(() => {
    if (serviceStatus.running) {
      localStorage.setItem('hasSeenServiceCoachMark', 'true');
      return;
    }
    if (!localStorage.getItem('hasSeenServiceCoachMark')) {
      const timer = setTimeout(() => setShowCoachMark(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [serviceStatus.running]);

  const dismissCoachMark = () => {
    setShowCoachMark(false);
    localStorage.setItem('hasSeenServiceCoachMark', 'true');
  };

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
        <div id="sidebar-service-toggle" className="harbor-monitor">
          <div>
            {healthError ? <NavLink to="/settings" role="alert" className="harbor-health-warning">Needs attention</NavLink> :
              <span className="harbor-monitor-label"><span className={`harbor-status-dot ${serviceStatus.running ? 'is-running' : ''}`} />{loading ? 'Checking…' : serviceStatus.running ? 'Active' : 'Stopped'}</span>}
            <span className="harbor-monitor-caption">{serviceStatus.running ? 'Monitoring' : 'Paused'}</span>
          </div>
          <label className="harbor-switch">
            <input type="checkbox" aria-label="Active monitoring" checked={serviceStatus.running} disabled={loading}
              onChange={async () => { dismissCoachMark(); await toggleService(); }} />
            <span aria-hidden="true" />
          </label>
        </div>
        <button className="harbor-icon-button" aria-label={available ? 'Update Available' : 'GitHub'}
          title={available ? 'Update Available' : 'GitHub'} onClick={() => {
            if (available && url) { void open(url); dismissNotification(); }
            else void open('https://github.com/eduard-lt/Harbor-Download-Organizer');
          }}><Code2 size={17} aria-hidden="true" /></button>
        <button className="harbor-icon-button" aria-label="Donate" title="Support Harbor"
          onClick={() => void open('https://ko-fi.com/eduardolteanu')}><Heart size={17} aria-hidden="true" /></button>
        {showCoachMark && !serviceStatus.running && <div className="harbor-coach" role="status">
          <span>Turn on monitoring to organize incoming files automatically.</span>
          <button className="harbor-icon-button" aria-label="Dismiss monitoring tip" onClick={dismissCoachMark}><X size={16} /></button>
        </div>}
      </div>
    </aside>
  );
}
