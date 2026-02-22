import * as React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUpdateCheck } from './useUpdateCheck';
import { UpdateProvider } from '../context/UpdateContext';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock package.json
vi.mock('../../package.json', () => ({
    default: { version: '1.2.0' },
}));

// Mock Tauri commands
vi.mock('../lib/tauri', () => ({
    getCheckUpdates: vi.fn().mockResolvedValue(true),
    setCheckUpdates: vi.fn().mockResolvedValue(undefined),
    getLastNotifiedVersion: vi.fn().mockResolvedValue('1.2.0'),
    setLastNotifiedVersion: vi.fn().mockResolvedValue(undefined),
}));

// Mock Notification plugin
vi.mock('@tauri-apps/plugin-notification', () => ({
    isPermissionGranted: vi.fn().mockResolvedValue(true),
    requestPermission: vi.fn().mockResolvedValue('granted'),
    sendNotification: vi.fn(),
}));

describe('useUpdateCheck', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(UpdateProvider, { children: children });

    it('should initialize with defaults', async () => {
        const { result } = renderHook(() => useUpdateCheck(), { wrapper });

        // Initial state
        expect(result.current.updateState.loading).toBe(false);
        expect(result.current.updateState.available).toBe(false);
        expect(result.current.checkForUpdates).toBe(true);
    });

    it('should detect an update manually', async () => {
        const mockRelease = {
            tag_name: 'v1.2.1',
            html_url: 'https://github.com/eduard-lt/Harbor-Download-Organizer/releases/tag/v1.2.1',
        };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockRelease,
        });

        const { result } = renderHook(() => useUpdateCheck(), { wrapper });

        // Wait for potential auto-check to finish
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

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockRelease,
        });

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

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockRelease,
        });

        // Set last notified to the version we're about to "find"
        const { getLastNotifiedVersion } = await import('../lib/tauri');
        (getLastNotifiedVersion as any).mockResolvedValue('1.2.1');

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

        expect(result.current.checkForUpdates).toBe(true);

        await act(async () => {
            await result.current.setCheckForUpdates(false);
        });

        expect(result.current.checkForUpdates).toBe(false);
    });
});
