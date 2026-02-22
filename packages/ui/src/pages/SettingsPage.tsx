import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { useSettings } from '../hooks/useSettings';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useState } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useWindowSize } from '../hooks/useWindowSize';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { currentSize, setSize, presets } = useWindowSize();
  const {
    serviceStatus,
    startupEnabled,
    loading,
    error,
    toggleService,
    toggleStartup,
    reload,
    reset,
  } = useSettings();

  const {
    checkForUpdates: checkUpdates,
    setCheckForUpdates: toggleCheckUpdates, // We will wrap this to behave like toggle if needed, or update usage
    checkNow: refreshUpdateCheck,
    updateState
  } = useUpdateCheck();

  const {
    loading: updateLoading,
    error: updateError,
    hasUpdate: updateHasUpdate,
    version: updateVersion,
    url: updateUrl
  } = updateState;

  const [showResetModal, setShowResetModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleReload = async () => {
    await reload();
    setFeedbackMessage('Configuration reloaded successfully.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleReset = async () => {
    await reset();
    setShowResetModal(false);
    setFeedbackMessage('Settings have been reset to defaults.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const serviceEnabled = serviceStatus.running;

  return (
    <>
      <Header title="Settings" subtitle="Configure how Harbor manages your automated workflows and environment." />

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto p-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-8">
            {/* Service Status */}
            <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${serviceEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    <span className={`text-xs font-bold uppercase tracking-widest ${serviceEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {loading ? 'Checking...' : (serviceEnabled ? 'Service is Running' : 'Service is Stopped')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Service Status</h3>
                  <p className="text-slate-500 mt-1 max-w-md">
                    Manage the background process that monitors your folders and organizes files in real-time.
                  </p>
                </div>
                <div className="flex items-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={serviceEnabled}
                      onChange={toggleService}
                      disabled={loading}
                    />
                    <div className="w-14 h-8 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>
              </div>
              <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-tight font-semibold">
                  Process ID: <span className="text-slate-800 dark:text-white font-mono ml-1">Native</span>
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-tight font-semibold">
                  Uptime: <span className="text-slate-800 dark:text-white font-mono ml-1">{serviceStatus.uptime_seconds ? `${Math.floor(serviceStatus.uptime_seconds / 60)}m` : 'N/A'}</span>
                </span>
              </div>
            </section>

            {/* Appearance */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <span className="material-icons-round mr-2 text-primary">palette</span>
                Appearance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Light Theme */}
                <div
                  className="group cursor-pointer"
                  onClick={() => setTheme('light')}
                >
                  <div
                    className={`h-24 w-full bg-white rounded-lg border-2 transition-all flex flex-col overflow-hidden relative ${theme === 'light'
                      ? 'border-primary shadow-[0_0_15px_rgba(14,155,148,0.1)]'
                      : 'border-transparent hover:border-primary/50'
                      }`}
                  >
                    <div className="h-4 bg-slate-100 w-full border-b border-slate-200"></div>
                    <div className="p-2 space-y-1">
                      <div className="h-2 w-3/4 bg-slate-200 rounded-full"></div>
                      <div className="h-2 w-1/2 bg-slate-100 rounded-full"></div>
                    </div>
                    {theme === 'light' && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                        <span className="material-icons-round text-[14px]">done</span>
                      </div>
                    )}
                    {theme !== 'light' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <span className="text-xs font-bold text-white">Select Light</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-center mt-2 text-sm font-medium ${theme === 'light' ? 'font-bold text-primary' : 'text-slate-600'}`}>
                    Light
                  </p>
                </div>

                {/* Dark Theme */}
                <div
                  className="group cursor-pointer"
                  onClick={() => setTheme('dark')}
                >
                  <div
                    className={`h-24 w-full bg-slate-800 rounded-lg border-2 transition-all flex flex-col overflow-hidden relative ${theme === 'dark'
                      ? 'border-primary shadow-[0_0_15px_rgba(14,155,148,0.1)]'
                      : 'border-transparent hover:border-primary/50'
                      }`}
                  >
                    <div className="h-4 bg-slate-900 w-full"></div>
                    <div className="p-2 space-y-1">
                      <div className="h-2 w-3/4 bg-slate-700 rounded-full"></div>
                      <div className="h-2 w-1/2 bg-slate-800 rounded-full"></div>
                    </div>
                    {theme === 'dark' && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                        <span className="material-icons-round text-[14px]">done</span>
                      </div>
                    )}
                    {theme !== 'dark' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <span className="text-xs font-bold text-white">Select Dark</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-center mt-2 text-sm font-medium ${theme === 'dark' ? 'font-bold text-primary' : 'text-slate-600 dark:text-slate-400'}`}>
                    Dark
                  </p>
                </div>

                {/* System Theme */}
                <div
                  className="group cursor-pointer"
                  onClick={() => setTheme('system')}
                >
                  <div
                    className={`h-24 w-full bg-slate-100 rounded-lg border-2 transition-all flex overflow-hidden relative ${theme === 'system'
                      ? 'border-primary shadow-[0_0_15px_rgba(14,155,148,0.1)]'
                      : 'border-transparent hover:border-primary/50'
                      }`}
                  >
                    <div className="w-1/2 bg-white h-full border-r border-slate-200"></div>
                    <div className="w-1/2 bg-slate-900 h-full"></div>
                    {theme === 'system' && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                        <span className="material-icons-round text-[14px]">done</span>
                      </div>
                    )}
                    {theme !== 'system' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <span className="text-xs font-bold text-white">Select System</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-center mt-2 text-sm font-medium ${theme === 'system' ? 'font-bold text-primary' : 'text-slate-600 dark:text-slate-400'}`}>
                    System
                  </p>
                </div>
              </div>
            </section>

            {/* System Preferences */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <span className="material-icons-round mr-2 text-primary">laptop</span>
                System Preferences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Launch at Startup</p>
                    <p className="text-xs text-slate-500">Start Harbor when you log in.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={startupEnabled}
                      onChange={toggleStartup}
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

              </div>
            </section>

            {/* Updates & Maintenance */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <span className="material-icons-round mr-2 text-primary">update</span>
                Updates & Maintenance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Check for Updates</p>
                    <p className="text-xs text-slate-500">Notify me when a new version is available.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={checkUpdates}
                        onChange={(e) => toggleCheckUpdates(e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Manual Check</p>
                    <p className="text-xs text-slate-500">
                      {updateLoading ? 'Checking...' :
                        updateError ? 'Error checking updates' :
                          updateHasUpdate && updateVersion ? (
                            <span>
                              Update available:
                              <a
                                href={updateUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1 text-primary hover:underline font-bold cursor-pointer"
                                onClick={(e) => {
                                  if (!updateUrl) e.preventDefault();
                                }}
                              >
                                {updateVersion}
                              </a>
                            </span>
                          ) :
                            'You are up to date.'}
                    </p>
                    {updateError && <p className="text-xs text-red-500 mt-1">{updateError}</p>}
                  </div>
                  <button
                    onClick={() => {
                      refreshUpdateCheck();
                      setFeedbackMessage('Checking for updates...');
                      setTimeout(() => setFeedbackMessage(null), 3000);
                    }}
                    disabled={updateLoading}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {updateLoading ? 'Checking...' : 'Check Now'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  {/* Notifications placeholder - not yet implemented in backend properly */}
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">Config Reload</p>
                    <p className="text-xs text-slate-500">Force reload configuration from disk.</p>
                  </div>
                  <button
                    onClick={handleReload}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                  >
                    Reload
                  </button>
                </div>
              </div>
            </section>


            {/* Window Size */}
            <section className="mb-8">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center">
                <span className="material-icons-round mr-2 text-primary">aspect_ratio</span>
                Window Size
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {presets.map((size) => {
                  const isActive = currentSize?.width === size.width && currentSize?.height === size.height;
                  return (
                    <button
                      key={size.label}
                      onClick={() => {
                        setSize(size);
                        setFeedbackMessage(`Resized to ${size.width}x${size.height}`);
                        setTimeout(() => setFeedbackMessage(null), 3000);
                      }}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all group ${isActive
                        ? 'bg-slate-50 dark:bg-slate-800 border-primary dark:border-primary ring-1 ring-primary'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary dark:hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                      <span className={`text-sm font-bold mb-1 ${isActive ? 'text-primary' : 'text-slate-700 dark:text-slate-300 group-hover:text-primary'}`}>
                        {size.label}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{size.width} x {size.height}</span>
                      {isActive && (
                        <span className="mt-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>


            {/* Factory Reset */}
            <section className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-red-600 font-bold">Factory Reset</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Permanently wipe all configuration data and restart the onboarding process. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="px-6 py-2 border border-red-200 dark:border-red-800 bg-white dark:bg-transparent text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 font-bold rounded-lg transition-all text-sm whitespace-nowrap"
                >
                  Reset All Settings
                </button>
              </div>
            </section>
          </div>

        </div>
        <p className="text-center text-slate-400 text-xs mt-12 mb-4">&copy; {new Date().getFullYear()} Harbor Utility.</p>
      </div>

      {feedbackMessage && (
        <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          {feedbackMessage}
        </div>
      )
      }

      <ConfirmationModal
        isOpen={showResetModal}
        title="Reset to Defaults?"
        message="Are you sure you want to reset all settings to their default values? This action cannot be undone."
        confirmLabel="Yes, Reset Everything"
        cancelLabel="No, Keep Settings"
        isDestructive={true}
        onConfirm={handleReset}
        onCancel={() => setShowResetModal(false)}
      />
    </>
  );
}
