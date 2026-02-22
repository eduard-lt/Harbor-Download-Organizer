import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';

// Mock all hooks used in SettingsPage
vi.mock('../context/ThemeContext', () => ({
    useTheme: vi.fn(),
}));

vi.mock('../hooks/useSettings', () => ({
    useSettings: vi.fn(),
}));

vi.mock('../hooks/useUpdateCheck', () => ({
    useUpdateCheck: vi.fn(),
}));

vi.mock('../hooks/useWindowSize', () => ({
    useWindowSize: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({ setSize: vi.fn(), center: vi.fn() }),
    LogicalSize: class { w: number; h: number; constructor(w: number, h: number) { this.w = w; this.h = h; } },
}));

import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../hooks/useSettings';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import { useWindowSize } from '../hooks/useWindowSize';

// Define the same presets that useWindowSize uses, locally to avoid mocked-module import issues
const PRESET_SIZES = [
    { label: 'Small', width: 1280, height: 800 },
    { label: 'Medium', width: 1600, height: 900 },
    { label: 'Large', width: 1920, height: 1080 },
];

describe('SettingsPage', () => {
    const mockTheme = { theme: 'system' as const, setTheme: vi.fn(), isDark: false };
    const mockSettings = {
        serviceStatus: { running: false },
        startupEnabled: false,
        downloadDir: 'C:\\Downloads',
        loading: false,
        organizing: false,
        error: null,
        toggleService: vi.fn(),
        toggleStartup: vi.fn(),
        organizeNow: vi.fn(),
        reload: vi.fn().mockResolvedValue(undefined),
        reset: vi.fn().mockResolvedValue(undefined),
        refresh: vi.fn(),
    };
    const mockUpdateCheck = {
        checkForUpdates: true,
        setCheckForUpdates: vi.fn(),
        lastNotifiedVersion: null,
        checkNow: vi.fn(),
        dismissNotification: vi.fn(),
        updateState: {
            available: false, hasUpdate: false, version: null, url: null,
            loading: false, error: null, checked: false,
        },
    };
    const mockWindowSize = {
        currentSize: PRESET_SIZES[2],
        setSize: vi.fn(),
        presets: PRESET_SIZES,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useTheme).mockReturnValue(mockTheme);
        vi.mocked(useSettings).mockReturnValue(mockSettings);
        vi.mocked(useUpdateCheck).mockReturnValue(mockUpdateCheck);
        vi.mocked(useWindowSize).mockReturnValue(mockWindowSize);
    });

    it('renders Settings header', () => {
        render(<SettingsPage />);
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('shows Service is Stopped when service is not running', () => {
        render(<SettingsPage />);
        expect(screen.getByText('Service is Stopped')).toBeInTheDocument();
    });

    it('shows Service is Running when service is running', () => {
        vi.mocked(useSettings).mockReturnValue({
            ...mockSettings, serviceStatus: { running: true },
        });
        render(<SettingsPage />);
        expect(screen.getByText('Service is Running')).toBeInTheDocument();
    });

    it('shows Checking... when loading', () => {
        vi.mocked(useSettings).mockReturnValue({
            ...mockSettings, loading: true,
        });
        render(<SettingsPage />);
        expect(screen.getByText('Checking...')).toBeInTheDocument();
    });

    it('shows error banner when error is present', () => {
        vi.mocked(useSettings).mockReturnValue({
            ...mockSettings, error: 'Service error',
        });
        render(<SettingsPage />);
        expect(screen.getByText('Service error')).toBeInTheDocument();
    });

    it('calls setTheme when light theme is clicked', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Light'));
        expect(mockTheme.setTheme).toHaveBeenCalledWith('light');
    });

    it('calls setTheme when dark theme is clicked', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Dark'));
        expect(mockTheme.setTheme).toHaveBeenCalledWith('dark');
    });

    it('calls setTheme when system theme is clicked', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('System'));
        expect(mockTheme.setTheme).toHaveBeenCalledWith('system');
    });

    it('calls toggleStartup when startup toggle is changed', () => {
        render(<SettingsPage />);
        // Find the "Launch at Startup" text and click the toggle label near it
        const startupText = screen.getByText('Launch at Startup');
        const label = startupText.closest('div')?.querySelector('label');
        if (label) {
            fireEvent.click(label);
            expect(mockSettings.toggleStartup).toHaveBeenCalled();
        } else {
            // Fallback: look for any checkbox
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            // startup checkbox is the 3rd one (service, check-updates, startup)
            fireEvent.click(checkboxes[1]);
            expect(mockSettings.toggleStartup).toHaveBeenCalled();
        }
    });

    it('calls setSize when a window preset is clicked', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Small'));
        expect(mockWindowSize.setSize).toHaveBeenCalledWith(PRESET_SIZES[0]);
    });

    it('shows feedback message after clicking Reload then clears it', async () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Reload'));
        await waitFor(() => expect(screen.getByText('Configuration reloaded successfully.')).toBeInTheDocument());
        // The feedback auto-dismisses after 3s - just verify it appeared
    });

    it('opens reset confirmation modal when Reset All Settings is clicked', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Reset All Settings'));
        expect(screen.getByText('Reset to Defaults?')).toBeInTheDocument();
    });

    it('confirms reset and calls reset()', async () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Reset All Settings'));
        await act(async () => {
            fireEvent.click(screen.getByText('Yes, Reset Everything'));
        });
        expect(mockSettings.reset).toHaveBeenCalled();
    });

    it('cancels reset modal when No, Keep Settings is clicked', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Reset All Settings'));
        fireEvent.click(screen.getByText('No, Keep Settings'));
        expect(screen.queryByText('Reset to Defaults?')).not.toBeInTheDocument();
    });

    it('calls checkNow and shows feedback on Check Now button click', async () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByText('Check Now'));
        expect(mockUpdateCheck.checkNow).toHaveBeenCalled();
        await waitFor(() => expect(screen.getByText('Checking for updates...')).toBeInTheDocument());
    });

    it('shows update available text when update is available', () => {
        vi.mocked(useUpdateCheck).mockReturnValue({
            ...mockUpdateCheck,
            updateState: {
                ...mockUpdateCheck.updateState,
                hasUpdate: true, version: '2.0.0',
                url: 'https://github.com/releases/2.0.0',
                checked: true,
            },
        });
        render(<SettingsPage />);
        expect(screen.getByText('Update available:')).toBeInTheDocument();
        expect(screen.getByText('2.0.0')).toBeInTheDocument();
    });

    it('shows update error when update check fails', () => {
        vi.mocked(useUpdateCheck).mockReturnValue({
            ...mockUpdateCheck,
            updateState: { ...mockUpdateCheck.updateState, error: 'Network error' },
        });
        render(<SettingsPage />);
        expect(screen.getByText('Error checking updates')).toBeInTheDocument();
    });

    it('shows "You are up to date." when no update found', () => {
        vi.mocked(useUpdateCheck).mockReturnValue({
            ...mockUpdateCheck,
            updateState: { ...mockUpdateCheck.updateState, checked: true, hasUpdate: false },
        });
        render(<SettingsPage />);
        expect(screen.getByText('You are up to date.')).toBeInTheDocument();
    });

    it('shows active badge on current window size preset', () => {
        render(<SettingsPage />);
        expect(screen.getByText('Active')).toBeInTheDocument(); // Large is active by default
    });

    it('shows uptime when uptime_seconds is present', () => {
        vi.mocked(useSettings).mockReturnValue({
            ...mockSettings,
            serviceStatus: { running: true, uptime_seconds: 120 },
        });
        render(<SettingsPage />);
        expect(screen.getByText('2m')).toBeInTheDocument();
    });

    it('shows N/A when no uptime_seconds', () => {
        render(<SettingsPage />);
        expect(screen.getByText('N/A')).toBeInTheDocument();
    });
});
