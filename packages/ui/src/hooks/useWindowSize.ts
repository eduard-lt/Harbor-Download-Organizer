import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';
import type { UnlistenFn } from '@tauri-apps/api/event';

const STORAGE_SIZE_KEY = 'harbor-window-size';
const STORAGE_POSITION_KEY = 'harbor-window-position';

// Prevent re-initialization when the hook is called from multiple components.
let globalInitialized = false;

/** Reset global init flag (for tests only). */
export function __resetWindowSizeForTest() {
  globalInitialized = false;
}

interface WindowSize {
    label: string;
    width: number;
    height: number;
}

interface WindowPosition {
    x: number;
    y: number;
}

export const PRESET_SIZES: WindowSize[] = [
    { label: 'Compact', width: 1000, height: 700 },
    { label: 'Medium', width: 1400, height: 900 },
    { label: 'Large', width: 1600, height: 1000 },
];

export function useWindowSize() {
    const [currentSize, setCurrentSize] = useState<WindowSize | null>(() => {
        // If another component already initialized, read saved size from localStorage.
        if (globalInitialized) {
            try {
                const saved = localStorage.getItem(STORAGE_SIZE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
                        return parsed;
                    }
                }
            } catch {
                // ignore
            }
        }
        return null;
    });
    const moveUnlistenRef = useRef<UnlistenFn | null>(null);

    const savePosition = useCallback(async () => {
        try {
            const window = getCurrentWindow();
            const pos = await window.outerPosition();
            // outerPosition returns PhysicalPosition; convert to logical for storage
            // We store logical coordinates so they work across DPI changes
            const scaleFactor = await window.scaleFactor();
            const logicalPos: WindowPosition = {
                x: Math.round(pos.x / scaleFactor),
                y: Math.round(pos.y / scaleFactor),
            };
            localStorage.setItem(STORAGE_POSITION_KEY, JSON.stringify(logicalPos));
        } catch {
            // Silently ignore position save failures
        }
    }, []);

    // Load saved size/position on mount (once globally)
    useEffect(() => {
        if (globalInitialized) return;
        globalInitialized = true;

        const initializeWindow = async () => {
            try {
                const saved = localStorage.getItem(STORAGE_SIZE_KEY);

                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
                            setCurrentSize(parsed);
                            await applySizeAndPosition(parsed, true);
                        }
                    } catch (e) {
                        console.error('Failed to parse saved window size', e);
                        await applyDefaultSize();
                    }
                } else {
                    await applyDefaultSize();
                }

                // Listen for window moves to persist position
                const window = getCurrentWindow();
                moveUnlistenRef.current = await window.onMoved(() => {
                    savePosition();
                });
            } catch (error) {
                console.error('Failed to initialize window size:', error);
            }
        };

        initializeWindow();

        return () => {
            if (moveUnlistenRef.current) {
                moveUnlistenRef.current();
                moveUnlistenRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const applyDefaultSize = async () => {
        try {
            const monitor = await currentMonitor();
            if (monitor && monitor.size) {
                const screenWidth = monitor.size.width;
                const screenHeight = monitor.size.height;

                console.log(`[Harbor] Detected screen: ${screenWidth}x${screenHeight}`);

                const targetWidth = screenWidth * 0.7;
                const targetHeight = screenHeight * 0.7;

                let selectedPreset = PRESET_SIZES[0];

                for (let i = PRESET_SIZES.length - 1; i >= 0; i--) {
                    const preset = PRESET_SIZES[i];
                    if (preset.width <= targetWidth && preset.height <= targetHeight) {
                        selectedPreset = preset;
                        break;
                    }
                }

                if (screenWidth <= 1366 || screenHeight <= 768) {
                    selectedPreset = PRESET_SIZES[0]; // Compact
                } else if (screenWidth <= 1920 && screenHeight <= 1080) {
                    selectedPreset = PRESET_SIZES[1]; // Medium
                } else if (screenWidth > 1920 || screenHeight > 1080) {
                    selectedPreset = PRESET_SIZES[2]; // Large
                }

                console.log(`[Harbor] Auto-selected size: ${selectedPreset.label} (${selectedPreset.width}x${selectedPreset.height})`);

                setCurrentSize(selectedPreset);
                await applySizeAndPosition(selectedPreset, false);
            } else {
                console.warn('[Harbor] Could not detect screen size, using Medium');
                const defaultSize = PRESET_SIZES[1];
                setCurrentSize(defaultSize);
                await applySizeAndPosition(defaultSize, false);
            }
        } catch (error) {
            console.error('Failed to apply default size:', error);
            const defaultSize = PRESET_SIZES[1];
            setCurrentSize(defaultSize);
        }
    };

    const applySizeAndPosition = async (size: { width: number; height: number }, restorePosition: boolean) => {
        try {
            const window = getCurrentWindow();
            await window.setSize(new LogicalSize(size.width, size.height));

            if (restorePosition) {
                const savedPos = localStorage.getItem(STORAGE_POSITION_KEY);
                if (savedPos) {
                    try {
                        const parsed: WindowPosition = JSON.parse(savedPos);
                        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                            await window.setPosition(new LogicalPosition(parsed.x, parsed.y));
                            return;
                        }
                    } catch {
                        // Invalid position data, fall through to center
                    }
                }
            }
            // Center window if no saved position or position restore not requested
            await window.center();
        } catch (error) {
            console.error('Failed to resize window:', error);
        }
    };

    const setSize = async (size: WindowSize) => {
        setCurrentSize(size);
        localStorage.setItem(STORAGE_SIZE_KEY, JSON.stringify(size));
        // When user explicitly changes size, center the window on the current monitor
        await applySizeAndPosition(size, false);
    };

    return {
        currentSize,
        setSize,
        presets: PRESET_SIZES
    };
}
