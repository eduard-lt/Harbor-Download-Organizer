import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoPage } from './InfoPage';

// Minimal mocks required:
// - useUpdateContext from hooks
// - open from @tauri-apps/plugin-shell (used in top-level code + inside component)
vi.mock('../context/UpdateContext', () => ({
    useUpdateContext: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
    open: vi.fn(),
}));

vi.mock('../hooks/useRules', () => ({
    useRules: () => ({ loading: false, rules: [
        { id: '1', name: 'Invoices', extensions: ['pdf'], pattern: 'invoice', destination: '/Users/you/Docs/Invoices', create_symlink: false, enabled: true, icon: 'description', icon_color: 'red' },
        { id: '2', name: 'Images', extensions: ['jpg'], destination: '/Users/you/Pictures', create_symlink: false, enabled: true, icon: 'image', icon_color: 'blue' },
    ] }),
}));

import { useUpdateContext } from '../context/UpdateContext';
import packageJson from '../../package.json';

const baseUpdateState = {
    available: false, hasUpdate: false, version: null, url: null,
    loading: false, error: null, checked: false,
};

describe('InfoPage', () => {
    const mockUseUpdateCheck = {
        updateState: baseUpdateState,
        checkForUpdates: true,
        setCheckForUpdates: vi.fn(),
        lastNotifiedVersion: null,
        checkNow: vi.fn(),
        dismissNotification: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useUpdateContext).mockReturnValue(mockUseUpdateCheck);
    });

    it('renders the header', () => {
        render(<InfoPage />);
        expect(screen.getByText('Info & Guide')).toBeInTheDocument();
    });

    it('shows User Guide tab content by default', () => {
        render(<InfoPage />);
        expect(screen.getByRole('heading', { name: 'What happens to a new file' })).toBeInTheDocument();
    });

    it('switches to About tab when clicked', () => {
        render(<InfoPage />);
        fireEvent.click(screen.getByRole('tab', { name: 'About' }));
        expect(screen.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', { name: 'Harbor' })).toBeInTheDocument();
        expect(screen.getByText(new RegExp(`Version ${packageJson.version}`))).toBeInTheDocument();
    });

    it('can switch back to User Guide from About tab', () => {
        render(<InfoPage />);
        fireEvent.click(screen.getByRole('tab', { name: 'About' }));
        fireEvent.click(screen.getByRole('tab', { name: 'User Guide' }));
        expect(screen.getByRole('heading', { name: 'What happens to a new file' })).toBeInTheDocument();
    });

    it('shows update banner when update is available', () => {
        vi.mocked(useUpdateContext).mockReturnValue({
            ...mockUseUpdateCheck,
            updateState: {
                ...baseUpdateState,
                available: true, hasUpdate: true,
                version: '1.5.0', url: 'https://github.com/releases/1.5.0',
            },
        });
        render(<InfoPage />);
        fireEvent.click(screen.getByRole('tab', { name: 'About' }));
        expect(screen.getByText('Version 1.5.0 is ready to download.')).toBeInTheDocument();
    });

    it('does NOT show update banner when no update available', () => {
        render(<InfoPage />);
        fireEvent.click(screen.getByRole('tab', { name: 'About' }));
        expect(screen.queryByText(/is ready to download/)).not.toBeInTheDocument();
    });

    it('does NOT show update banner when available is true but url is null', () => {
        vi.mocked(useUpdateContext).mockReturnValue({
            ...mockUseUpdateCheck,
            updateState: { ...baseUpdateState, available: true, version: '1.5.0', url: null },
        });
        render(<InfoPage />);
        fireEvent.click(screen.getByRole('tab', { name: 'About' }));
        expect(screen.queryByText(/is ready to download/)).not.toBeInTheDocument();
    });

    it('moves between tabs with the arrow keys', () => {
        render(<InfoPage />);
        fireEvent.keyDown(screen.getByRole('tab', { name: 'User Guide' }), { key: 'ArrowRight' });
        expect(screen.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true');
    });

    it('tests a file name against the real rules', () => {
        render(<InfoPage />);
        expect(screen.getByText(/Moves to/)).toHaveTextContent('Moves to …/you/Pictures');
        fireEvent.click(screen.getByRole('button', { name: 'invoice-march.pdf' }));
        expect(screen.getByText(/catches it because/)).toHaveTextContent('The Invoices rule catches it because its name matches the pattern invoice');
        fireEvent.click(screen.getByRole('button', { name: 'dataset.zip.crdownload' }));
        expect(screen.getByText('Still downloading.')).toBeInTheDocument();
        fireEvent.change(screen.getByRole('textbox', { name: 'File name' }), { target: { value: 'song.flac' } });
        expect(screen.getByText('Stays in your watched folder.')).toBeInTheDocument();
    });
});
