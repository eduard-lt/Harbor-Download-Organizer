import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsProvider, useSettingsContext } from './SettingsContext';
import * as tauri from '../lib/tauri';

// Mock the tauri library
vi.mock('../lib/tauri', () => ({
    getServiceStatus: vi.fn(),
    getStartupEnabled: vi.fn(),
    getDownloadDir: vi.fn(),
    startService: vi.fn(),
    stopService: vi.fn(),
    setStartupEnabled: vi.fn(),
    triggerOrganizeNow: vi.fn(),
    reloadConfig: vi.fn(),
    resetToDefaults: vi.fn(),
}));

// Test component to consume context
function TestComponent() {
    const { serviceStatus, toggleService, startupEnabled, toggleStartup } = useSettingsContext();
    return (
        <div>
            <div data-testid="service-status">{serviceStatus.running ? 'Running' : 'Stopped'}</div>
            <button data-testid="toggle-service" onClick={toggleService}>Toggle Service</button>
            <div data-testid="startup-status">{startupEnabled ? 'Enabled' : 'Disabled'}</div>
            <button data-testid="toggle-startup" onClick={toggleStartup}>Toggle Startup</button>
        </div>
    );
}

describe('SettingsContext', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Default mocks
        vi.mocked(tauri.getServiceStatus).mockResolvedValue({ running: false });
        vi.mocked(tauri.getStartupEnabled).mockResolvedValue(false);
        vi.mocked(tauri.getDownloadDir).mockResolvedValue('/downloads');
    });

    it('loads initial state correctly', async () => {
        vi.mocked(tauri.getServiceStatus).mockResolvedValue({ running: true });

        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('service-status')).toHaveTextContent('Running');
        });
    });

    it('optimistically updates service status on toggle', async () => {
        // Initial state: Stopped
        vi.mocked(tauri.getServiceStatus)
            .mockResolvedValueOnce({ running: false }) // Init
            .mockResolvedValueOnce({ running: true }); // After toggle validation

        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );

        // Wait for init
        await waitFor(() => expect(screen.getByTestId('service-status')).toHaveTextContent('Stopped'));

        // Click toggle
        await act(async () => {
            screen.getByTestId('toggle-service').click();
        });

        // Expect startService to be called
        expect(tauri.startService).toHaveBeenCalled();

        // Should be Running now
        await waitFor(() => expect(screen.getByTestId('service-status')).toHaveTextContent('Running'));
    });

    it('reverts optimistic update if service call fails', async () => {
        vi.mocked(tauri.startService).mockRejectedValue(new Error('Failed to start'));
        vi.mocked(tauri.getServiceStatus).mockResolvedValue({ running: false });

        render(
            <SettingsProvider>
                <TestComponent />
            </SettingsProvider>
        );

        await waitFor(() => expect(screen.getByTestId('service-status')).toHaveTextContent('Stopped'));

        await act(async () => {
            screen.getByTestId('toggle-service').click();
        });

        // It might briefly show Running (optimistic) but should revert to Stopped
        expect(tauri.startService).toHaveBeenCalled();

        await waitFor(() => expect(screen.getByTestId('service-status')).toHaveTextContent('Stopped'));
    });
});
