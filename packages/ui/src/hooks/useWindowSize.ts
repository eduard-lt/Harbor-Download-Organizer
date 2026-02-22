import { useState, useEffect } from 'react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

const STORAGE_KEY = 'harbor-window-size';

interface WindowSize {
    label: string;
    width: number;
    height: number;
}

export const PRESET_SIZES: WindowSize[] = [
    { label: 'Small', width: 1280, height: 800 },
    { label: 'Medium', width: 1600, height: 900 },
    { label: 'Large', width: 1920, height: 1080 },
];

export function useWindowSize() {
    const [currentSize, setCurrentSize] = useState<WindowSize | null>(null);

    // Load saved size on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Validate it matches one of our presets or at least has width/height
                if (parsed && typeof parsed.width === 'number' && typeof parsed.height === 'number') {
                    setCurrentSize(parsed);
                    applySize(parsed);
                }
            } catch (e) {
                console.error('Failed to parse saved window size', e);
            }
        } else {
            // Default to Large if nothing saved
            const defaultSize = PRESET_SIZES[2];
            setCurrentSize(defaultSize);
            // We don't necessarily enforce it on first load if not saved, 
            // relying on tauri.conf.json defaults, but saving it for future helps.
        }
    }, []);

    const applySize = async (size: { width: number; height: number }) => {
        try {
            await getCurrentWindow().setSize(new LogicalSize(size.width, size.height));
            await getCurrentWindow().center();
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
