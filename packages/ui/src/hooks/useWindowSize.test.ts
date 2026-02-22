import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWindowSize, PRESET_SIZES } from './useWindowSize';

const mockSetSize = vi.fn().mockResolvedValue(undefined);
const mockCenter = vi.fn().mockResolvedValue(undefined);

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        setSize: mockSetSize,
        center: mockCenter,
    }),
    LogicalSize: class {
        width: number;
        height: number;
        constructor(w: number, h: number) { this.width = w; this.height = h; }
    },
}));

describe('useWindowSize', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('defaults to Large preset when nothing is saved in localStorage', async () => {
        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());
        expect(result.current.currentSize).toEqual(PRESET_SIZES[2]); // Large
    });

    it('loads saved size from localStorage', async () => {
        const savedSize = { label: 'Small', width: 1280, height: 800 };
        localStorage.setItem('harbor-window-size', JSON.stringify(savedSize));

        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());

        expect(result.current.currentSize).toEqual(savedSize);
        expect(mockSetSize).toHaveBeenCalled();
        expect(mockCenter).toHaveBeenCalled();
    });

    it('ignores invalid JSON in localStorage, currentSize stays null', async () => {
        localStorage.setItem('harbor-window-size', 'invalid-json');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const { result } = renderHook(() => useWindowSize());
        // With bad JSON, we are still inside "if (saved)" so the else
        // Large-default branch is NOT reached. currentSize stays null.
        await new Promise(r => setTimeout(r, 50));
        expect(result.current.currentSize).toBeNull();
        consoleSpy.mockRestore();
    });

    it('ignores saved data missing width/height, stays null until explicitly set', async () => {
        localStorage.setItem('harbor-window-size', JSON.stringify({ label: 'Weird' }));
        const { result } = renderHook(() => useWindowSize());
        // Parsed successfully but fails type guard: parsed.width/height not a number
        // setCurrentSize is NOT called in this branch, so stays null
        // After a tick the effect has run; currentSize should remain null
        await new Promise(r => setTimeout(r, 50));
        expect(result.current.currentSize).toBeNull();
    });

    it('setSize updates state, saves to localStorage, and calls applySize', async () => {
        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());

        await act(async () => {
            await result.current.setSize(PRESET_SIZES[0]); // Small
        });

        expect(result.current.currentSize).toEqual(PRESET_SIZES[0]);
        const saved = JSON.parse(localStorage.getItem('harbor-window-size')!);
        expect(saved).toEqual(PRESET_SIZES[0]);
        expect(mockSetSize).toHaveBeenCalled();
    });

    it('exposes presets array', () => {
        const { result } = renderHook(() => useWindowSize());
        expect(result.current.presets).toEqual(PRESET_SIZES);
    });

    it('handles applySize error gracefully', async () => {
        mockSetSize.mockRejectedValueOnce(new Error('resize failed'));
        localStorage.setItem('harbor-window-size', JSON.stringify(PRESET_SIZES[0]));

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());

        expect(consoleSpy).toHaveBeenCalledWith('Failed to resize window:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});
