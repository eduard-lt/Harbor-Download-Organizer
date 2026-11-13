import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Eye, Folder, Hourglass, ShieldCheck, Undo2, Play } from 'lucide-react';
import { setMonitoringCue } from '../lib/monitoringCue';
import { previewOrganization, type OrganizationPreview } from '../lib/tauri';
import { useSettings } from '../hooks/useSettings';
import { useRules } from '../hooks/useRules';
import { useFileActions } from '../context/FileActionsContext';
import { formatPath, shortPath } from '../lib/format';
import { fileIcon } from '../lib/icons';
import { Dialog } from './Dialog';
import { Switch } from './Switch';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = ['Welcome', 'Folder', 'Rules', 'Preview', 'Start'] as const;
const titles = [
  'Welcome to Harbor',
  'Where your downloads land',
  'Choose what gets sorted',
  'See it before anything moves',
  'Ready when you are',
];

const promises = [
  { icon: Eye, title: 'Preview first', text: 'See every planned move before a file is touched.' },
  { icon: ShieldCheck, title: 'Never overwrites', text: 'If a name is taken, Harbor keeps both files.' },
  { icon: Hourglass, title: 'Waits for downloads', text: 'Half-finished downloads are left alone.' },
  { icon: Undo2, title: 'Undo the last batch', text: 'Put files back if they haven’t changed.' },
];

