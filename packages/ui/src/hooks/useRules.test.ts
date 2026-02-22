import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRules } from './useRules';
import * as tauri from '../lib/tauri';
import type { Rule } from '../lib/tauri';

vi.mock('../lib/tauri');

const makeRule = (overrides?: Partial<Rule>): Rule => ({
    id: '1', name: 'Images', extensions: ['jpg', 'png'],
    destination: 'C:\\Pictures', create_symlink: false,
    enabled: true, icon: '📷', icon_color: '#fff',
    ...overrides,
});

describe('useRules', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(tauri.getRules).mockResolvedValue([makeRule()]);
        vi.mocked(tauri.createRule).mockResolvedValue(makeRule({ id: '2', name: 'Videos' }));
        vi.mocked(tauri.updateRule).mockResolvedValue(makeRule({ name: 'Updated' }));
        vi.mocked(tauri.deleteRule).mockResolvedValue(undefined);
        vi.mocked(tauri.toggleRule).mockResolvedValue(undefined);
        vi.mocked(tauri.reorderRules).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fetches rules on mount', async () => {
        const { result } = renderHook(() => useRules());
        expect(result.current.loading).toBe(true);
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rules).toHaveLength(1);
        expect(result.current.rules[0].name).toBe('Images');
        expect(result.current.error).toBeNull();
    });

    it('sets error when fetchRules fails', async () => {
        vi.mocked(tauri.getRules).mockRejectedValue(new Error('fetch failed'));
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe('fetch failed');
    });

    it('sets string error correctly', async () => {
        vi.mocked(tauri.getRules).mockRejectedValue('generic error');
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe('generic error');
    });

    it('addRule adds a new rule', async () => {
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.addRule({ name: 'Videos', extensions: ['mp4'], destination: 'C:\\Videos', create_symlink: false, enabled: true });
        });

        expect(result.current.rules).toHaveLength(2);
        expect(result.current.rules[1].name).toBe('Videos');
    });

    it('addRule throws if createRule fails', async () => {
        vi.mocked(tauri.createRule).mockRejectedValue(new Error('create failed'));
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await expect(
            act(async () => {
                await result.current.addRule({ name: 'Videos', extensions: [], destination: '', create_symlink: false, enabled: true });
            })
        ).rejects.toThrow('create failed');
    });

    it('editRule updates an existing rule', async () => {
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.editRule({ id: '1', name: 'Updated' });
        });

        expect(result.current.rules[0].name).toBe('Updated');
    });

    it('editRule throws if updateRule fails', async () => {
        vi.mocked(tauri.updateRule).mockRejectedValue(new Error('update failed'));
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await expect(
            act(async () => { await result.current.editRule({ id: '1' }); })
        ).rejects.toThrow('update failed');
    });

    it('removeRule removes the rule from state', async () => {
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.removeRule('1');
        });

        expect(result.current.rules).toHaveLength(0);
    });

    it('removeRule throws if deleteRule fails', async () => {
        vi.mocked(tauri.deleteRule).mockRejectedValue(new Error('delete failed'));
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await expect(
            act(async () => { await result.current.removeRule('1'); })
        ).rejects.toThrow('delete failed');
    });

    it('toggleRule updates enabled status', async () => {
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.toggleRule('1', false);
        });

        expect(result.current.rules[0].enabled).toBe(false);
    });

    it('toggleRule throws if toggleRule API fails', async () => {
        vi.mocked(tauri.toggleRule).mockRejectedValue(new Error('toggle failed'));
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await expect(
            act(async () => { await result.current.toggleRule('1', false); })
        ).rejects.toThrow('toggle failed');
    });

    it('reorderRules optimistically updates and reverts on failure', async () => {
        vi.mocked(tauri.getRules).mockResolvedValue([makeRule({ id: '1' }), makeRule({ id: '2', name: 'Videos' })]);
        vi.mocked(tauri.reorderRules).mockRejectedValue(new Error('reorder failed'));

        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.rules).toHaveLength(2);

        await expect(
            act(async () => { await result.current.reorderRules(['2', '1']); })
        ).rejects.toThrow('reorder failed');

        // Reverted to original order
        expect(result.current.rules[0].id).toBe('1');
    });

    it('reorderRules succeeds and keeps new order', async () => {
        vi.mocked(tauri.getRules).mockResolvedValue([makeRule({ id: '1' }), makeRule({ id: '2', name: 'Videos' })]);
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.reorderRules(['2', '1']);
        });

        expect(result.current.rules[0].id).toBe('2');
    });

    it('reorderRules appends rules missing from new order', async () => {
        vi.mocked(tauri.getRules).mockResolvedValue([
            makeRule({ id: '1' }), makeRule({ id: '2', name: 'Videos' }), makeRule({ id: '3', name: 'Docs' })
        ]);
        const { result } = renderHook(() => useRules());
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Only reorder 2 of the 3 rules
        await act(async () => {
            await result.current.reorderRules(['2', '1']);
        });

        // Rule with id '3' should still be there, appended
        expect(result.current.rules.some(r => r.id === '3')).toBe(true);
    });
});
