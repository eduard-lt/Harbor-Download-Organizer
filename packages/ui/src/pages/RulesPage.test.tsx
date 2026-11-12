import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { RulesPage } from './RulesPage';
import type { Rule } from '../lib/tauri';

// Mock hooks and Tauri APIs
vi.mock('../hooks/useRules', () => ({
    useRules: vi.fn(),
}));

vi.mock('../lib/tauri', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../lib/tauri')>();
    return {
        ...actual,
        getTutorialCompleted: vi.fn().mockResolvedValue(true),
        setTutorialCompleted: vi.fn().mockResolvedValue(undefined),
    };
});

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('../hooks/useSettings', () => ({ useSettings: () => ({ downloadDir: 'C:\\Users\\you\\Downloads' }) }));
const fileActions = vi.hoisted(() => ({
    busy: false, organizing: false, lastBatch: { count: 3, recorded_at: '2024-01-02 14:32:00' } as { count: number; recorded_at: string } | null, chooseFolder: vi.fn(), previewMoves: vi.fn(), organizeNow: vi.fn(),
    requestUndo: vi.fn(), exportRules: vi.fn(), requestImport: vi.fn(),
}));
vi.mock('../context/FileActionsContext', () => ({ useFileActions: () => fileActions }));
vi.mock('@tauri-apps/plugin-shell', () => ({ open: vi.fn() }));

import { useRules } from '../hooks/useRules';

const makeRule = (overrides?: Partial<Rule>): Rule => ({
    id: '1', name: 'Images', extensions: ['jpg', 'png'], destination: 'C:\\Pictures',
    create_symlink: false, enabled: true, icon: 'photo', icon_color: 'indigo',
    ...overrides,
});

