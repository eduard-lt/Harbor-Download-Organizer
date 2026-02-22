import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RuleModal } from './RuleModal';
import type { Rule } from '../lib/tauri';

// Mock the Tauri dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn(),
}));

const onClose = vi.fn();
const onSave = vi.fn();

const mockRule: Rule = {
    id: '1', name: 'Images', extensions: ['jpg', 'png'], destination: 'C:\\Pictures',
    create_symlink: false, enabled: true, icon: '📷', icon_color: 'indigo',
};

describe('RuleModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        onSave.mockResolvedValue(undefined);
    });

    it('renders nothing when isOpen is false', () => {
        const { container } = render(<RuleModal isOpen={false} onClose={onClose} onSave={onSave} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders "New Rule" title for create mode', () => {
        render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} />);
        expect(screen.getByText('New Rule')).toBeInTheDocument();
    });

    it('renders "Edit Rule" title for edit mode', () => {
        render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} initialData={mockRule} />);
        expect(screen.getByText('Edit Rule')).toBeInTheDocument();
    });

    it('pre-fills form fields from initialData', () => {
        render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} initialData={mockRule} />);
        expect(screen.getByDisplayValue('Images')).toBeInTheDocument();
        expect(screen.getByDisplayValue('jpg, png')).toBeInTheDocument();
        expect(screen.getByDisplayValue('C:\\Pictures')).toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} />);
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel button is clicked', () => {
        render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} />);
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalled();
    });

    it('calls onSave with form data and closes on submit', async () => {
        const { container } = render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} />);

        fireEvent.change(screen.getByPlaceholderText('e.g. Images'), { target: { value: 'Videos' } });
        fireEvent.change(screen.getByPlaceholderText('e.g. jpg, png, gif'), { target: { value: 'mp4, avi' } });
        fireEvent.change(screen.getByPlaceholderText('C:\\Users\\Name\\Pictures'), { target: { value: 'C:\\Videos' } });

        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });

        await waitFor(() => expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Videos', extensions: ['mp4', 'avi'], destination: 'C:\\Videos' })
        ));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('shows error message when onSave throws', async () => {
        onSave.mockRejectedValue(new Error('Save failed'));
        const { container } = render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} initialData={mockRule} />);

        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });

        await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument());
    });

    it('resets form when isOpen changes to false then true', () => {
        const { rerender } = render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} initialData={mockRule} />);
        expect(screen.getByDisplayValue('Images')).toBeInTheDocument();

        rerender(<RuleModal isOpen={false} onClose={onClose} onSave={onSave} initialData={null} />);
        rerender(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} initialData={null} />);

        // In create mode (no initialData), name should be empty
        expect(screen.getByPlaceholderText('e.g. Images')).toHaveValue('');
    });

    it('handles browse button (dialog returns a path)', async () => {
        const { open } = await import('@tauri-apps/plugin-dialog');
        vi.mocked(open).mockResolvedValue('C:\\NewFolder');

        render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle('Browse Folder'));
        });

        await waitFor(() => {
            expect(screen.getByDisplayValue('C:\\NewFolder')).toBeInTheDocument();
        });
    });

    it('handles browse button when dialog returns null (cancelled)', async () => {
        const { open } = await import('@tauri-apps/plugin-dialog');
        vi.mocked(open).mockResolvedValue(null);

        render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} />);

        await act(async () => {
            fireEvent.click(screen.getByTitle('Browse Folder'));
        });

        // Destination should remain empty since dialog was cancelled
        expect(screen.getByPlaceholderText('C:\\Users\\Name\\Pictures')).toHaveValue('');
    });

    it('passes enabled: true for new rules and existing enabled for edits', async () => {
        onSave.mockResolvedValue(undefined);
        const { container } = render(<RuleModal isOpen={true} onClose={onClose} onSave={onSave} />);

        fireEvent.change(screen.getByPlaceholderText('e.g. Images'), { target: { value: 'Test' } });
        fireEvent.change(screen.getByPlaceholderText('C:\\Users\\Name\\Pictures'), { target: { value: 'C:\\Test' } });

        await act(async () => {
            fireEvent.submit(container.querySelector('form')!);
        });

        await waitFor(() => expect(onSave).toHaveBeenCalledWith(
            expect.objectContaining({ enabled: true })
        ));
    });
});
