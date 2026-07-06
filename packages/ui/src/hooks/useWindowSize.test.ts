import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWindowSize, PRESET_SIZES } from './useWindowSize';

const mockFns = vi.hoisted(() => {
    const mocks = {
        mockSetSize: vi.fn(),
        mockSetPosition: vi.fn(),
        mockCenter: vi.fn(),
        mockOuterPosition: vi.fn(),
        mockScaleFactor: vi.fn(),
        mockOnMoved: vi.fn(),
        mockCurrentMonitor: vi.fn(),
    };
    return mocks;
});

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: () => ({
        setSize: mockFns.mockSetSize,
        setPosition: mockFns.mockSetPosition,
        center: mockFns.mockCenter,
        outerPosition: mockFns.mockOuterPosition,
        scaleFactor: mockFns.mockScaleFactor,
        onMoved: mockFns.mockOnMoved,
    }),
    currentMonitor: () => mockFns.mockCurrentMonitor(),
    LogicalSize: class {
        width: number;
        height: number;
        constructor(w: number, h: number) { this.width = w; this.height = h; }
    },
    LogicalPosition: class {
        x: number;
        y: number;
        constructor(x: number, y: number) { this.x = x; this.y = y; }
    },
}));

const {
    mockSetSize,
    mockSetPosition,
    mockCenter,
    mockOuterPosition,
    mockScaleFactor,
    mockOnMoved,
    mockCurrentMonitor,
} = mockFns;

describe('useWindowSize', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockCurrentMonitor.mockResolvedValue({
            size: { width: 1920, height: 1080 }
        });
        mockSetSize.mockResolvedValue(undefined);
        mockSetPosition.mockResolvedValue(undefined);
        mockCenter.mockResolvedValue(undefined);
        mockOuterPosition.mockResolvedValue({ x: 100, y: 200 });
        mockScaleFactor.mockResolvedValue(1);
        mockOnMoved.mockResolvedValue(() => {}); // default: returns a no-op unlisten
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('defaults to Medium preset for 1920x1080 screen when nothing is saved', async () => {
        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());
        expect(result.current.currentSize).toEqual(PRESET_SIZES[1]); // Medium for 1920x1080
    });

    it('defaults to Compact preset for small screens', async () => {
        mockCurrentMonitor.mockResolvedValue({
            size: { width: 1366, height: 768 }
        });
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull(), { timeout: 3000 });
        expect(result.current.currentSize).toEqual(PRESET_SIZES[0]); // Compact
        consoleSpy.mockRestore();
    });

    it('defaults to Large preset for large screens', async () => {
        mockCurrentMonitor.mockResolvedValue({
            size: { width: 2560, height: 1440 }
        });
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull(), { timeout: 3000 });
        expect(result.current.currentSize).toEqual(PRESET_SIZES[2]); // Large
        consoleSpy.mockRestore();
    });

    it('loads saved size and restores position from localStorage', async () => {
        const savedSize = { label: 'Compact', width: 1000, height: 700 };
        const savedPosition = { x: 42, y: 1337 };
        localStorage.setItem('harbor-window-size', JSON.stringify(savedSize));
        localStorage.setItem('harbor-window-position', JSON.stringify(savedPosition));

        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());

        expect(result.current.currentSize).toEqual(savedSize);
        expect(mockSetSize).toHaveBeenCalled();
        // Position should be restored, not centered
        expect(mockSetPosition).toHaveBeenCalled();
        expect(mockCenter).not.toHaveBeenCalled();
    });

    it('centers window when no saved position exists', async () => {
        const savedSize = { label: 'Medium', width: 1400, height: 900 };
        localStorage.setItem('harbor-window-size', JSON.stringify(savedSize));
        // No position saved

        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());

        expect(mockCenter).toHaveBeenCalled();
        expect(mockSetPosition).not.toHaveBeenCalled();
    });

    it('ignores invalid JSON in localStorage and applies default', async () => {
        localStorage.setItem('harbor-window-size', 'invalid-json');
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());
        expect(result.current.currentSize).toEqual(PRESET_SIZES[1]); // Medium default for 1920x1080
        consoleSpy.mockRestore();
    });

    it('ignores saved data missing width/height, stays null until explicitly set', async () => {
        localStorage.setItem('harbor-window-size', JSON.stringify({ label: 'Weird' }));
        const { result } = renderHook(() => useWindowSize());
        await new Promise(r => setTimeout(r, 50));
        expect(result.current.currentSize).toBeNull();
    });

    it('setSize updates state, saves to localStorage, and centers the window', async () => {
        const { result } = renderHook(() => useWindowSize());
        await waitFor(() => expect(result.current.currentSize).not.toBeNull());

        await act(async () => {
            await result.current.setSize(PRESET_SIZES[0]); // Compact
        });

        expect(result.current.currentSize).toEqual(PRESET_SIZES[0]);
        const saved = JSON.parse(localStorage.getItem('harbor-window-size')!);
        expect(saved).toEqual(PRESET_SIZES[0]);
        expect(mockSetSize).toHaveBeenCalled();
        // Explicit preset changes should center
        expect(mockCenter).toHaveBeenCalled();
    });

    it('registers onMoved listener on mount and cleans up on unmount', async () => {
        const mockUnlisten = vi.fn();
        mockOnMoved.mockResolvedValue(mockUnlisten);

        const { unmount } = renderHook(() => useWindowSize());
        await waitFor(() => expect(mockOnMoved).toHaveBeenCalled());

        unmount();
        expect(mockUnlisten).toHaveBeenCalled();
    });

    it('saves position when window is moved', async () => {
        let moveCallback: (() => void) | null = null;
        mockOnMoved.mockImplementation((cb: () => void) => {
            moveCallback = cb;
            return Promise.resolve(() => {});
        });

        renderHook(() => useWindowSize());
        await waitFor(() => expect(mockOnMoved).toHaveBeenCalled());

        // Trigger the move callback; savePosition is fire-and-forget async inside
        expect(moveCallback).not.toBeNull();
        moveCallback!();

        // Wait for the async savePosition to complete using waitFor polling
        await waitFor(
            () => {
                expect(localStorage.getItem('harbor-window-position')).toEqual(
                    JSON.stringify({ x: 100, y: 200 })
                );
            },
            { timeout: 2000 }
        );
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
