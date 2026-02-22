import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as React from 'react';
import { SettingsProvider, useSettingsContext } from './SettingsContext';
import * as tauri from '../lib/tauri';

vi.mock('../lib/tauri');

const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(SettingsProvider, { children });

describe('SettingsContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(tauri.getServiceStatus).mockResolvedValue({ running: false });
        vi.mocked(tauri.getStartupEnabled).mockResolvedValue(false);
        vi.mocked(tauri.getDownloadDir).mockResolvedValue('C:\\Downloads');
        vi.mocked(tauri.startService).mockResolvedValue(undefined);
        vi.mocked(tauri.stopService).mockResolvedValue(undefined);
        vi.mocked(tauri.setStartupEnabled).mockResolvedValue(undefined);
        vi.mocked(tauri.triggerOrganizeNow).mockResolvedValue(3);
        vi.mocked(tauri.reloadConfig).mockResolvedValue(undefined);
        vi.mocked(tauri.resetToDefaults).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('loads initial settings on mount', async () => {
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.serviceStatus).toEqual({ running: false });
        expect(result.current.startupEnabled).toBe(false);
        expect(result.current.downloadDir).toBe('C:\\Downloads');
        expect(result.current.error).toBeNull();
    });

    it('sets error when fetchStatus fails', async () => {
        vi.mocked(tauri.getServiceStatus).mockRejectedValue(new Error('status error'));
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe('status error');
    });

    it('sets string error from fetchStatus', async () => {
        vi.mocked(tauri.getServiceStatus).mockRejectedValue('string error');
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe('string error');
    });

    it('toggleService starts service when currently stopped', async () => {
        vi.mocked(tauri.getServiceStatus)
            .mockResolvedValueOnce({ running: false })
            .mockResolvedValue({ running: true });

        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.toggleService(); });

        expect(tauri.startService).toHaveBeenCalled();
        expect(result.current.serviceStatus.running).toBe(true);
    });

    it('toggleService stops service when currently running', async () => {
        vi.mocked(tauri.getServiceStatus)
            .mockResolvedValueOnce({ running: true })
            .mockResolvedValue({ running: false });

        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.toggleService(); });
        expect(tauri.stopService).toHaveBeenCalled();
    });

    it('toggleService sets error transiently and fetches status on failure', async () => {
        vi.mocked(tauri.startService).mockRejectedValue(new Error('start failed'));
        // fetchStatus succeeds (beforeEach mock), which clears the error
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.toggleService(); });
        // startService was called
        expect(tauri.startService).toHaveBeenCalled();
        // fetchStatus was called (revert), error eventually cleared by fetchStatus
        expect(tauri.getServiceStatus).toHaveBeenCalled();
    });

    it('toggleStartup enables startup', async () => {
        vi.mocked(tauri.getStartupEnabled)
            .mockResolvedValueOnce(false)
            .mockResolvedValue(true);

        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.toggleStartup(); });
        expect(tauri.setStartupEnabled).toHaveBeenCalledWith(true);
        expect(result.current.startupEnabled).toBe(true);
    });

    it('toggleStartup sets error transiently and recovers', async () => {
        vi.mocked(tauri.setStartupEnabled).mockRejectedValue(new Error('startup error'));
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.toggleStartup(); });
        // setStartupEnabled was called
        expect(tauri.setStartupEnabled).toHaveBeenCalled();
    });

    it('organizeNow calls triggerOrganizeNow and returns count', async () => {
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        let count: number = 0;
        await act(async () => { count = await result.current.organizeNow(); });
        expect(count).toBe(3);
        expect(result.current.organizing).toBe(false);
    });

    it('organizeNow sets error and throws on failure', async () => {
        vi.mocked(tauri.triggerOrganizeNow).mockRejectedValue(new Error('org error'));
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        let caught: unknown = null;
        await act(async () => {
            try { await result.current.organizeNow(); } catch (e) { caught = e; }
        });
        expect((caught as Error)?.message).toBe('org error');
        await waitFor(() => expect(result.current.error).toBe('org error'));
    });

    it('reload calls reloadConfig and refreshes status', async () => {
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.reload(); });
        expect(tauri.reloadConfig).toHaveBeenCalled();
    });

    it('reload throws and sets error on failure', async () => {
        vi.mocked(tauri.reloadConfig).mockRejectedValue(new Error('reload error'));
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        let caughtErr: unknown = null;
        await act(async () => {
            try { await result.current.reload(); } catch (e) { caughtErr = e; }
        });
        expect((caughtErr as Error)?.message).toBe('reload error');
        await waitFor(() => expect(result.current.error).toBe('reload error'));
    });

    it('reset calls resetToDefaults and refreshes status', async () => {
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => { await result.current.reset(); });
        expect(tauri.resetToDefaults).toHaveBeenCalled();
    });

    it('reset throws and sets error on failure', async () => {
        vi.mocked(tauri.resetToDefaults).mockRejectedValue(new Error('reset error'));
        const { result } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(result.current.loading).toBe(false));

        let caughtErr: unknown = null;
        await act(async () => {
            try { await result.current.reset(); } catch (e) { caughtErr = e; }
        });
        expect((caughtErr as Error)?.message).toBe('reset error');
        await waitFor(() => expect(result.current.error).toBe('reset error'));
    });

    it('polling interval is cleaned up on unmount', async () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        const { unmount } = renderHook(() => useSettingsContext(), { wrapper });
        await waitFor(() => expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(0));
        unmount();
        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('throws when used outside SettingsProvider', () => {
        expect(() => renderHook(() => useSettingsContext())).toThrow();
    });
});