describe('RulesPage', () => {
    const mockUseRules = {
        rules: [makeRule()],
        loading: false,
        error: null,
        fetchRules: vi.fn(),
        addRule: vi.fn().mockResolvedValue(undefined),
        editRule: vi.fn().mockResolvedValue(undefined),
        removeRule: vi.fn().mockResolvedValue(undefined),
        toggleRule: vi.fn().mockResolvedValue(undefined),
        reorderRules: vi.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useRules).mockReturnValue(mockUseRules);
    });

    it('renders the title with a rule count', () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, rules: [makeRule(), makeRule({ id: '2', name: 'Docs', enabled: false })] });
        render(<RulesPage />);
        expect(screen.getByRole('heading', { name: 'Rules' })).toBeInTheDocument();
        expect(screen.getByText('2 rules, 1 enabled')).toBeInTheDocument();
    });

    it('shows the watched folder with its file actions', () => {
        render(<RulesPage />);
        expect(screen.getByText('C:\\Users\\you\\Downloads')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Change' }));
        fireEvent.click(screen.getByRole('button', { name: 'Preview moves' }));
        fireEvent.click(screen.getByRole('button', { name: 'Organize now' }));
        fireEvent.click(screen.getByRole('button', { name: 'Undo last batch' }));
        expect(fileActions.chooseFolder).toHaveBeenCalled();
        expect(fileActions.previewMoves).toHaveBeenCalled();
        expect(fileActions.organizeNow).toHaveBeenCalled();
        expect(fileActions.requestUndo).toHaveBeenCalled();
    });

    it('shows the last batch beside Undo and disables Undo when there is none', () => {
        const { rerender } = render(<RulesPage />);
        expect(screen.getByText(/Last batch: 3 files, Tue, Jan 2, 2024 at 14:32/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Undo last batch' })).toBeEnabled();
        fileActions.lastBatch = null;
        rerender(<RulesPage />);
        expect(screen.getByText('Nothing to undo')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Undo last batch' })).toBeDisabled();
        fileActions.lastBatch = { count: 3, recorded_at: '2024-01-02 14:32:00' };
    });

    it('shows loading state', () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, loading: true, rules: [] });
        render(<RulesPage />);
        expect(screen.getByText('Loading rules…')).toBeInTheDocument();
    });

    it('shows error message when error is present', () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, error: 'Some error' });
        render(<RulesPage />);
        expect(screen.getByRole('alert')).toHaveTextContent(/Some error/);
    });

    it('renders rule row with correct data', () => {
        render(<RulesPage />);
        const row = screen.getByRole('row', { name: /Images/ });
        expect(row).toHaveTextContent('jpg, png');
        expect(row).toHaveTextContent('C:\\Pictures');
        expect(screen.getByRole('switch', { name: 'Enable Images' })).toBeChecked();
    });

    it('marks pattern and size rules', () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, rules: [makeRule({ has_pattern: true, pattern: '^IMG', has_size_constraint: true })] });
        render(<RulesPage />);
        expect(screen.getByText('Pattern')).toBeInTheDocument();
        expect(screen.getByText('Size')).toBeInTheDocument();
        expect(screen.getByText('^IMG')).toBeInTheDocument();
    });

    it('toggles a rule', () => {
        render(<RulesPage />);
        fireEvent.click(screen.getByRole('switch', { name: 'Enable Images' }));
        expect(mockUseRules.toggleRule).toHaveBeenCalledWith('1', false);
    });

    it('reorders with the keyboard-operable move buttons', async () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, rules: [makeRule(), makeRule({ id: '2', name: 'Docs' })] });
        render(<RulesPage />);
        expect(screen.getByRole('button', { name: 'Move Images up' })).toBeDisabled();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Move Images down' })); });
        expect(mockUseRules.reorderRules).toHaveBeenCalledWith(['2', '1']);
    });

    it('shows empty state when no rules exist', () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, rules: [] });
        render(<RulesPage />);
        expect(screen.getByText('No rules yet')).toBeInTheDocument();
    });

    it('filters rules by search term and offers to clear it', () => {
        vi.mocked(useRules).mockReturnValue({
            ...mockUseRules,
            rules: [
                makeRule({ id: '1', name: 'Images' }),
                makeRule({ id: '2', name: 'Documents', extensions: ['pdf'] }),
            ],
        });
        render(<RulesPage />);
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search rules' }), { target: { value: 'Doc' } });
        expect(screen.queryByText('Images')).not.toBeInTheDocument();
        expect(screen.getByText('Documents')).toBeInTheDocument();
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search rules' }), { target: { value: 'zzz' } });
        expect(screen.getByText(/No rules match/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
        expect(screen.getByText('Images')).toBeInTheDocument();
    });

    it('opens the New rule dialog', () => {
        render(<RulesPage />);
        fireEvent.click(screen.getByRole('button', { name: 'New rule' }));
        expect(screen.getByRole('dialog', { name: 'New rule' })).toBeInTheDocument();
    });

    it('opens edit dialog when edit button is clicked', () => {
        render(<RulesPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Edit Images' }));
        expect(screen.getByRole('dialog', { name: 'Edit rule' })).toBeInTheDocument();
    });

    it('confirms delete and removes rule', async () => {
        render(<RulesPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete Images' }));
        expect(screen.getByRole('alertdialog', { name: /Delete .Images.\?/ })).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Delete rule' }));
        });
        await waitFor(() => expect(mockUseRules.removeRule).toHaveBeenCalledWith('1'));
    });

    it('cancels delete confirmation', () => {
        render(<RulesPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Delete Images' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(mockUseRules.removeRule).not.toHaveBeenCalled();
    });

    it('shows tutorial modal when not completed', async () => {
        const { getTutorialCompleted } = await import('../lib/tauri');
        vi.mocked(getTutorialCompleted).mockResolvedValue(false);

        vi.useFakeTimers();
        render(<RulesPage />);
        await act(async () => { await vi.runAllTimersAsync(); });
        vi.useRealTimers();
        await waitFor(() => expect(screen.queryByText('Welcome to Harbor')).not.toBeNull(), { timeout: 2000 });
    });

    it('sends explicit null clears when editing a rule with clear controls', async () => {
        render(<RulesPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Edit Images' }));

        fireEvent.click(screen.getByLabelText('Clear pattern'));
        fireEvent.click(screen.getByLabelText('Clear minimum size'));
        fireEvent.click(screen.getByLabelText('Clear maximum size'));

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
        });

        await waitFor(() =>
            expect(mockUseRules.editRule).toHaveBeenCalledWith(expect.objectContaining({
                id: '1',
                pattern: null,
                min_size_bytes: null,
                max_size_bytes: null,
            }))
        );
    });
});
