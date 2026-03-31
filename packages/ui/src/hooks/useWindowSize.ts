import { useState, useEffect } from 'react';
import { getCurrentWindow, LogicalSize, currentMonitor } from '@tauri-apps/api/window';

const STORAGE_KEY = 'harbor-window-size';

interface WindowSize {
    label: string;
    width: number;
    height: number;
}

export const PRESET_SIZES: WindowSize[] = [
    { label: 'Compact', width: 1000, height: 700 },
    { label: 'Medium', width: 1400, height: 900 },
    { label: 'Large', width: 1600, height: 1000 },
];

export function useWindowSize() {
    const [currentSize, setCurrentSize] = useState<WindowSize | null>(null);

    // Load saved size on mount and adjust for DPI scaling
    useEffect(() => {
        const initializeWindowSize = async () => {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
                            setCurrentSize(parsed);
                            // Use LogicalSize which handles DPI automatically
                            await applySize(parsed);
                        }
                    } catch (e) {
                        console.error('Failed to parse saved window size', e);
                        await applyDefaultSize();
                    }
                } else {
                    // No saved size - use intelligent default based on screen size
                    await applyDefaultSize();
                }
            } catch (error) {
                console.error('Failed to initialize window size:', error);
            }
        };

        initializeWindowSize();
    }, []);

    const applyDefaultSize = async () => {
        try {
            // Get available screen size
            const monitor = await currentMonitor();
            if (monitor && monitor.size) {
                const screenWidth = monitor.size.width;
                const screenHeight = monitor.size.height;
                
                console.log(`[Harbor] Detected screen: ${screenWidth}x${screenHeight}`);
                
                // Smart preset selection based on screen size
                // Use 70% of screen size as comfortable maximum
                const targetWidth = screenWidth * 0.7;
                const targetHeight = screenHeight * 0.7;
                
                let selectedPreset = PRESET_SIZES[0]; // Default to Compact
                
                // Choose the largest preset that comfortably fits
                for (let i = PRESET_SIZES.length - 1; i >= 0; i--) {
                    const preset = PRESET_SIZES[i];
                    if (preset.width <= targetWidth && preset.height <= targetHeight) {
                        selectedPreset = preset;
                        break;
                    }
                }
                
                // Additional smart sizing based on actual screen dimensions:
                // - Small screens (<= 1366x768): Compact
                // - Medium screens (<= 1920x1080): Medium  
                // - Large screens (> 1920x1080): Large
                if (screenWidth <= 1366 || screenHeight <= 768) {
                    selectedPreset = PRESET_SIZES[0]; // Compact
                } else if (screenWidth <= 1920 && screenHeight <= 1080) {
                    selectedPreset = PRESET_SIZES[1]; // Medium
                } else if (screenWidth > 1920 || screenHeight > 1080) {
                    selectedPreset = PRESET_SIZES[2]; // Large
                }
                
                console.log(`[Harbor] Auto-selected size: ${selectedPreset.label} (${selectedPreset.width}x${selectedPreset.height})`);
                
                setCurrentSize(selectedPreset);
                await applySize(selectedPreset);
            } else {
                // Fallback to medium if we can't detect screen size
                console.warn('[Harbor] Could not detect screen size, using Medium');
                const defaultSize = PRESET_SIZES[1];
                setCurrentSize(defaultSize);
                await applySize(defaultSize);
            }
        } catch (error) {
            console.error('Failed to apply default size:', error);
            // Last resort fallback
            const defaultSize = PRESET_SIZES[1];
            setCurrentSize(defaultSize);
        }
    };

    const applySize = async (size: { width: number; height: number }) => {
        try {
            const window = getCurrentWindow();
            // LogicalSize automatically handles DPI scaling
            await window.setSize(new LogicalSize(size.width, size.height));
            await window.center();
        } catch (error) {
            console.error('Failed to resize window:', error);
        }
    };

    const setSize = async (size: WindowSize) => {
        setCurrentSize(size);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
        await applySize(size);
    };

    return {
        currentSize,
        setSize,
        presets: PRESET_SIZES
    };
}
