import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InfoPage } from './InfoPage';

// Minimal mocks required:
// - useUpdateCheck from hooks
// - open from @tauri-apps/plugin-shell (used in top-level code + inside component)
vi.mock('../hooks/useUpdateCheck', () => ({
    useUpdateCheck: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-shell', () => ({
    open: vi.fn(),
}));

import { useUpdateCheck } from '../hooks/useUpdateCheck';

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
        vi.mocked(useUpdateCheck).mockReturnValue(mockUseUpdateCheck);
    });

    it('renders the header', () => {
        render(<InfoPage />);
        expect(screen.getByText('Info & Guide')).toBeInTheDocument();
    });

    it('shows User Guide tab content by default', () => {
        render(<InfoPage />);
        expect(screen.getByText('How it Works')).toBeInTheDocument();
    });

    it('switches to About tab when clicked', () => {
        render(<InfoPage />);
        fireEvent.click(screen.getByText('About'));
        expect(screen.getByText('Harbor')).toBeInTheDocument();
        expect(screen.getByText(/Version 1\.0\.0/)).toBeInTheDocument();
    });

    it('can switch back to User Guide from About tab', () => {
        render(<InfoPage />);
        fireEvent.click(screen.getByText('About'));
        fireEvent.click(screen.getByText('User Guide'));
        expect(screen.getByText('How it Works')).toBeInTheDocument();
    });

    it('shows update banner when update is available', () => {
        vi.mocked(useUpdateCheck).mockReturnValue({
            ...mockUseUpdateCheck,
            updateState: {
                ...baseUpdateState,
                available: true, hasUpdate: true,
                version: '1.5.0', url: 'https://github.com/releases/1.5.0',
            },
        });
        render(<InfoPage />);
        expect(screen.getByText('Update Available!')).toBeInTheDocument();
        expect(screen.getByText('Version 1.5.0 is ready to download.')).toBeInTheDocument();
    });

    it('does NOT show update banner when no update available', () => {
        render(<InfoPage />);
        expect(screen.queryByText('Update Available!')).not.toBeInTheDocument();
    });

    it('does NOT show update banner when available is true but url is null', () => {
        vi.mocked(useUpdateCheck).mockReturnValue({
            ...mockUseUpdateCheck,
            updateState: { ...baseUpdateState, available: true, version: '1.5.0', url: null },
        });
        render(<InfoPage />);
        expect(screen.queryByText('Update Available!')).not.toBeInTheDocument();
    });
});
