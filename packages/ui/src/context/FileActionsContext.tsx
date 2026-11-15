import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ArrowRight, CircleAlert } from 'lucide-react';
import {
  exportRules as exportRulesApi, getLastBatch, importRules, previewOrganization, setDownloadDir, undoLastBatch,
  type BatchSummary, type OrganizationPreview, type OrganizeNowResponse,
} from '../lib/tauri';
import { useSettings } from '../hooks/useSettings';
import { useToast } from './ToastContext';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Dialog } from '../components/Dialog';
import { formatPath, shortPath } from '../lib/format';

export const LAST_ORGANIZE_KEY = 'harbor:lastOrganizeResult';
export const ORGANIZE_EVENT = 'harbor:organize-result';

interface FileActions {
  busy: boolean;
  /** The undoable batch; null when there is none, undefined while unknown. */
  lastBatch: BatchSummary | null | undefined;
  organizing: boolean;
  chooseFolder: () => void;
  previewMoves: () => void;
  organizeNow: () => void;
  requestUndo: () => void;
  exportRules: () => void;
  requestImport: () => void;
}

const FileActionsContext = createContext<FileActions | undefined>(undefined);

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function FileActionsProvider({ children }: { children: ReactNode }) {
  const { refresh, organizeNow: runOrganize, organizing } = useSettings();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<OrganizationPreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [lastBatch, setLastBatch] = useState<BatchSummary | null | undefined>(undefined);

  const refreshLastBatch = useCallback(async () => {
    // Unknown stays undefined so Undo stays available; the backend still refuses safely.
    try { setLastBatch(await getLastBatch()); } catch { setLastBatch(undefined); }
  }, []);

  useEffect(() => {
    void refreshLastBatch();
    // Background monitoring records batches too, so keep the footer current.
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void refreshLastBatch();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [refreshLastBatch]);

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); await refresh(); }
    catch (e) { notify({ tone: 'danger', message: message(e) }); }
    finally { setBusy(false); void refreshLastBatch(); }
  }, [refresh, notify, refreshLastBatch]);

  const chooseFolder = useCallback(() => void run(async () => {
    const path = await open({ directory: true, multiple: false, title: 'Choose the folder Harbor watches' });
    if (typeof path !== 'string') return;
    await setDownloadDir(path);
    setPreview(null);
    notify({ tone: 'ok', message: 'Watched folder changed.', detail: 'Monitoring is paused so you can review your rules first.' });
  }), [run, notify]);

  const previewMoves = useCallback(() => {
    setPreview(null);
    setPreviewOpen(true);
    void run(async () => { setPreview(await previewOrganization()); });
  }, [run]);

  const organizeNow = useCallback(() => {
    setPreviewOpen(false);
    void (async () => {
      let result: OrganizeNowResponse;
      try { result = await runOrganize(); }
      catch (e) { notify({ tone: 'danger', message: `Organize failed: ${message(e)}` }); return; }
      try { window.sessionStorage.setItem(LAST_ORGANIZE_KEY, JSON.stringify(result)); } catch { /* storage unavailable */ }
      window.dispatchEvent(new Event(ORGANIZE_EVENT));
      void refreshLastBatch();
      const failed = result.total_failures > 0;
      notify({
        tone: failed ? 'danger' : 'ok',
        message: result.message,
        detail: `Moved ${result.moved_count} · Failed ${result.total_failures}`,
        action: failed ? { label: 'See failures in Activity', onClick: () => navigate('/activity') } : undefined,
      });
    })();
  }, [runOrganize, notify, navigate, refreshLastBatch]);

  const exportRules = useCallback(() => void run(async () => {
    const destination = await save({ defaultPath: 'harbor-rules.json', filters: [{ name: 'JSON rules', extensions: ['json'] }] });
    if (!destination) return;
    await exportRulesApi(destination);
    notify({ tone: 'ok', message: 'Rules exported.' });
  }), [run, notify]);

  const value: FileActions = {
    busy, organizing, lastBatch, chooseFolder, previewMoves, organizeNow, exportRules,
    requestUndo: () => setConfirmUndo(true),
    requestImport: () => input.current?.click(),
  };

  const moves = preview?.moves ?? [];

  return (
    <FileActionsContext.Provider value={value}>
      {children}
      <input ref={input} type="file" accept=".json,application/json" hidden aria-label="Import rules file" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { notify({ tone: 'danger', message: 'Rules file must be smaller than 2 MiB.' }); return; }
        void run(async () => setPendingImport(await file.text()));
      }} />

      <Dialog open={previewOpen} title="Preview moves" wide closeLabel="Close preview" onClose={() => setPreviewOpen(false)}
        footer={<>
          <span className="grow">Preview never moves files.</span>
          <button type="button" className="btn" onClick={() => setPreviewOpen(false)}>Close</button>
          <button type="button" className="btn btn-primary" disabled={!preview || moves.length === 0 || organizing} onClick={organizeNow}>
            {organizing ? 'Organizing…' : 'Organize now'}
          </button>
        </>}>
        <div className="dialog-body" aria-busy={!preview}>
          {!preview ? <p>Checking the watched folder…</p> : (
            <>
              <p>{moves.length === 0
                ? 'No files in the watched folder match a rule right now.'
                : `${moves.length} ${moves.length === 1 ? 'file' : 'files'} would move. Results can change if files or rules change before you organize.`}</p>
              {preview.errors.map((e, i) => (
                <div key={i} role="alert" className="notice" data-tone="danger" style={{ marginTop: 10 }}>
                  <CircleAlert size={16} aria-hidden="true" /><span className="grow">{e}</span>
                </div>
              ))}
              {moves.length > 0 && (
                <ul className="preview-list allow-select">
                  {moves.map((move, i) => (
                    <li key={i}>
                      <span className="file">{formatPath(move.source).leaf || move.source}</span>
                      <span className="to"><ArrowRight size={13} aria-hidden="true" />
                        <code title={move.destination}>{shortPath(move.destination, 3)}</code>
                        <span>· {move.rule}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Dialog>

      <ConfirmationModal isOpen={pendingImport !== null} title="Replace your rules?"
        message="Importing replaces your current rules and pauses monitoring. Your previous configuration is kept in a backup. Check the destination folders before you turn monitoring back on."
        confirmLabel="Import rules" onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          const content = pendingImport; setPendingImport(null);
          if (content !== null) void run(async () => {
            const count = await importRules(content);
            setPreview(null);
            notify({ tone: 'ok', message: `Imported ${count} rules.`, detail: 'Monitoring is paused.' });
          });
        }} />
      <ConfirmationModal isOpen={confirmUndo} title="Undo the last batch?"
        message="Monitoring will pause. Harbor puts the files from the last batch back only if they are unchanged and their original locations are free."
        confirmLabel="Undo batch" onCancel={() => setConfirmUndo(false)}
        onConfirm={() => {
          setConfirmUndo(false);
          void run(async () => {
            const count = await undoLastBatch();
            setPreview(null);
            notify({ tone: 'ok', message: `Restored ${count} ${count === 1 ? 'file' : 'files'}.`, detail: 'Monitoring is paused.' });
          });
        }} />
    </FileActionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFileActions() {
  const context = useContext(FileActionsContext);
  if (!context) throw new Error('useFileActions must be used within a FileActionsProvider');
  return context;
}
