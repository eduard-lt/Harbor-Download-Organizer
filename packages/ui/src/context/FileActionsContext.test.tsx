import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FileActionsProvider, useFileActions, LAST_ORGANIZE_KEY } from './FileActionsContext';
import { ToastProvider } from './ToastContext';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('../lib/tauri', () => ({
    previewOrganization: vi.fn(),
    undoLastBatch: vi.fn(),
    getLastBatch: vi.fn().mockResolvedValue(null),
    setDownloadDir: vi.fn(),
    exportRules: vi.fn(),
    importRules: vi.fn(),
}));
const settings = vi.hoisted(() => ({
    refresh: vi.fn().mockResolvedValue(undefined),
    organizeNow: vi.fn(),
    organizing: false,
}));
vi.mock('../hooks/useSettings', () => ({ useSettings: () => settings }));

import { open, save } from '@tauri-apps/plugin-dialog';
import { previewOrganization, undoLastBatch, setDownloadDir, exportRules, importRules, getLastBatch } from '../lib/tauri';

function Buttons() {
    const a = useFileActions();
    return (
        <div>
            <button onClick={a.chooseFolder}>choose</button>
            <button onClick={a.previewMoves}>preview</button>
            <button onClick={a.organizeNow}>organize</button>
            <button onClick={a.requestUndo}>undo</button>
            <button onClick={a.exportRules}>export</button>
            <button onClick={a.requestImport}>import</button>
            <output>{a.lastBatch === undefined ? 'unknown' : a.lastBatch ? `batch ${a.lastBatch.count}` : 'none'}</output>
        </div>
    );
}

const renderProvider = () => render(
    <MemoryRouter>
        <ToastProvider>
            <FileActionsProvider>
                <Routes>
                    <Route path="/" element={<Buttons />} />
                    <Route path="/activity" element={<p>Activity page</p>} />
                </Routes>
            </FileActionsProvider>
        </ToastProvider>
    </MemoryRouter>,
);

