import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { FileTools } from './FileTools';
import * as api from '../lib/tauri';

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }));
vi.mock('../lib/tauri');
vi.mock('../hooks/useSettings', () => ({ useSettings: () => ({ downloadDir: 'C:/Downloads', refresh: vi.fn().mockResolvedValue(undefined) }) }));

describe('FileTools', () => {
    beforeEach(() => vi.resetAllMocks());
    it('previews moves without invoking undo or folder changes', async () => {
        vi.mocked(api.previewOrganization).mockResolvedValue({ moves: [{ source: 'one.txt', destination: 'Text/one.txt', rule: 'Text' }], errors: ['A file is locked'] });
        render(<FileTools />);
        fireEvent.click(screen.getByText('Preview moves'));
        expect(await screen.findByText(/1 planned moves/)).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('A file is locked');
        expect(api.undoLastBatch).not.toHaveBeenCalled();
        expect(api.setDownloadDir).not.toHaveBeenCalled();
    });
    it('does not change a folder after dialog cancellation', async () => {
        vi.mocked(open).mockResolvedValue(null);
        render(<FileTools />);
        fireEvent.click(screen.getByText('Choose folder'));
        await waitFor(() => expect(screen.getByText('Choose folder')).toBeEnabled());
        expect(api.setDownloadDir).not.toHaveBeenCalled();
    });
    it('changes the selected folder and explains the paused state', async () => {
        vi.mocked(open).mockResolvedValue('D:/Incoming');
        vi.mocked(api.setDownloadDir).mockResolvedValue(undefined);
        render(<FileTools />);
        fireEvent.click(screen.getByText('Choose folder'));
        expect(await screen.findByRole('status')).toHaveTextContent('Monitoring is paused');
        expect(api.setDownloadDir).toHaveBeenCalledWith('D:/Incoming');
    });
    it('requires confirmation for undo and preserves a refusal message', async () => {
        vi.mocked(api.undoLastBatch).mockRejectedValue(new Error('Destination has changed'));
        render(<FileTools />);
        fireEvent.click(screen.getByText('Undo last batch'));
        expect(api.undoLastBatch).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText('Undo batch'));
        expect(await screen.findByRole('alert')).toHaveTextContent('Destination has changed');
    });
    it('exports to the native save-dialog destination', async () => {
        vi.mocked(save).mockResolvedValue('D:/Backup/rules.json');
        vi.mocked(api.exportRules).mockResolvedValue(undefined);
        render(<FileTools />);
        fireEvent.click(screen.getByText('Export rules'));
        expect(await screen.findByRole('status')).toHaveTextContent('Rules exported');
        expect(api.exportRules).toHaveBeenCalledWith('D:/Backup/rules.json');
    });
    it('confirms replacement before importing the selected file', async () => {
        vi.mocked(api.importRules).mockResolvedValue(2);
        render(<FileTools />);
        const file = new File(['{"version":1,"rules":[]}'], 'rules.json', { type: 'application/json' });
        Object.defineProperty(file, 'text', { value: async () => '{"version":1,"rules":[]}' });
        fireEvent.change(screen.getByLabelText('Import rules file'), { target: { files: [file] } });
        const dialog = await screen.findByRole('dialog');
        expect(api.importRules).not.toHaveBeenCalled();
        fireEvent.click(dialog.querySelectorAll('button')[1]);
        expect(await screen.findByRole('status')).toHaveTextContent('Imported 2 rules');
        expect(api.importRules).toHaveBeenCalledWith('{"version":1,"rules":[]}');
    });
});
