import { NavLink } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-shell';
import { useSettings } from '../hooks/useSettings';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useState, useEffect } from 'react';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: 'rule', label: 'Rules' },
  { to: '/activity', icon: 'history', label: 'Activity Logs' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
  { to: '/info', icon: 'info', label: 'Info & Guide' },
];

export function Sidebar() {
  const { serviceStatus, toggleService, loading } = useSettings();
  const { updateState, dismissNotification } = useUpdateCheck();
  const { available, url } = updateState;
  const serviceEnabled = serviceStatus.running;
  const [showCoachMark, setShowCoachMark] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenServiceCoachMark');
    // Show only if not seen and service is NOT running (to encourage starting it)
    if (!hasSeen && !serviceEnabled) {
      // Small delay for entrance
      const timer = setTimeout(() => setShowCoachMark(true), 1000);
      return () => clearTimeout(timer);
    } else if (serviceEnabled) {
      // If service is enabled, we can consider it "seen" or just hide it
      if (showCoachMark) setShowCoachMark(false);
      if (!hasSeen) localStorage.setItem('hasSeenServiceCoachMark', 'true');
    }
  }, [serviceEnabled, showCoachMark]);

  const handleToggle = async () => {
    if (showCoachMark) {
      setShowCoachMark(false);
      localStorage.setItem('hasSeenServiceCoachMark', 'true');
    }
    await toggleService();
  };

  const dismissCoachMark = () => {
    setShowCoachMark(false);
    localStorage.setItem('hasSeenServiceCoachMark', 'true');
  };

  return (
    <aside className="w-20 lg:w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 relative z-20">
      {/* Logo */}
      <div className="p-6 pt-10 flex items-center gap-3">
        <img src="/harbor.svg" alt="Harbor" className="w-10 h-10 object-contain" />
        <span className="text-xl font-bold tracking-tight hidden lg:block dark:text-white">Harbor</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-lg transition-colors group ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`
            }
          >
            <span className="material-icons-round group-hover:text-primary">{item.icon}</span>
            <span className="font-medium hidden lg:block">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Service Toggle & Footer Links */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 relative">

        {/* Coach Mark Badge */}
        {showCoachMark && (
          <div className="absolute -top-16 left-4 right-4 bg-primary text-white p-3 rounded-xl shadow-xl shadow-primary/20 animate-in slide-in-from-bottom-2 fade-in duration-500 z-50">
            <div className="relative">
              <div className="flex items-start gap-2">
                <span className="material-icons-round text-sm mt-0.5">auto_awesome</span>
                <p className="text-xs font-bold leading-tight">
                  Start the app from here & forget about it!
                </p>
                <button
                  onClick={dismissCoachMark}
                  className="ml-auto -mt-1 -mr-1 text-white/70 hover:text-white"
                >
                  <span className="material-icons-round text-sm">close</span>
                </button>
              </div>
              {/* Arrow pointing down */}
              <div className="absolute -bottom-[20px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-primary border-r-[8px] border-r-transparent"></div>
            </div>
          </div>
        )}

        {/* Service Toggle */}
        <div id="sidebar-service-toggle" className={`rounded-xl p-3 flex items-center justify-between group transition-all duration-300 ${serviceEnabled
          ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/10'
          : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700'
          }`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${serviceEnabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-400'}`}></div>
            <div className="flex flex-col min-w-0">
              <span className={`text-xs font-bold truncate transition-colors ${serviceEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
                }`}>
                {serviceEnabled ? 'Active' : 'Stopped'}
              </span>
              <span className="text-[10px] text-slate-500 truncate hidden lg:block">
                {serviceEnabled ? 'Monitoring' : 'Paused'}
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={serviceEnabled}
              onChange={handleToggle}
              disabled={loading}
            />
            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Separator Line */}
        <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>

        {/* External Links */}
        <div className="space-y-2">
          <button
            onClick={() => {
              if (available && url) {
                open(url);
                dismissNotification();
              } else {
                open('https://github.com/eduard-lt/Harbor-Download-Organizer');
              }
            }}
            className="w-full flex items-center gap-4 px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer relative"
            title={available ? "Update Available!" : "GitHub Repository"}
          >
            <div className="relative">
              <span className={`material-icons-round text-xl transition-colors ${available ? 'text-slate-800 dark:text-white group-hover:text-primary' : 'group-hover:text-primary'}`}>code</span>
              {available && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-900"></span>
                </span>
              )}
            </div>
            <span className={`text-sm font-medium hidden lg:block transition-colors ${available ? 'text-slate-800 dark:text-white group-hover:text-primary' : 'group-hover:text-primary'}`}>
              {available ? 'Update Available' : 'GitHub'}
            </span>
          </button>
          <button
            onClick={() => open('https://ko-fi.com/eduardolteanu')}
            className="w-full flex items-center gap-4 px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer"
            title="Buy me a coffee"
          >
            <span className="material-icons-round text-xl text-slate-400 group-hover:text-[#FF5E5B] transition-colors">favorite</span>
            <span className="text-sm font-medium hidden lg:block group-hover:text-[#FF5E5B] transition-colors">Donate</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