function groupMoves(preview: OrganizationPreview) {
  const groups = new Map<string, string[]>();
  for (const move of preview.moves) {
    const list = groups.get(move.rule) ?? [];
    list.push(formatPath(move.source).leaf || move.source);
    groups.set(move.rule, list);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** Guided first run: folder, rules, a real preview, then an explicit start. */
export function TutorialModal({ isOpen, onClose }: TutorialModalProps) {
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<OrganizationPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [alsoOrganize, setAlsoOrganize] = useState(false);
  const [starting, setStarting] = useState(false);
  const { downloadDir, serviceStatus, toggleService } = useSettings();
  const { rules, toggleRule, fetchRules } = useRules();
  const { busy, chooseFolder, organizeNow } = useFileActions();

  useEffect(() => {
    if (isOpen) { setStep(0); setPreview(null); setPreviewError(null); setAlsoOrganize(false); }
  }, [isOpen]);

  const loadPreview = useCallback(async () => {
    setPreview(null); setPreviewError(null);
    try { setPreview(await previewOrganization()); }
    catch (e) { setPreviewError(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => {
    if (isOpen && step === 3) void loadPreview();
  }, [isOpen, step, loadPreview]);

  // Keep keyboard focus on the step's primary action as the buttons change.
  useEffect(() => {
    if (isOpen) document.querySelector<HTMLElement>('.dialog [data-autofocus]')?.focus();
  }, [isOpen, step]);

  // The folder can change on step 2; refresh rules when returning to them.
  useEffect(() => { if (isOpen && step === 2) void fetchRules(); }, [isOpen, step, fetchRules]);

  const later = () => {
    setMonitoringCue(true);
    onClose();
  };

  const start = async () => {
    setStarting(true);
    try {
      if (!serviceStatus.running) await toggleService();
      if (alsoOrganize) organizeNow();
      setMonitoringCue(false);
      onClose();
    } finally {
      setStarting(false);
    }
  };

  const folder = formatPath(downloadDir || '').leaf || 'Downloads';
  const enabled = rules.filter(r => r.enabled).length;
  const moveCount = preview?.moves.length ?? 0;
  const last = step === steps.length - 1;

  const footer = (
    <>
      <span className="grow">
        {!last && <button type="button" className="link-btn" onClick={later}>Skip setup</button>}
      </span>
      {step > 0 && (
        <button type="button" className="btn" onClick={() => setStep(step - 1)}>
          <ArrowLeft size={14} aria-hidden="true" />Back
        </button>
      )}
      {last ? (
        <>
          <button type="button" className="btn" onClick={later}>Start later</button>
          <button type="button" className="btn btn-primary" data-autofocus disabled={starting} onClick={() => void start()}>
            <Play size={14} aria-hidden="true" />Start monitoring
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-primary" data-autofocus onClick={() => setStep(step + 1)}>
          {step === 0 ? 'Set up Harbor' : 'Next'}<ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
    </>
  );

  return (
    <Dialog open={isOpen} title={titles[step]} onClose={later} dismissible={false} wide footer={footer}>
      <div className="dialog-body onboarding">
        <ol className="stepper" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((label, i) => (
            <li key={label} data-state={i < step ? 'done' : i === step ? 'current' : undefined}
              aria-current={i === step ? 'step' : undefined}>
              <span className="stepper-dot" aria-hidden="true" />{label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <>
            <p className="lead">Harbor keeps your Downloads folder tidy. When a file finishes downloading, it moves it to the folder you chose for that kind of file.</p>
            <ul className="promise-grid">
              {promises.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <Icon size={18} aria-hidden="true" />
                  <div><strong>{title}</strong><span>{text}</span></div>
                </li>
              ))}
            </ul>
            <p>Setup takes about a minute, and nothing moves until you say so.</p>
          </>
        )}

        {step === 1 && (
          <>
            <p className="lead">Harbor watches one folder. Most people keep it on Downloads.</p>
            <div className="folder-card">
              <Folder size={22} aria-hidden="true" />
              <div className="grow">
                <strong>{folder}</strong>
                <code className="allow-select" title={downloadDir}>{downloadDir || 'No folder set'}</code>
              </div>
              <button type="button" className="btn" disabled={busy} onClick={chooseFolder}>Change folder…</button>
            </div>
            <p>New files that land here get sorted. Files already here stay put unless you organize them.</p>
          </>
        )}

        {step === 2 && (
          <>
            <p className="lead">These starter rules are ready. Turn off any you don’t want; you can edit them later on the Rules page.</p>
            <ul className="onboard-rules">
              {rules.map(rule => {
                const Icon = fileIcon(rule.icon);
                return (
                  <li key={rule.id} data-off={rule.enabled ? undefined : ''}>
                    <Icon size={16} aria-hidden="true" />
                    <div className="grow">
                      <strong>{rule.name}</strong>
                      <span>{rule.extensions.slice(0, 6).join(', ') || 'Any file type'}{rule.extensions.length > 6 ? ', …' : ''}</span>
                    </div>
                    <code title={rule.destination}>{shortPath(rule.destination, 1)}</code>
                    <Switch label={`Use ${rule.name}`} checked={rule.enabled} onChange={on => void toggleRule(rule.id, on)} />
                  </li>
                );
              })}
            </ul>
            <p className="hint">{enabled} of {rules.length} rules on. The first rule that matches a file decides where it goes.</p>
          </>
        )}

        {step === 3 && (
          <div aria-live="polite">
            {!preview && !previewError && <p className="lead">Looking through {folder}…</p>}
            {previewError && (
              <>
                <p className="lead">Couldn’t preview {folder}: {previewError}</p>
                <button type="button" className="btn" onClick={() => void loadPreview()}>Try again</button>
              </>
            )}
            {preview && moveCount === 0 && (
              <p className="lead">Nothing to tidy right now. New downloads will be sorted as they arrive.</p>
            )}
            {preview && moveCount > 0 && (
              <>
                <p className="lead">With these rules, <strong>{moveCount} {moveCount === 1 ? 'file' : 'files'}</strong> already in {folder} would move. Nothing has moved yet.</p>
                <ul className="preview-groups">
                  {groupMoves(preview).map(([rule, files]) => (
                    <li key={rule}>
                      <span className="count num">{files.length}</span>
                      <div className="grow">
                        <strong>{rule}</strong>
                        <span>{files.slice(0, 3).join(', ')}{files.length > 3 ? ` and ${files.length - 3} more` : ''}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <>
            <p className="lead">Turn on monitoring and Harbor sorts new files in {folder} with {enabled} {enabled === 1 ? 'rule' : 'rules'}. It runs quietly in the {navigator.platform.toLowerCase().includes('mac') ? 'menu bar' : 'system tray'}, even when this window is closed.</p>
            {moveCount > 0 && (
              <label className="check" style={{ color: 'var(--ink)' }}>
                <input type="checkbox" checked={alsoOrganize} onChange={e => setAlsoOrganize(e.target.checked)} />
                Also move the {moveCount} {moveCount === 1 ? 'file' : 'files'} already there
              </label>
            )}
            <p>You can pause monitoring, preview moves, or undo the last batch at any time.</p>
          </>
        )}
      </div>
    </Dialog>
  );
}