describe('FileActionsProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.sessionStorage.clear();
    });

    it('loads the undoable batch and refreshes it after undo', async () => {
        vi.mocked(getLastBatch).mockResolvedValueOnce({ count: 2, recorded_at: null }).mockResolvedValue(null);
        vi.mocked(undoLastBatch).mockResolvedValue(2);
        renderProvider();
        expect(await screen.findByText('batch 2')).toBeInTheDocument();
        fireEvent.click(screen.getByText('undo'));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Undo batch' })); });
        expect(await screen.findByText('none')).toBeInTheDocument();
    });

    it('treats an unreadable batch as unknown', async () => {
        vi.mocked(getLastBatch).mockRejectedValueOnce(new Error('no handler'));
        renderProvider();
        await waitFor(() => expect(getLastBatch).toHaveBeenCalled());
        expect(screen.getByText('unknown')).toBeInTheDocument();
    });

    it('requires a provider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<Buttons />)).toThrow(/FileActionsProvider/);
        spy.mockRestore();
    });

    it('changes the watched folder and says monitoring paused', async () => {
        vi.mocked(open).mockResolvedValue('D:\\Inbox');
        renderProvider();
        await act(async () => { fireEvent.click(screen.getByText('choose')); });
        expect(setDownloadDir).toHaveBeenCalledWith('D:\\Inbox');
        expect(await screen.findByText('Watched folder changed.')).toBeInTheDocument();
        expect(screen.getByText(/Monitoring is paused/)).toBeInTheDocument();
    });

    it('does nothing when the folder picker is cancelled', async () => {
        vi.mocked(open).mockResolvedValue(null);
        renderProvider();
        await act(async () => { fireEvent.click(screen.getByText('choose')); });
        expect(setDownloadDir).not.toHaveBeenCalled();
    });

    it('previews moves without moving files, then organizes from the preview', async () => {
        vi.mocked(previewOrganization).mockResolvedValue({
            moves: [{ source: 'C:\\Downloads\\a.jpg', destination: 'C:\\Downloads\\Images\\a.jpg', rule: 'Images' }],
            errors: ['Could not read b.tmp'],
        });
        settings.organizeNow.mockResolvedValue({
            status: 'success', message: 'Organize finished.', moved_count: 1, moved: 1, total_failures: 0, errors: [], failure_groups: [],
        });
        renderProvider();
        await act(async () => { fireEvent.click(screen.getByText('preview')); });
        const dialog = screen.getByRole('dialog', { name: 'Preview moves' });
        expect(dialog).toHaveTextContent('1 file would move');
        expect(dialog).toHaveTextContent('a.jpg');
        expect(screen.getByRole('alert')).toHaveTextContent('Could not read b.tmp');
        expect(settings.organizeNow).not.toHaveBeenCalled();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Organize now' })); });
        expect(settings.organizeNow).toHaveBeenCalled();
        expect(await screen.findByText('Organize finished.')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('says when nothing would move and keeps Organize now disabled', async () => {
        vi.mocked(previewOrganization).mockResolvedValue({ moves: [], errors: [] });
        renderProvider();
        await act(async () => { fireEvent.click(screen.getByText('preview')); });
        expect(screen.getByText(/No files in the watched folder match a rule/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Organize now' })).toBeDisabled();
    });

    it('stores organize failures and links to Activity', async () => {
        settings.organizeNow.mockResolvedValue({
            status: 'partial_failure', message: 'Organize finished with 1 failure.', moved_count: 0, moved: 0, total_failures: 1, errors: [],
            failure_groups: [{ code: 'filesystem_error', message: 'x', count: 1, failures: [], legacy_errors: [] }],
        });
        const listener = vi.fn();
        window.addEventListener('harbor:organize-result', listener);
        renderProvider();
        await act(async () => { fireEvent.click(screen.getByText('organize')); });
        expect(await screen.findByText('Organize finished with 1 failure.')).toBeInTheDocument();
        expect(JSON.parse(window.sessionStorage.getItem(LAST_ORGANIZE_KEY)!).failure_groups).toHaveLength(1);
        expect(listener).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'See failures in Activity' }));
        expect(screen.getByText('Activity page')).toBeInTheDocument();
        window.removeEventListener('harbor:organize-result', listener);
    });

    it('reports an organize error', async () => {
        settings.organizeNow.mockRejectedValue(new Error('busy'));
        renderProvider();
        await act(async () => { fireEvent.click(screen.getByText('organize')); });
        expect(await screen.findByText('Organize failed: busy')).toBeInTheDocument();
    });

    it('asks before undoing the last batch', async () => {
        vi.mocked(undoLastBatch).mockResolvedValue(3);
        renderProvider();
        fireEvent.click(screen.getByText('undo'));
        expect(screen.getByRole('alertdialog', { name: 'Undo the last batch?' })).toBeInTheDocument();
        expect(undoLastBatch).not.toHaveBeenCalled();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Undo batch' })); });
        expect(undoLastBatch).toHaveBeenCalled();
        expect(await screen.findByText('Restored 3 files.')).toBeInTheDocument();
    });

    it('shows an undo refusal as an error', async () => {
        vi.mocked(undoLastBatch).mockRejectedValue(new Error('Undo refused: report.pdf has changed'));
        renderProvider();
        fireEvent.click(screen.getByText('undo'));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Undo batch' })); });
        expect(await screen.findByRole('alert')).toHaveTextContent('Undo refused: report.pdf has changed');
    });

    it('exports rules to the chosen file', async () => {
        vi.mocked(save).mockResolvedValue('C:\\rules.json');
        renderProvider();
        await act(async () => { fireEvent.click(screen.getByText('export')); });
        expect(exportRules).toHaveBeenCalledWith('C:\\rules.json');
        expect(await screen.findByText('Rules exported.')).toBeInTheDocument();
    });

    it('confirms before importing rules', async () => {
        vi.mocked(importRules).mockResolvedValue(4);
        renderProvider();
        fireEvent.click(screen.getByText('import'));
        const input = screen.getByLabelText('Import rules file') as HTMLInputElement;
        const file = new File(['{"rules":[]}'], 'rules.json', { type: 'application/json' });
        Object.defineProperty(file, 'text', { value: async () => '{"rules":[]}' });
        await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });
        await waitFor(() => expect(screen.getByRole('alertdialog', { name: 'Replace your rules?' })).toBeInTheDocument());
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Import rules' })); });
        expect(importRules).toHaveBeenCalledWith('{"rules":[]}');
        expect(await screen.findByText('Imported 4 rules.')).toBeInTheDocument();
    });

    it('refuses rules files over 2 MiB', async () => {
        renderProvider();
        const input = screen.getByLabelText('Import rules file') as HTMLInputElement;
        const big = new File(['x'], 'big.json');
        Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 });
        await act(async () => { fireEvent.change(input, { target: { files: [big] } }); });
        expect(screen.getByRole('alert')).toHaveTextContent('Rules file must be smaller than 2 MiB.');
        expect(importRules).not.toHaveBeenCalled();
    });
});
