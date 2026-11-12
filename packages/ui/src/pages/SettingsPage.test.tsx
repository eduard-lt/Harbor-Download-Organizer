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

vi.mock('../context/UpdateContext', () => ({
    useUpdateContext: vi.fn(),
}));

vi.mock('../hooks/useWindowSize', () => ({
    useWindowSize: vi.fn(),
}));

const notify = vi.hoisted(() => vi.fn());
vi.mock('../context/ToastContext', () => ({ useToast: () => ({ notify }) }));
const fileActions = vi.hoisted(() => ({
    busy: false, organizing: false, lastBatch: { count: 3, recorded_at: '2024-01-02 14:32:00' } as { count: number; recorded_at: string } | null, chooseFolder: vi.fn(), previewMoves: vi.fn(), organizeNow: vi.fn(),
    requestUndo: vi.fn(), exportRules: vi.fn(), requestImport: vi.fn(),
}));
vi.mock('../context/FileActionsContext', () => ({ useFileActions: () => fileActions }));
vi.mock('@tauri-apps/plugin-shell', () => ({ open: vi.fn() }));
vi.mock('../lib/tauri', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../lib/tauri')>()),
    setTutorialCompleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({ setSize: vi.fn(), center: vi.fn() }),
    LogicalSize: class { w: number; h: number; constructor(w: number, h: number) { this.w = w; this.h = h; } },
}));

import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../hooks/useSettings';
import { useUpdateContext } from '../context/UpdateContext';
import { useWindowSize } from '../hooks/useWindowSize';

// Define the same presets that useWindowSize uses, locally to avoid mocked-module import issues
const PRESET_SIZES = [
    { label: 'Small', width: 1280, height: 800 },
    { label: 'Medium', width: 1600, height: 900 },
    { label: 'Large', width: 1920, height: 1080 },
];

