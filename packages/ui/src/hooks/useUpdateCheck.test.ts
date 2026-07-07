import * as React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpdateCheck } from './useUpdateCheck';
import { UpdateProvider } from '../context/UpdateContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tauri from '../lib/tauri';

// Mock package.json
vi.mock('../../package.json', () => ({
    default: { version: '1.2.0' },
}));

// Mock Tauri commands - Auto-mocking
vi.mock('../lib/tauri');

describe('useUpdateCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({}),
        });

        // Setup default mocks explicitly in beforeEach to ensure fresh state
        vi.mocked(tauri.getCheckUpdates).mockResolvedValue(true);
        vi.mocked(tauri.setCheckUpdates).mockResolvedValue(undefined);
        vi.mocked(tauri.getLastNotifiedVersion).mockResolvedValue('1.2.0');
        vi.mocked(tauri.setLastNotifiedVersion).mockResolvedValue(undefined);
        vi.mocked(tauri.notifyUpdateAvailable).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(UpdateProvider, { children: children });

    it('should initialize with defaults', async () => {
        const { result } = renderHook(() => useUpdateCheck(), { wrapper });

        // Wait for initial loadSettings to complete
        await waitFor(() => {
            expect(result.current.updateState.loading).toBe(false);
        });

        expect(result.current.updateState.available).toBe(false);
        expect(result.current.checkForUpdates).toBe(true);
    });

    it('should detect an update manually', async () => {
        const mockRelease = {
            tag_name: 'v1.2.1',
            html_url: 'https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.2.1',
        };

        vi.mocked(globalThis.fetch).mockResolvedValue({
            ok: true,
            json: async () => mockRelease,
        } as Response);

        const { result } = renderHook(() => useUpdateCheck(), { wrapper });

        // Wait for initial load
        await waitFor(() => {
            expect(result.current.updateState.loading).toBe(false);
        });

        await act(async () => {
            await result.current.checkNow();
        });

        expect(result.current.updateState.loading).toBe(false);
        expect(result.current.updateState.available).toBe(true);
        expect(result.current.updateState.version).toBe('1.2.1');
        expect(result.current.updateState.url).toBe(mockRelease.html_url);
    });

    it('should not detect update if version is same or older', async () => {
        const mockRelease = {
            tag_name: 'v1.2.0',
            html_url: 'https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.2.0',
        };

        vi.mocked(globalThis.fetch).mockResolvedValue({
            ok: true,
            json: async () => mockRelease,
        } as Response);

        const { result } = renderHook(() => useUpdateCheck(), { wrapper });

        await waitFor(() => {
            expect(result.current.updateState.loading).toBe(false);
        });

        await act(async () => {
            await result.current.checkNow();
        });

        expect(result.current.updateState.available).toBe(false);
    });

    it('should not show notification if already dismissed for this version', async () => {
        const mockRelease = {
            tag_name: 'v1.2.1',
            html_url: 'https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.2.1',
        };

        vi.mocked(globalThis.fetch).mockResolvedValue({
            ok: true,
            json: async () => mockRelease,
        } as Response);

        // Set last notified to the version we're about to "find"
        vi.mocked(tauri.getLastNotifiedVersion).mockResolvedValue('1.2.1');

        const { result } = renderHook(() => useUpdateCheck(), { wrapper });

        await waitFor(() => {
            expect(result.current.updateState.loading).toBe(false);
        });

        await act(async () => {
            await result.current.checkNow();
        });

        // Should still be available (red dot)
        expect(result.current.updateState.available).toBe(true);
    });

    it('should toggle update checks', async () => {
        const { result } = renderHook(() => useUpdateCheck(), { wrapper });

        await waitFor(() => {
            expect(result.current.updateState.loading).toBe(false);
        });

        // Verify initial state from mock (getCheckUpdates returns true)
        expect(result.current.checkForUpdates).toBe(true);

        await act(async () => {
            await result.current.setCheckForUpdates(false);
        });

        expect(result.current.checkForUpdates).toBe(false);
    });

    it('should set checked and error state on manual check failure', async () => {
        vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useUpdateCheck(), { wrapper });

        await waitFor(() => {
            expect(result.current.updateState.loading).toBe(false);
        });

        await act(async () => {
            await result.current.checkNow();
        });

        expect(result.current.updateState.checked).toBe(true);
        expect(result.current.updateState.error).toBe('Network error');
        expect(result.current.updateState.available).toBe(false);
    });
});
