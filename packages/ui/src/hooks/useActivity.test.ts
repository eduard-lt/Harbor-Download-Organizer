import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivity } from './useActivity';
import * as tauri from '../lib/tauri';

vi.mock('../lib/tauri');

const mockLogs = [
    {
        id: '1', timestamp: '2024-01-01', filename: 'test.jpg', icon: '📷', icon_color: '#fff',
        source_path: '/downloads/test.jpg', dest_path: '/pictures/test.jpg',
        rule_name: 'Images', status: 'success',
    },
];

const mockStats = {
    total_files_moved: 5, files_moved_today: 1, files_moved_this_week: 3, most_active_rule: 'Images',
};

describe('useActivity', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(tauri.getActivityLogs).mockResolvedValue({ logs: mockLogs, total: 1, has_more: false });
        vi.mocked(tauri.getActivityStats).mockResolvedValue(mockStats);
        vi.mocked(tauri.clearActivityLogs).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fetches logs and stats on mount', async () => {
        const { result } = renderHook(() => useActivity());
        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.logs).toEqual(mockLogs);
        expect(result.current.stats).toEqual(mockStats);
        expect(result.current.total).toBe(1);
        expect(result.current.hasMore).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('sets error when fetching logs fails', async () => {
        vi.mocked(tauri.getActivityLogs).mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useActivity());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe('Network error');
    });

    it('sets non-Error error string correctly', async () => {
        vi.mocked(tauri.getActivityLogs).mockRejectedValue('string error');
        const { result } = renderHook(() => useActivity());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe('string error');
    });

    it('loadMore appends new logs when hasMore is true', async () => {
        const moreLogs = [{ ...mockLogs[0], id: '2' }];
        vi.mocked(tauri.getActivityLogs)
            .mockResolvedValueOnce({ logs: mockLogs, total: 2, has_more: true })
            .mockResolvedValueOnce({ logs: moreLogs, total: 2, has_more: false });

        const { result } = renderHook(() => useActivity(1));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.hasMore).toBe(true);

        await act(async () => {
            result.current.loadMore();
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.logs).toHaveLength(2);
        expect(result.current.hasMore).toBe(false);
    });

    it('loadMore does nothing when hasMore is false', async () => {
        const { result } = renderHook(() => useActivity());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const callCount = vi.mocked(tauri.getActivityLogs).mock.calls.length;
        act(() => {
            result.current.loadMore();
        });
        expect(vi.mocked(tauri.getActivityLogs).mock.calls.length).toBe(callCount);
    });

    it('refresh resets logs', async () => {
        const { result } = renderHook(() => useActivity());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            result.current.refresh();
        });

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(vi.mocked(tauri.getActivityLogs).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('clearLogs calls clearActivityLogs and refreshes', async () => {
        const { result } = renderHook(() => useActivity());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.clearLogs();
        });

        expect(vi.mocked(tauri.clearActivityLogs)).toHaveBeenCalled();
    });

    it('clearLogs throws if clearActivityLogs fails', async () => {
        vi.mocked(tauri.clearActivityLogs).mockRejectedValue(new Error('clear failed'));
        const { result } = renderHook(() => useActivity());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await expect(
            act(async () => { await result.current.clearLogs(); })
        ).rejects.toThrow('clear failed');
    });
});
