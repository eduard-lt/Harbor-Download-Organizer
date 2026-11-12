import { useState } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import { ChevronRight, CircleAlert, TriangleAlert } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { useSettings } from '../hooks/useSettings';
import { useUpdateContext } from '../context/UpdateContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Switch } from '../components/Switch';
import { useWindowSize } from '../hooks/useWindowSize';
import { setTutorialCompleted } from '../lib/tauri';
import { TutorialModal } from '../components/TutorialModal';
import { setMonitoringCue } from '../lib/monitoringCue';
import { useToast } from '../context/ToastContext';
import { useFileActions } from '../context/FileActionsContext';
import packageJson from '../../package.json';
import { batchLabel } from '../lib/format';

function formatUptime(seconds?: number) {
  if (!seconds) return 'Not running';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const lifecycleLabels: Record<string, string> = {
  running: 'Running', stopped: 'Stopped', restarting: 'Restarting', degraded: 'Degraded',
};

export function SettingsPage() {
  const { theme, setTheme, reduceTransparency, setReduceTransparency } = useTheme();
  const { currentSize, setSize, presets } = useWindowSize();
  const { serviceStatus, startupEnabled, downloadDir, loading, error, toggleService, retryService, toggleStartup, reload, reset } = useSettings();
  const { checkForUpdates, setCheckForUpdates, checkNow, updateState } = useUpdateContext();
  const { busy, organizing, lastBatch, chooseFolder, previewMoves, organizeNow, requestUndo, exportRules, requestImport } = useFileActions();
  const { notify } = useToast();
  const { loading: updateLoading, error: updateError, hasUpdate, version: updateVersion, url: updateUrl } = updateState;

  const [showResetModal, setShowResetModal] = useState(false);
  const [showResetTutorial, setShowResetTutorial] = useState(false);

  const handleReload = async () => {
    try {
      await reload();
      notify({ tone: 'ok', message: 'Configuration reloaded.' });
    } catch (e) {
      notify({ tone: 'danger', message: `Couldn’t reload configuration: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  const handleReset = async () => {
    setShowResetModal(false);
    try {
      await reset();
      setMonitoringCue(false);
      setShowResetTutorial(true);
      notify({ tone: 'ok', message: 'Rules and settings are back to their defaults.' });
    } catch (e) {
      notify({ tone: 'danger', message: `Couldn’t reset: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  const running = serviceStatus.running;
  const lifecycle = serviceStatus.lifecycle_state ?? (running ? 'running' : 'stopped');
  const statusTone = loading ? 'muted' : serviceStatus.degraded_reason ? 'warn' : running ? 'ok' : 'warn';

  let updateText = `You’re up to date.`;
  if (updateLoading) updateText = 'Checking for updates…';
  else if (updateError) updateText = 'Couldn’t check for updates.';
  else if (hasUpdate && updateVersion) updateText = `Version ${updateVersion} is available.`;

  return (
    <div className="page">
      <Header title="Settings" />
      <div className="page-body">
        {(serviceStatus.configuration_error || serviceStatus.scan_error || error) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {serviceStatus.configuration_error && (
              <div role="alert" className="notice" data-tone="danger">
                <CircleAlert size={16} aria-hidden="true" />
                <span className="grow"><strong>Configuration problem.</strong> {serviceStatus.configuration_error}</span>
              </div>
            )}
            {serviceStatus.scan_error && (
              <div role="alert" className="notice" data-tone="warn">
                <TriangleAlert size={16} aria-hidden="true" />
                <span className="grow"><strong>Monitoring needs attention.</strong> {serviceStatus.scan_error}</span>
              </div>
            )}
            {error && (
              <div role="alert" className="notice" data-tone="danger">
                <CircleAlert size={16} aria-hidden="true" /><span className="grow">{error}</span>
              </div>
            )}
          </div>
        )}

        <div className="settings-grid">
          <div className="settings-col">
            <section aria-labelledby="s-files">
              <h2 className="group-title" id="s-files">Files</h2>
              <div className="group">
                <div className="group-row">
                  <div className="text">
                    <div className="title">Watched folder</div>
                    <code className="desc allow-select" title={downloadDir}>{downloadDir || 'Not set'}</code>
                  </div>
                  <div className="actions"><button type="button" className="btn btn-sm" disabled={busy} onClick={chooseFolder}>Change…</button></div>
                </div>
                <div className="group-row">
                  <div className="text">
                    <div className="title">Organize files already there</div>
                    <div className="desc">Preview first. Nothing moves until you choose Organize now.</div>
                  </div>
                  <div className="actions">
                    <button type="button" className="btn btn-sm" disabled={busy} onClick={previewMoves}>Preview moves</button>
                    <button type="button" className="btn btn-sm" disabled={busy || organizing} onClick={organizeNow}>
                      {organizing ? 'Organizing…' : 'Organize now'}
                    </button>
                  </div>
                </div>
                <div className="group-row">
                  <div className="text">
                    <div className="title">Undo last batch</div>
                    <div className="desc">{lastBatch === null
                      ? 'Nothing to undo. Batches Harbor moves show up here.'
                      : `${lastBatch ? `${batchLabel(lastBatch.count, lastBatch.recorded_at)}. ` : ''}Puts the files back if they are unchanged. Pauses monitoring.`}</div>
                  </div>
                  <div className="actions"><button type="button" className="btn btn-sm" disabled={busy || lastBatch === null} onClick={requestUndo}>Undo last batch</button></div>
                </div>
                <div className="group-row">
                  <div className="text">
                    <div className="title">Rules file</div>
                    <div className="desc">Move your rules to another computer or share them. Importing pauses monitoring.</div>
                  </div>
                  <div className="actions">
                    <button type="button" className="btn btn-sm" disabled={busy} onClick={requestImport}>Import rules…</button>
                    <button type="button" className="btn btn-sm" disabled={busy} onClick={exportRules}>Export rules…</button>
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="s-monitoring">
              <h2 className="group-title" id="s-monitoring">Monitoring</h2>
              <div className="group">
                <div className="group-row">
                  <span className="dot" data-tone={statusTone} aria-hidden="true" />
                  <div className="text">
                    <div className="title">{loading ? 'Checking…' : running ? 'Monitoring is on' : 'Monitoring is paused'}</div>
                    <div className="desc">{running
                      ? 'New files in the watched folder move as they arrive.'
                      : 'New downloads stay where they land until you turn this on.'}</div>
                  </div>
                  <Switch label="Monitoring service" checked={running} disabled={loading} onChange={() => void toggleService()} />
                </div>
                {serviceStatus.degraded_reason && (
                  <div className="group-row">
                    <TriangleAlert size={16} aria-hidden="true" style={{ color: 'var(--warn-text)', flexShrink: 0 }} />
                    <div className="text">
                      <div className="title">Degraded state</div>
                      <div className="desc">{serviceStatus.degraded_reason}</div>
                    </div>
                    <div className="actions"><button type="button" className="btn btn-sm" onClick={() => void retryService()}>Retry recovery</button></div>
                  </div>
                )}
                <div className="group-row">
                  <details style={{ flex: 1 }}>
                    <summary><ChevronRight size={14} aria-hidden="true" />Diagnostics</summary>
                    <dl className="kv allow-select">
                      <dt>State</dt><dd>{lifecycleLabels[lifecycle] ?? lifecycle}</dd>
                      <dt>Process ID</dt><dd className="mono">{serviceStatus.pid || 'None'}</dd>
                      <dt>Uptime</dt><dd className="num">{formatUptime(serviceStatus.uptime_seconds)}</dd>
                    </dl>
                  </details>
                </div>
              </div>
            </section>
          </div>

          <div className="settings-col">
            <section aria-labelledby="s-appearance">
              <h2 className="group-title" id="s-appearance">Appearance</h2>
              <div className="group">
                <div className="group-row stack">
                  <div className="title" id="theme-label">Theme</div>
                  <div className="theme-options" role="radiogroup" aria-labelledby="theme-label">
                    {([['light', 'Light', 'sw-light'], ['dark', 'Dark', 'sw-dark'], ['system', 'Match system', 'sw-system']] as const).map(([value, label, swatch]) => (
                      <label className="theme-option" key={value}>
                        <input type="radio" name="theme" value={value} checked={theme === value} onChange={() => setTheme(value)} />
                        <span className={`theme-swatch ${swatch}`} aria-hidden="true" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="group-row">
                  <div className="text">
                    <div className="title">Reduce transparency</div>
                    <div className="desc">Use solid backgrounds instead of frosted glass.</div>
                  </div>
                  <Switch label="Reduce transparency" checked={reduceTransparency ?? false} onChange={setReduceTransparency} />
                </div>
                <div className="group-row">
                  <div className="text">
                    <div className="title" id="size-label">Window size</div>
                  </div>
                  <div className="seg" role="group" aria-labelledby="size-label">
                    {presets.map((size) => {
                      const active = currentSize?.width === size.width && currentSize?.height === size.height;
                      return (
                        <button key={size.label} type="button" aria-pressed={active} title={`${size.width} × ${size.height}`}
                          onClick={() => { setSize(size); notify({ message: `Window resized to ${size.width} × ${size.height}.` }); }}>
                          {size.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="s-startup">
              <h2 className="group-title" id="s-startup">Startup and updates</h2>
              <div className="group">
                <div className="group-row">
                  <div className="text">
                    <div className="title">Open Harbor at login</div>
                    <div className="desc">Starts quietly in the {navigator.platform.toLowerCase().includes('mac') ? 'menu bar' : 'system tray'}.</div>
                  </div>
                  <Switch label="Launch at startup" checked={startupEnabled} onChange={() => void toggleStartup()} />
                </div>
                <div className="group-row">
                  <div className="text"><div className="title">Check for updates automatically</div></div>
                  <Switch label="Check for updates" checked={checkForUpdates} onChange={setCheckForUpdates} />
                </div>
                <div className="group-row">
                  <div className="text">
                    <div className="title">Harbor {packageJson.version}</div>
                    <div className="desc" role="status" style={hasUpdate && !updateLoading ? { color: 'var(--accent-text)' } : undefined}>{updateText}</div>
                    {updateError && <div className="desc" style={{ color: 'var(--danger-text)' }}>{updateError}</div>}
                  </div>
                  <div className="actions">
                    <button type="button" className="btn btn-sm" disabled={updateLoading} onClick={() => checkNow()}>
                      {updateLoading ? 'Checking…' : 'Check now'}
                    </button>
                    {hasUpdate && updateUrl && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => void open(updateUrl)}>Download</button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="span-2" aria-labelledby="s-advanced">
            <h2 className="group-title" id="s-advanced">Advanced</h2>
            <div className="group">
              <div className="group-row">
                <div className="text">
                  <div className="title">Reload configuration</div>
                  <div className="desc">Reads the configuration file again after you edit it by hand.</div>
                </div>
                <div className="actions"><button type="button" className="btn btn-sm" onClick={() => void handleReload()}>Reload</button></div>
              </div>
              <div className="group-row">
                <div className="text">
                  <div className="title">Reset to defaults</div>
                  <div className="desc">Replaces your rules and settings with the defaults and shows the introduction again. Files already moved stay where they are.</div>
                </div>
                <div className="actions"><button type="button" className="btn btn-sm btn-danger" onClick={() => setShowResetModal(true)}>Reset…</button></div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <ConfirmationModal isOpen={showResetModal} title="Reset to defaults?"
        message="Your rules and settings are replaced with the defaults. This can’t be undone. Files Harbor already moved stay where they are."
        confirmLabel="Reset everything" cancelLabel="Keep my settings" isDestructive
        onConfirm={() => void handleReset()} onCancel={() => setShowResetModal(false)} />
      <TutorialModal isOpen={showResetTutorial} onClose={() => {
        setShowResetTutorial(false);
        void setTutorialCompleted(true).catch(e => notify({ tone: 'danger', message: `Couldn’t save onboarding: ${String(e)}` }));
      }} />
    </div>
  );
}
