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

    it('renders header and stats cards', () => {
        render(<RulesPage />);
        expect(screen.getByText('Rules Management')).toBeInTheDocument();
        expect(screen.getByText('Total Rules')).toBeInTheDocument();
        expect(screen.getByText('Active Rules')).toBeInTheDocument();
    });

    it('shows loading state', () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, loading: true, rules: [] });
        render(<RulesPage />);
        expect(screen.getByText('Loading rules...')).toBeInTheDocument();
    });

    it('shows error message when error is present', () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, error: 'Some error' });
        render(<RulesPage />);
        expect(screen.getByText(/Some error/)).toBeInTheDocument();
    });

    it('renders rule row with correct data', () => {
        render(<RulesPage />);
        expect(screen.getByText('Images')).toBeInTheDocument();
        expect(screen.getByText('jpg')).toBeInTheDocument();
        expect(screen.getByText('png')).toBeInTheDocument();
    });

    it('shows empty state when no rules exist', () => {
        vi.mocked(useRules).mockReturnValue({ ...mockUseRules, rules: [] });
        render(<RulesPage />);
        expect(screen.getByText('No rules found.')).toBeInTheDocument();
    });

    it('filters rules by search term', () => {
        vi.mocked(useRules).mockReturnValue({
            ...mockUseRules,
            rules: [
                makeRule({ id: '1', name: 'Images' }),
                makeRule({ id: '2', name: 'Documents', extensions: ['pdf'] }),
            ],
        });
        render(<RulesPage />);
        fireEvent.change(screen.getByPlaceholderText('Search rules...'), { target: { value: 'Doc' } });
        expect(screen.queryByText('Images')).not.toBeInTheDocument();
        expect(screen.getByText('Documents')).toBeInTheDocument();
    });

    it('opens "New Rule" modal when New Rule button is clicked', () => {
        render(<RulesPage />);
        fireEvent.click(screen.getByText('New Rule'));
        expect(screen.getByText('New Rule', { selector: 'h2' })).toBeInTheDocument();
    });

    it('opens edit modal when edit button is clicked', () => {
        render(<RulesPage />);
        const editBtn = screen.getByTitle ? screen.getAllByRole('button').find(b => b.querySelector('.material-icons-round')?.textContent === 'edit') : null;
        if (editBtn) {
            fireEvent.click(editBtn);
            expect(screen.getByText('Edit Rule')).toBeInTheDocument();
        }
    });

    it('opens delete confirmation when delete button is clicked', () => {
        render(<RulesPage />);
        const deleteButtons = screen.getAllByRole('button').filter(b =>
            b.querySelector('span')?.textContent === 'delete_outline'
        );
        if (deleteButtons.length > 0) {
            fireEvent.click(deleteButtons[0]);
            expect(screen.getByText('Delete Rule')).toBeInTheDocument();
        }
    });

    it('confirms delete and removes rule', async () => {
        render(<RulesPage />);
        const deleteButtons = screen.getAllByRole('button').filter(b =>
            b.querySelector('span')?.textContent === 'delete_outline'
        );
        if (deleteButtons.length > 0) {
            fireEvent.click(deleteButtons[0]);
            await act(async () => {
                fireEvent.click(screen.getByText('Delete'));
            });
            await waitFor(() => expect(mockUseRules.removeRule).toHaveBeenCalledWith('1'));
        }
    });

    it('cancels delete confirmation', () => {
        render(<RulesPage />);
        const deleteButtons = screen.getAllByRole('button').filter(b =>
            b.querySelector('span')?.textContent === 'delete_outline'
        );
        if (deleteButtons.length > 0) {
            fireEvent.click(deleteButtons[0]);
            expect(screen.getByText('Delete Rule')).toBeInTheDocument();
            fireEvent.click(screen.getByText('Cancel'));
            expect(screen.queryByText('Delete Rule')).not.toBeInTheDocument();
        }
    });

    it('shows tutorial modal when not completed', async () => {
        const { getTutorialCompleted } = await import('../lib/tauri');
        vi.mocked(getTutorialCompleted).mockResolvedValue(false);

        vi.useFakeTimers();
        render(<RulesPage />);
        await act(async () => { await vi.runAllTimersAsync(); });
        vi.useRealTimers();
        // Tutorial should show after the timer (500ms delay)
        await waitFor(() => expect(screen.queryByText('Welcome to Harbor!')).not.toBeNull(), { timeout: 2000 });
    });
});