describe('SettingsPage', () => {
    const mockTheme = { theme: 'system' as const, setTheme: vi.fn(), isDark: false, reduceTransparency: false, setReduceTransparency: vi.fn() };
    const mockSettings = {
        serviceStatus: { running: false, lifecycle_state: 'stopped', pid: 12345, degraded: false, degraded_reason: null },
        startupEnabled: false,
        downloadDir: 'C:\\Downloads',
        loading: false,
        organizing: false,
        error: null,
        toggleService: vi.fn(),
        retryService: vi.fn(),
        toggleStartup: vi.fn(),
        organizeNow: vi.fn().mockResolvedValue({
            status: 'partial_failure',
            message: 'Organize finished with 1 move(s) and 1 failure(s).',
            moved_count: 1,
            moved: 1,
            total_failures: 1,
            errors: ['legacy error'],
            failure_groups: [
                {
                    code: 'filesystem_error',
                    message: 'File operation failed during move_file',
                    count: 1,
                    failures: [
                        {
                            code: 'filesystem_error',
                            message: 'File operation failed during move_file',
                            legacy_error: 'legacy error',
                            details: {
                                source_path: 'locked.txt',
                                destination_path: 'Docs\\locked.txt',
                                reason: 'Access denied',
                                remediation_hint: 'Close applications locking the file and retry.',
                            },
                        },
                    ],
                    legacy_errors: ['legacy error'],
                },
            ],
        }),
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
        vi.mocked(useUpdateContext).mockReturnValue(mockUpdateCheck);
        vi.mocked(useWindowSize).mockReturnValue(mockWindowSize);
    });

    it('renders Settings header', () => {
        render(<SettingsPage />);
        expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    });

    it('shows paused monitoring when service is not running', () => {
        render(<SettingsPage />);
        expect(screen.getByText('Monitoring is paused')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Monitoring service' })).not.toBeChecked();
    });

    it('shows monitoring on when service is running', () => {
        vi.mocked(useSettings).mockReturnValue({
            ...mockSettings, serviceStatus: { running: true, lifecycle_state: 'running', pid: 12345, degraded: false, degraded_reason: null },
        });
        render(<SettingsPage />);
        expect(screen.getByText('Monitoring is on')).toBeInTheDocument();
    });

    it('toggles the monitoring service', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('switch', { name: 'Monitoring service' }));
        expect(mockSettings.toggleService).toHaveBeenCalled();
    });

    it('shows Checking… when loading', () => {
        vi.mocked(useSettings).mockReturnValue({ ...mockSettings, loading: true });
        render(<SettingsPage />);
        expect(screen.getByText('Checking…')).toBeInTheDocument();
    });

    it('shows error banner when error is present', () => {
        vi.mocked(useSettings).mockReturnValue({ ...mockSettings, error: 'Service error' });
        render(<SettingsPage />);
        expect(screen.getByRole('alert')).toHaveTextContent('Service error');
    });

    it('shows configuration and scan problems', () => {
        vi.mocked(useSettings).mockReturnValue({
            ...mockSettings,
            serviceStatus: { ...mockSettings.serviceStatus, configuration_error: 'Bad YAML', scan_error: 'Folder unreadable' },
        });
        render(<SettingsPage />);
        expect(screen.getByText(/Bad YAML/)).toBeInTheDocument();
        expect(screen.getByText(/Folder unreadable/)).toBeInTheDocument();
    });

    it.each([['Light', 'light'], ['Dark', 'dark'], ['Match system', 'system']])('selects the %s theme', (label, value) => {
        vi.mocked(useTheme).mockReturnValue({ ...mockTheme, theme: value === 'light' ? 'dark' : 'light' });
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('radio', { name: label }));
        expect(mockTheme.setTheme).toHaveBeenCalledWith(value);
    });

    it('toggles reduce transparency', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('switch', { name: 'Reduce transparency' }));
        expect(mockTheme.setReduceTransparency).toHaveBeenCalledWith(true);
    });

    it('calls toggleStartup when startup toggle is changed', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('switch', { name: 'Launch at startup' }));
        expect(mockSettings.toggleStartup).toHaveBeenCalled();
    });

    it('calls setSize when a window preset is clicked', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Small' }));
        expect(mockWindowSize.setSize).toHaveBeenCalledWith(PRESET_SIZES[0]);
        expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Window resized to 1280 × 800.' }));
    });

    it('marks the current window size preset as pressed', () => {
        render(<SettingsPage />);
        expect(screen.getByRole('button', { name: 'Large' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Small' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('reloads configuration and confirms with a toast', async () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
        await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'Configuration reloaded.' })));
    });

    it('opens reset confirmation modal', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Reset…' }));
        expect(screen.getByRole('alertdialog', { name: 'Reset to defaults?' })).toBeInTheDocument();
    });

    it('confirms reset and calls reset()', async () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Reset…' }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Reset everything' }));
        });
        expect(mockSettings.reset).toHaveBeenCalled();
        await waitFor(() => expect(screen.getByText('Welcome to Harbor')).toBeInTheDocument());
    });

    it('cancels reset modal', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Reset…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Keep my settings' }));
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
        expect(mockSettings.reset).not.toHaveBeenCalled();
    });

    it('calls checkNow on Check now', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Check now' }));
        expect(mockUpdateCheck.checkNow).toHaveBeenCalled();
    });

    it('shows update available text and a download action', () => {
        vi.mocked(useUpdateContext).mockReturnValue({
            ...mockUpdateCheck,
            updateState: {
                ...mockUpdateCheck.updateState,
                hasUpdate: true, version: '2.0.0',
                url: 'https://github.com/releases/2.0.0',
                checked: true,
            },
        });
        render(<SettingsPage />);
        expect(screen.getByText('Version 2.0.0 is available.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
    });

    it('shows update error when update check fails', () => {
        vi.mocked(useUpdateContext).mockReturnValue({
            ...mockUpdateCheck,
            updateState: { ...mockUpdateCheck.updateState, error: 'Network error' },
        });
        render(<SettingsPage />);
        expect(screen.getByText('Couldn’t check for updates.')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('says when Harbor is up to date', () => {
        vi.mocked(useUpdateContext).mockReturnValue({
            ...mockUpdateCheck,
            updateState: { ...mockUpdateCheck.updateState, checked: true, hasUpdate: false },
        });
        render(<SettingsPage />);
        expect(screen.getByText('You’re up to date.')).toBeInTheDocument();
    });

    it('shows uptime and process ID in diagnostics', () => {
        vi.mocked(useSettings).mockReturnValue({
            ...mockSettings,
            serviceStatus: { running: true, lifecycle_state: 'running', pid: 12345, degraded: false, degraded_reason: null, uptime_seconds: 3720 },
        });
        render(<SettingsPage />);
        expect(screen.getByText('1h 2m')).toBeInTheDocument();
        expect(screen.getByText('12345')).toBeInTheDocument();
    });

    it('shows degraded reason and retry recovery action', () => {
        vi.mocked(useSettings).mockReturnValue({
            ...mockSettings,
            serviceStatus: {
                running: false,
                lifecycle_state: 'degraded',
                pid: 12345,
                degraded: true,
                degraded_reason: 'Config validation failed. Check your rules for errors.',
            },
        });
        render(<SettingsPage />);
        expect(screen.getByText('Degraded state')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Retry recovery' }));
        expect(mockSettings.retryService).toHaveBeenCalled();
    });

    it('says not running when there is no uptime', () => {
        render(<SettingsPage />);
        expect(screen.getByText('Not running')).toBeInTheDocument();
    });

    it('routes file actions through the shared file actions', () => {
        render(<SettingsPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Change…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Preview moves' }));
        fireEvent.click(screen.getByRole('button', { name: 'Organize now' }));
        fireEvent.click(screen.getByRole('button', { name: 'Undo last batch' }));
        fireEvent.click(screen.getByRole('button', { name: 'Import rules…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Export rules…' }));
        expect(fileActions.chooseFolder).toHaveBeenCalled();
        expect(fileActions.previewMoves).toHaveBeenCalled();
        expect(fileActions.organizeNow).toHaveBeenCalled();
        expect(fileActions.requestUndo).toHaveBeenCalled();
        expect(fileActions.requestImport).toHaveBeenCalled();
        expect(fileActions.exportRules).toHaveBeenCalled();
    });
});
