import { useRef, useState } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { exportRules, importRules, previewOrganization, setDownloadDir, undoLastBatch, type OrganizationPreview } from '../lib/tauri';
import { useSettings } from '../hooks/useSettings';
import { ConfirmationModal } from './ConfirmationModal';

export function FileTools() {
    const { downloadDir, refresh } = useSettings();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<OrganizationPreview | null>(null);
    const [pendingImport, setPendingImport] = useState<string | null>(null);
    const [confirmUndo, setConfirmUndo] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const run = async (action: () => Promise<void>) => {
        setBusy(true); setError(''); setMessage('');
        try { await action(); await refresh(); }
        catch (e) { setError(e instanceof Error ? e.message : String(e)); }
        finally { setBusy(false); }
    };
    const chooseFolder = () => run(async () => {
        const path = await open({ directory: true, multiple: false, title: 'Choose folder to monitor' });
        if (typeof path !== 'string') return;
        await setDownloadDir(path);
        setPreview(null);
        setMessage('Folder changed. Monitoring is paused so you can review your rules.');
    });
    const downloadRules = () => run(async () => {
        const destination = await save({ defaultPath: 'harbor-rules.json', filters: [{ name: 'JSON rules', extensions: ['json'] }] });
        if (!destination) return;
        await exportRules(destination);
        setMessage('Rules exported.');
    });
    const button = 'px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 disabled:opacity-50 text-slate-800 dark:text-slate-100';
    return <section className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700" aria-label="File organization tools">
        <h2 className="font-bold text-slate-900 dark:text-white">Files and rules</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Monitored folder: <span className="break-all">{downloadDir || 'Not available'}</span></p>
        <div className="flex flex-wrap gap-2 mt-4">
            <button className={button} disabled={busy} onClick={chooseFolder}>Choose folder</button>
            <button className={button} disabled={busy} onClick={() => run(async () => { setPreview(await previewOrganization()); })}>Preview moves</button>
            <button className={button} disabled={busy} onClick={() => setConfirmUndo(true)}>Undo last batch</button>
            <button className={button} disabled={busy} onClick={downloadRules}>Export rules</button>
            <button className={button} disabled={busy} onClick={() => input.current?.click()}>Import rules</button>
        </div>
        <input ref={input} type="file" accept=".json,application/json" className="hidden" aria-label="Import rules file" onChange={event => {
            const file = event.target.files?.[0]; event.target.value = '';
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) { setError('Rules file must be smaller than 2 MiB.'); return; }
            void run(async () => setPendingImport(await file.text()));
        }} />
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Preview never moves files. Undo pauses monitoring and refuses changed files or conflicts. Only the last recorded nonempty batch can be undone.</p>
        {error && <p role="alert" className="mt-3 text-red-600 dark:text-red-400">{error}</p>}
        {message && <p role="status" className="mt-3 text-teal-700 dark:text-teal-300">{message}</p>}
        {preview && <div className="mt-4 text-sm text-slate-700 dark:text-slate-200">
            <p>{preview.moves.length} planned moves. Results may change if files or rules change.</p>
            {preview.errors.map((e, i) => <p key={i} role="alert" className="text-red-600">{e}</p>)}
            <ul className="max-h-64 overflow-auto divide-y divide-slate-200 dark:divide-slate-700">{preview.moves.map((move, i) => <li key={i} className="py-2 break-all"><strong>{move.rule}</strong>: {move.source}<br />→ {move.destination}</li>)}</ul>
        </div>}
        <ConfirmationModal isOpen={pendingImport !== null} title="Replace your rules?" message="Import replaces the existing rules and pauses monitoring. Your previous configuration is kept in a backup. Review destination folders before turning monitoring back on." confirmLabel="Import rules" onCancel={() => setPendingImport(null)} onConfirm={() => { const content = pendingImport; setPendingImport(null); if (content !== null) void run(async () => { const count = await importRules(content); setPreview(null); setMessage(`Imported ${count} rules. Monitoring is paused.`); }); }} />
        <ConfirmationModal isOpen={confirmUndo} title="Undo the last batch?" message="Monitoring will pause. Harbor will restore the last recorded batch only if the moved files are unchanged and their original locations are available." confirmLabel="Undo batch" onCancel={() => setConfirmUndo(false)} onConfirm={() => { setConfirmUndo(false); void run(async () => { const count = await undoLastBatch(); setPreview(null); setMessage(`Restored ${count} files. Monitoring is paused.`); }); }} />
    </section>;
}
