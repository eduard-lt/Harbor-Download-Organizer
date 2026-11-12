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
        expect(screen.getByText('How Harbor works')).toBeInTheDocument();
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
        expect(screen.getByText('How Harbor works')).toBeInTheDocument();
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
});
